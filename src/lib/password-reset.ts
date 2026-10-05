import { SignJWT, jwtVerify } from 'jose';
import { getPrivateKey, getPublicKey } from './keys';
import { sql } from './db';
import { sendMail, passwordResetEmailHtml } from './mailer';

const ISSUER = process.env.APP_URL ?? 'https://irotechlab-auth.netlify.app';

export async function signResetToken(userId: string, currentHash: string) {
  const key = await getPrivateKey();
  // Bind the token to the current password hash so it auto-invalidates
  // once the password changes (single-use).
  const fingerprint = currentHash.slice(-16);
  return new SignJWT({ purpose: 'password-reset', fp: fingerprint })
    .setProtectedHeader({ alg: 'RS256', kid: process.env.JWT_KEY_ID ?? 'iro-key-1' })
    .setIssuer(ISSUER)
    .setAudience('password-reset')
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(key);
}

export async function verifyResetToken(token: string) {
  const key = await getPublicKey();
  const { payload } = await jwtVerify(token, key, {
    issuer: ISSUER,
    audience: 'password-reset',
  });
  if (payload.purpose !== 'password-reset' || !payload.sub) {
    throw new Error('invalid_token');
  }
  return { userId: payload.sub, fingerprint: payload.fp as string };
}

export async function sendPasswordResetEmail(email: string) {
  const rows = await sql`
    SELECT id, email, first_name, password_hash
    FROM users WHERE email = ${email}
  `;
  const u = rows[0];
  // Do not throw if user not found — prevents user enumeration.
  if (!u) return { sent: false, reason: 'not_found' as const };

  const token = await signResetToken(u.id, u.password_hash);
  const base = process.env.APP_URL ?? 'https://irotechlab-auth.netlify.app';
  const resetUrl = `${base}/reset-password?token=${encodeURIComponent(token)}`;

  await sendMail({
    to: u.email,
    subject: 'Reset your IrotechLab password',
    html: passwordResetEmailHtml({ firstName: u.first_name, resetUrl }),
  });
  return { sent: true };
}
