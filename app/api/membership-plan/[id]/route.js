// app/api/membership-plan/[id]/route.js
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_MEMBERSHIPS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { id } = await params;

    const existing = await prisma.membershipPlan.findFirst({
      where: { id, branchId: access.branchId },
    });
    if (!existing) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    const body = await request.json();
    const updateData = {};
    if (body.name !== undefined) {
      updateData.name = body.name;
      updateData.slug = body.name.toLowerCase().trim().replace(/\s+/g, '-');
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
    if (body.durationDays !== undefined) updateData.durationDays = Number(body.durationDays);
    if (body.price !== undefined) updateData.price = Number(body.price);
    if (body.features !== undefined)
      updateData.features = Array.isArray(body.features) ? body.features.filter(Boolean) : [];
    if (body.status !== undefined) updateData.status = body.status;

    const plan = await prisma.membershipPlan.update({ where: { id }, data: updateData });
    return NextResponse.json({ message: 'Plan updated', plan });
  } catch (error) {
    console.error('PUT /api/membership-plan/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_MEMBERSHIPS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { id } = await params;

    const existing = await prisma.membershipPlan.findFirst({
      where: { id, branchId: access.branchId },
    });
    if (!existing) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    await prisma.membershipPlan.delete({ where: { id } });
    return NextResponse.json({ message: 'Plan deleted' });
  } catch (error) {
    if (error.code === 'P2003')
      return NextResponse.json(
        { error: 'Cannot delete a plan that has purchase history — set it to Inactive instead' },
        { status: 400 }
      );
    console.error('DELETE /api/membership-plan/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
