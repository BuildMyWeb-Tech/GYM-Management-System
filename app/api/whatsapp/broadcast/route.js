// app/api/whatsapp/broadcast/route.js
// POST – send a bulk WhatsApp message to selected members.
// Processes members sequentially; returns per-member results.

import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { sendWhatsAppMessage, buildFallbackUrl } from '@/lib/whatsappServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.COLLECT_PAYMENT);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const { memberIds, message } = await request.json();

    if (!Array.isArray(memberIds) || memberIds.length === 0)
      return NextResponse.json({ error: 'memberIds array is required' }, { status: 400 });
    if (!message || !message.trim())
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    if (memberIds.length > 200)
      return NextResponse.json({ error: 'Maximum 200 members per broadcast' }, { status: 400 });

    // Verify all members belong to this branch
    const members = await prisma.member.findMany({
      where: { id: { in: memberIds }, branchId },
      select: { id: true, fullName: true, phone: true },
    });

    const results = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const member of members) {
      const sendResult = await sendWhatsAppMessage(member.phone, message);

      const logStatus = sendResult.success ? 'SENT' : 'PENDING';

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
          metadata: { broadcastMessage: message.slice(0, 200) },
        },
      });

      if (sendResult.success) {
        sentCount++;
        results.push({ memberId: member.id, fullName: member.fullName, status: 'sent' });
      } else if (sendResult.method === 'not_configured') {
        const fallbackUrl = buildFallbackUrl(member.phone, message);
        results.push({ memberId: member.id, fullName: member.fullName, status: 'link', fallbackUrl });
      } else {
        failedCount++;
        results.push({ memberId: member.id, fullName: member.fullName, status: 'failed', error: sendResult.error });
      }
    }

    return NextResponse.json({
      total: members.length,
      sent: sentCount,
      failed: failedCount,
      apiConfigured: !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
      results,
    });
  } catch (error) {
    console.error('POST /api/whatsapp/broadcast error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
