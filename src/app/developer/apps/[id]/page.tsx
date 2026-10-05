import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { notFound, redirect } from 'next/navigation';
import AppClient from './client';

export const runtime = 'nodejs';

export default async function AppDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) redirect(`/login?next=/developer/apps/${id}`);

  const rows = await sql`
    SELECT * FROM oauth_clients WHERE id = ${id} AND owner_id = ${session.userId}
  `;
  if (!rows[0]) notFound();
  const a = rows[0];

  const [{ count }] = (await sql`
    SELECT COUNT(*)::int AS count
    FROM user_authorized_apps
    WHERE client_id = ${a.client_id}
  `) as { count: number }[];

  return (
    <AppClient
      app={{
        id: a.id,
        clientId: a.client_id,
        name: a.name,
        description: a.description,
        homepageUrl: a.homepage_url,
        logo: a.logo_base64,
        redirectUris: a.redirect_uris,
        allowedScopes: a.allowed_scopes,
        isPublic: a.is_public,
        isActive: a.is_active,
        secretPrefix: a.client_secret_prefix,
      }}
      authorizedCount={count}
    />
  );
}
