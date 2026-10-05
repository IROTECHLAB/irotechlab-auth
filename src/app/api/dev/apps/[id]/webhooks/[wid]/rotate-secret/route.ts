import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { generateWebhookSecret } from '@/lib/webhooks';

export const runtime = 'nodejs';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string; wid: string }> }) {
  const { id, wid } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'You must be signed in.' },
      { status: 401 }
    );
  }

  const owned = await sql`
    SELECT w.id
    FROM webhook_endpoints w
    JOIN oauth_clients c ON c.client_id = w.client_id
    WHERE w.id = ${wid} AND c.id = ${id} AND c.owner_id = ${session.userId}
  `;
  if (!owned[0]) {
    return NextResponse.json(
      { error: 'not_found', message: 'Webhook not found or you do not own it.' },
      { status: 404 }
    );
  }

  const secret = generateWebhookSecret();

  await sql`
    UPDATE webhook_endpoints SET
      secret = ${secret},
      failure_count = 0,
      last_error = NULL
    WHERE id = ${wid}
  `;

  return NextResponse.json({
    ok: true,
    secret,
    warning:
      'The previous signing secret has been revoked. Update your receiver immediately — this secret will not be shown again.',
  });
}
