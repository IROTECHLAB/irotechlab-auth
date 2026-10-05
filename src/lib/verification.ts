import { SignJWT, jwtVerify } from 'jose';
import { getPrivateKey, getPublicKey } from './keys';
import { sql } from './db';
import { sendMail, verificationEmailHtml } from './mailer';

const ISSUER = process.env.APP_URL ?? 'https://irotechlab-auth.netlify.app';

export async function signVerificationToken(userId: string, email: string) {
  const key = await getPrivateKey();
  return new SignJWT({ email, purpose: 'email-verify' })
    .setProtectedHeader({ alg: 'RS256', kid: process.env.JWT_KEY_ID ?? 'iro-key-1' })
    .setIssuer(ISSUER)
    .setAudience('email-verify')
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

export async function verifyVerificationToken(token: string) {
  const key = await getPublicKey();
  const { payload } = await jwtVerify(token, key, {
    issuer: ISSUER,
    audience: 'email-verify',
  });
  if (payload.purpose !== 'email-verify' || !payload.sub) {
    throw new Error('invalid_token');
  }
  return { userId: payload.sub, email: payload.email as string };
}

/**
 * Issue a fresh verification token and send the email.
 * Safe to call from any route handler.
 */
export async function sendVerificationEmail(
  userId: string,
  email: string,
  firstName: string
) {
  const base = process.env.APP_URL ?? 'https://irotechlab-auth.netlify.app';
  const token = await signVerificationToken(userId, email);
  const verifyUrl = `${base}/verify?token=${encodeURIComponent(token)}`;

  await sendMail({
    to: email,
    subject: 'Verify your IrotechLab email address',
    html: verificationEmailHtml({ firstName, verifyUrl }),
  });
}

/**
 * Convenience: look up a user by ID and send them a fresh verification email.
 */
export async function sendVerificationEmailForUser(userId: string) {
  const rows = await sql`
    SELECT id, email, first_name, email_verified
    FROM users WHERE id = ${userId}
  `;
  const u = rows[0];
  if (!u) throw new Error('user_not_found');
  if (u.email_verified) return { already: true };
  await sendVerificationEmail(u.id, u.email, u.first_name);
  return { already: false };
}
