// worker.mjs — Standalone WhatsApp supervisor for Render Background Worker.
// Deploy this on Render alongside the Vercel Next.js app.
// Both services share the same Neon PostgreSQL DATABASE_URL.
//
// Render service type : Background Worker
// Build command       : npm install && npx prisma generate
// Start command       : node worker.mjs
// Required env vars   : DATABASE_URL, WHATSAPP_SESSION_ENCRYPTION_KEY, WORKER_ID

const missing = ['DATABASE_URL', 'WHATSAPP_SESSION_ENCRYPTION_KEY'].filter(k => !process.env[k]);
if (missing.length) {
  console.error(`[worker] Missing required env vars: ${missing.join(', ')}`);
  console.error('[worker] Set them in the Render service environment tab.');
  process.exit(1);
}

console.log('[worker] Starting WhatsApp supervisor…');

try {
  const { startSupervisor } = await import('./whatsapp-worker/supervisor.js');
  await startSupervisor();
  console.log('[worker] Supervisor running. Waiting for connect commands from the DB…');
} catch (err) {
  console.error('[worker] Fatal startup error:', err);
  process.exit(1);
}
