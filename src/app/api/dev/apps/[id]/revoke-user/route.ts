import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { z } from 'zod';

export const runtime = 'nodejs';
const schema = z.object({ userId: z.string().uuid() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const owned = await sql`
    SELECT client_id FROM oauth_clients WHERE id = ${id} AND owner_id = ${session.userId}
  `;
  if (!owned[0]) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await sql`
    DELETE FROM user_authorized_apps
    WHERE client_id = ${owned[0].client_id} AND user_id = ${parsed.data.userId}
  `;
  await sql`
    DELETE FROM refresh_tokens
    WHERE client_id = ${owned[0].client_id} AND user_id = ${parsed.data.userId}
  `;

  return NextResponse.json({ ok: true });
}
