import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { generateWebhookSecret, ALL_WEBHOOK_EVENTS } from '@/lib/webhooks';

export const runtime = 'nodejs';

const createSchema = z.object({
  url: z.string().url('Webhook URL must be a valid URL.'),
  events: z
    .array(z.string())
    .min(1, 'Subscribe to at least one event.')
    .max(ALL_WEBHOOK_EVENTS.length, 'Too many events.'),
});

async function ownedApp(userId: string, appId: string) {
  const rows = await sql`
    SELECT client_id FROM oauth_clients WHERE id = ${appId} AND owner_id = ${userId}
  `;
  return (rows[0]?.client_id as string) ?? null;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const clientId = await ownedApp(session.userId, id);
  if (!clientId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const rows = await sql`
    SELECT id, url, events, is_active, created_at,
           last_success_at, last_failure_at, last_error, failure_count
    FROM webhook_endpoints
    WHERE client_id = ${clientId}
    ORDER BY created_at DESC
  `;
  return NextResponse.json({ webhooks: rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const clientId = await ownedApp(session.userId, id);
  if (!clientId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'invalid_input',
        message: parsed.error.issues[0]?.message ?? 'Check your input.',
      },
      { status: 400 }
    );
  }

  // Only allow known events
  const events = parsed.data.events.filter((e) =>
    (ALL_WEBHOOK_EVENTS as string[]).includes(e)
  );
  if (events.length === 0) {
    return NextResponse.json(
      { error: 'invalid_input', message: 'No valid events selected.' },
      { status: 400 }
    );
  }

  // `ping` is always subscribed so the Test button can deliver.
  // It's a system event — not shown in the UI event picker.
  const eventsWithPing = Array.from(new Set([...events, 'ping']));

  const secret = generateWebhookSecret();

  const rows = await sql`
    INSERT INTO webhook_endpoints (client_id, url, secret, events)
    VALUES (${clientId}, ${parsed.data.url}, ${secret}, ${eventsWithPing})
    RETURNING id, url, events, is_active, created_at
  `;

  return NextResponse.json(
    {
      webhook: rows[0],
      secret,
      warning: 'Save this signing secret now — it will not be shown again.',
    },
    { status: 201 }
  );
}
