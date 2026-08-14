// app/api/reports/summary/route.js
import prisma from '@/lib/prisma';
import { resolveReportAccess } from '@/lib/reportAccess';
import { NextResponse } from 'next/server';
import {
  buildDateRange,
  buildComparisonRanges,
  calcGrowth,
  round2,
  EXCLUDED_STATUSES,
} from '@/lib/reportUtils';

export async function GET(request) {
  try {
    const { role, branchId: myBranchId } = await resolveReportAccess(request);
    if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const filterBranch = searchParams.get('branchId');
    const comparison = searchParams.get('comparison');

    const dateRange = buildDateRange(period, from, to);
    if (!dateRange) {
      return NextResponse.json(
        { error: 'Custom period requires valid "from" and "to" dates' },
        { status: 400 }
      );
    }

    const scopedBranchId = role === 'ADMIN' ? filterBranch || undefined : myBranchId;

    const orderWhere = {
      createdAt: dateRange,
      status: { notIn: EXCLUDED_STATUSES },
      ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
    };

    const [agg, activeMembers, expiredMembers, newMembers, todayAttendance] = await Promise.all([
      prisma.order.aggregate({
        where: orderWhere,
        _sum: { total: true, commissionAmt: true },
        _count: { id: true },
        _avg: { total: true },
      }),
      prisma.membership.count({
        where: {
          status: 'ACTIVE',
          expiryDate: { gte: new Date() },
          ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
        },
      }),
      prisma.membership.count({
        where: {
          OR: [{ status: 'EXPIRED' }, { status: 'ACTIVE', expiryDate: { lt: new Date() } }],
          ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
        },
      }),
      prisma.member.count({
        where: { joinDate: dateRange, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) },
      }),
      prisma.attendance.count({
        where: { checkIn: dateRange, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) },
      }),
    ]);

    const revenue = round2(agg._sum.total || 0);
    const commissionEarned = round2(agg._sum.commissionAmt || 0);
    const branchRevenue = round2(revenue - commissionEarned);
    const orderCount = agg._count.id || 0;
    const aov = round2(agg._avg.total || 0);

    // Top branch (admin only)
    let topBranch = null;
    if (role === 'ADMIN' && !filterBranch) {
      const topBranchRaw = await prisma.order.groupBy({
        by: ['branchId'],
        where: { createdAt: dateRange, status: { notIn: EXCLUDED_STATUSES } },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 1,
      });
      if (topBranchRaw.length > 0) {
        const branchData = await prisma.branch.findUnique({
          where: { id: topBranchRaw[0].branchId },
          select: { id: true, name: true, logo: true, username: true },
        });
        topBranch = { ...branchData, revenue: round2(topBranchRaw[0]._sum.total || 0) };
      }
    }

    let comparisonData = null;
    if (comparison) {
      const ranges = buildComparisonRanges(comparison);
      if (ranges) {
        const branchFilter = scopedBranchId ? { branchId: scopedBranchId } : {};
        const excludeFilter = { status: { notIn: EXCLUDED_STATUSES } };

        const [curr, prev] = await Promise.all([
          prisma.order.aggregate({
            where: { createdAt: ranges.current, ...branchFilter, ...excludeFilter },
            _sum: { total: true },
            _count: { id: true },
          }),
          prisma.order.aggregate({
            where: { createdAt: ranges.previous, ...branchFilter, ...excludeFilter },
            _sum: { total: true },
            _count: { id: true },
          }),
        ]);

        const currRev = round2(curr._sum.total || 0);
        const prevRev = round2(prev._sum.total || 0);
        const currOrds = curr._count.id || 0;
        const prevOrds = prev._count.id || 0;

        comparisonData = {
          labels: ranges.labels,
          revenue: { current: currRev, previous: prevRev, ...calcGrowth(currRev, prevRev) },
          orders: { current: currOrds, previous: prevOrds, ...calcGrowth(currOrds, prevOrds) },
        };
      }
    }

    return NextResponse.json({
      summary: {
        revenue,
        commissionEarned,
        branchRevenue,
        orders: orderCount,
        aov,
        activeMembers,
        expiredMembers,
        newMembers,
        todayAttendance,
        topBranch,
        period,
        dateRange: { from: dateRange.gte, to: dateRange.lte },
        comparison: comparisonData,
      },
    });
  } catch (error) {
    console.error('GET /api/reports/summary error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
