import { NextResponse } from 'next/server';
import { verifySmtpConnection } from '@/lib/mailer';
import { requireDevSecret } from '@/lib/dev-guard';

export const runtime = 'nodejs';

export async function function() {
  const guard = requireDevSecret(req);
  if (guard) return guard;
  const result = await verifySmtpConnection();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}