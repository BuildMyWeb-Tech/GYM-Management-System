// app/api/whatsapp/broadcast/[id]/status/route.js
// GET – live progress for a broadcast campaign (poll every 2s from frontend).

import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.COLLECT_PAYMENT);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const { id } = await params;
    const campaign = await prisma.broadcastCampaign.findFirst({
      where: { id, branchId },
    });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    // Auto-complete detection
    let status = campaign.status;
    if (status === 'IN_PROGRESS') {
      const pending = await prisma.messageOutbox.count({
        where: { broadcastId: id, status: { in: ['PENDING', 'PROCESSING'] } },
      });
      if (pending === 0) {
        await prisma.broadcastCampaign.update({
          where: { id },
          data: { status: 'COMPLETED', updatedAt: new Date() },
        });
        status = 'COMPLETED';
      }
    }

    return NextResponse.json({
      id: campaign.id,
      status,
      message: campaign.message,
      mediaUrl: campaign.mediaUrl,
      mediaType: campaign.mediaType,
      totalCount: campaign.totalCount,
      sentCount: campaign.sentCount,
      failedCount: campaign.failedCount,
      pendingCount: campaign.pendingCount,
      deliveredCount: campaign.deliveredCount,
      recipients: campaign.recipients,
      createdAt: campaign.createdAt,
    });
  } catch (err) {
    console.error('GET /api/whatsapp/broadcast/[id]/status error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
