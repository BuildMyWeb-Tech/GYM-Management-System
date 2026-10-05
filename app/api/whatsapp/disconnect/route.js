// app/api/whatsapp/disconnect/route.js
// POST – tells the worker to disconnect (sets disconnectRequestedAt flag).

import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_BRANCH_SETTINGS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const account = await prisma.whatsAppAccount.findUnique({ where: { branchId } });
    if (!account) {
      return NextResponse.json({ error: 'WhatsApp not set up for this branch' }, { status: 404 });
    }

    await prisma.whatsAppAccount.update({
      where: { branchId },
      data: {
        disconnectRequestedAt: new Date(),
        connectRequestedAt: null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: 'Disconnect request sent to worker' });
  } catch (err) {
    console.error('POST /api/whatsapp/disconnect error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
