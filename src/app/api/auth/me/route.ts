import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ user: null }, { status: 401 });

  const rows = await sql`
    SELECT id, email, first_name, last_name, avatar_base64, email_verified, is_developer
    FROM users WHERE id = ${session.userId}
  `;
  if (!rows[0]) return NextResponse.json({ user: null }, { status: 401 });
  const u = rows[0];

  return NextResponse.json({
    user: {
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      avatar: u.avatar_base64,
      emailVerified: u.email_verified,
      isDeveloper: u.is_developer,
    },
  });
}
