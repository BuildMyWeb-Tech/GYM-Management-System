// server.mjs — Combined Next.js + WhatsApp Baileys supervisor.
// Run with: node server.mjs
// On Render/Railway, set start command to: node server.mjs

import { createServer } from 'node:http';
import { parse } from 'node:url';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function startWorker() {
  if (!process.env.WHATSAPP_SESSION_ENCRYPTION_KEY) {
    console.warn('[WA] Skipping worker — WHATSAPP_SESSION_ENCRYPTION_KEY not set.');
    return;
  }
  if (!process.env.DATABASE_URL) {
    console.warn('[WA] Skipping worker — DATABASE_URL not set.');
    return;
  }
  try {
    const { startSupervisor } = await import('./whatsapp-worker/supervisor.js');
    await startSupervisor();
    console.log('[WA] Supervisor started.');
  } catch (err) {
    console.error('[WA] Worker failed to start:', err.message);
    // Keep Next.js running even if worker crashes
  }
}

app.prepare().then(async () => {
  await startWorker();

  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Request error:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, hostname, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
