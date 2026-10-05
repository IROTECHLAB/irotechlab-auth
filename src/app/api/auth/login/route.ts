import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { loginSchema } from '@/lib/validators';
import { getSession } from '@/lib/session';
import { loginLimiter, checkLimit } from '@/lib/rate-limit';
import { verifyIrocap } from '@/lib/irocap';
import { looksLikeBrowser } from '@/lib/bot-check';
import { verifyCsrfToken } from '@/lib/csrf';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // ---- Layer 1: browser header check ----
  const bot = looksLikeBrowser(req);
  if (!bot.ok) {
    console.warn('[login] bot-check failed:', bot.reason);
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

  // ---- Layer 2: honeypot ----
  if (body.website) {
    console.warn('[login] honeypot triggered');
    // pretend success — bots don't learn anything
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // ---- Layer 3: timing ----
  const elapsed = Number(body.formElapsedMs ?? 0);
  if (elapsed < 800) {
    console.warn('[login] too fast:', elapsed);
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

  // ---- Layer 4: CSRF nonce ----
  if (!verifyCsrfToken(body.csrf)) {
    console.warn('[login] csrf failed');
    return NextResponse.json(
      { error: 'blocked', message: 'Request blocked.' },
      { status: 403 }
    );
  }

  // ---- Layer 5: captcha ----
  const captcha = await verifyIrocap(body['irocap-token'], req);
  if (!captcha.ok) {
    return NextResponse.json(
      { error: captcha.code, message: captcha.message },
      { status: captcha.httpStatus }
    );
  }

  // ---- Validation ----
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', message: 'Check your email and password format.' },
      { status: 400 }
    );
  }

  // ---- Layer 6: rate limits (email + IP) ----
  const emailKey = parsed.data.email.toLowerCase();
  if (!(await checkLimit(loginLimiter, `login:email:${emailKey}`)).ok) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many login attempts. Wait a minute.' },
      { status: 429 }
    );
  }

  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown').trim();
  const ipKey = ip.includes(':') ? ip.split(':').slice(0, 4).join(':') : ip;
  if (!(await checkLimit(loginLimiter, `login:ip:${ipKey}`)).ok) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many login attempts from your network.' },
      { status: 429 }
    );
  }

  // ---- Auth ----
  const rows = await sql`
    SELECT id, email, password_hash, first_name, last_name, avatar_base64
    FROM users WHERE email = ${parsed.data.email}
  `;
  const user = rows[0];
  if (!user) {
    return NextResponse.json(
      { error: 'invalid_credentials', message: 'Email or password is incorrect.' },
      { status: 401 }
    );
  }

  const ok = await verifyPassword(user.password_hash, parsed.data.password);
  if (!ok) {
    return NextResponse.json(
      { error: 'invalid_credentials', message: 'Email or password is incorrect.' },
      { status: 401 }
    );
  }

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  await session.save();

  const resp = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      avatar: user.avatar_base64,
    },
  });

  resp.cookies.set('iro_auth_time', String(Math.floor(Date.now() / 1000)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return resp;
}
