import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const TTL_MS = 10 * 60 * 1000; // 10 minutes

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET is not set');
  return s;
}

export function issueCsrfToken(): string {
  const nonce = randomBytes(16).toString('hex');
  const expires = Date.now() + TTL_MS;
  const payload = `${nonce}.${expires}`;
  const sig = createHmac('sha256', secret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyCsrfToken(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [nonce, expiresStr, sig] = parts;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;

  const expected = createHmac('sha256', secret())
    .update(`${nonce}.${expires}`)
    .digest('hex');

  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
