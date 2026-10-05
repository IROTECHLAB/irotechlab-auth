import { NextRequest } from 'next/server';

/**
 * irocap base URL. Must be set via the IROCAP_BASE env var.
 * irocap is self-hosted — see https://github.com/IROTECHLAB/irocap
 *
 * Deploy your own instance, then set:
 *   IROCAP_BASE=https://your-irocap.vercel.app
 */
const IROCAP_BASE = process.env.IROCAP_BASE;

if (!IROCAP_BASE && process.env.NODE_ENV === 'production') {
  console.warn('[irocap] IROCAP_BASE is not set — captcha verification will fail');
}

export type IrocapResult =
  | { ok: true; score: number; sitekey: string; ts: string }
  | { ok: false; code: string; message: string; httpStatus: number };

export async function verifyIrocap(
  token: string | null | undefined,
  req: NextRequest
): Promise<IrocapResult> {
  if (!token) {
    return { ok: false, code: 'missing-captcha', message: 'Captcha token missing.', httpStatus: 400 };
  }

  if (!IROCAP_BASE) {
    console.error('[irocap] IROCAP_BASE is not configured. Self-host irocap: https://github.com/IROTECHLAB/irocap');
    return {
      ok: false,
      code: 'server-misconfigured',
      message: 'Captcha service is not configured on this server.',
      httpStatus: 500,
    };
  }

  const secret = process.env.IROCAP_SECRET;
  if (!secret) {
    console.error('[irocap] IROCAP_SECRET is not configured');
    return {
      ok: false,
      code: 'server-misconfigured',
      message: 'Server is not configured for captcha.',
      httpStatus: 500,
    };
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    undefined;

  let res: Response;
  try {
    res = await fetch(`${IROCAP_BASE}/api/siteverify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(6000),
    });
  } catch (e) {
    console.error('[irocap] network error:', e);
    return {
      ok: false,
      code: 'captcha-unreachable',
      message: 'Captcha service unreachable. Try again in a moment.',
      httpStatus: 503,
    };
  }

  const data: any = await res.json().catch(() => ({}));
  const codes: string[] = data['error-codes'] ?? [];

  if (!data.success) {
    const code = codes[0] ?? 'captcha-failed';
    return { ok: false, code, message: messageForCode(code), httpStatus: httpStatusForCode(code) };
  }

  const score: number = typeof data.score === 'number' ? data.score : 0;
  if (score < 0.5) {
    return {
      ok: false,
      code: 'captcha-low-score',
      message: 'Captcha verification was too low. Please try again.',
      httpStatus: 403,
    };
  }

  return { ok: true, score, sitekey: data.sitekey, ts: data.challenge_ts };
}

function messageForCode(code: string): string {
  switch (code) {
    case 'expired': return 'Captcha expired. Refresh the page and try again.';
    case 'already-used': return 'Captcha was already used. Refresh the page and try again.';
    case 'invalid-secret': return 'Server misconfigured. Contact support.';
    case 'invalid-token': return 'Captcha token invalid for this site.';
    default: return 'Captcha verification failed. Please try again.';
  }
}

function httpStatusForCode(code: string): number {
  switch (code) {
    case 'invalid-secret': return 500;
    case 'expired':
    case 'already-used':
    case 'invalid-token': return 400;
    default: return 400;
  }
}
