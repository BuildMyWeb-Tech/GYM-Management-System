// app/api/reports/attendance-trend/route.js
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
    const where = { checkIn: dateRange, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) };

    const records = await prisma.attendance.findMany({
      where,
      select: {
        checkIn: true,
        verified: true,
        memberId: true,
        member: { select: { fullName: true } },
      },
      orderBy: { checkIn: 'asc' },
    });

    // Daily trend
    const buckets = {};
    for (const r of records) {
      const key = toISTDateKey(r.checkIn);
      if (!buckets[key]) buckets[key] = { count: 0, verified: 0 };
      buckets[key].count += 1;
      if (r.verified) buckets[key].verified += 1;
    }
    const trend = [];
    const cursor = new Date(dateRange.gte);
    const end = new Date(dateRange.lte);
    while (cursor <= end) {
      const key = toISTDateKey(cursor);
      trend.push({
        date: key,
        label: fmtDay(cursor),
        count: buckets[key]?.count || 0,
        verified: buckets[key]?.verified || 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Member-wise top attendees
    const memberCounts = {};
    for (const r of records) {
      if (!memberCounts[r.memberId])
        memberCounts[r.memberId] = { name: r.member.fullName, count: 0 };
      memberCounts[r.memberId].count += 1;
    }
    const topAttendees = Object.values(memberCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const unverifiedCount = records.filter((r) => !r.verified).length;

    return NextResponse.json({
      trend,
      topAttendees,
      meta: {
        totalCheckIns: records.length,
        unverifiedCount,
        uniqueMembers: Object.keys(memberCounts).length,
        period,
        from: dateRange.gte,
        to: dateRange.lte,
      },
    });
  } catch (error) {
    console.error('GET /api/reports/attendance-trend error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
