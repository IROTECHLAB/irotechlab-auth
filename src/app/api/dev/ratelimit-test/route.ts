import { NextRequest, NextResponse } from 'next/server';
import { loginLimiter, checkLimit } from '@/lib/rate-limit';
import { requireDevSecret } from '@/lib/dev-guard';

export const runtime = 'nodejs';

export async function function(req: NextRequest) {
  const guard = requireDevSecret(req);
  if (guard) return guard;
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  const key = `login:${ip}`;
  const result = await checkLimit(loginLimiter, key);

  return NextResponse.json({
    ip,
    key,
    limiter_present: Boolean(loginLimiter),
    allowed: result.ok,
    env: {
      has_url: Boolean(process.env.UPSTASH_REDIS_URL),
      has_token: Boolean(process.env.UPSTASH_REDIS_TOKEN),
    },
  });
}