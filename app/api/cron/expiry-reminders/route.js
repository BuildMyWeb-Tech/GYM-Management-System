// app/api/cron/expiry-reminders/route.js
// Vercel Cron: runs daily at 03:30 UTC (09:00 IST).
// Each branch's messages route through its own WhatsApp (Baileys if connected, Cloud API fallback).

import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';
import { sendWhatsAppMessage, buildExpiryReminderMessage } from '@/lib/whatsappServer';

const REMINDER_DAYS = [3];

function startOfDayIST(date) {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 5.5 * 60 * 60 * 1000);
}

/**
 * Process expiry reminders for a single branch.
 * Routes through the branch's own Baileys connection if active; falls back to Cloud API.
 */
async function processForBranch(branchId, branchName, daysAhead, windowStart, windowEnd, todayStart, results) {
  // Check this branch's Baileys connection state
  const waAccount = await prisma.whatsAppAccount.findUnique({
    where: { branchId },
    select: { connectionState: true },
  });
  const baileysConnected = waAccount?.connectionState === 'CONNECTED';

  const expiringMemberships = await prisma.membership.findMany({
    where: {
      branchId,
      status: 'ACTIVE',
      expiryDate: { gte: windowStart, lt: windowEnd },
    },
    include: {
      member: { select: { id: true, fullName: true, phone: true } },
      plan: { select: { name: true } },
    },
  });

  results.checked += expiringMemberships.length;

  for (const membership of expiringMemberships) {
    const { member } = membership;

    // Duplicate guard: skip if we already queued or sent this reminder today
    const alreadyLogged = await prisma.notificationLog.count({
      where: {
        memberId: member.id,
        branchId,
        type: 'EXPIRY_REMINDER',
        createdAt: { gte: todayStart },
        metadata: { path: ['daysUntilExpiry'], equals: daysAhead },
      },
    });
    if (alreadyLogged > 0) { results.skipped++; continue; }

    const message = buildExpiryReminderMessage(
      member.fullName,
      membership.plan.name,
      membership.expiryDate,
      daysAhead,
      branchName,
    );

    let logStatus = 'PENDING';
    let messageRef = null;
    let errorMessage = null;
    let method = 'queued';

    if (baileysConnected) {
      // Route through this gym's WhatsApp — queue to MessageOutbox; worker sends it.
      await prisma.messageOutbox.create({
        data: {
          branchId,
          recipient: member.phone,
          messageType: 'TEXT',
          payload: { text: message },
          status: 'PENDING',
          scheduledAt: new Date(),
        },
      });
      logStatus = 'PENDING';
      method = 'baileys';
      results.sent++;
    } else {
      // No Baileys connection — fall back to shared Cloud API
      const sendResult = await sendWhatsAppMessage(member.phone, message);
      logStatus = sendResult.success ? 'SENT' : 'PENDING';
      messageRef = sendResult.messageId || null;
      errorMessage = sendResult.error || null;
      method = sendResult.success ? 'api' : 'api_error';
      if (sendResult.success) results.sent++;
      else results.failed++;
    }

    await prisma.notificationLog.create({
      data: {
        memberId: member.id,
        branchId,
        channel: 'WHATSAPP',
        type: 'EXPIRY_REMINDER',
        status: logStatus,
        messageRef,
        errorMessage,
        sentAt: logStatus === 'SENT' ? new Date() : null,
        metadata: { daysUntilExpiry: daysAhead, membershipId: membership.id, method },
      },
    });
  }
}

export async function GET(request) {
  const auth = request.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET;

  let manualBranchId = null;

  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    // Authenticated cron call — process all active branches
  } else {
    // Fall back to branch auth for the manual "Run Auto-Check" button
    const access = await resolveBranchAccess(request, PERMISSIONS.VIEW_REPORTS);
    if (access.error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    manualBranchId = access.branchId;
  }

  const results = { checked: 0, sent: 0, skipped: 0, failed: 0, branches: 0 };

  try {
    const now = new Date();
    const todayStart = startOfDayIST(now);

    // Load branches to process (all active, or just the one from manual auth)
    const branches = manualBranchId
      ? await prisma.branch.findMany({ where: { id: manualBranchId, isActive: true }, select: { id: true, name: true } })
      : await prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true } });

    results.branches = branches.length;

    for (const branch of branches) {
      for (const daysAhead of REMINDER_DAYS) {
        const windowStart = new Date(todayStart);
        windowStart.setDate(windowStart.getDate() + daysAhead);
        const windowEnd = new Date(windowStart);
        windowEnd.setDate(windowEnd.getDate() + 1);

        await processForBranch(
          branch.id, branch.name, daysAhead,
          windowStart, windowEnd, todayStart,
          results,
        );
      }
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (error) {
    console.error('Cron expiry-reminders error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
