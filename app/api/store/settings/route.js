// app/api/store/settings/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import authAdmin from '@/middlewares/authAdmin';
import { getAuth } from '@clerk/nextjs/server';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';

const SETTINGS_SELECT = {
  id: true,
  name: true,
  description: true,
  username: true,
  address: true,
  phone: true,
  email: true,
  contact: true,
  operatingHours: true,
  gstNumber: true,
  logo: true,
  status: true,
  isActive: true,
  commission: { select: { percentage: true } },
};

// GET /api/store/settings — Fetch branch settings
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryBranchId = searchParams.get('branchId');

    // Admin fetching any branch's settings
    if (queryBranchId) {
      const { userId } = getAuth(request);
      if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      const isAdminUser = await authAdmin(userId);
      if (!isAdminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const branch = await prisma.branch.findUnique({
        where: { id: queryBranchId },
        select: SETTINGS_SELECT,
      });
      if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
      return NextResponse.json({ settings: branch });
    }

    // Owner or receptionist fetching their own branch's settings
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_BRANCH_SETTINGS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const branch = await prisma.branch.findUnique({
      where: { id: access.branchId },
      select: SETTINGS_SELECT,
    });
    if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

    return NextResponse.json({ settings: branch });
  } catch (error) {
    console.error('GET /api/store/settings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/store/settings — Update branch settings
export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_BRANCH_SETTINGS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await request.json();
    const { name, description, address, phone, email, contact, operatingHours, gstNumber } = body;

    if (!name || !email || !phone || !contact) {
      return NextResponse.json(
        { error: 'Name, email, phone and contact are required' },
        { status: 400 }
      );
    }

    const updated = await prisma.branch.update({
      where: { id: access.branchId },
      data: {
        name,
        description: description || '',
        address: address || '',
        phone,
        email,
        contact,
        operatingHours: operatingHours || null,
        gstNumber: gstNumber || null,
      },
      select: SETTINGS_SELECT,
    });

    return NextResponse.json({ message: 'Settings updated successfully', settings: updated });
  } catch (error) {
    console.error('POST /api/store/settings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const PUT = POST;
