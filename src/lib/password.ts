import { hash, verify } from '@node-rs/argon2';

const OPTS = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };

export async function hashPassword(pw: string) {
  return hash(pw, OPTS);
}

export async function verifyPassword(hashStr: string, pw: string) {
  try { return await verify(hashStr, pw); } catch { return false; }
}
