// app/api/reports/member-stats/route.js
import prisma from '@/lib/prisma';
import { resolveReportAccess } from '@/lib/reportAccess';
import { NextResponse } from 'next/server';
import { buildDateRange, fmtDay, toISTDateKey } from '@/lib/reportUtils';

export async function GET(request) {
  try {
    const { role, branchId: myBranchId } = await resolveReportAccess(request);
    if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const filterBranch = searchParams.get('branchId');

    const dateRange = buildDateRange(period, from, to);
    if (!dateRange)
      return NextResponse.json(
        { error: 'Custom period requires valid "from" and "to" dates' },
        { status: 400 }
      );

    const scopedBranchId = role === 'ADMIN' ? filterBranch || undefined : myBranchId;
    const branchFilter = scopedBranchId ? { branchId: scopedBranchId } : {};

    const [totalMembers, activeCount, expiredCount, frozenCount, newMembersInRange] =
      await Promise.all([
        prisma.member.count({ where: branchFilter }),
        prisma.membership.count({
          where: { status: 'ACTIVE', expiryDate: { gte: new Date() }, ...branchFilter },
        }),
        prisma.membership.count({
          where: {
            OR: [{ status: 'EXPIRED' }, { status: 'ACTIVE', expiryDate: { lt: new Date() } }],
            ...branchFilter,
          },
        }),
        prisma.membership.count({ where: { status: 'FROZEN', ...branchFilter } }),
        prisma.member.findMany({
          where: { joinDate: dateRange, ...branchFilter },
          select: { joinDate: true },
        }),
      ]);

    // New-member growth trend
    const buckets = {};
    for (const m of newMembersInRange) {
      const key = toISTDateKey(m.joinDate);
      buckets[key] = (buckets[key] || 0) + 1;
    }
    const trend = [];
    const cursor = new Date(dateRange.gte);
    const end = new Date(dateRange.lte);
    while (cursor <= end) {
      const key = toISTDateKey(cursor);
      trend.push({ date: key, label: fmtDay(cursor), count: buckets[key] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    return NextResponse.json({
      breakdown: {
        totalMembers,
        activeCount,
        expiredCount,
        frozenCount,
        newInPeriod: newMembersInRange.length,
      },
      trend,
      period,
      dateRange: { from: dateRange.gte, to: dateRange.lte },
    });
  } catch (error) {
    console.error('GET /api/reports/member-stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
