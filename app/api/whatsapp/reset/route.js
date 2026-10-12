// app/api/whatsapp/reset/route.js
// POST — clear stored WhatsApp session + reset account state so the next
// Connect generates a brand-new QR from scratch.

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_BRANCH_SETTINGS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    // Delete the encrypted session so Baileys starts fresh next connect
    await prisma.whatsAppSession.deleteMany({ where: { branchId } });

    // Reset account state
    await prisma.whatsAppAccount.upsert({
      where: { branchId },
      create: { branchId, connectionState: 'DISCONNECTED', status: 'disconnected' },
      update: {
        connectionState: 'DISCONNECTED',
        status: 'disconnected',
        qrDataUri: null,
        lastError: null,
        pairingCode: null,
        pairingPhone: null,
        pairingMode: false,
        workerInstanceId: null,
        connectRequestedAt: null,
        disconnectRequestedAt: null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ message: 'Session cleared — click Connect to generate a fresh QR' });
  } catch (err) {
    console.error('POST /api/whatsapp/reset error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
