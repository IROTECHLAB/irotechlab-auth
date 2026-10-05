import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { updateAppSchema } from '@/lib/validators';

export const runtime = 'nodejs';

async function ownApp(userId: string, appId: string) {
  const rows = await sql`
    SELECT id FROM oauth_clients WHERE id = ${appId} AND owner_id = ${userId}
  `;
  return rows[0] ?? null;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'You must be signed in.' },
      { status: 401 }
    );
  }
  if (!(await ownApp(session.userId, id))) {
    return NextResponse.json(
      { error: 'not_found', message: 'App not found or you do not own it.' },
      { status: 404 }
    );
  }

  const rows = await sql`
    SELECT id, client_id, name, description, homepage_url, logo_base64,
           redirect_uris, allowed_scopes, is_public, is_active,
           client_secret_prefix, created_at, updated_at
    FROM oauth_clients WHERE id = ${id}
  `;
  return NextResponse.json({ app: rows[0] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'You must be signed in.' },
      { status: 401 }
    );
  }
  if (!(await ownApp(session.userId, id))) {
    return NextResponse.json(
      { error: 'not_found', message: 'App not found or you do not own it.' },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = updateAppSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    console.warn('[dev/apps PATCH] validation failed', {
      path: first?.path,
      message: first?.message,
    });
    return NextResponse.json(
      {
        error: 'invalid_input',
        message: first?.message ?? 'Check your input.',
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }
  const d = parsed.data;

  // Determine which keys the client actually sent (before zod transforms).
  const has = (key: string) =>
    body != null && Object.prototype.hasOwnProperty.call(body, key);

  // Normalize empties: "" and null become actual null for optional text fields.
  const desc = d.description === '' || d.description === null ? null : d.description;
  const home = d.homepageUrl === '' || d.homepageUrl === null ? null : d.homepageUrl;
  const logo = d.logo === null ? null : d.logo;

  const rows = await sql`
    UPDATE oauth_clients SET
      name           = COALESCE(${d.name ?? null}, name),
      description    = CASE WHEN ${has('description')} THEN ${desc ?? null} ELSE description END,
      homepage_url   = CASE WHEN ${has('homepageUrl')} THEN ${home ?? null} ELSE homepage_url END,
      logo_base64    = CASE WHEN ${has('logo')} THEN ${logo ?? null} ELSE logo_base64 END,
      redirect_uris  = COALESCE(${d.redirectUris ?? null}, redirect_uris),
      allowed_scopes = COALESCE(${d.allowedScopes ?? null}, allowed_scopes),
      is_active      = COALESCE(${d.isActive ?? null}, is_active),
      updated_at     = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return NextResponse.json({ app: rows[0] });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'You must be signed in.' },
      { status: 401 }
    );
  }
  if (!(await ownApp(session.userId, id))) {
    return NextResponse.json(
      { error: 'not_found', message: 'App not found or you do not own it.' },
      { status: 404 }
    );
  }

  const rows = await sql`SELECT client_id FROM oauth_clients WHERE id = ${id}`;
  const clientId = rows[0].client_id;

  await sql`DELETE FROM oauth_clients WHERE id = ${id}`;
  await sql`DELETE FROM refresh_tokens WHERE client_id = ${clientId}`;
  await sql`DELETE FROM user_authorized_apps WHERE client_id = ${clientId}`;
  await sql`UPDATE authorization_codes SET used = TRUE WHERE client_id = ${clientId}`;

  return NextResponse.json({ ok: true });
}
