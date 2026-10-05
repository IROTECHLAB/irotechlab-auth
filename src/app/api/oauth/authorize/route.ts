import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { generateOpaqueToken } from '@/lib/crypto';
import { z } from 'zod';
import { emitWebhook } from '@/lib/webhooks';

export const runtime = 'nodejs';

const authzSchema = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  response_type: z.literal('code'),
  scope: z.string().default('openid profile email'),
  state: z.string().optional(),
  code_challenge: z.string().min(43).max(128),
  code_challenge_method: z.literal('S256'),
  nonce: z.string().optional(),
  prompt: z.enum(['none', 'login', 'consent']).optional(),
  login_hint: z.string().optional(),
  max_age: z.coerce.number().int().nonnegative().optional(),
});

function errorJson(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = authzSchema.safeParse(params);
  if (!parsed.success) return errorJson('invalid_request');
  const q = parsed.data;

  const clients = await sql`
    SELECT client_id, redirect_uris, allowed_scopes, is_public, is_active
    FROM oauth_clients WHERE client_id = ${q.client_id}
  `;
  const client = clients[0];
  if (!client || !client.is_active) return errorJson('invalid_client');
  if (!client.redirect_uris.includes(q.redirect_uri)) return errorJson('invalid_redirect_uri');
  if (!client.is_public && !q.code_challenge) return errorJson('pkce_required');

  const session = await getSession();
  const userId: string | undefined = session.userId;

  const requireLogin =
    q.prompt === 'login' ||
    !userId ||
    (q.max_age !== undefined && isSessionStale(req, q.max_age));

  if (requireLogin || !userId) {
    const next = req.nextUrl.pathname + req.nextUrl.search;
    const url = new URL('/login', req.url);
    url.searchParams.set('next', next);
    if (q.login_hint) url.searchParams.set('email', q.login_hint);
    return NextResponse.redirect(url);
  }

  // Email verification gate — route user to a verify prompt
  const verifiedRows = await sql`
    SELECT email_verified FROM users WHERE id = ${userId}
  `;
  if (!verifiedRows[0]?.email_verified) {
    const url = new URL('/verify-email-required', req.url);
    url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  const requestedScopes = q.scope.split(/\s+/);
  const authorized = await sql`
    SELECT scopes FROM user_authorized_apps
    WHERE user_id = ${userId} AND client_id = ${q.client_id}
  `;
  const hasAll =
    authorized[0]?.scopes?.every((s: string) => requestedScopes.includes(s)) ?? false;
  const requireConsent = q.prompt === 'consent' || !hasAll;

  if (requireConsent) {
    const consent = new URL('/oauth/consent', req.url);
    consent.search = req.nextUrl.search;
    return NextResponse.redirect(consent);
  }
  return issueCode(q, userId);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params = Object.fromEntries(form) as Record<string, string>;
  const parsed = authzSchema.safeParse(params);
  if (!parsed.success) return errorJson('invalid_request');
  const q = parsed.data;

  if (params.decision !== 'approve') {
    const url = new URL(q.redirect_uri);
    url.searchParams.set('error', 'access_denied');
    if (q.state) url.searchParams.set('state', q.state);
    return NextResponse.redirect(url);
  }

  const session = await getSession();
  const userId: string | undefined = session.userId;
  if (!userId) return errorJson('unauthorized');

  const verifiedRows = await sql`
    SELECT email_verified FROM users WHERE id = ${userId}
  `;
  if (!verifiedRows[0]?.email_verified) return errorJson('email_not_verified');

  const scopes = q.scope.split(/\s+/);
  await sql`
    INSERT INTO user_authorized_apps (user_id, client_id, scopes)
    VALUES (${userId}, ${q.client_id}, ${scopes})
    ON CONFLICT (user_id, client_id)
    DO UPDATE SET scopes = EXCLUDED.scopes, authorized_at = NOW()
  `;

  // Fire webhook (best-effort — don't block the redirect)
  try {
    await emitWebhook(q.client_id, 'user.authorized', {
      user_id: userId,
      scopes,
      authorized_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[authorize] webhook failed:', e);
  }

  return issueCode(q, userId);
}

async function issueCode(q: any, userId: string) {
  const code = generateOpaqueToken(32);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await sql`
    INSERT INTO authorization_codes
      (code, client_id, user_id, redirect_uri, scope,
       code_challenge, code_challenge_method, nonce, expires_at)
    VALUES (${code}, ${q.client_id}, ${userId}, ${q.redirect_uri}, ${q.scope},
            ${q.code_challenge}, ${q.code_challenge_method},
            ${q.nonce ?? null}, ${expiresAt})
  `;

  const url = new URL(q.redirect_uri);
  url.searchParams.set('code', code);
  if (q.state) url.searchParams.set('state', q.state);
  return NextResponse.redirect(url);
}

function isSessionStale(req: NextRequest, maxAge: number) {
  const authTime = req.cookies.get('iro_auth_time')?.value;
  if (!authTime) return true;
  return Date.now() / 1000 - Number(authTime) > maxAge;
}
