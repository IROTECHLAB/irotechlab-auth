import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { createAppSchema } from '@/lib/validators';
import { generateClientId, generateClientSecret } from '@/lib/crypto';
import { hashPassword } from '@/lib/password';
import { devAppLimiter, checkLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
const MAX_APPS = 10;

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const apps = await sql`
    SELECT id, client_id, name, description, homepage_url, logo_base64,
           redirect_uris, allowed_scopes, is_public, is_active, created_at,
           client_secret_prefix
    FROM oauth_clients
    WHERE owner_id = ${session.userId}
    ORDER BY created_at DESC
  `;
  return NextResponse.json({ apps });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userRows = await sql`SELECT email_verified FROM users WHERE id = ${session.userId}`;
  if (!userRows[0]?.email_verified) {
    return NextResponse.json({ error: 'email_not_verified' }, { status: 403 });
  }


  if (!(await checkLimit(devAppLimiter, `devapp:${session.userId}`)).ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const count = await sql`SELECT COUNT(*)::int AS n FROM oauth_clients WHERE owner_id = ${session.userId}`;
  if (count[0].n >= MAX_APPS) {
    return NextResponse.json({ error: 'max_apps_reached', max: MAX_APPS }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createAppSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;

  const clientId = generateClientId();
  const rawSecret = d.isPublic ? null : generateClientSecret();
  const secretHash = rawSecret ? await hashPassword(rawSecret) : null;
  const secretPrefix = rawSecret ? rawSecret.slice(0, 16) + '…' : null;

  const rows = await sql`
    INSERT INTO oauth_clients (
      owner_id, client_id, client_secret_hash, client_secret_prefix,
      name, description, homepage_url, logo_base64,
      redirect_uris, allowed_scopes, is_public
    ) VALUES (
      ${session.userId}, ${clientId}, ${secretHash}, ${secretPrefix},
      ${d.name}, ${d.description ?? null}, ${d.homepageUrl ?? null}, ${d.logo ?? null},
      ${d.redirectUris}, ${d.allowedScopes}, ${d.isPublic}
    )
    RETURNING id, client_id, name, is_public
  `;

  return NextResponse.json({
    app: rows[0],
    clientId,
    clientSecret: rawSecret,
    warning: rawSecret ? 'Store this secret now — it will not be shown again.' : null,
  }, { status: 201 });
}
