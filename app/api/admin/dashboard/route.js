// app/api/admin/dashboard/route.js
import prisma from '@/lib/prisma';
import authAdmin from '@/middlewares/authAdmin';
import { getAdminUserId } from '@/lib/getAdminUserId';
import { NextResponse } from 'next/server';
import { round2, EXCLUDED_STATUSES, toISTDateKey, fmtDay } from '@/lib/reportUtils';

export async function GET(request) {
  try {
    const userId = await getAdminUserId(request);
    const isAdminUser = await authAdmin(userId);
    if (!isAdminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() - 13);
    rangeStart.setHours(0, 0, 0, 0);

    const [
      totalBranches,
      activeBranches,
      pendingBranches,
      totalMembers,
      totalEmployees,
      activeMemberships,
      expiredMembershipsRaw,
      frozenMemberships,
      todayAttendance,
      revenueAgg,
      recentOrders,
      topBranchesRaw,
      branchStatusCounts,
    ] = await Promise.all([
      prisma.branch.count(),
      prisma.branch.count({ where: { status: 'ACTIVE', isActive: true } }),
      prisma.branch.count({ where: { status: 'PENDING' } }),
      prisma.member.count(),
      prisma.employee.count(),
      prisma.membership.count({ where: { status: 'ACTIVE', expiryDate: { gte: now } } }),
      prisma.membership.count({
        where: { OR: [{ status: 'EXPIRED' }, { status: 'ACTIVE', expiryDate: { lt: now } }] },
      }),
      prisma.membership.count({ where: { status: 'FROZEN' } }),
      prisma.attendance.count({ where: { checkIn: { gte: todayStart } } }),
      prisma.order.aggregate({
        where: { isPaid: true, status: { notIn: EXCLUDED_STATUSES } },
        _sum: { total: true, commissionAmt: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: rangeStart }, status: { notIn: EXCLUDED_STATUSES } },
        select: { total: true, createdAt: true },
      }),
      prisma.order.groupBy({
        by: ['branchId'],
        where: { status: { notIn: EXCLUDED_STATUSES } },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      prisma.branch.groupBy({ by: ['status'], _count: { id: true } }),
    ]);

    // Revenue trend — last 14 days, IST bucketed
    const buckets = {};
    for (const o of recentOrders) {
      const key = toISTDateKey(o.createdAt);
      buckets[key] = (buckets[key] || 0) + o.total;
    }
    const revenueTrend = [];
    const cursor = new Date(rangeStart);
    while (cursor <= now) {
      const key = toISTDateKey(cursor);
      revenueTrend.push({ date: key, label: fmtDay(cursor), revenue: round2(buckets[key] || 0) });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Top branches with names
    const topBranches = await Promise.all(
      topBranchesRaw.map(async (t) => {
        const branch = await prisma.branch.findUnique({
          where: { id: t.branchId },
          select: { name: true },
        });
        return { name: branch?.name || 'Unknown', revenue: round2(t._sum.total || 0) };
      })
    );

    // Branch status pie
    const branchStatusPie = branchStatusCounts.map((b) => ({ name: b.status, value: b._count.id }));

    // Membership status pie
    const membershipStatusPie = [
      { name: 'Active', value: activeMemberships },
      { name: 'Expired', value: expiredMembershipsRaw },
      { name: 'Frozen', value: frozenMemberships },
    ];

    return NextResponse.json({
      dashboardData: {
        totalBranches,
        activeBranches,
        pendingBranches,
        totalMembers,
        totalEmployees,
        activeMemberships,
        expiredMemberships: expiredMembershipsRaw,
        frozenMemberships,
        todayAttendance,
        totalRevenue: round2(revenueAgg._sum.total || 0),
        totalCommission: round2(revenueAgg._sum.commissionAmt || 0),
        revenueTrend,
        topBranches,
        branchStatusPie,
        membershipStatusPie,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/dashboard error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
