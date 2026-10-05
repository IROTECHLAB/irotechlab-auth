import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { verifyAccessToken } from '@/lib/jwt';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = form.get('token') as string;
  const tokenTypeHint = form.get('token_type_hint') as string | null;
  const clientId = form.get('client_id') as string;
  const clientSecret = form.get('client_secret') as string | null;

  if (!token || !clientId) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const clients = await sql`
    SELECT client_id, client_secret_hash, is_public, is_active
    FROM oauth_clients WHERE client_id = ${clientId}
  `;
  const client = clients[0] as {
    client_id: string;
    client_secret_hash: string | null;
    is_public: boolean;
    is_active: boolean;
  } | undefined;
  if (!client || !client.is_active) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401 });
  }
  if (!client.is_public) {
    if (!clientSecret || !client.client_secret_hash) {
      return NextResponse.json({ error: 'invalid_client' }, { status: 401 });
    }
    const ok = await verifyPassword(client.client_secret_hash, clientSecret);
    if (!ok) return NextResponse.json({ error: 'invalid_client' }, { status: 401 });
  }

  if (tokenTypeHint !== 'refresh_token') {
    try {
      const payload: any = await verifyAccessToken(token);
      const userRows = await sql`
        SELECT id, email FROM users WHERE id = ${payload.sub}
      `;
      const u = userRows[0];
      if (u) {
        return NextResponse.json({
          active: true,
          scope: payload.scope,
          client_id: payload.client_id,
          token_type: 'Bearer',
          exp: payload.exp,
          iat: payload.iat,
          sub: u.id,
          aud: payload.aud,
          iss: payload.iss,
          username: u.email,
        });
      }
    } catch {}
  }

  const rts = await sql`
    SELECT token, user_id, client_id, scope, expires_at, revoked
    FROM refresh_tokens WHERE token = ${token}
  `;
  const rt = rts[0];
  if (rt && !rt.revoked && new Date(rt.expires_at) > new Date()) {
    return NextResponse.json({
      active: true,
      scope: rt.scope,
      client_id: rt.client_id,
      token_type: 'refresh_token',
      exp: Math.floor(new Date(rt.expires_at).getTime() / 1000),
      sub: rt.user_id,
    });
  }
  return NextResponse.json({ active: false });
}
