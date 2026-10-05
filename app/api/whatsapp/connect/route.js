// app/api/whatsapp/connect/route.js
// POST – tells the worker to connect (sets connectRequestedAt flag).
// Also enables whatsappEnabled on the branch if not already.

import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_BRANCH_SETTINGS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    // Enable WhatsApp on the branch
    await prisma.branch.update({
      where: { id: branchId },
      data: { whatsappEnabled: true },
    });

    // Upsert account + set connect command
    await prisma.whatsAppAccount.upsert({
      where: { branchId },
      create: {
        branchId,
        connectionState: 'DISCONNECTED',
        connectRequestedAt: new Date(),
      },
      update: {
        connectRequestedAt: new Date(),
        disconnectRequestedAt: null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: 'Connect request sent to worker' });
  } catch (err) {
    console.error('POST /api/whatsapp/connect error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
