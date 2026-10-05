import { NextResponse } from 'next/server';
import { issueCsrfToken } from '@/lib/csrf';

export const runtime = 'nodejs';

export async function GET() {
  const resp = NextResponse.json({ token: issueCsrfToken() });
  resp.headers.set('Cache-Control', 'no-store');
  return resp;
}
