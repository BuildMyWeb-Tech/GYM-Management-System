// lib/sendBranchWhatsApp.js
// Routes a WhatsApp text message through the branch's own Baileys connection
// (via MessageOutbox → Render worker) when the worker is alive; falls back to
// the shared Cloud API when Baileys is unavailable.

import prisma from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/whatsappServer';

const WORKER_ALIVE_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Checks whether a branch's Baileys worker is connected and recently heartbeated.
 * Pass the raw WhatsAppAccount row (select connectionState + lastHeartbeatAt).
 */
export function isBranchWAReady(account) {
  if (!account) return false;
  const alive = account.lastHeartbeatAt
    ? Date.now() - new Date(account.lastHeartbeatAt).getTime() < WORKER_ALIVE_MS
    : false;
  return account.connectionState === 'CONNECTED' && alive;
}

/**
 * Sends a plain-text WhatsApp message on behalf of a branch.
 * Returns { success, method, messageId?, error? }
 * method: 'baileys' | 'api' | 'api_error' | 'not_configured'
 */
export async function sendBranchWhatsApp(branchId, toPhone, messageText) {
  const account = await prisma.whatsAppAccount.findUnique({
    where: { branchId },
    select: { connectionState: true, lastHeartbeatAt: true },
  });

  if (isBranchWAReady(account)) {
    await prisma.messageOutbox.create({
      data: {
        branchId,
        recipient: toPhone,
        messageType: 'TEXT',
        payload: { text: messageText },
        status: 'PENDING',
        scheduledAt: new Date(),
      },
    });
    return { success: true, method: 'baileys' };
  }

  return sendWhatsAppMessage(toPhone, messageText);
}
