// app/api/admin/approve-store/route.js
import prisma from '@/lib/prisma';
import authAdmin from '@/middlewares/authAdmin';
import { getAdminUserId } from '@/lib/getAdminUserId';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const userId = await getAdminUserId(request);
    const isAdminUser = await authAdmin(userId);
    if (!isAdminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { branchId, action } = await request.json();
    if (!branchId || !action)
      return NextResponse.json({ error: 'branchId and action are required' }, { status: 400 });
    if (!['APPROVE', 'REJECT'].includes(action))
      return NextResponse.json({ error: 'action must be APPROVE or REJECT' }, { status: 400 });

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

    if (action === 'APPROVE') {
      await prisma.$transaction(async (tx) => {
        await tx.branch.update({
          where: { id: branchId },
          data: { status: 'ACTIVE', isActive: true },
        });
        await tx.commission.upsert({
          where: { branchId },
          update: {},
          create: { branchId, percentage: 0 },
        });
      });
      return NextResponse.json({ message: 'Branch approved and activated successfully' });
    }

    await prisma.branch.update({
      where: { id: branchId },
      data: { status: 'REJECTED', isActive: false },
    });
    return NextResponse.json({ message: 'Branch rejected successfully' });
  } catch (error) {
    console.error('POST /api/admin/approve-store error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(request) {
  try {
    const userId = await getAdminUserId(request);
    const isAdminUser = await authAdmin(userId);
    if (!isAdminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const branches = await prisma.branch.findMany({
      where: { status: { in: ['PENDING', 'REJECTED'] } },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ branches });
  } catch (error) {
    console.error('GET /api/admin/approve-store error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
