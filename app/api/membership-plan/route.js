// app/api/membership-plan/route.js
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const access = await resolveBranchAccess(request, null);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL';

    const plans = await prisma.membershipPlan.findMany({
      where: { branchId: access.branchId, ...(status !== 'ALL' ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('GET /api/membership-plan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_MEMBERSHIPS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const { name, durationDays, price } = await request.json();

    if (!name || !durationDays || !price) {
      return NextResponse.json(
        { error: 'Name, duration, and price are required' },
        { status: 400 }
      );
    }

    const slug = name.toLowerCase().trim().replace(/\s+/g, '-');

    const plan = await prisma.membershipPlan.create({
      data: {
        branchId: access.branchId,
        name,
        slug,
        description: '',
        durationDays: Number(durationDays),
        price: Number(price),
        features: [],
        createdBy: access.isOwner ? 'owner' : access.employee.employeeId,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ message: 'Plan created', plan }, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002')
      return NextResponse.json({ error: 'A plan with this name already exists' }, { status: 400 });
    console.error('POST /api/membership-plan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
