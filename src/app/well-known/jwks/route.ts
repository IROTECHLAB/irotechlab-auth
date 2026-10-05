import { NextResponse } from 'next/server';
import { getJwks } from '@/lib/keys';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(await getJwks(), {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
