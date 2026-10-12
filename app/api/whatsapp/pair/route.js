// app/api/whatsapp/pair/route.js
// POST { phone } — enable pairing-code mode; worker will call requestPairingCode()
// DELETE — cancel pairing mode

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_BRANCH_SETTINGS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const { phone } = await request.json();
    if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });

    // Normalize: strip non-digits, ensure country code
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.length === 10 ? `91${digits}` : digits;
    if (normalized.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    await prisma.whatsAppAccount.upsert({
      where: { branchId },
      create: {
        branchId,
        pairingPhone: normalized,
        pairingMode: true,
        pairingCode: null,
        // Also trigger a connect so the worker picks it up
        connectRequestedAt: new Date(),
      },
      update: {
        pairingPhone: normalized,
        pairingMode: true,
        pairingCode: null,
        connectRequestedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ message: 'Pairing code requested — check back in a few seconds' });
  } catch (err) {
    console.error('POST /api/whatsapp/pair error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_BRANCH_SETTINGS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    await prisma.whatsAppAccount.updateMany({
      where: { branchId },
      data: { pairingPhone: null, pairingCode: null, pairingMode: false, updatedAt: new Date() },
    });

    return NextResponse.json({ message: 'Pairing mode cancelled' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
