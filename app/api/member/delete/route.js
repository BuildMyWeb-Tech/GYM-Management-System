// app/api/member/delete/route.js
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function DELETE(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_MEMBERS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });

    const existing = await prisma.member.findFirst({ where: { id, branchId } });
    if (!existing) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    await prisma.member.delete({ where: { id } });

    return NextResponse.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/member/delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
