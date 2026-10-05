import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { sha256Base64Url, generateOpaqueToken } from '@/lib/crypto';
import { signAccessToken, signIdToken } from '@/lib/jwt';
import { tokenLimiter, checkLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

function err(code: string, desc?: string, status = 400) {
  return NextResponse.json(
    { error: code, error_description: desc },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
}

type ClientRow = {
  client_id: string;
  client_secret_hash: string | null;
  is_public: boolean;
  is_active: boolean;
};

type AuthResult =
  | { ok: true; client: ClientRow }
  | { ok: false; error: 'invalid_client' };

async function authenticateClient(
  clientId: string,
  clientSecret: string | null
): Promise<AuthResult> {
  const rows = await sql`
    SELECT client_id, client_secret_hash, is_public, is_active
    FROM oauth_clients WHERE client_id = ${clientId}
  `;
  const client = rows[0] as ClientRow | undefined;
  if (!client || !client.is_active) return { ok: false, error: 'invalid_client' };
  if (!client.is_public) {
    if (!clientSecret || !client.client_secret_hash) {
      return { ok: false, error: 'invalid_client' };
    }
    const valid = await verifyPassword(client.client_secret_hash, clientSecret);
    if (!valid) return { ok: false, error: 'invalid_client' };
  }
  return { ok: true, client };
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!(await checkLimit(tokenLimiter, `token:${ip}`)).ok) {
    return err('rate_limited', undefined, 429);
  }

  const ctype = req.headers.get('content-type') ?? '';
  if (!ctype.includes('application/x-www-form-urlencoded') && !ctype.includes('multipart/form-data')) {
    return err('invalid_request');
  }

  const form = await req.formData();
  const grantType = form.get('grant_type') as string;
  if (grantType === 'authorization_code') return handleCode(form);
  if (grantType === 'refresh_token') return handleRefresh(form);
  return err('unsupported_grant_type');
}

async function handleCode(form: FormData) {
  const code = form.get('code') as string;
  const redirectUri = form.get('redirect_uri') as string;
  const clientId = form.get('client_id') as string;
  const clientSecret = form.get('client_secret') as string | null;
  const codeVerifier = form.get('code_verifier') as string;
  if (!code || !redirectUri || !clientId || !codeVerifier) return err('invalid_request');

  const codes = await sql`
    SELECT * FROM authorization_codes
    WHERE code = ${code} AND used = FALSE AND expires_at > NOW()
  `;
  const row = codes[0];
  if (!row) return err('invalid_grant', 'Code invalid or expired');
  if (row.redirect_uri !== redirectUri) return err('invalid_grant', 'Redirect URI mismatch');
  if (row.client_id !== clientId) return err('invalid_grant', 'Client mismatch');
  if (sha256Base64Url(codeVerifier) !== row.code_challenge) {
    return err('invalid_grant', 'PKCE verification failed');
  }

  const auth = await authenticateClient(clientId, clientSecret);
  if (!auth.ok) return err(auth.error);

  await sql`UPDATE authorization_codes SET used = TRUE WHERE code = ${code}`;

  const users = await sql`
    SELECT id, email, email_verified, first_name, last_name, avatar_base64
    FROM users WHERE id = ${row.user_id}
  `;
  const user = users[0];
  if (!user) return err('invalid_grant', 'User not found');
  return issueTokens(user, clientId, row.scope, null, row.nonce ?? undefined);
}

async function handleRefresh(form: FormData) {
  const presented = form.get('refresh_token') as string;
  const clientId = form.get('client_id') as string;
  const clientSecret = form.get('client_secret') as string | null;
  if (!presented || !clientId) return err('invalid_request');

  const auth = await authenticateClient(clientId, clientSecret);
  if (!auth.ok) return err(auth.error);

  const rows = await sql`SELECT * FROM refresh_tokens WHERE token = ${presented}`;
  const rt = rows[0];
  if (!rt) return err('invalid_grant', 'Refresh token invalid');
  if (rt.client_id !== clientId) return err('invalid_grant', 'Client mismatch');

  if (rt.revoked) {
    await sql`UPDATE refresh_tokens SET revoked = TRUE WHERE rotated_from = ${presented}`;
    return err('invalid_grant', 'Refresh token already used — family revoked');
  }
  if (new Date(rt.expires_at) < new Date()) {
    return err('invalid_grant', 'Refresh token expired');
  }

  const users = await sql`
    SELECT id, email, email_verified, first_name, last_name, avatar_base64
    FROM users WHERE id = ${rt.user_id}
  `;
  const user = users[0];
  if (!user) return err('invalid_grant', 'User not found');

  await sql`UPDATE refresh_tokens SET revoked = TRUE WHERE token = ${presented}`;
  return issueTokens(user, clientId, rt.scope, presented);
}

async function issueTokens(
  user: any,
  clientId: string,
  scope: string,
  rotatedFrom: string | null,
  nonce?: string
) {
  const accessToken = await signAccessToken({ sub: user.id, client_id: clientId, scope });

  let idToken: string | undefined;
  if (scope.split(/\s+/).includes('openid')) {
    idToken = await signIdToken({
      sub: user.id,
      client_id: clientId,
      email: user.email,
      email_verified: user.email_verified,
      name: `${user.first_name} ${user.last_name}`,
      given_name: user.first_name,
      family_name: user.last_name,
      picture: user.avatar_base64 ?? undefined,
      nonce,
    });
  }

  const refreshToken = generateOpaqueToken(40);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await sql`
    INSERT INTO refresh_tokens (token, user_id, client_id, scope, expires_at, rotated_from)
    VALUES (${refreshToken}, ${user.id}, ${clientId}, ${scope}, ${refreshExpires}, ${rotatedFrom})
  `;

  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      ...(idToken ? { id_token: idToken } : {}),
      scope,
    },
    { headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' } }
  );
}
