// app/api/member/update/route.js
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function PUT(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_MEMBERS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });

    const existing = await prisma.member.findFirst({ where: { id, branchId } });
    if (!existing) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const updateData = {};
    const strFields = [
      'fullName',
      'phone',
      'gender',
      'address',
      'emergencyContactName',
      'emergencyContactNumber',
      'deviceUserId',
      'memberCode',
    ];
    for (const field of strFields) {
      if (body[field] !== undefined) updateData[field] = body[field] || null;
    }
    if (body.dob !== undefined) updateData.dob = body.dob ? new Date(body.dob) : null;

    const member = await prisma.member.update({ where: { id }, data: updateData });
    return NextResponse.json({ message: 'Member updated successfully', member });
  } catch (error) {
    if (error.code === 'P2002') {
      const target = error.meta?.target || [];
      if (target.includes('memberCode')) {
        return NextResponse.json(
          { error: 'That Member ID is already in use in this branch' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'That biometric device ID is already assigned to another member' },
        { status: 400 }
      );
    }
    console.error('PUT /api/member/update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
