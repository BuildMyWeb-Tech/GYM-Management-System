// app/api/attendance/manual/route.js
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { recordAttendanceEvent } from '@/lib/attendanceHelpers';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MARK_ATTENDANCE);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const { memberId, timestamp } = await request.json();
    if (!memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 });

    const member = await prisma.member.findFirst({ where: { id: memberId, branchId } });
    if (!member)
      return NextResponse.json({ error: 'Member not found in this branch' }, { status: 404 });

    const result = await recordAttendanceEvent({
      memberId,
      branchId,
      method: 'MANUAL',
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    return NextResponse.json(
      {
        message:
          result.action === 'checked_out'
            ? `${member.fullName} checked out`
            : `${member.fullName} checked in`,
        ...result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/attendance/manual error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
