// app/api/attendance/correct/route.js
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function PUT(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MARK_ATTENDANCE);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const { id, checkIn, checkOut, correctionReason } = await request.json();
    if (!id || !correctionReason) {
      return NextResponse.json({ error: 'id and correctionReason are required' }, { status: 400 });
    }

    const existing = await prisma.attendance.findFirst({ where: { id, branchId } });
    if (!existing)
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });

    const updateData = { correctionReason, method: 'MANUAL' };
    if (checkIn) updateData.checkIn = new Date(checkIn);
    if (checkOut !== undefined) updateData.checkOut = checkOut ? new Date(checkOut) : null;
    if (!access.isOwner) updateData.correctedById = access.employee.employeeId;

    const record = await prisma.attendance.update({ where: { id }, data: updateData });
    return NextResponse.json({ message: 'Attendance corrected', record });
  } catch (error) {
    console.error('PUT /api/attendance/correct error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
