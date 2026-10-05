// app/api/whatsapp/broadcast/[id]/pause/route.js
// POST – pause or resume an in-progress broadcast.
// Body: { action: 'pause' | 'resume' }

import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.COLLECT_PAYMENT);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const { id } = await params;
    const { action } = await request.json();
    if (!['pause', 'resume'].includes(action))
      return NextResponse.json({ error: 'action must be pause or resume' }, { status: 400 });

    const campaign = await prisma.broadcastCampaign.findFirst({ where: { id, branchId } });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    if (action === 'pause') {
      // Mark pending outbox jobs as cancelled so the worker skips them
      await prisma.messageOutbox.updateMany({
        where: { broadcastId: id, branchId, status: { in: ['PENDING'] } },
        data: { status: 'CANCELLED', updatedAt: new Date() },
      });
      await prisma.broadcastCampaign.update({
        where: { id },
        data: { status: 'PAUSED', updatedAt: new Date() },
      });
    } else {
      // Resume: re-queue unsent recipients
      const recipients = Array.isArray(campaign.recipients) ? campaign.recipients : [];
      const pending = recipients.filter(r => r.status === 'queued');
      if (pending.length > 0) {
        const baseTime = Date.now();
        await prisma.messageOutbox.createMany({
          data: pending.map((r, i) => ({
            branchId,
            recipient: r.phone,
            messageType: campaign.mediaType ? campaign.mediaType.toUpperCase() : 'TEXT',
            payload: campaign.mediaUrl
              ? { url: campaign.mediaUrl, caption: campaign.message || '', mimeType: campaign.mediaType || 'image/jpeg' }
              : { text: campaign.message },
            status: 'PENDING',
            scheduledAt: new Date(baseTime + i * campaign.sendIntervalMs),
            broadcastId: id,
            broadcastRecipientIndex: r.index ?? 0,
          })),
        });
      }
      await prisma.broadcastCampaign.update({
        where: { id },
        data: { status: 'IN_PROGRESS', updatedAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/whatsapp/broadcast/[id]/pause error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
