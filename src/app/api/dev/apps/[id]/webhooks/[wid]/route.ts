import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { ALL_WEBHOOK_EVENTS } from '@/lib/webhooks';

export const runtime = 'nodejs';

const updateSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
});

async function owned(userId: string, appId: string, webhookId: string) {
  const rows = await sql`
    SELECT w.id
    FROM webhook_endpoints w
    JOIN oauth_clients c ON c.client_id = w.client_id
    WHERE w.id = ${webhookId} AND c.id = ${appId} AND c.owner_id = ${userId}
  `;
  return Boolean(rows[0]);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; wid: string }> }) {
  const { id, wid } = await params;
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await owned(session.userId, id, wid))) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', message: 'Check your input.' }, { status: 400 });
  }
  const d = parsed.data;

  const events = d.events
    ? Array.from(
        new Set([
          ...d.events.filter((e) => (ALL_WEBHOOK_EVENTS as string[]).includes(e)),
          'ping',
        ])
      )
    : undefined;

  const rows = await sql`
    UPDATE webhook_endpoints SET
      url       = COALESCE(${d.url ?? null}, url),
      events    = COALESCE(${events ?? null}, events),
      is_active = COALESCE(${d.isActive ?? null}, is_active)
    WHERE id = ${wid}
    RETURNING id, url, events, is_active, created_at,
              last_success_at, last_failure_at, last_error, failure_count
  `;
  return NextResponse.json({ webhook: rows[0] });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; wid: string }> }) {
  const { id, wid } = await params;
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await owned(session.userId, id, wid))) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await sql`DELETE FROM webhook_endpoints WHERE id = ${wid}`;
  return NextResponse.json({ ok: true });
}
