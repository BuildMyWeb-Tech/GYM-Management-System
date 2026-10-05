// whatsapp-worker/config.js
// Environment variable parsing and validation.

import { randomUUID } from 'crypto';

function required(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function optional(name, fallback) {
  return process.env[name] || fallback;
}

export const config = {
  databaseUrl: required('DATABASE_URL'),

  // AES-256-GCM key for encrypting Baileys session (64 hex chars = 32 bytes)
  sessionEncryptionKey: required('WHATSAPP_SESSION_ENCRYPTION_KEY'),

  // Stable worker ID — set to a constant on production to survive restarts
  workerId: optional('WORKER_ID', `worker-${process.pid}`),

  // Polling intervals (ms)
  supervisorIntervalMs: parseInt(optional('SALON_DISCOVERY_INTERVAL_MS', '60000')),
  heartbeatIntervalMs: parseInt(optional('HEARTBEAT_INTERVAL_MS', '30000')),
  commandPollIntervalMs: parseInt(optional('COMMAND_POLL_INTERVAL_MS', '5000')),
  outboxPollIntervalMs: parseInt(optional('OUTBOX_POLL_INTERVAL_MS', '2000')),

  // Default send interval when broadcast doc has no value
  defaultSendIntervalMs: parseInt(optional('BROADCAST_SEND_INTERVAL_MS', '1500')),

  // Outbox batch size per poll
  outboxBatchSize: parseInt(optional('OUTBOX_BATCH_SIZE', '5')),

  // Lock expiry (ms) — stale locks older than this are stolen
  lockExpiryMs: parseInt(optional('LOCK_EXPIRY_MS', '120000')),

  // Stale processing job recovery interval (poll count)
  staleRecoveryEvery: parseInt(optional('STALE_RECOVERY_EVERY', '150')),

  // Log level
  logLevel: optional('LOG_LEVEL', 'info'),
};

// Validate session key length
if (!/^[0-9a-fA-F]{64}$/.test(config.sessionEncryptionKey)) {
  throw new Error('WHATSAPP_SESSION_ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}
