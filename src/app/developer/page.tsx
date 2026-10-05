import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { VerifyBanner } from '@/components/VerifyBanner';
import { VerifiedBadge } from '@/components/VerifiedBadge';

export const runtime = 'nodejs';

export default async function DeveloperPage() {
  const session = await getSession();
  if (!session.userId) redirect('/login?next=/developer');

  const meRows = await sql`SELECT email_verified FROM users WHERE id = ${session.userId}`;
  const verified: boolean = Boolean(meRows[0]?.email_verified);

  const apps = await sql`
    SELECT id, client_id, name, description, is_public, is_active, created_at
    FROM oauth_clients WHERE owner_id = ${session.userId}
    ORDER BY created_at DESC
  `;

  return (
    <div className="space-y-6">
      <VerifyBanner />

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Developer Settings</h1>
          <VerifiedBadge verified={verified} />
        </div>
        <Link href="/developer/new" className="btn-primary">New App</Link>
      </div>

      {apps.length === 0 && (
        <div className="card text-center text-[rgb(var(--fg-muted))]">
          No apps yet.{' '}
          <Link className="text-brand-600 hover:underline" href="/developer/new">
            Create your first OAuth app
          </Link>.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {apps.map(a => (
          <Link key={a.id} href={`/developer/apps/${a.id}`} className="card hover:border-brand-300">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{a.name}</h3>
                <p className="text-sm text-[rgb(var(--fg-muted))]">{a.description ?? 'No description'}</p>
                <p className="mt-2 font-mono text-xs text-[rgb(var(--fg-subtle))]">{a.client_id}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-xs ${a.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {a.is_active ? 'Active' : 'Disabled'}
              </span>
            </div>
            <div className="mt-3 flex gap-2 text-xs text-[rgb(var(--fg-subtle))]">
              <span className="rounded bg-[rgb(var(--surface-2))] px-2 py-0.5">
                {a.is_public ? 'Public (PKCE)' : 'Confidential'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
