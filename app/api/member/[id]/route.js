// app/api/member/[id]/route.js
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

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

    return NextResponse.json({ member });
  } catch (error) {
    console.error('GET /api/member/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
