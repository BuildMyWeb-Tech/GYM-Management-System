// app/api/member/toggle-status/route.js
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_MEMBERS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });

    const existing = await prisma.member.findFirst({ where: { id, branchId } });
    if (!existing) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const newStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await prisma.member.update({ where: { id }, data: { status: newStatus } });

    return NextResponse.json({
      message: `Member ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`,
      status: newStatus,
    });
  } catch (error) {
    console.error('POST /api/member/toggle-status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
