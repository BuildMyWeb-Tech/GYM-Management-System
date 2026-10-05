// whatsapp-worker/repository.js
// All database access for the worker — isolated from Prisma imports in API routes.
// Imports PrismaClient from the parent project's node_modules.

import { PrismaClient } from '@prisma/client';
import { config } from './config.js';

const prisma = new PrismaClient({
  datasources: { db: { url: config.databaseUrl } },
});

// ── Branch ────────────────────────────────────────────────────────────────────

export async function getEnabledBranches() {
  return prisma.branch.findMany({
    where: { isActive: true, whatsappEnabled: true },
    select: { id: true, name: true },
  });
}

// ── WhatsAppAccount ───────────────────────────────────────────────────────────

export async function getAccount(branchId) {
  return prisma.whatsAppAccount.findUnique({ where: { branchId } });
}

export async function upsertAccount(branchId, data) {
  return prisma.whatsAppAccount.upsert({
    where: { branchId },
    create: { branchId, ...data },
    update: { ...data, updatedAt: new Date() },
  });
}

/**
 * Atomically claim the worker lock.
 * Returns the updated account if lock was claimed, null if someone else holds it.
 */
export async function claimLock(branchId, workerId) {
  const expiryThreshold = new Date(Date.now() - config.lockExpiryMs);
  try {
    return await prisma.whatsAppAccount.update({
      where: {
        branchId,
        OR: [
          { workerInstanceId: null },
          { workerInstanceId: workerId },
          { lastHeartbeatAt: { lt: expiryThreshold } },
        ],
      },
      data: { workerInstanceId: workerId, lastHeartbeatAt: new Date(), updatedAt: new Date() },
    });
  } catch {
    return null; // Record doesn't match the filter — another worker holds the lock
  }
}

export async function releaseLock(branchId, workerId) {
  await prisma.whatsAppAccount.updateMany({
    where: { branchId, workerInstanceId: workerId },
    data: { workerInstanceId: null, updatedAt: new Date() },
  });
}

export async function heartbeat(branchId, workerId) {
  await prisma.whatsAppAccount.updateMany({
    where: { branchId, workerInstanceId: workerId },
    data: { lastHeartbeatAt: new Date(), updatedAt: new Date() },
  });
}

export async function checkConnectCommand(branchId) {
  const acc = await prisma.whatsAppAccount.findUnique({
    where: { branchId },
    select: { connectRequestedAt: true },
  });
  if (!acc?.connectRequestedAt) return false;
  await prisma.whatsAppAccount.update({
    where: { branchId },
    data: { connectRequestedAt: null, updatedAt: new Date() },
  });
  return true;
}

export async function checkDisconnectCommand(branchId) {
  const acc = await prisma.whatsAppAccount.findUnique({
    where: { branchId },
    select: { disconnectRequestedAt: true },
  });
  if (!acc?.disconnectRequestedAt) return false;
  await prisma.whatsAppAccount.update({
    where: { branchId },
    data: { disconnectRequestedAt: null, updatedAt: new Date() },
  });
  return true;
}

// ── Session ───────────────────────────────────────────────────────────────────

export async function getSession(branchId) {
  return prisma.whatsAppSession.findUnique({ where: { branchId } });
}

export async function saveSession(branchId, encryptedState, expectedVersion) {
  if (expectedVersion === 0) {
    // First save — upsert
    return prisma.whatsAppSession.upsert({
      where: { branchId },
      create: { branchId, encryptedState, version: 1 },
      update: { encryptedState, version: 1, updatedAt: new Date() },
    });
  }
  // Optimistic version check
  const result = await prisma.whatsAppSession.updateMany({
    where: { branchId, version: expectedVersion },
    data: { encryptedState, version: expectedVersion + 1, updatedAt: new Date() },
  });
  if (result.count === 0) {
    // Stale — just overwrite
    await prisma.whatsAppSession.update({
      where: { branchId },
      data: { encryptedState, updatedAt: new Date() },
    });
  }
}

export async function clearSession(branchId) {
  await prisma.whatsAppSession.deleteMany({ where: { branchId } });
}

// ── MessageOutbox ─────────────────────────────────────────────────────────────

/**
 * Atomically claim a batch of pending jobs using SELECT FOR UPDATE SKIP LOCKED.
 */
export async function claimOutboxBatch(branchId, batchSize, workerId) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const jobs = await tx.$queryRawUnsafe(
      `SELECT id FROM "MessageOutbox"
       WHERE "branchId" = $1
         AND status = 'PENDING'::"OutboxStatus"
         AND "scheduledAt" <= $2
       ORDER BY "scheduledAt" ASC
       LIMIT $3
       FOR UPDATE SKIP LOCKED`,
      branchId, now, batchSize
    );
    if (!jobs.length) return [];
    const ids = jobs.map(j => j.id);
    await tx.messageOutbox.updateMany({
      where: { id: { in: ids } },
      data: { status: 'PROCESSING', lockedAt: now, lockedBy: workerId, updatedAt: now },
    });
    return tx.messageOutbox.findMany({ where: { id: { in: ids } } });
  });
}

export async function markOutboxSent(id, sentMessageId) {
  await prisma.messageOutbox.update({
    where: { id },
    data: { status: 'SENT', sentMessageId, lockedAt: null, lockedBy: null, updatedAt: new Date() },
  });
}

export async function markOutboxFailed(id, errorMessage, attempts, maxAttempts) {
  const finalStatus = attempts >= maxAttempts ? 'FAILED' : 'PENDING';
  await prisma.messageOutbox.update({
    where: { id },
    data: {
      status: finalStatus,
      errorMessage,
      attempts,
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
      // Small backoff for non-final retries
      scheduledAt: finalStatus === 'PENDING' ? new Date(Date.now() + 30000) : undefined,
    },
  });
}

export async function cancelOutboxJobs(broadcastId, branchId) {
  return prisma.messageOutbox.updateMany({
    where: { broadcastId, branchId, status: { in: ['PENDING', 'PROCESSING'] } },
    data: { status: 'CANCELLED', updatedAt: new Date() },
  });
}

export async function pauseOutboxJobs(broadcastId, branchId) {
  return prisma.messageOutbox.updateMany({
    where: { broadcastId, branchId, status: 'PENDING' },
    data: { status: 'CANCELLED', updatedAt: new Date() },
  });
}

export async function recoverStaleOutboxJobs(branchId, workerId) {
  const threshold = new Date(Date.now() - 5 * 60 * 1000); // 5 min
  return prisma.messageOutbox.updateMany({
    where: { branchId, status: 'PROCESSING', lockedAt: { lt: threshold }, lockedBy: workerId },
    data: { status: 'PENDING', lockedAt: null, lockedBy: null, updatedAt: new Date() },
  });
}

// ── BroadcastCampaign ─────────────────────────────────────────────────────────

export async function getBroadcast(broadcastId) {
  return prisma.broadcastCampaign.findUnique({ where: { id: broadcastId } });
}

export async function updateBroadcastRecipient(broadcastId, recipientIndex, statusUpdate) {
  const campaign = await prisma.broadcastCampaign.findUnique({
    where: { id: broadcastId },
    select: { recipients: true, sentCount: true, failedCount: true, pendingCount: true },
  });
  if (!campaign) return;

  const recipients = Array.isArray(campaign.recipients) ? [...campaign.recipients] : [];
  if (recipients[recipientIndex]) {
    recipients[recipientIndex] = { ...recipients[recipientIndex], ...statusUpdate };
  }

  const sentCount = recipients.filter(r => r.status === 'sent').length;
  const failedCount = recipients.filter(r => r.status === 'failed').length;
  const pendingCount = recipients.filter(r => r.status === 'pending' || r.status === 'queued').length;
  const isComplete = pendingCount === 0 && (sentCount + failedCount) >= recipients.length;

  await prisma.broadcastCampaign.update({
    where: { id: broadcastId },
    data: {
      recipients,
      sentCount,
      failedCount,
      pendingCount,
      status: isComplete ? 'COMPLETED' : 'IN_PROGRESS',
      updatedAt: new Date(),
    },
  });
}

export async function updateBroadcastDelivered(broadcastId, sentMessageId, deliveryStatus) {
  const campaign = await prisma.broadcastCampaign.findUnique({
    where: { id: broadcastId },
    select: { recipients: true, deliveredCount: true },
  });
  if (!campaign) return;

  const recipients = Array.isArray(campaign.recipients) ? [...campaign.recipients] : [];
  const idx = recipients.findIndex(r => r.sentMessageId === sentMessageId);
  if (idx >= 0) {
    recipients[idx] = { ...recipients[idx], status: deliveryStatus };
  }

  const deliveredCount = recipients.filter(r => r.status === 'delivered' || r.status === 'read').length;
  await prisma.broadcastCampaign.update({
    where: { id: broadcastId },
    data: { recipients, deliveredCount, updatedAt: new Date() },
  });
}

export { prisma };
