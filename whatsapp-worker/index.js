// whatsapp-worker/index.js
// Standalone entry point: node whatsapp-worker/index.js

import 'dotenv/config';
import { startSupervisor } from './supervisor.js';
import { logger } from './logger.js';

logger.info('WhatsApp Worker starting');

try {
  await startSupervisor();
  logger.info('WhatsApp Worker ready');
} catch (err) {
  logger.fatal({ err }, 'Failed to start supervisor');
  process.exit(1);
}
