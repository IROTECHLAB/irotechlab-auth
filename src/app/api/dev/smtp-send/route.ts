import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/mailer';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const to = body.to as string | undefined;

  if (!to) {
    return NextResponse.json({ error: 'send {"to":"you@example.com"}' }, { status: 400 });
  }

  try {
    const info = await sendMail({
      to,
      subject: 'IrotechLab SMTP test',
      html: '<h1>It works!</h1><p>SMTP is delivering.</p>',
    });
    return NextResponse.json({
      ok: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? String(e),
        code: e?.code,
        command: e?.command,
        responseCode: e?.responseCode,
        response: e?.response,
      },
      { status: 500 }
    );
  }
}
