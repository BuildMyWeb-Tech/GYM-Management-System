// whatsapp-worker/heartbeat.js
// Two timers per worker:
//   Slow (30s) — writes lastHeartbeatAt to DB so the API can show worker-alive status.
//   Fast (5s)  — polls connect/disconnect commands from admin UI.

import { heartbeat, checkConnectCommand, checkDisconnectCommand } from './repository.js';
import { childLogger } from './logger.js';
import { config } from './config.js';

export class Heartbeat {
  constructor(branchId, connectionManager) {
    this.branchId = branchId;
    this.cm = connectionManager;
    this.log = childLogger({ branchId, module: 'heartbeat' });
    this.slowTimer = null;
    this.fastTimer = null;
    this.running = false;
  }

  start() {
    this.running = true;
    this._slowTick();
    this._fastTick();
  }

  stop() {
    this.running = false;
    if (this.slowTimer) { clearInterval(this.slowTimer); this.slowTimer = null; }
    if (this.fastTimer) { clearInterval(this.fastTimer); this.fastTimer = null; }
  }

  _slowTick() {
    this.slowTimer = setInterval(async () => {
      try { await heartbeat(this.branchId, config.workerId); }
      catch (err) { this.log.warn({ err }, 'Heartbeat write failed'); }
    }, config.heartbeatIntervalMs);
  }

  _fastTick() {
    this.fastTimer = setInterval(async () => {
      if (!this.running) return;
      try {
        if (await checkConnectCommand(this.branchId)) {
          this.log.info('Connect command received');
          await this.cm.forceConnect();
        }
        if (await checkDisconnectCommand(this.branchId)) {
          this.log.info('Disconnect command received');
          await this.cm.forceDisconnect();
        }
      } catch (err) {
        this.log.warn({ err }, 'Command poll error');
      }
    }, config.commandPollIntervalMs);
  }
}
