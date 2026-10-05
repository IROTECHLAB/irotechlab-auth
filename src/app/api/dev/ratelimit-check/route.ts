import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;
  return NextResponse.json({
    configured: Boolean(url && token),
    url_host: url ? new URL(url).host : null,
    token_prefix: token ? token.slice(0, 6) + '…' : null,
  });
}
