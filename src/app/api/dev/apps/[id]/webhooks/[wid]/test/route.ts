import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string; wid: string }> }) {
  const { id, wid } = await params;
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rows = await sql`
    SELECT w.id, w.url, w.secret, w.client_id
    FROM webhook_endpoints w
    JOIN oauth_clients c ON c.client_id = w.client_id
    WHERE w.id = ${wid} AND c.id = ${id} AND c.owner_id = ${session.userId}
  `;
  if (!rows[0]) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const endpoint = rows[0] as { id: string; url: string; secret: string };

  // Fire the ping directly to this endpoint — bypasses the event filter
  // so the test always delivers.
  const timestamp = Math.floor(Date.now() / 1000);
  const deliveryId = Math.random().toString(16).slice(2, 18);
  const body = JSON.stringify({
    id: deliveryId,
    event: 'ping',
    created_at: new Date().toISOString(),
    data: { message: 'This is a test webhook from IrotechLab Auth.', sent_at: new Date().toISOString() },
  });
  const { createHmac } = await import('crypto');
  const signature = createHmac('sha256', endpoint.secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  let status = 0;
  let responseBody = '';
  let error: string | null = null;

  try {
    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'IrotechLab-Webhooks/1.0',
        'X-Iro-Event': 'ping',
        'X-Iro-Delivery': deliveryId,
        'X-Iro-Timestamp': String(timestamp),
        'X-Iro-Signature': `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    status = res.status;
    responseBody = (await res.text()).slice(0, 1000);
    if (!res.ok) error = `HTTP ${res.status}`;
  } catch (e: any) {
    error = e?.message ?? String(e);
  }

  const success = status >= 200 && status < 300;

  await sql`
    INSERT INTO webhook_deliveries (endpoint_id, event, payload, status_code, response_body, error, delivered_at)
    VALUES (
      ${endpoint.id}, 'ping',
      ${JSON.stringify({ message: 'Test webhook' })},
      ${status}, ${responseBody}, ${error},
      ${success ? new Date().toISOString() : null}
    )
  `;

  await sql`
    UPDATE webhook_endpoints SET
      last_success_at = CASE WHEN ${success} THEN NOW() ELSE last_success_at END,
      last_failure_at = CASE WHEN NOT ${success} THEN NOW() ELSE last_failure_at END,
      last_error = ${error},
      failure_count = CASE WHEN ${success} THEN 0 ELSE failure_count + 1 END
    WHERE id = ${endpoint.id}
  `;

  return NextResponse.json({
    ok: success,
    delivery: {
      status_code: status,
      error,
      response_body: responseBody,
      delivered_at: success ? new Date().toISOString() : null,
    },
  });
}
