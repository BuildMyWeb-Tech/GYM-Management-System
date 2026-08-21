// app/api/store/dashboard/route.js
import prisma from '@/lib/prisma';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import authBranchOwner from '@/middlewares/authBranchOwner';
import verifyEmployeeToken from '@/middlewares/authEmployee';

async function resolveBranchAuth(request) {
  const employee = verifyEmployeeToken(request);
  if (employee) return { branchId: employee.branchId, employee, source: 'employee' };

  const { userId } = getAuth(request);
  if (!userId) return { branchId: null };
  const branchId = await authBranchOwner(userId);
  return { branchId, source: 'owner' };
}

export async function GET(request) {
  try {
    const { branchId } = await resolveBranchAuth(request);
    if (!branchId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);
    in3Days.setHours(23, 59, 59, 999);

    const [
      branch,
      totalMembers,
      activeMemberships,
      expiredMemberships,
      totalEmployees,
      todayAttendance,
      totalOrders,
      revenueAgg,
      expiringSoon,
    ] = await Promise.all([
      prisma.branch.findUnique({
        where: { id: branchId },
        select: { name: true, status: true, isActive: true, createdAt: true },
      }),
      prisma.member.count({ where: { branchId } }),
      prisma.membership.count({ where: { branchId, status: 'ACTIVE' } }),
      prisma.membership.count({ where: { branchId, status: 'EXPIRED' } }),
      prisma.employee.count({ where: { branchId } }),
      prisma.attendance.count({ where: { branchId, checkIn: { gte: todayStart } } }),
      prisma.order.count({ where: { branchId } }),
      prisma.order.aggregate({ where: { branchId, isPaid: true }, _sum: { total: true } }),
      prisma.membership.findMany({
        where: {
          branchId,
          status: 'ACTIVE',
          expiryDate: { gte: todayStart, lte: in3Days },
        },
        include: {
          member: { select: { fullName: true, phone: true } },
          plan: { select: { name: true } },
        },
        orderBy: { expiryDate: 'asc' },
        take: 25,
      }),
    ]);

    return NextResponse.json({
      dashboardData: {
        branch,
        totalMembers,
        activeMemberships,
        expiredMemberships,
        totalEmployees,
        todayAttendance,
        totalOrders,
        totalRevenue: revenueAgg._sum.total || 0,
        expiringSoon: expiringSoon.map((m) => ({
          memberName: m.member.fullName,
          phone: m.member.phone,
          planName: m.plan.name,
          expiryDate: m.expiryDate,
        })),
      },
    });
  } catch (error) {
    console.error('GET /api/store/dashboard error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
