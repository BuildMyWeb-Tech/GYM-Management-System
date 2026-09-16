// app/api/notifications/pending-renewals/route.js
// GET  – list members whose most recent membership has expired (payment due)
// POST – send a WhatsApp payment-due reminder to a specific member

import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import {
  sendWhatsAppMessage,
  buildFallbackUrl,
  buildPaymentReminderMessage,
} from '@/lib/whatsappServer';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.VIEW_REPORTS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));

    const now = new Date();

    // Members with at least one past membership but none currently active
    const activeMemberIds = (
      await prisma.membership.findMany({
        where: { branchId, status: 'ACTIVE', expiryDate: { gte: now } },
        select: { memberId: true },
      })
    ).map((m) => m.memberId);

    const where = {
      branchId,
      id: { notIn: activeMemberIds },
      memberships: { some: {} },
      ...(q ? { OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] } : {}),
    };

    const [total, members] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        include: {
          memberships: {
            orderBy: { expiryDate: 'desc' },
            take: 1,
            include: { plan: { select: { name: true } } },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Fetch last payment-due notification for each member
    const memberIds = members.map((m) => m.id);
    const logs = memberIds.length
      ? await prisma.notificationLog.findMany({
          where: { branchId, memberId: { in: memberIds }, type: 'PAYMENT_DUE' },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const logByMember = {};
    for (const log of logs) {
      if (!logByMember[log.memberId]) logByMember[log.memberId] = log;
    }

    const enriched = members.map((m) => {
      const lastMs = m.memberships[0];
      const expiryDate = lastMs?.expiryDate;
      const daysSinceExpiry = expiryDate
        ? Math.max(0, Math.floor((now - new Date(expiryDate)) / 86400000))
        : null;
      const lastLog = logByMember[m.id];
      return {
        id: m.id,
        fullName: m.fullName,
        phone: m.phone,
        status: m.status,
        lastPlanName: lastMs?.plan?.name || null,
        expiryDate: expiryDate || null,
        daysSinceExpiry,
        lastNotification: lastLog
          ? { status: lastLog.status, sentAt: lastLog.sentAt || lastLog.createdAt }
          : null,
      };
    });

    return NextResponse.json({
      members: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/notifications/pending-renewals error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.COLLECT_PAYMENT);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const { memberId } = await request.json();
    if (!memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 });

    const [member, branch] = await Promise.all([
      prisma.member.findFirst({
        where: { id: memberId, branchId },
        include: {
          memberships: {
            orderBy: { expiryDate: 'desc' },
            take: 1,
            include: { plan: { select: { name: true } } },
          },
        },
      }),
      prisma.branch.findUnique({ where: { id: branchId }, select: { name: true } }),
    ]);

    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const lastMs = member.memberships[0];
    const daysSince = lastMs?.expiryDate
      ? Math.max(0, Math.floor((new Date() - new Date(lastMs.expiryDate)) / 86400000))
      : 0;

    const message = buildPaymentReminderMessage(
      member.fullName,
      lastMs?.plan?.name || 'your plan',
      lastMs?.expiryDate,
      daysSince,
      branch?.name
    );

    const result = await sendWhatsAppMessage(member.phone, message);

    await prisma.notificationLog.create({
      data: {
        memberId: member.id,
        branchId,
        channel: 'WHATSAPP',
        type: 'PAYMENT_DUE',
        status: result.success ? 'SENT' : 'PENDING',
        messageRef: result.messageId || null,
        errorMessage: result.error || null,
        sentAt: result.success ? new Date() : null,
        metadata: { daysSinceExpiry: daysSince },
      },
    });

    if (result.method === 'not_configured') {
      return NextResponse.json({ success: false, method: 'link', fallbackUrl: buildFallbackUrl(member.phone, message) });
    }
    if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 500 });

    return NextResponse.json({ success: true, method: 'api' });
  } catch (error) {
    console.error('POST /api/notifications/pending-renewals error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
