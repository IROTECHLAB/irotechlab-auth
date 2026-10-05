import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyVerificationToken } from '@/lib/verification';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = body?.token as string | undefined;
  if (!token) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });

  let claims;
  try {
    claims = await verifyVerificationToken(token);
  } catch {
    return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 400 });
  }

  const rows = await sql`
    UPDATE users
    SET email_verified = TRUE, updated_at = NOW()
    WHERE id = ${claims.userId} AND email = ${claims.email}
    RETURNING id, email, email_verified
  `;
  if (!rows[0]) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user: rows[0] });
}
