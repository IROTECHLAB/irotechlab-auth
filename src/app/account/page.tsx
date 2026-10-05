import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import AccountClient from './client';
import { VerifyBanner } from '@/components/VerifyBanner';

export const runtime = 'nodejs';

export default async function AccountPage() {
  const session = await getSession();
  if (!session.userId) redirect('/login?next=/account');

  const users = await sql`
    SELECT id, email, first_name, last_name, avatar_base64, email_verified
    FROM users WHERE id = ${session.userId}
  `;
  const u = users[0];

  const apps = await sql`
    SELECT a.client_id, c.name, c.logo_base64, a.scopes, a.authorized_at
    FROM user_authorized_apps a
    JOIN oauth_clients c ON c.client_id = a.client_id
    WHERE a.user_id = ${session.userId}
    ORDER BY a.authorized_at DESC
  `;

  return (
    <AccountClient
      banner={<VerifyBanner />}
      user={{
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        avatar: u.avatar_base64,
        emailVerified: u.email_verified,
      }}
      apps={apps.map(a => ({
        clientId: a.client_id,
        name: a.name,
        logo: a.logo_base64,
        scopes: a.scopes,
        authorizedAt: a.authorized_at,
      }))}
    />
  );
}
