// app/api/whatsapp/status/route.js
// GET – returns the WhatsApp connection state for the caller's branch.

import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

const WORKER_ALIVE_MS = 2 * 60 * 1000; // 2 minutes

export async function GET(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_BRANCH_SETTINGS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const account = await prisma.whatsAppAccount.findUnique({ where: { branchId } });

    if (!account) {
      return NextResponse.json({
        connected: false,
        connectionState: 'DISCONNECTED',
        status: 'disconnected',
        isWorkerAlive: false,
      });
    }

    const isWorkerAlive = account.lastHeartbeatAt
      ? (Date.now() - new Date(account.lastHeartbeatAt).getTime()) < WORKER_ALIVE_MS
      : false;

    return NextResponse.json({
      connected: account.connectionState === 'CONNECTED',
      connectionState: account.connectionState,
      status: account.status,
      // Only return QR when it's needed
      qrDataUri: account.connectionState === 'QR_REQUIRED' ? account.qrDataUri : null,
      qrGeneratedAt: account.qrGeneratedAt,
      lastConnectedAt: account.lastConnectedAt,
      lastHeartbeatAt: account.lastHeartbeatAt,
      lastError: account.lastError,
      isWorkerAlive,
      reconnectAttempts: account.reconnectAttempts,
    });
  } catch (err) {
    console.error('GET /api/whatsapp/status error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
