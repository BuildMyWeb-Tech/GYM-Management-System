// app/api/cron/expiry-reminders/route.js
// Vercel Cron: runs daily at 09:00 IST (03:30 UTC).
// Identifies memberships expiring in 1, 3, and 7 days and sends WhatsApp reminders.
// Protected by CRON_SECRET env var (Vercel sets Authorization: Bearer <secret>).

import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';
import {
  sendWhatsAppMessage,
  buildExpiryReminderMessage,
} from '@/lib/whatsappServer';

const REMINDER_DAYS = [1, 3, 7];

function startOfDayIST(date) {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 5.5 * 60 * 60 * 1000);
}

export async function GET(request) {
  const auth = request.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    // Fall back to branch auth for the manual "Run Auto-Check" button
    const access = await resolveBranchAccess(request, PERMISSIONS.VIEW_REPORTS);
    if (access.error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = { checked: 0, sent: 0, skipped: 0, failed: 0, errors: [] };

  try {
    const now = new Date();
    const todayStart = startOfDayIST(now);

    for (const daysAhead of REMINDER_DAYS) {
      const windowStart = new Date(todayStart);
      windowStart.setDate(windowStart.getDate() + daysAhead);
      const windowEnd = new Date(windowStart);
      windowEnd.setDate(windowEnd.getDate() + 1);

      const expiringMemberships = await prisma.membership.findMany({
        where: {
          status: 'ACTIVE',
          expiryDate: { gte: windowStart, lt: windowEnd },
        },
        include: {
          member: { select: { id: true, fullName: true, phone: true, branchId: true } },
          plan: { select: { name: true } },
        },
      });

      results.checked += expiringMemberships.length;

      for (const membership of expiringMemberships) {
        const { member } = membership;

        // Duplicate guard: skip if we already sent this exact day-window reminder today
        const alreadySent = await prisma.notificationLog.count({
          where: {
            memberId: member.id,
            branchId: member.branchId,
            type: 'EXPIRY_REMINDER',
            createdAt: { gte: todayStart },
            metadata: { path: ['daysUntilExpiry'], equals: daysAhead },
          },
        });
        if (alreadySent > 0) { results.skipped++; continue; }

        const branch = await prisma.branch.findUnique({
          where: { id: member.branchId },
          select: { name: true },
        });

        const message = buildExpiryReminderMessage(
          member.fullName,
          membership.plan.name,
          membership.expiryDate,
          daysAhead,
          branch?.name
        );

        const sendResult = await sendWhatsAppMessage(member.phone, message);

        await prisma.notificationLog.create({
          data: {
            memberId: member.id,
            branchId: member.branchId,
            channel: 'WHATSAPP',
            type: 'EXPIRY_REMINDER',
            status: sendResult.success ? 'SENT' : 'PENDING',
            messageRef: sendResult.messageId || null,
            errorMessage: sendResult.error || null,
            sentAt: sendResult.success ? new Date() : null,
            metadata: { daysUntilExpiry: daysAhead, membershipId: membership.id },
          },
        });

        if (sendResult.success) results.sent++;
        else results.failed++;
      }
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (error) {
    console.error('Cron expiry-reminders error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
