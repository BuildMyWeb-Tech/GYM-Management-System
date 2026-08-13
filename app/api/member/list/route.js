// app/api/member/list/route.js
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_MEMBERS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const status = searchParams.get('status') || 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20', 10));

    const where = {
      branchId,
      ...(status !== 'ALL' ? { status } : {}),
      ...(q
        ? {
            OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }],
          }
        : {}),
    };

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          phone: true,
          photo: true,
          status: true,
          joinDate: true,
          deviceUserId: true,
          _count: { select: { memberships: true, attendances: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.member.count({ where }),
    ]);

    return NextResponse.json({
      members,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/member/list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
