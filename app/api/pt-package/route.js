// app/api/pt-package/route.js
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const access = await resolveBranchAccess(request, null);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const packages = await prisma.pTPackage.findMany({
      where: { branchId: access.branchId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ packages });
  } catch (error) {
    console.error('GET /api/pt-package error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_MEMBERSHIPS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const { name, sessionCount, price, trainerName } = await request.json();
    if (!name || !sessionCount || !price) {
      return NextResponse.json(
        { error: 'Name, session count, and price are required' },
        { status: 400 }
      );
    }

    const pkg = await prisma.pTPackage.create({
      data: {
        branchId: access.branchId,
        name,
        sessionCount: Number(sessionCount),
        price: Number(price),
        trainerName: trainerName || null,
        isActive: true,
      },
    });

    return NextResponse.json({ message: 'PT package created', package: pkg }, { status: 201 });
  } catch (error) {
    console.error('POST /api/pt-package error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_MEMBERSHIPS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const { id, isActive } = await request.json();
    const existing = await prisma.pTPackage.findFirst({ where: { id, branchId: access.branchId } });
    if (!existing) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

    const pkg = await prisma.pTPackage.update({ where: { id }, data: { isActive: !!isActive } });
    return NextResponse.json({ message: 'Package updated', package: pkg });
  } catch (error) {
    console.error('PUT /api/pt-package error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_MEMBERSHIPS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const existing = await prisma.pTPackage.findFirst({ where: { id, branchId: access.branchId } });
    if (!existing) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

    await prisma.pTPackage.delete({ where: { id } });
    return NextResponse.json({ message: 'Package deleted' });
  } catch (error) {
    if (error.code === 'P2003')
      return NextResponse.json(
        { error: 'Cannot delete a package that has purchase history' },
        { status: 400 }
      );
    console.error('DELETE /api/pt-package error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
