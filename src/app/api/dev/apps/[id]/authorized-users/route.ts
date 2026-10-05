import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const owned = await sql`
    SELECT client_id FROM oauth_clients WHERE id = ${id} AND owner_id = ${session.userId}
  `;
  if (!owned[0]) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const clientId = owned[0].client_id as string;

  const [{ count }] = (await sql`
    SELECT COUNT(*)::int AS count
    FROM user_authorized_apps
    WHERE client_id = ${clientId}
  `) as { count: number }[];

  return NextResponse.json({ count });
}
