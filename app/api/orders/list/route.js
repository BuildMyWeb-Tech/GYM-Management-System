// app/api/orders/list/route.js
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.COLLECT_PAYMENT);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20', 10));

    const where = { branchId: access.branchId, ...(status !== 'ALL' ? { status } : {}) };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          member: { select: { id: true, fullName: true, phone: true, photo: true } },
          orderItems: { select: { name: true, itemType: true, quantity: true, price: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/orders/list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
