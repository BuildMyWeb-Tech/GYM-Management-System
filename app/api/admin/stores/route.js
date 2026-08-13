// app/api/admin/stores/route.js
import prisma from '@/lib/prisma';
import authAdmin from '@/middlewares/authAdmin';
import { getAdminUserId } from '@/lib/getAdminUserId';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const userId = await getAdminUserId(request);
    const isAdminUser = await authAdmin(userId);
    if (!isAdminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const whereClause = statusFilter && statusFilter !== 'ALL' ? { status: statusFilter } : {};

    const branches = await prisma.branch.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        commission: { select: { percentage: true } },
        _count: { select: { membershipPlans: true, orders: true, employees: true, members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ branches });
  } catch (error) {
    console.error('GET /api/admin/stores error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(request) {
  try {
    const userId = await getAdminUserId(request);
    const isAdminUser = await authAdmin(userId);
    if (!isAdminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { branchId, commissionPercentage } = await request.json();
    if (!branchId) return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    if (commissionPercentage === undefined || isNaN(Number(commissionPercentage))) {
      return NextResponse.json(
        { error: 'Valid commissionPercentage is required' },
        { status: 400 }
      );
    }
    if (Number(commissionPercentage) < 0 || Number(commissionPercentage) > 100) {
      return NextResponse.json({ error: 'Commission must be between 0 and 100' }, { status: 400 });
    }

    const commission = await prisma.commission.upsert({
      where: { branchId },
      update: { percentage: Number(commissionPercentage) },
      create: { branchId, percentage: Number(commissionPercentage) },
    });

    return NextResponse.json({ message: 'Commission updated successfully', commission });
  } catch (error) {
    console.error('PATCH /api/admin/stores error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
