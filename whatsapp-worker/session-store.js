// whatsapp-worker/session-store.js
// Custom Baileys auth state backed by PostgreSQL (encrypted with AES-256-GCM).
// Replaces useMultiFileAuthState with a DB-backed equivalent.

import { initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';
import { encrypt, decrypt } from './crypto.js';
import { getSession, saveSession } from './repository.js';
import { childLogger } from './logger.js';

export async function useDbAuthState(branchId) {
  const log = childLogger({ branchId, module: 'session-store' });

  // ── Load state from DB ──────────────────────────────────────────────────────
  const sessionDoc = await getSession(branchId);
  let creds;
  let keys = {};
  let version = 0;

  if (sessionDoc) {
    try {
      const plaintext = decrypt(sessionDoc.encryptedState);
      const parsed = JSON.parse(plaintext, BufferJSON.reviver);
      creds = parsed.creds;
      keys = parsed.keys || {};
      version = sessionDoc.version;
      log.debug('Session loaded from DB');
    } catch (err) {
      log.warn({ err }, 'Failed to decrypt session — starting fresh');
      creds = initAuthCreds();
    }
  } else {
    creds = initAuthCreds();
    log.debug('No existing session — starting fresh');
  }

  // ── Coalesced save queue ────────────────────────────────────────────────────
  let savePending = false;
  let saveTimeout = null;

  async function flushSave() {
    savePending = false;
    const plaintext = JSON.stringify({ creds, keys }, BufferJSON.replacer);
    const encrypted = encrypt(plaintext);
    await saveSession(branchId, encrypted, version);
    version++;
  }

  function scheduleSave() {
    if (savePending) return;
    savePending = true;
    // Coalesce multiple updates within 200 ms into one DB write
    saveTimeout = setTimeout(async () => {
      try { await flushSave(); }
      catch (err) { log.error({ err }, 'Session save failed'); }
    }, 200);
  }

  // ── Baileys auth state interface ────────────────────────────────────────────
  const state = {
    creds,
    keys: {
      get: (type, ids) => {
        const data = {};
        for (const id of ids) {
          const val = keys[`${type}-${id}`];
          if (val !== undefined) data[id] = val;
        }
        return data;
      },
      set: (data) => {
        for (const [type, entries] of Object.entries(data)) {
          for (const [id, val] of Object.entries(entries || {})) {
            if (val === null) delete keys[`${type}-${id}`];
            else keys[`${type}-${id}`] = val;
          }
        }
        scheduleSave();
      },
    },
  };

  const saveCreds = () => scheduleSave();

  const destroy = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    if (savePending) {
      // Best-effort sync flush on destroy
      flushSave().catch(() => {});
    }
  };

  return { state, saveCreds, destroy };
}
