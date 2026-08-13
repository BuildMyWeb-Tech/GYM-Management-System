// app/api/admin/toggle-store/route.js
import prisma from '@/lib/prisma';
import authAdmin from '@/middlewares/authAdmin';
import { getAdminUserId } from '@/lib/getAdminUserId';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const userId = await getAdminUserId(request);
    const isAdminUser = await authAdmin(userId);
    if (!isAdminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { branchId } = await request.json();
    if (!branchId) return NextResponse.json({ error: 'branchId is required' }, { status: 400 });

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

    if (branch.status === 'PENDING' || branch.status === 'REJECTED') {
      return NextResponse.json(
        { error: 'Cannot toggle a branch that has not been approved yet' },
        { status: 400 }
      );
    }

    const newStatus = branch.isActive ? 'INACTIVE' : 'ACTIVE';
    const newActive = !branch.isActive;

    await prisma.branch.update({
      where: { id: branchId },
      data: { status: newStatus, isActive: newActive },
    });

    return NextResponse.json({
      message: `Branch ${newActive ? 'activated' : 'deactivated'} successfully`,
      isActive: newActive,
    });
  } catch (error) {
    console.error('POST /api/admin/toggle-store error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
