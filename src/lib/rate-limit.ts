import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_URL
  ? new Redis({ url: process.env.UPSTASH_REDIS_URL, token: process.env.UPSTASH_REDIS_TOKEN! })
  : null;

function make(limit: number, window: `${number} s` | `${number} m`) {
  return redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, window) }) : null;
}

export const loginLimiter = make(10, '1 m');
export const signupLimiter = make(5, '1 m');
export const tokenLimiter = make(30, '1 m');
export const devAppLimiter = make(20, '1 m');

export async function checkLimit(
  limiter: Ratelimit | null,
  id: string
): Promise<{ ok: boolean }> {
  if (!limiter) return { ok: true };
  const { success } = await limiter.limit(id);
  return { ok: success };
}
