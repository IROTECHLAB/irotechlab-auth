import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string; wid: string }> }) {
  const { id, wid } = await params;
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const owned = await sql`
    SELECT w.id
    FROM webhook_endpoints w
    JOIN oauth_clients c ON c.client_id = w.client_id
    WHERE w.id = ${wid} AND c.id = ${id} AND c.owner_id = ${session.userId}
  `;
  if (!owned[0]) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const deliveries = await sql`
    SELECT id, event, status_code, response_body, error, delivered_at, created_at
    FROM webhook_deliveries
    WHERE endpoint_id = ${wid}
    ORDER BY created_at DESC
    LIMIT 20
  `;
  return NextResponse.json({ deliveries });
}
