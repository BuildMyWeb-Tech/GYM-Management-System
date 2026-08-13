// app/api/employee/list/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import authBranchOwner from '@/middlewares/authBranchOwner';

export async function GET(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const branchId = await authBranchOwner(userId);
    if (!branchId)
      return NextResponse.json(
        { error: 'Only branch owners can view receptionists' },
        { status: 403 }
      );

    const employees = await prisma.employee.findMany({
      where: { branchId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('GET /api/employee/list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
