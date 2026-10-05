// whatsapp-worker/supervisor.js
// Manages one SalonWorker per enabled branch.
// Polls the DB every SALON_DISCOVERY_INTERVAL_MS for enabled branches.

import { getEnabledBranches, upsertAccount } from './repository.js';
import { OutboxConsumer } from './outbox-consumer.js';
import { ConnectionManager } from './connection-manager.js';
import { Heartbeat } from './heartbeat.js';
import { logger } from './logger.js';
import { config } from './config.js';

class BranchWorker {
  constructor(branchId, branchName) {
    this.branchId = branchId;
    this.branchName = branchName;
    this.running = false;
  }

  async start() {
    this.running = true;
    logger.info({ branchId: this.branchId, name: this.branchName }, 'Worker starting');

    // Bootstrap account doc if needed
    await upsertAccount(this.branchId, {});

    // CM owns the provider lifecycle; it sets oc.provider once connected.
    this.oc = new OutboxConsumer(this.branchId, null);
    this.cm = new ConnectionManager(this.branchId, this.oc);
    this.hb = new Heartbeat(this.branchId, this.cm);

    this.oc.start();
    this.hb.start();
    await this.cm.start();
  }

  async stop() {
    this.running = false;
    logger.info({ branchId: this.branchId }, 'Worker stopping');
    this.hb?.stop();
    this.oc?.stop();
    await this.cm?.stop();
  }
}

const workers = new Map(); // branchId → BranchWorker
let discoveryTimer = null;

async function loadWorkers() {
  try {
    const branches = await getEnabledBranches();
    const ids = new Set(branches.map(b => b.id));

    // Stop workers for disabled/removed branches
    for (const [id, worker] of workers) {
      if (!ids.has(id)) {
        await worker.stop();
        workers.delete(id);
        logger.info({ branchId: id }, 'Worker stopped (branch disabled)');
      }
    }

    // Start workers for new branches
    for (const branch of branches) {
      if (!workers.has(branch.id)) {
        const worker = new BranchWorker(branch.id, branch.name);
        workers.set(branch.id, worker);
        worker.start().catch(err =>
          logger.error({ err, branchId: branch.id }, 'Worker start error')
        );
      }
    }
  } catch (err) {
    logger.error({ err }, 'Supervisor discovery error');
  }
}

export async function startSupervisor() {
  logger.info({ workerId: config.workerId }, 'Supervisor starting');
  await loadWorkers();
  discoveryTimer = setInterval(loadWorkers, config.supervisorIntervalMs);

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

async function shutdown() {
  logger.info('Supervisor shutting down');
  if (discoveryTimer) clearInterval(discoveryTimer);
  await Promise.all([...workers.values()].map(w => w.stop()));
  process.exit(0);
}
