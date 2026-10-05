import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { emitWebhook } from '@/lib/webhooks';

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

  const owned = await sql`
    SELECT client_id FROM oauth_clients WHERE id = ${id} AND owner_id = ${session.userId}
  `;
  if (!owned[0]) {
    return NextResponse.json(
      { error: 'not_found', message: 'App not found or you do not own it.' },
      { status: 404 }
    );
  }
  const clientId = owned[0].client_id as string;

  const [{ count }] = (await sql`
    SELECT COUNT(*)::int AS count
    FROM user_authorized_apps WHERE client_id = ${clientId}
  `) as { count: number }[];

  await sql`DELETE FROM user_authorized_apps WHERE client_id = ${clientId}`;
  await sql`UPDATE refresh_tokens SET revoked = TRUE WHERE client_id = ${clientId}`;
  await sql`UPDATE authorization_codes SET used = TRUE WHERE client_id = ${clientId}`;

  try {
    await emitWebhook(clientId, 'user.revoked_all', {
      revoked_count: count,
      revoked_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[revoke-all] webhook failed:', e);
  }

  return NextResponse.json({ ok: true, revoked: count });
}
