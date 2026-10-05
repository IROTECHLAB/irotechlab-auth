import { SignJWT, jwtVerify } from 'jose';
import { getPrivateKey, getPublicKey } from './keys';

const ISSUER = process.env.APP_URL ?? 'https://irotechlab-auth.netlify.app';

export async function signAccessToken(payload: {
  sub: string; client_id: string; scope: string;
}) {
  const key = await getPrivateKey();
  return new SignJWT({ scope: payload.scope })
    .setProtectedHeader({ alg: 'RS256', kid: process.env.JWT_KEY_ID ?? 'iro-key-1' })
    .setIssuer(ISSUER)
    .setAudience(payload.client_id)
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('1h')
    .setJti(crypto.randomUUID())
    .sign(key);
}

export async function signIdToken(payload: {
  sub: string; client_id: string; email?: string;
  email_verified?: boolean; name?: string;
  given_name?: string; family_name?: string; picture?: string;
  nonce?: string; auth_time?: number;
}) {
  const key = await getPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    email: payload.email,
    email_verified: payload.email_verified,
    name: payload.name,
    given_name: payload.given_name,
    family_name: payload.family_name,
    picture: payload.picture,
    auth_time: payload.auth_time ?? now,
    ...(payload.nonce ? { nonce: payload.nonce } : {}),
  })
    .setProtectedHeader({ alg: 'RS256', kid: process.env.JWT_KEY_ID ?? 'iro-key-1' })
    .setIssuer(ISSUER)
    .setAudience(payload.client_id)
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
}

export async function verifyAccessToken(token: string) {
  const key = await getPublicKey();
  const { payload } = await jwtVerify(token, key, { issuer: ISSUER });
  return payload;
}
