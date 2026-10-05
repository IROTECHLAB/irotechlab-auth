import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = session.userId;
  await sql`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ${userId}`;
  await sql`DELETE FROM user_authorized_apps WHERE user_id = ${userId}`;
  await sql`UPDATE authorization_codes SET used = TRUE WHERE user_id = ${userId}`;
  session.destroy();

  const resp = NextResponse.json({ ok: true });
  resp.cookies.delete('iro_auth_time');
  return resp;
}
