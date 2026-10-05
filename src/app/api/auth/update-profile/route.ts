import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { updateProfileSchema } from '@/lib/validators';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const { firstName, lastName, avatar } = parsed.data;
  const rows = await sql`
    UPDATE users SET
      first_name = COALESCE(${firstName ?? null}, first_name),
      last_name  = COALESCE(${lastName  ?? null}, last_name),
      avatar_base64 = COALESCE(${avatar  ?? null}, avatar_base64),
      updated_at = NOW()
    WHERE id = ${session.userId}
    RETURNING id, email, first_name, last_name, avatar_base64
  `;
  return NextResponse.json({ user: rows[0] });
}
