// whatsapp-worker/connection-manager.js
// Manages the full WhatsApp connection lifecycle for one branch.
// Handles lock acquisition, backoff, reconnect, QR display, and state persistence.

import { upsertAccount, claimLock, releaseLock, clearSession } from './repository.js';
import { BaileysProvider } from './baileys-provider.js';
import { childLogger } from './logger.js';
import { config } from './config.js';

const BACKOFF_MS = [1000, 2000, 5000, 10000, 15000, 30000]; // capped at 30s

export class ConnectionManager {
  constructor(branchId, outboxConsumer) {
    this.branchId = branchId;
    this.oc = outboxConsumer;
    this.log = childLogger({ branchId, module: 'conn' });
    this.provider = null;
    this.running = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.locked = false;
  }

  async start() {
    this.running = true;
    await this._acquireAndConnect();
  }

  async stop() {
    this.running = false;
    this.oc.setActive(false);
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.provider) {
      await this.provider.disconnect();
      this.provider = null;
    }
    if (this.locked) {
      await releaseLock(this.branchId, config.workerId);
      this.locked = false;
    }
  }

  /** Called by Heartbeat when admin clicks Connect. */
  async forceConnect() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.reconnectAttempts = 0;
    await this._acquireAndConnect();
  }

  /** Called by Heartbeat when admin clicks Disconnect. */
  async forceDisconnect() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.running = false;
    this.oc.setActive(false);
    if (this.provider) {
      await this.provider.logout();
      this.provider = null;
    }
    await clearSession(this.branchId);
    await upsertAccount(this.branchId, {
      connectionState: 'LOGGED_OUT', status: 'disconnected',
      workerInstanceId: null, qrDataUri: null,
    });
    this.locked = false;
    this.log.info('Disconnected by admin request');
  }

  async _acquireAndConnect() {
    if (!this.running) return;

    await upsertAccount(this.branchId, { connectionState: 'STARTING', status: 'disconnected' });

    // Acquire lock
    const locked = await claimLock(this.branchId, config.workerId);
    if (!locked) {
      this.log.warn('Could not acquire lock — another worker holds it');
      await upsertAccount(this.branchId, { connectionState: 'DISCONNECTED', status: 'disconnected' });
      this._scheduleReconnect(); // retry later
      return;
    }
    this.locked = true;

    await this._connect();
  }

  async _connect() {
    if (!this.running) return;
    try {
      this.provider = new BaileysProvider(this.branchId);

      this.provider.on('state_changed', async (state) => {
        const status = state === 'CONNECTED' ? 'connected' : 'disconnected';
        await upsertAccount(this.branchId, {
          connectionState: state, status,
          reconnectAttempts: this.reconnectAttempts,
          ...(state === 'CONNECTED' ? { lastConnectedAt: new Date(), qrDataUri: null, lastError: null } : {}),
        });

        if (state === 'CONNECTED') {
          this.reconnectAttempts = 0;
          this.oc.provider = this.provider;
          this.oc.setActive(true);
        } else {
          this.oc.setActive(false);
        }
      });

      this.provider.on('qr', async ({ qrDataUri }) => {
        await upsertAccount(this.branchId, {
          connectionState: 'QR_REQUIRED', status: 'disconnected',
          qrDataUri, qrGeneratedAt: new Date(),
        });
        this.log.info('QR code ready — waiting for scan');
      });

      this.provider.on('logged_out', async () => {
        this.log.info('Logged out — clearing session');
        await clearSession(this.branchId);
        await upsertAccount(this.branchId, {
          connectionState: 'LOGGED_OUT', status: 'disconnected',
          qrDataUri: null, workerInstanceId: null,
        });
        this.oc.setActive(false);
        // Don't reconnect after logout
      });

      this.provider.on('state_changed', async (state) => {
        if (state === 'RECONNECTING' && this.running) {
          this._scheduleReconnect();
        }
      });

      await this.provider.connect();
    } catch (err) {
      this.log.error({ err }, 'Connection error');
      await upsertAccount(this.branchId, {
        connectionState: 'ERROR', status: 'error', lastError: err.message,
      });
      if (this.running) this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (!this.running) return;
    const delayIdx = Math.min(this.reconnectAttempts, BACKOFF_MS.length - 1);
    const delay = BACKOFF_MS[delayIdx];
    this.reconnectAttempts++;
    this.log.info({ attempt: this.reconnectAttempts, delay }, 'Scheduling reconnect');
    this.reconnectTimer = setTimeout(async () => {
      if (this.provider) { await this.provider.disconnect(); this.provider = null; }
      if (this.running) await this._connect();
    }, delay);
  }
}
