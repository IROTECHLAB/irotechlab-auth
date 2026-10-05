import nodemailer, { type Transporter } from 'nodemailer';

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST ?? 'smtp.maileroo.com';
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Implicit TLS for 465; STARTTLS for 587/2525.
  const secure = port === 465 || process.env.SMTP_SECURE === 'true';

  if (!user || !pass) {
    throw new Error('SMTP env vars missing: SMTP_USER, SMTP_PASS');
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure,                 // true → TLS from connection open (port 465)
    requireTLS: !secure,    // require STARTTLS upgrade on 587/2525
    auth: { user, pass },
    tls: {
      // Fail fast if TLS can't be negotiated; never fall back to plaintext
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return _transporter;
}

export async function sendMail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const from = process.env.SMTP_FROM ?? 'IrotechLab Auth <no-reply@irotechlab.com>';
  const info = await getTransporter().sendMail({
    from,
    to,
    subject,
    html,
    text: text ?? html.replace(/<[^>]+>/g, ''),
  });
  return info;
}

export async function verifySmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export function verificationEmailHtml({
  firstName,
  verifyUrl,
}: {
  firstName: string;
  verifyUrl: string;
}) {
  return `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
          <tr><td style="padding:32px 40px 0;">
            <div style="width:48px;height:48px;border-radius:12px;background:#4f46e5;color:#fff;font-size:24px;font-weight:700;text-align:center;line-height:48px;">I</div>
            <h1 style="margin:24px 0 8px;font-size:22px;color:#111827;">Verify your email</h1>
            <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.5;">
              Hi ${escapeHtml(firstName)}, welcome to IrotechLab Auth. Click the button below to verify your email address.
            </p>
            <a href="${verifyUrl}"
               style="display:inline-block;padding:14px 24px;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);color:#fff;font-weight:600;text-decoration:none;border-radius:12px;font-size:15px;">
              Verify email address
            </a>
            <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;line-height:1.5;">
              Or paste this link into your browser:<br>
              <a href="${verifyUrl}" style="color:#4f46e5;word-break:break-all;">${verifyUrl}</a>
            </p>
          </td></tr>
          <tr><td style="padding:24px 40px 32px;">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
              This link expires in 24 hours. If you didn't create an IrotechLab account, you can safely ignore this email.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!));
}

export function passwordResetEmailHtml({
  firstName,
  resetUrl,
}: {
  firstName: string;
  resetUrl: string;
}) {
  return `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
          <tr><td style="padding:32px 40px 0;">
            <div style="width:48px;height:48px;border-radius:12px;background:#000;color:#fff;font-size:20px;font-weight:800;text-align:center;line-height:48px;">IRO</div>
            <h1 style="margin:24px 0 8px;font-size:22px;color:#111827;">Reset your password</h1>
            <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.5;">
              Hi ${escapeHtml(firstName)}, we received a request to reset your IrotechLab password.
              Click the button below to choose a new one.
            </p>
            <a href="${resetUrl}"
               style="display:inline-block;padding:14px 24px;background:#000;color:#fff;font-weight:600;text-decoration:none;border-radius:12px;font-size:15px;">
              Reset password
            </a>
            <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;line-height:1.5;">
              Or paste this link into your browser:<br>
              <a href="${resetUrl}" style="color:#4f46e5;word-break:break-all;">${resetUrl}</a>
            </p>
          </td></tr>
          <tr><td style="padding:24px 40px 32px;">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
              This link expires in 30 minutes and can only be used once. If you didn't request a
              password reset, you can safely ignore this email — your password won't change.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>`;
}
