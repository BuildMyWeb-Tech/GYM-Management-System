// whatsapp-worker/logger.js
import pino from 'pino';
import pretty from 'pino-pretty';
import { config } from './config.js';

// Use pino-pretty as an in-process stream (not a worker thread).
// The transport:{target} API spawns a worker thread that crashes when
// Next.js's Webpack compilation workers run concurrently.
const stream = process.stdout.isTTY
  ? pretty({ colorize: true, ignore: 'pid,hostname', sync: true })
  : process.stdout;

export const logger = pino(
  { level: config.logLevel, base: { worker: config.workerId } },
  stream,
);

export function childLogger(ctx) {
  return logger.child(ctx);
}
