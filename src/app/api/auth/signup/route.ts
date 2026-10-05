import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { signupSchema } from '@/lib/validators';
import { signupLimiter, checkLimit } from '@/lib/rate-limit';
import { sendVerificationEmail } from '@/lib/verification';
import { verifyIrocap } from '@/lib/irocap';
import { looksLikeBrowser } from '@/lib/bot-check';
import { verifyCsrfToken } from '@/lib/csrf';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // --- Layer 1: browser check ---
  const bot = looksLikeBrowser(req);
  if (!bot.ok) {
    console.warn('[signup] bot-check failed:', bot.reason);
    return NextResponse.json(
      { error: 'blocked', message: 'Request blocked.' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'invalid_request', message: 'Malformed request.' },
      { status: 400 }
    );
  }

  // --- Layer 2: honeypot ---
  if (body.website) {
    // Attacker filled the hidden field — pretend success, do nothing
    console.warn('[signup] honeypot triggered');
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // --- Layer 3: timing ---
  const elapsed = Number(body.formElapsedMs ?? 0);
  if (elapsed < 1500) {
    console.warn('[signup] too fast:', elapsed);
    return NextResponse.json(
      { error: 'blocked', message: 'Request blocked.' },
      { status: 403 }
    );
  }
  if (elapsed > 60 * 60 * 1000) {
    return NextResponse.json(
      { error: 'expired', message: 'Session expired. Reload the page.' },
      { status: 400 }
    );
  }

  // --- Layer 4: CSRF nonce ---
  if (!verifyCsrfToken(body.csrf)) {
    console.warn('[signup] csrf failed');
    return NextResponse.json(
      { error: 'blocked', message: 'Request blocked.' },
      { status: 403 }
    );
  }

  // --- Layer 5: captcha ---
  const captcha = await verifyIrocap(body['irocap-token'], req);
  if (!captcha.ok) {
    return NextResponse.json(
      { error: captcha.code, message: captcha.message },
      { status: captcha.httpStatus }
    );
  }

  // --- Layer 6: rate limit ---
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown').trim();
  if (!(await checkLimit(signupLimiter, `signup:${ip}`)).ok) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many signups. Wait a minute and try again.' },
      { status: 429 }
    );
  }

  // --- Validation ---
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'invalid_input',
        message: parsed.error.issues[0]?.message ?? 'Check your input.',
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }
  const { email, password, firstName, lastName, avatar } = parsed.data;

  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length) {
    return NextResponse.json(
      { error: 'email_taken', message: 'An account with that email already exists.' },
      { status: 409 }
    );
  }

  const hash = await hashPassword(password);
  const rows = await sql`
    INSERT INTO users (email, password_hash, first_name, last_name, avatar_base64)
    VALUES (${email}, ${hash}, ${firstName}, ${lastName}, ${avatar ?? null})
    RETURNING id, email, first_name, last_name, avatar_base64
  `;
  const user = rows[0];

  let emailSent = false;
  let emailError: string | null = null;
  try {
    await sendVerificationEmail(user.id, user.email, user.first_name);
    emailSent = true;
  } catch (e: any) {
    emailError = e?.message ?? String(e);
    console.error('[signup] verify email failed:', e);
  }

  return NextResponse.json(
    { user, emailSent, ...(emailError ? { emailError } : {}) },
    { status: 201 }
  );
}
