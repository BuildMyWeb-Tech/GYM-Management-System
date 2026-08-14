// app/api/reports/revenue-trend/route.js
import prisma from '@/lib/prisma';
import { resolveReportAccess } from '@/lib/reportAccess';
import { NextResponse } from 'next/server';
import { buildDateRange, round2, fmtDay, toISTDateKey, EXCLUDED_STATUSES } from '@/lib/reportUtils';

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

    const orders = await prisma.order.findMany({
      where: {
        createdAt: dateRange,
        status: { notIn: EXCLUDED_STATUSES },
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      select: { total: true, commissionAmt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const buckets = {};
    for (const order of orders) {
      const key = toISTDateKey(order.createdAt);
      if (!buckets[key]) buckets[key] = { revenue: 0, commission: 0, count: 0 };
      buckets[key].revenue += order.total;
      buckets[key].commission += order.commissionAmt;
      buckets[key].count += 1;
    }

    const trend = [];
    const cursor = new Date(dateRange.gte);
    const end = new Date(dateRange.lte);
    while (cursor <= end) {
      const key = toISTDateKey(cursor);
      trend.push({
        date: key,
        label: fmtDay(cursor),
        revenue: round2(buckets[key]?.revenue || 0),
        commission: round2(buckets[key]?.commission || 0),
        count: buckets[key]?.count || 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const totalRevenue = round2(orders.reduce((s, o) => s + o.total, 0));
    const totalCommission = round2(orders.reduce((s, o) => s + o.commissionAmt, 0));
    const peakDay = trend.reduce((best, d) => (d.revenue > (best?.revenue || 0) ? d : best), null);

    return NextResponse.json({
      trend,
      meta: {
        totalRevenue,
        totalCommission,
        branchRevenue: round2(totalRevenue - totalCommission),
        totalCount: orders.length,
        peakDay,
        period,
        from: dateRange.gte,
        to: dateRange.lte,
      },
    });
  } catch (error) {
    console.error('GET /api/reports/revenue-trend error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
