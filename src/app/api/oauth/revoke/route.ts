import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { getSession } from '@/lib/session';
import { emitWebhook } from '@/lib/webhooks';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ctype = req.headers.get('content-type') ?? '';

  // Malformed request — no form content-type and no session cookie
  const hasForm = ctype.includes('application/x-www-form-urlencoded') || ctype.includes('multipart/form-data');
  const hasSession = Boolean(req.cookies.get('iro_session')?.value);
  if (!hasForm && !hasSession) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  // Case 1: form-encoded (RFC 7009 from client apps)
  if (ctype.includes('application/x-www-form-urlencoded') || ctype.includes('multipart/form-data')) {
    const form = await req.formData();
    const token = form.get('token') as string;
    const clientId = form.get('client_id') as string;
    const clientSecret = form.get('client_secret') as string | null;

    if (!token || !clientId) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    const clients = await sql`
      SELECT client_id, client_secret_hash, is_public, is_active
      FROM oauth_clients WHERE client_id = ${clientId}
    `;
    const client = clients[0];
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

    await sql`
      UPDATE refresh_tokens SET revoked = TRUE
      WHERE token = ${token} AND client_id = ${clientId}
    `;
    await sql`
      UPDATE refresh_tokens SET revoked = TRUE
      WHERE rotated_from = ${token}
    `;

    return new NextResponse(null, { status: 200 });
  }

  // Case 2: session-authenticated user revoking their own access (from /account)
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const clientId = url.searchParams.get('client_id');
  if (!clientId) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  await sql`
    DELETE FROM user_authorized_apps
    WHERE user_id = ${session.userId} AND client_id = ${clientId}
  `;
  await sql`
    UPDATE refresh_tokens SET revoked = TRUE
    WHERE user_id = ${session.userId} AND client_id = ${clientId}
  `;

  try {
    await emitWebhook(clientId, 'user.revoked', {
      user_id: session.userId,
      revoked_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[revoke] webhook failed:', e);
  }

  return NextResponse.json({ ok: true });
}
