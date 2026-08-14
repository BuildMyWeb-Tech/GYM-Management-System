// app/api/orders/[id]/route.js
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.COLLECT_PAYMENT);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: { id, branchId: access.branchId },
      include: {
        member: { select: { id: true, fullName: true, phone: true, photo: true } },
        orderItems: true,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ order });
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
