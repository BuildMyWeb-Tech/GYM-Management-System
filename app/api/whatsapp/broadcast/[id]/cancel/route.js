// app/api/whatsapp/broadcast/[id]/cancel/route.js
// POST – cancel an in-progress broadcast.

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
    const campaign = await prisma.broadcastCampaign.findFirst({ where: { id, branchId } });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    await prisma.$transaction([
      prisma.messageOutbox.updateMany({
        where: { broadcastId: id, branchId, status: { in: ['PENDING', 'PROCESSING'] } },
        data: { status: 'CANCELLED', updatedAt: new Date() },
      }),
      prisma.broadcastCampaign.update({
        where: { id },
        data: { status: 'CANCELLED', updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/whatsapp/broadcast/[id]/cancel error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
