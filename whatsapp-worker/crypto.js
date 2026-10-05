// whatsapp-worker/crypto.js
// AES-256-GCM encrypt/decrypt helpers for Baileys session storage.

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { config } from './config.js';

const KEY = Buffer.from(config.sessionEncryptionKey, 'hex');
const ALGO = 'aes-256-gcm';

export function encrypt(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

export function decrypt(ciphertext) {
  const [ivHex, encHex, tagHex] = ciphertext.split(':');
  if (!ivHex || !encHex || !tagHex) throw new Error('Invalid encrypted session format');
  const decipher = createDecipheriv(ALGO, KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}
