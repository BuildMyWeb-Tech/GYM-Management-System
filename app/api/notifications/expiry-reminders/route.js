// app/api/notifications/expiry-reminders/route.js
// GET  – list memberships expiring in the next 7 days with last reminder status
// POST – send / resend a WhatsApp expiry reminder for a specific membership

import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import {
  sendWhatsAppMessage,
  buildFallbackUrl,
  buildExpiryReminderMessage,
} from '@/lib/whatsappServer';
import { NextResponse } from 'next/server';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.VIEW_REPORTS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const today = startOfToday();
    const in8Days = new Date(today);
    in8Days.setDate(in8Days.getDate() + 8);

    const memberships = await prisma.membership.findMany({
      where: { branchId, status: 'ACTIVE', expiryDate: { gte: today, lt: in8Days } },
      include: {
        member: { select: { id: true, fullName: true, phone: true } },
        plan: { select: { name: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    if (memberships.length === 0) return NextResponse.json({ groups: [], total: 0 });

    const memberIds = [...new Set(memberships.map((m) => m.memberId))];
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    const logs = await prisma.notificationLog.findMany({
      where: { branchId, memberId: { in: memberIds }, type: 'EXPIRY_REMINDER', createdAt: { gte: tenDaysAgo } },
      orderBy: { createdAt: 'desc' },
    });

    const logByMember = {};
    for (const log of logs) {
      if (!logByMember[log.memberId]) logByMember[log.memberId] = log;
    }

    const groupMap = {};
    for (const ms of memberships) {
      const expiry = new Date(ms.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      const diffMs = expiry.getTime() - today.getTime();
      const daysLeft = Math.max(0, Math.round(diffMs / 86400000));
      const bucket = daysLeft === 0 ? 0 : daysLeft <= 1 ? 1 : daysLeft <= 3 ? 3 : 7;

      if (!groupMap[bucket]) groupMap[bucket] = [];
      const lastLog = logByMember[ms.memberId];
      groupMap[bucket].push({
        memberId: ms.memberId,
        membershipId: ms.id,
        fullName: ms.member.fullName,
        phone: ms.member.phone,
        planName: ms.plan.name,
        expiryDate: ms.expiryDate,
        daysUntilExpiry: daysLeft,
        lastNotification: lastLog
          ? { status: lastLog.status, sentAt: lastLog.sentAt || lastLog.createdAt }
          : null,
      });
    }

    const groups = Object.entries(groupMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([days, items]) => {
        const d = Number(days);
        return {
          daysUntilExpiry: d,
          label: d === 0 ? 'Expiring Today' : d === 1 ? 'Expiring Tomorrow' : `Expiring in ${d} days`,
          count: items.length,
          members: items,
        };
      });

    return NextResponse.json({ groups, total: memberships.length });
  } catch (error) {
    console.error('GET /api/notifications/expiry-reminders error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.COLLECT_PAYMENT);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const { memberId, membershipId } = await request.json();
    if (!memberId || !membershipId)
      return NextResponse.json({ error: 'memberId and membershipId are required' }, { status: 400 });

    const [member, membership, branch] = await Promise.all([
      prisma.member.findFirst({ where: { id: memberId, branchId } }),
      prisma.membership.findFirst({ where: { id: membershipId, branchId }, include: { plan: true } }),
      prisma.branch.findUnique({ where: { id: branchId }, select: { name: true } }),
    ]);

    if (!member || !membership) return NextResponse.json({ error: 'Member or membership not found' }, { status: 404 });

    const daysLeft = Math.max(0, Math.ceil((new Date(membership.expiryDate) - new Date()) / 86400000));
    const message = buildExpiryReminderMessage(member.fullName, membership.plan.name, membership.expiryDate, daysLeft, branch?.name);

    const result = await sendWhatsAppMessage(member.phone, message);

    await prisma.notificationLog.create({
      data: {
        memberId: member.id,
        branchId,
        channel: 'WHATSAPP',
        type: 'EXPIRY_REMINDER',
        status: result.success ? 'SENT' : 'PENDING',
        messageRef: result.messageId || null,
        errorMessage: result.error || null,
        sentAt: result.success ? new Date() : null,
        metadata: { daysUntilExpiry: daysLeft, membershipId },
      },
    });

    if (result.method === 'not_configured') {
      const fallbackUrl = buildFallbackUrl(member.phone, message);
      return NextResponse.json({ success: false, method: 'link', fallbackUrl });
    }

    if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 500 });

    return NextResponse.json({ success: true, method: 'api', messageId: result.messageId });
  } catch (error) {
    console.error('POST /api/notifications/expiry-reminders error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
