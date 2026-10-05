// whatsapp-worker/outbox-consumer.js
// Polls MessageOutbox, sends messages via BaileysProvider, updates statuses.

import {
  claimOutboxBatch, markOutboxSent, markOutboxFailed,
  recoverStaleOutboxJobs, getBroadcast, updateBroadcastRecipient,
  updateBroadcastDelivered,
} from './repository.js';
import { BaileysProvider, isPermanentFailure } from './baileys-provider.js';
import { childLogger } from './logger.js';
import { config } from './config.js';

export class OutboxConsumer {
  constructor(branchId, provider) {
    this.branchId = branchId;
    this._provider = null;
    this.log = childLogger({ branchId, module: 'outbox' });
    this.timer = null;
    this.pollCount = 0;
    this.running = false;
    this.active = false;

    // Wire up initial provider (may be null; ConnectionManager sets it on connect)
    if (provider) this.provider = provider;
  }

  get provider() { return this._provider; }
  set provider(p) {
    this._provider = p;
    if (p) p.on('message_status', (updates) => this._handleDeliveryUpdates(updates));
  }

  setActive(active) {
    this.active = active;
    if (active && !this.timer) this._scheduleNext(0);
  }

  stop() {
    this.running = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  _scheduleNext(delayMs) {
    this.timer = setTimeout(() => this._poll(), delayMs);
  }

  async _poll() {
    this.timer = null;
    if (!this.running) return;
    if (!this.active) { this._scheduleNext(config.outboxPollIntervalMs); return; }

    this.pollCount++;

    // Periodic stale job recovery
    if (this.pollCount % config.staleRecoveryEvery === 0) {
      try { await recoverStaleOutboxJobs(this.branchId, config.workerId); }
      catch (err) { this.log.warn({ err }, 'Stale recovery error'); }
    }

    try {
      const jobs = await claimOutboxBatch(this.branchId, config.outboxBatchSize, config.workerId);
      for (const job of jobs) {
        if (!this.running) break;
        await this._processJob(job);
      }
    } catch (err) {
      this.log.error({ err }, 'Outbox poll error');
    }

    if (this.running) this._scheduleNext(config.outboxPollIntervalMs);
  }

  async _processJob(job) {
    const jid = BaileysProvider.phoneToJid(job.recipient);
    let sendIntervalMs = config.defaultSendIntervalMs;

    // Respect per-broadcast send interval
    if (job.broadcastId) {
      try {
        const campaign = await getBroadcast(job.broadcastId);
        if (campaign?.status === 'CANCELLED') {
          await markOutboxFailed(job.id, 'Broadcast cancelled', job.maxAttempts, job.maxAttempts);
          return;
        }
        if (campaign?.status === 'PAUSED') {
          // Return to pending — will retry when unpaused
          await markOutboxFailed(job.id, 'Broadcast paused', job.attempts, job.maxAttempts + 1);
          return;
        }
        sendIntervalMs = campaign?.sendIntervalMs || config.defaultSendIntervalMs;
      } catch {}
    }

    try {
      let sent;
      if (job.messageType === 'TEXT') {
        sent = await this.provider.sendText(jid, job.payload.text);
      } else {
        sent = await this.provider.sendMedia(jid, job.messageType, job.payload);
      }

      const sentMessageId = sent?.key?.id;
      await markOutboxSent(job.id, sentMessageId || null);
      this.log.debug({ jid, broadcastId: job.broadcastId }, 'Message sent');

      if (job.broadcastId && job.broadcastRecipientIndex != null) {
        await updateBroadcastRecipient(job.broadcastId, job.broadcastRecipientIndex, {
          status: 'sent', sentAt: new Date().toISOString(), sentMessageId,
        });
      }
    } catch (err) {
      const permanent = isPermanentFailure(err);
      const attempts = (job.attempts || 0) + 1;
      const exhaust = permanent ? job.maxAttempts : attempts;
      await markOutboxFailed(job.id, err.message, exhaust, job.maxAttempts);
      this.log.warn({ err, jid, permanent }, 'Message send failed');

      if (job.broadcastId && job.broadcastRecipientIndex != null) {
        await updateBroadcastRecipient(job.broadcastId, job.broadcastRecipientIndex, {
          status: 'failed', error: err.message,
        });
      }
    }

    // Rate-limiting delay between messages
    await new Promise(r => setTimeout(r, sendIntervalMs));
  }

  async _handleDeliveryUpdates(updates) {
    for (const update of updates) {
      try {
        const msgId = update.key?.id;
        const status = update.update?.status;
        if (!msgId || !status) continue;

        // Map Baileys status numbers to strings
        const statusMap = { 2: 'sent', 3: 'delivered', 4: 'read' };
        const statusStr = statusMap[status];
        if (!statusStr) continue;

        // Find which broadcast this message belongs to by sentMessageId
        const { prisma } = await import('./repository.js');
        const outbox = await prisma.messageOutbox.findFirst({
          where: { sentMessageId: msgId, branchId: this.branchId },
        });
        if (outbox?.broadcastId && outbox.broadcastRecipientIndex != null) {
          await updateBroadcastDelivered(outbox.broadcastId, msgId, statusStr);
        }
      } catch (err) {
        this.log.warn({ err }, 'Delivery update error');
      }
    }
  }

  start() {
    this.running = true;
    this._scheduleNext(config.outboxPollIntervalMs);
  }
}
