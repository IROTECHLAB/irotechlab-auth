import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ConsentActions } from './client';

export const runtime = 'nodejs';

interface ClientRow {
  client_id: string;
  name: string;
  description: string | null;
  logo_base64: string | null;
  homepage_url: string | null;
  redirect_uris: string[];
}

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const q = await searchParams;
  const session = await getSession();

  if (!session.userId) {
    const next = `/oauth/consent?${new URLSearchParams(q).toString()}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const clients = await sql`
    SELECT client_id, name, description, logo_base64, homepage_url, redirect_uris
    FROM oauth_clients WHERE client_id = ${q.client_id}
  `;
  const client = clients[0] as ClientRow | undefined;
  if (!client) redirect('/');

  const scopes = (q.scope ?? 'openid profile email').split(/\s+/);

  return (
    <div className="card mx-auto max-w-lg space-y-5">
      {/* ---------- App header with logo ---------- */}
      <div className="flex items-center gap-4">
        <AppLogo client={client} size={64} />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{client.name}</h1>
          <p className="text-sm muted">wants to access your IrotechLab account</p>
        </div>
      </div>

      {client.description && (
        <p className="text-sm muted">{client.description}</p>
      )}

      {client.homepage_url && (
        <p className="text-xs subtle">
          <a
            href={client.homepage_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 hover:underline dark:text-brand-400"
          >
            {client.homepage_url}
          </a>
        </p>
      )}

      {/* ---------- Scopes ---------- */}
      <div>
        <h2 className="mb-2 text-sm font-medium">This app will be able to:</h2>
        <ul className="space-y-2 text-sm">
          {scopes.map((s: string) => (
            <li key={s} className="flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0 text-brand-600 dark:text-brand-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span>
                {s === 'openid' && 'Verify your identity'}
                {s === 'profile' && 'View your name and profile picture'}
                {s === 'email' && 'View your email address'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ---------- Signed-in-as hint ---------- */}
      <div className="rounded-lg bg-[rgb(var(--surface-2))] p-3 text-xs muted">
        You are signed in as <strong>{session.email}</strong>.{' '}
        <Link href="/account" className="text-brand-600 hover:underline dark:text-brand-400">
          Manage account
        </Link>
      </div>

      {/* ---------- Actions ---------- */}
      <ConsentActions query={q} />

      <p className="text-center text-xs subtle">
        You can revoke access at any time from your account settings.
      </p>
    </div>
  );
}

/** Renders the app's logo, or an initial-letter fallback. */
function AppLogo({ client, size = 64 }: { client: ClientRow; size?: number }) {
  const initial = (client.name?.[0] ?? '?').toUpperCase();

  // Deterministic colour from the client_id so the fallback looks "designed"
  const hue = hashHue(client.client_id);
  const style = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.42),
  };

  if (client.logo_base64 && client.logo_base64.startsWith('data:image')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={client.logo_base64}
        alt={client.name}
        style={style}
        className="flex-shrink-0 rounded-xl object-cover ring-1 ring-[rgb(var(--border))]"
      />
    );
  }

  return (
    <div
      style={{
        ...style,
        background: `hsl(${hue} 70% 45% / 0.12)`,
        color: `hsl(${hue} 70% 35%)`,
      }}
      className="flex flex-shrink-0 items-center justify-center rounded-xl font-bold ring-1 ring-[rgb(var(--border))] dark:bg-[hsl(var(--h) 40% 15%)] dark:text-[hsl(var(--h) 60% 70%)]"
    >
      {initial}
    </div>
  );
}

function hashHue(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}
