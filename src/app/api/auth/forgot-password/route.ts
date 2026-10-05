import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendPasswordResetEmail } from '@/lib/password-reset';
import { loginLimiter, checkLimit } from '@/lib/rate-limit';
import { verifyIrocap } from '@/lib/irocap';
import { looksLikeBrowser } from '@/lib/bot-check';
import { verifyCsrfToken } from '@/lib/csrf';

export const runtime = 'nodejs';

const schema = z.object({ email: z.string().email().toLowerCase() });

export async function POST(req: NextRequest) {
  // ---- Layer 1: browser header check ----
  const bot = looksLikeBrowser(req);
  if (!bot.ok) {
    console.warn('[forgot] bot-check failed:', bot.reason);
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
    console.warn('[forgot] honeypot triggered');
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // ---- Layer 3: timing ----
  const elapsed = Number(body.formElapsedMs ?? 0);
  if (elapsed < 800) {
    console.warn('[forgot] too fast:', elapsed);
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
    console.warn('[forgot] csrf failed');
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', message: 'Enter a valid email address.' },
      { status: 400 }
    );
  }

  // ---- Layer 6: rate limit ----
  const key = `forgot:${parsed.data.email}`;
  if (!(await checkLimit(loginLimiter, key)).ok) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests. Wait a minute.' },
      { status: 429 }
    );
  }

  try {
    await sendPasswordResetEmail(parsed.data.email);
  } catch (e) {
    console.error('[forgot-password] send failed:', e);
  }

  // Always 200 — never reveal whether the email exists
  return NextResponse.json({ ok: true });
}
