import crypto from 'crypto';
import { query } from '../config/db.js';

/**
 * Generates an original, permanent Vynk UID like "vynk.t7x4k9"
 */
export function generateVynkUID(prefix: string = 'vynk'): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // exclude ambiguous characters like 0, o, 1, l, i
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `${prefix}.${code}`;
}

/**
 * Ensures UID is formatted cleanly, starting with "vynk."
 */
export function normalizeUID(rawUID: string): string {
  let cleaned = rawUID.trim().toLowerCase().replace(/^@/, '');
  if (!cleaned.startsWith('vynk.')) {
    cleaned = `vynk.${cleaned.replace(/[^a-z0-9_]/g, '')}`;
  }
  return cleaned;
}

/**
 * Check if a UID is already registered
 */
export function isUIDAvailable(uid: string, excludeUserId?: string): boolean {
  let sql = 'SELECT id FROM users WHERE uid = ?';
  const params: any[] = [uid];
  if (excludeUserId) {
    sql += ' AND id != ?';
    params.push(excludeUserId);
  }
  const existing = query.get(sql, params);
  return !existing;
}
