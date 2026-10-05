import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { generateClientSecret } from '@/lib/crypto';
import { hashPassword } from '@/lib/password';
import { devAppLimiter, checkLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  if (!session.userId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'You must be signed in.' },
      { status: 401 }
    );
  }

  if (!(await checkLimit(devAppLimiter, `rotate:${session.userId}`)).ok) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many secret rotations. Wait a minute.' },
      { status: 429 }
    );
  }

  const rows = await sql`
    SELECT id, name, is_public, is_active
    FROM oauth_clients
    WHERE id = ${id} AND owner_id = ${session.userId}
  `;
  const app = rows[0];

  if (!app) {
    return NextResponse.json(
      { error: 'not_found', message: 'App not found or you do not own it.' },
      { status: 404 }
    );
  }

  if (app.is_public) {
    return NextResponse.json(
      {
        error: 'public_client',
        message: 'Public clients do not use a client secret. PKCE is used instead.',
      },
      { status: 400 }
    );
  }

  if (!app.is_active) {
    return NextResponse.json(
      {
        error: 'app_disabled',
        message: 'This app is disabled. Enable it before rotating the secret.',
      },
      { status: 400 }
    );
  }

  const raw = generateClientSecret();
  const hash = await hashPassword(raw);
  const prefix = raw.slice(0, 16) + '…';

  await sql`
    UPDATE oauth_clients
    SET client_secret_hash = ${hash},
        client_secret_prefix = ${prefix},
        updated_at = NOW()
    WHERE id = ${id}
  `;

  return NextResponse.json({
    ok: true,
    clientSecret: raw,
    clientSecretPrefix: prefix,
    warning:
      'The previous secret has been revoked. Update your server env vars immediately — this secret will not be shown again.',
  });
}
