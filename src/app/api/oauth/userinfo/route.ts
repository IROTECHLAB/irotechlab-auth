import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/jwt';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'invalid_token' }, {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer realm="userinfo"' },
    });
  }

  let payload: any;
  try {
    payload = await verifyAccessToken(auth.slice(7));
  } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const rows = await sql`
    SELECT id, email, email_verified, first_name, last_name, avatar_base64
    FROM users WHERE id = ${payload.sub}
  `;
  const u = rows[0];
  if (!u) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });

  const scopes: string[] = (payload.scope ?? '').split(/\s+/);
  const res: Record<string, any> = { sub: u.id };
  if (scopes.includes('email')) {
    res.email = u.email;
    res.email_verified = u.email_verified;
  }
  if (scopes.includes('profile')) {
    res.name = `${u.first_name} ${u.last_name}`;
    res.given_name = u.first_name;
    res.family_name = u.last_name;
    if (u.avatar_base64) res.picture = u.avatar_base64;
  }

  return NextResponse.json(res);
}
