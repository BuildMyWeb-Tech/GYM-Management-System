// app/api/plan-category/route.js
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const access = await resolveBranchAccess(request, null);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const categories = await prisma.planCategory.findMany({
      where: { OR: [{ branchId: access.branchId }, { isGlobal: true }] },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('GET /api/plan-category error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_MEMBERSHIPS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const { name, description } = await request.json();
    if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });

    const category = await prisma.planCategory.create({
      data: { name, description: description || '', branchId: access.branchId },
    });

    return NextResponse.json({ message: 'Category created', category }, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002')
      return NextResponse.json({ error: 'Category name already exists' }, { status: 400 });
    console.error('POST /api/plan-category error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_MEMBERSHIPS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });

    const existing = await prisma.planCategory.findFirst({
      where: { id, branchId: access.branchId },
    });
    if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    await prisma.planCategory.delete({ where: { id } });
    return NextResponse.json({ message: 'Category deleted' });
  } catch (error) {
    if (error.code === 'P2003')
      return NextResponse.json(
        { error: 'Cannot delete a category with plans in it' },
        { status: 400 }
      );
    console.error('DELETE /api/plan-category error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
