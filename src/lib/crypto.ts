import { randomBytes, createHash, randomUUID } from 'crypto';

export function generateClientId() {
  return 'iro_' + randomBytes(12).toString('hex');
}

export function generateClientSecret() {
  return 'iro_sk_live_' + randomBytes(18).toString('base64url').slice(0, 24);
}

export function generateOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function sha256Base64Url(input: string) {
  return createHash('sha256').update(input).digest('base64url');
}

export function uuid() { return randomUUID(); }
