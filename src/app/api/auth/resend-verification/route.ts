import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { sendVerificationEmailForUser } from '@/lib/verification';
import { loginLimiter, checkLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(_req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (!(await checkLimit(loginLimiter, `resend:${session.userId}`)).ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  try {
    const result = await sendVerificationEmailForUser(session.userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'send_failed' }, { status: 500 });
  }
}
