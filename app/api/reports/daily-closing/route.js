// app/api/reports/daily-closing/route.js
// GET – daily closing report: payments, attendance, new members, renewals.

import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { round2 } from '@/lib/reportUtils';
import { NextResponse } from 'next/server';

const IST = 5.5 * 60 * 60 * 1000;

function dayRangeIST(dateStr) {
  // dateStr: YYYY-MM-DD in IST
  const base = dateStr
    ? new Date(dateStr + 'T00:00:00.000Z')
    : new Date(Date.now() + IST); // now in IST

  // Align to IST midnight
  const ist = new Date(base);
  ist.setUTCHours(0, 0, 0, 0);
  const startUTC = new Date(ist.getTime() - IST);
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { gte: startUTC, lte: endUTC };
}

export async function GET(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.VIEW_REPORTS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD IST

    const dateRange = dayRangeIST(dateParam);

    const [orders, attendanceCount, newMembers] = await Promise.all([
      prisma.order.findMany({
        where: { branchId, createdAt: dateRange, status: { notIn: ['CANCELLED'] } },
        include: {
          member: { select: { fullName: true } },
          orderItems: { select: { name: true, itemType: true, price: true, quantity: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.attendance.count({ where: { branchId, checkIn: dateRange } }),
      prisma.member.count({ where: { branchId, joinDate: dateRange } }),
    ]);

    // Aggregate revenue by payment method
    const revenue = { CASH: 0, UPI: 0, CARD: 0, RAZORPAY: 0, total: 0 };
    let renewalCount = 0;
    let newPurchaseCount = 0;

    const orderRows = orders.map((o) => {
      revenue[o.paymentMethod] = round2((revenue[o.paymentMethod] || 0) + o.total);
      revenue.total = round2(revenue.total + o.total);

      const hasMembershipPlan = o.orderItems.some((i) => i.itemType === 'MEMBERSHIP_PLAN');
      if (hasMembershipPlan) {
        // Count as renewal if member has prior orders (rough heuristic)
        renewalCount++;
      }

      return {
        id: o.id,
        memberName: o.member?.fullName || '—',
        plans: o.orderItems.map((i) => i.name).join(', '),
        amount: o.total,
        paymentMethod: o.paymentMethod,
        isPaid: o.isPaid,
        time: new Date(o.createdAt).toLocaleTimeString('en-IN', {
          hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
        }),
        createdAt: o.createdAt,
      };
    });

    // Better renewal detection: orders by members who have prior confirmed orders
    const memberIdsToday = [...new Set(orders.map((o) => o.memberId))];
    let actualRenewals = 0;
    if (memberIdsToday.length > 0) {
      const priorOrders = await prisma.order.groupBy({
        by: ['memberId'],
        where: {
          branchId,
          memberId: { in: memberIdsToday },
          isPaid: true,
          createdAt: { lt: dateRange.gte },
        },
        _count: { id: true },
      });
      actualRenewals = priorOrders.length;
    }

    return NextResponse.json({
      date: dateParam || new Date(Date.now() + IST).toISOString().split('T')[0],
      revenue: {
        total: revenue.total,
        cash: revenue.CASH,
        upi: revenue.UPI,
        card: revenue.CARD,
        razorpay: revenue.RAZORPAY,
      },
      totalOrders: orders.length,
      paidOrders: orders.filter((o) => o.isPaid).length,
      totalAttendance: attendanceCount,
      newMembers,
      renewals: actualRenewals,
      orders: orderRows,
    });
  } catch (error) {
    console.error('GET /api/reports/daily-closing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
