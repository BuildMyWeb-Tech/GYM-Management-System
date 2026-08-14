// app/api/biometric-device/route.js
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_BRANCH_SETTINGS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const devices = await prisma.biometricDevice.findMany({
      where: { branchId: access.branchId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ devices });
  } catch (error) {
    console.error('GET /api/biometric-device error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_BRANCH_SETTINGS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const { deviceSerial, name, location } = await request.json();
    if (!deviceSerial || !name) {
      return NextResponse.json({ error: 'Device serial and name are required' }, { status: 400 });
    }

    const device = await prisma.biometricDevice.create({
      data: { branchId: access.branchId, deviceSerial, name, location: location || null },
    });

    return NextResponse.json({ message: 'Device registered', device }, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002')
      return NextResponse.json(
        { error: 'A device with this serial is already registered' },
        { status: 400 }
      );
    console.error('POST /api/biometric-device error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_BRANCH_SETTINGS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const { id, isActive, name, location } = await request.json();
    const existing = await prisma.biometricDevice.findFirst({
      where: { id, branchId: access.branchId },
    });
    if (!existing) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    const updateData = {};
    if (isActive !== undefined) updateData.isActive = !!isActive;
    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;

    const device = await prisma.biometricDevice.update({ where: { id }, data: updateData });
    return NextResponse.json({ message: 'Device updated', device });
  } catch (error) {
    console.error('PUT /api/biometric-device error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_BRANCH_SETTINGS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const existing = await prisma.biometricDevice.findFirst({
      where: { id, branchId: access.branchId },
    });
    if (!existing) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    await prisma.biometricDevice.delete({ where: { id } });
    return NextResponse.json({ message: 'Device removed' });
  } catch (error) {
    console.error('DELETE /api/biometric-device error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
