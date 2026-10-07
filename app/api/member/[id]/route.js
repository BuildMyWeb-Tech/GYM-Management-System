// app/api/member/[id]/route.js
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

function monthLabel(date) {
  return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function dayLabel(date) {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function dateKey(date) {
  return date.toISOString().split('T')[0];
}

export async function GET(request, { params }) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_MEMBERS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;
    const { id } = await params;

    const member = await prisma.member.findFirst({
      where: { id, branchId },
      include: {
        memberships: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { plan: { select: { name: true } } },
        },
        attendances: {
          orderBy: { checkIn: 'desc' },
          take: 10,
        },
        _count: { select: { orders: true } },
      },
    });

    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const now = new Date();

    // Monthly attendance counts — last 6 months
    const monthRanges = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      monthRanges.push({ start, end, label: monthLabel(start) });
    }

    // Single query covering the full 6-month window; bucket in JS to avoid 6 round-trips
    const allMonthAttendance = await prisma.attendance.findMany({
      where: { memberId: id, checkIn: { gte: monthRanges[0].start, lt: monthRanges[5].end } },
      select: { checkIn: true },
    });
    const monthBuckets = {};
    for (const a of allMonthAttendance) {
      const d = new Date(a.checkIn);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthBuckets[key] = (monthBuckets[key] || 0) + 1;
    }
    const attendanceMonthly = monthRanges.map((r) => ({
      label: r.label,
      count: monthBuckets[`${r.start.getFullYear()}-${r.start.getMonth()}`] || 0,
    }));

    // Daily attendance duration — last 30 days
    const rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() - 29);
    rangeStart.setHours(0, 0, 0, 0);

    const recentRecords = await prisma.attendance.findMany({
      where: { memberId: id, checkIn: { gte: rangeStart } },
      select: { checkIn: true, checkOut: true },
    });

    const minutesByDay = {};
    for (const r of recentRecords) {
      const key = dateKey(new Date(r.checkIn));
      const end = r.checkOut ? new Date(r.checkOut) : now; // still-open session counts up to now
      const minutes = Math.max(0, Math.round((end - new Date(r.checkIn)) / 60000));
      minutesByDay[key] = (minutesByDay[key] || 0) + minutes;
    }

    const attendanceDaily = [];
    const cursor = new Date(rangeStart);
    while (cursor <= now) {
      const key = dateKey(cursor);
      attendanceDaily.push({ date: key, label: dayLabel(cursor), minutes: minutesByDay[key] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Active membership summary
    const activeMembership = await prisma.membership.findFirst({
      where: { memberId: id, status: 'ACTIVE', expiryDate: { gte: now } },
      orderBy: { expiryDate: 'asc' },
      include: { plan: { select: { name: true } } },
    });

    let activeMembershipSummary = null;
    if (activeMembership) {
      const daysRemaining = Math.ceil(
        (new Date(activeMembership.expiryDate) - now) / (1000 * 60 * 60 * 24)
      );
      activeMembershipSummary = {
        planName: activeMembership.plan.name,
        expiryDate: activeMembership.expiryDate,
        daysRemaining,
      };
    }

    return NextResponse.json({
      member,
      attendanceMonthly,
      attendanceDaily,
      activeMembership: activeMembershipSummary,
    });
  } catch (error) {
    console.error('GET /api/member/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
