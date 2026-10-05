// whatsapp-worker/baileys-provider.js
// Wraps @whiskeysockets/baileys behind a simple EventEmitter interface.
// The rest of the worker never imports Baileys directly.

import { EventEmitter } from 'events';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto,
  Browsers,
  WAMessageStatus,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { useDbAuthState } from './session-store.js';
import { childLogger } from './logger.js';

// A complete no-op pino-compatible logger passed to Baileys internals.
// Every call (including logger.child().trace()) returns silently.
const noopLogger = {
  level: 'silent',
  trace: () => {}, debug: () => {}, info: () => {},
  warn: () => {}, error: () => {}, fatal: () => {},
  child: () => noopLogger,
};

const PERMANENT_FAILURE = [
  /invalid.*number/i, /not.*registered/i, /number.*does not exist/i,
  /unsupported.*media/i, /media.*too large/i, /invalid.*jid/i, /blocked/i,
];

export function isPermanentFailure(err) {
  const msg = err?.message || String(err);
  return PERMANENT_FAILURE.some(re => re.test(msg));
}

export class BaileysProvider extends EventEmitter {
  constructor(branchId) {
    super();
    this.branchId = branchId;
    this.log = childLogger({ branchId, module: 'baileys' });
    this.sock = null;
    this.authState = null;
  }

  /** Connect (or reconnect) to WhatsApp Web. */
  async connect() {
    if (this.sock) await this.disconnect();
    this.authState = await useDbAuthState(this.branchId);

    const { version } = await fetchLatestBaileysVersion();
    this.log.debug({ version }, 'Connecting with Baileys version');

    this.sock = makeWASocket({
      version,
      auth: {
        creds: this.authState.state.creds,
        keys: makeCacheableSignalKeyStore(this.authState.state.keys, noopLogger),
      },
      browser: Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      logger: noopLogger,
      getMessage: async () => undefined,
    });

    this.sock.ev.on('creds.update', this.authState.saveCreds);

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUri = await QRCode.toDataURL(qr);
          this.emit('qr', { qr, qrDataUri });
        } catch (err) {
          this.log.error({ err }, 'QR code generation failed');
        }
      }

      if (connection === 'open') {
        this.log.info('WhatsApp connected');
        this.emit('state_changed', 'CONNECTED');
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode
          : null;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        this.log.info({ statusCode, loggedOut }, 'WhatsApp connection closed');

        if (loggedOut) {
          this.authState?.destroy();
          this.emit('logged_out');
        } else {
          this.emit('state_changed', 'RECONNECTING');
        }
      }
    });

    this.sock.ev.on('messages.update', (updates) => {
      this.emit('message_status', updates);
    });

    this.emit('state_changed', 'AUTHENTICATING');
  }

  /** Graceful logout — clears session. */
  async logout() {
    try {
      if (this.sock) await this.sock.logout();
    } catch (err) {
      this.log.warn({ err }, 'Logout error (ignored)');
    } finally {
      await this.disconnect();
    }
  }

  async disconnect() {
    this.authState?.destroy();
    if (this.sock) {
      try { this.sock.end(); } catch {}
      this.sock = null;
    }
  }

  /** Normalize a local phone number to WhatsApp JID. */
  static phoneToJid(phone) {
    const digits = phone.replace(/\D/g, '');
    // Ensure 91 country code prefix
    const normalized = digits.length === 10 ? `91${digits}` : digits;
    return `${normalized}@s.whatsapp.net`;
  }

  /** Send a text message. */
  async sendText(jid, text) {
    if (!this.sock) throw new Error('Not connected');
    return this.sock.sendMessage(jid, { text });
  }

  /** Send a media message. payload: { url, mimetype?, caption?, filename? } */
  async sendMedia(jid, type, payload) {
    if (!this.sock) throw new Error('Not connected');
    switch (type) {
      case 'IMAGE':
        return this.sock.sendMessage(jid, { image: { url: payload.url }, caption: payload.caption || '' });
      case 'VIDEO':
        return this.sock.sendMessage(jid, { video: { url: payload.url }, caption: payload.caption || '' });
      case 'AUDIO':
        return this.sock.sendMessage(jid, { audio: { url: payload.url }, ptt: false });
      case 'DOCUMENT':
        return this.sock.sendMessage(jid, {
          document: { url: payload.url },
          fileName: payload.filename || 'file',
          mimetype: payload.mimetype || 'application/octet-stream',
        });
      default:
        throw new Error(`Unknown media type: ${type}`);
    }
  }
}
