import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { verifyResetToken } from '@/lib/password-reset';
import { passwordSchema } from '@/lib/validators';
import { loginLimiter, checkLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const schema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Throttle by IP — reset tokens are already single-use
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown').trim();
  const ipKey = ip.includes(':') ? ip.split(':').slice(0, 4).join(':') : ip;
  if (!(await checkLimit(loginLimiter, `reset:${ipKey}`)).ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let claims;
  try {
    claims = await verifyResetToken(parsed.data.token);
  } catch {
    return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 400 });
  }

  const rows = await sql`
    SELECT id, password_hash FROM users WHERE id = ${claims.userId}
  `;
  const u = rows[0];
  if (!u) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  // Fingerprint check — token becomes invalid once password changes
  if (u.password_hash.slice(-16) !== claims.fingerprint) {
    return NextResponse.json({ error: 'token_already_used' }, { status: 400 });
  }

  const newHash = await hashPassword(parsed.data.password);

  await sql`
    UPDATE users SET password_hash = ${newHash}, updated_at = NOW()
    WHERE id = ${u.id}
  `;

  // Kill every session & refresh token (user must log in again)
  await sql`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ${u.id}`;
  await sql`DELETE FROM sessions WHERE user_id = ${u.id}`;

  return NextResponse.json({ ok: true });
}
