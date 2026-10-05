import { NextResponse } from 'next/server';
import { verifySmtpConnection } from '@/lib/mailer';

export const runtime = 'nodejs';

export async function GET() {
  const result = await verifySmtpConnection();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
