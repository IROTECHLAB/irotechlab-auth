import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSession();
  const userId = session.userId;

  if (userId) {
    await sql`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ${userId}`;
  }
  session.destroy();

  const postLogout = req.nextUrl.searchParams.get('post_logout_redirect_uri');
  const state = req.nextUrl.searchParams.get('state');
  const idTokenHint = req.nextUrl.searchParams.get('id_token_hint');

  if (postLogout && idTokenHint) {
    const url = new URL(postLogout);
    if (state) url.searchParams.set('state', state);
    return NextResponse.redirect(url);
  }
  const fallback = new URL('/login', req.url);
  fallback.searchParams.set('logged_out', '1');
  return NextResponse.redirect(fallback);
}
