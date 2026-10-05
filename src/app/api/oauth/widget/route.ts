import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

function b64url(buf: Buffer | string) {
  const b = typeof buf === 'string' ? Buffer.from(buf) : buf;
  return b.toString('base64url');
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get('client_id');
  const redirectUriParam = url.searchParams.get('redirect_uri');
  const scope = url.searchParams.get('scope') ?? 'openid profile email';
  const stateParam = url.searchParams.get('state');

  if (!clientId) {
    return NextResponse.json(
      { error: 'invalid_request', message: 'client_id is required' },
      { status: 400 }
    );
  }

  const rows = await sql`
    SELECT client_id, redirect_uris, is_active
    FROM oauth_clients WHERE client_id = ${clientId}
  `;
  const client = rows[0] as
    | { client_id: string; redirect_uris: string[]; is_active: boolean }
    | undefined;

  if (!client || !client.is_active) {
    return NextResponse.json(
      { error: 'invalid_client', message: 'Unknown or disabled client' },
      { status: 400 }
    );
  }

  // Pick a redirect URI — either the one provided (must be registered)
  // or the first registered one. Explicitly typed as string.
  const redirectUri: string | undefined =
    redirectUriParam ?? client.redirect_uris[0];

  if (!redirectUri) {
    return NextResponse.json(
      { error: 'invalid_request', message: 'No redirect URI registered on this client' },
      { status: 400 }
    );
  }

  if (!client.redirect_uris.includes(redirectUri)) {
    return NextResponse.json(
      { error: 'invalid_redirect_uri', message: 'redirect_uri is not registered' },
      { status: 400 }
    );
  }

  // Generate PKCE
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  const state = stateParam ?? b64url(randomBytes(16));

  const authorizeUrl = new URL('/api/oauth/authorize', req.url);
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', scope);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge', challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');

  const resp = NextResponse.redirect(authorizeUrl);

  // Expose the verifier to the client's JS so plain-HTML integrations
  // can complete the token exchange without a server.
  resp.cookies.set(`iro_pkce_${clientId.slice(0, 8)}`, verifier, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  return resp;
}
