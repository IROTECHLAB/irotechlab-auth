import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/verification';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = body.email as string | undefined;
  if (!email) return NextResponse.json({ error: 'send {"email":"..."}' }, { status: 400 });

  const rows = await sql`
    SELECT id, email, first_name FROM users WHERE email = ${email}
  `;
  const user = rows[0];
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  try {
    await sendVerificationEmail(user.id, user.email, user.first_name);
    return NextResponse.json({ ok: true, sent_to: user.email });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? String(e),
        stack: e?.stack?.split('\n').slice(0, 5),
        name: e?.name,
        code: e?.code,
        command: e?.command,
        responseCode: e?.responseCode,
      },
      { status: 500 }
    );
  }
}
