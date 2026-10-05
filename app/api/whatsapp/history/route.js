// app/api/whatsapp/history/route.js
// GET – paginated broadcast history (no recipients array for performance).

import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.VIEW_REPORTS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));

    const [total, campaigns] = await Promise.all([
      prisma.broadcastCampaign.count({ where: { branchId } }),
      prisma.broadcastCampaign.findMany({
        where: { branchId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          message: true,
          mediaUrl: true,
          mediaType: true,
          status: true,
          totalCount: true,
          sentCount: true,
          failedCount: true,
          deliveredCount: true,
          pendingCount: true,
          sendIntervalMs: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      campaigns,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('GET /api/whatsapp/history error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
