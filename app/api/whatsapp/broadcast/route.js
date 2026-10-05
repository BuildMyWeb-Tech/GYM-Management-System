// app/api/whatsapp/broadcast/route.js
// POST – create a broadcast campaign.
// Priority: Baileys (QR connected) → Cloud API → wa.me fallback links.

import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { sendWhatsAppMessage, buildFallbackUrl } from '@/lib/whatsappServer';
import { NextResponse } from 'next/server';

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.COLLECT_PAYMENT);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const {
      memberIds, message, mediaUrl, mediaType, mimeType,
      sendIntervalMs = 1500,
    } = await request.json();

    if (!Array.isArray(memberIds) || memberIds.length === 0)
      return NextResponse.json({ error: 'memberIds array is required' }, { status: 400 });
    if (!message && !mediaUrl)
      return NextResponse.json({ error: 'message or mediaUrl is required' }, { status: 400 });
    if (memberIds.length > 200)
      return NextResponse.json({ error: 'Maximum 200 members per broadcast' }, { status: 400 });

    const members = await prisma.member.findMany({
      where: { id: { in: memberIds }, branchId },
      select: { id: true, fullName: true, phone: true },
    });

    // Check if Baileys worker is connected
    const waAccount = await prisma.whatsAppAccount.findUnique({
      where: { branchId },
      select: { connectionState: true },
    });
    const baileysConnected = waAccount?.connectionState === 'CONNECTED';

    if (baileysConnected) {
      // ── Baileys path: queue to MessageOutbox ──────────────────────────────
      const recipients = members.map((m, i) => ({
        memberId: m.id,
        name: m.fullName,
        phone: m.phone,
        status: 'queued',
        index: i,
      }));

      const campaign = await prisma.broadcastCampaign.create({
        data: {
          branchId,
          message: message || null,
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          status: 'IN_PROGRESS',
          totalCount: members.length,
          pendingCount: members.length,
          sendIntervalMs: Math.max(700, Math.min(5000, sendIntervalMs)),
          recipients,
        },
      });

      // Build outbox jobs with staggered scheduledAt
      const baseTime = Date.now();
      const intervalMs = campaign.sendIntervalMs;
      const jobs = members.map((m, i) => ({
        branchId,
        recipient: m.phone,
        messageType: mediaType ? mediaType.toUpperCase() : 'TEXT',
        payload: mediaUrl
          ? { url: mediaUrl, caption: message || '', mimetype: mimeType || 'application/octet-stream' }
          : { text: message },
        status: 'PENDING',
        scheduledAt: new Date(baseTime + i * intervalMs),
        broadcastId: campaign.id,
        broadcastRecipientIndex: i,
      }));

      await prisma.messageOutbox.createMany({ data: jobs });

      return NextResponse.json({
        method: 'baileys',
        broadcastId: campaign.id,
        total: members.length,
        message: 'Broadcast queued — sending in background',
      });
    }

    // ── Cloud API path ────────────────────────────────────────────────────────
    const apiConfigured = !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
    if (apiConfigured) {
      const results = [];
      let sentCount = 0;
      let failedCount = 0;

      for (const member of members) {
        const sendResult = await sendWhatsAppMessage(member.phone, message);
        const logStatus = sendResult.success ? 'SENT' : 'FAILED';

        await prisma.notificationLog.create({
          data: {
            memberId: member.id,
            branchId,
            channel: 'WHATSAPP',
            type: 'ANNOUNCEMENT',
            status: logStatus,
            messageRef: sendResult.messageId || null,
            errorMessage: sendResult.error || null,
            sentAt: sendResult.success ? new Date() : null,
            metadata: { broadcastMessage: (message || '').slice(0, 200) },
          },
        });

        if (sendResult.success) {
          sentCount++;
          results.push({ memberId: member.id, fullName: member.fullName, status: 'sent' });
        } else {
          failedCount++;
          results.push({ memberId: member.id, fullName: member.fullName, status: 'failed', error: sendResult.error });
        }
      }

      return NextResponse.json({ method: 'api', total: members.length, sent: sentCount, failed: failedCount, results });
    }

    // ── Fallback: wa.me links ─────────────────────────────────────────────────
    const results = members.map(m => ({
      memberId: m.id,
      fullName: m.fullName,
      status: 'link',
      fallbackUrl: buildFallbackUrl(m.phone, message || ''),
    }));

    return NextResponse.json({ method: 'links', total: members.length, sent: 0, failed: 0, results });
  } catch (err) {
    console.error('POST /api/whatsapp/broadcast error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
