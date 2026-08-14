// app/api/attendance/list/route.js
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MARK_ATTENDANCE);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // 'YYYY-MM-DD', defaults to today
    const memberId = searchParams.get('memberId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '30', 10));

    const dayStart = date ? new Date(date) : new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const where = {
      branchId,
      checkIn: { gte: dayStart, lt: dayEnd },
      ...(memberId ? { memberId } : {}),
    };

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: { member: { select: { id: true, fullName: true, phone: true, photo: true } } },
        orderBy: { checkIn: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.attendance.count({ where }),
    ]);

    return NextResponse.json({
      records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/attendance/list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
