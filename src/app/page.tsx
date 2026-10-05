import Link from 'next/link';
import { getSession } from '@/lib/session';
import { sql } from '@/lib/db';
import { Avatar } from '@/components/Avatar';
import { Logo } from '@/components/Logo';
import { VerifiedBadge } from '@/components/VerifiedBadge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getSession();

  let user: any = null;
  if (session.userId) {
    const rows = await sql`
      SELECT id, email, first_name, last_name, avatar_base64, email_verified
      FROM users WHERE id = ${session.userId}
    `;
    if (rows[0]) {
      const u = rows[0];
      user = {
        id: u.id, email: u.email,
        firstName: u.first_name, lastName: u.last_name,
        avatar: u.avatar_base64, emailVerified: u.email_verified,
      };
    }
  }

  return (
    <div className="space-y-8">
      {user ? <SignedInHero user={user} /> : <GuestHero />}

      <section className="card">
        <h2 className="text-xl font-semibold">Quick Start</h2>
        <p className="mt-2 text-sm muted">
          Register an app at <code className="rounded bg-[rgb(var(--surface-2))] px-1">/developer/new</code>,
          then redirect users to the authorize endpoint:
        </p>
        <pre className="mt-3 overflow-x-auto rounded bg-neutral-900 p-4 text-xs text-neutral-100">
{`https://irotechlab-auth.netlify.app/api/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/callback
  &response_type=code
  &scope=openid%20profile%20email
  &state=RANDOM_STATE
  &code_challenge=BASE64URL(SHA256(verifier))
  &code_challenge_method=S256`}
        </pre>
      </section>
    </div>
  );
}

function GuestHero() {
  return (
    <section className="text-center">
      <div className="mx-auto mb-6 flex justify-center text-brand-600 dark:text-brand-400">
        <Logo size={96} />
      </div>
      <h1 className="text-4xl font-bold tracking-tight">IrotechLab Auth</h1>
      <p className="mt-3 text-lg muted">
        OAuth 2.0 / OIDC provider — add &ldquo;Login with IrotechLab&rdquo; in under 10 minutes.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/signup" className="btn-primary">Create Account</Link>
        <Link href="/login" className="btn-secondary">Sign in</Link>
      </div>
    </section>
  );
}

function SignedInHero({ user }: { user: any }) {
  const display = `${user.firstName} ${user.lastName}`.trim() || user.email;
  return (
    <section className="card">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        {/* Left: avatar + info */}
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <Avatar user={user} size={64} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold leading-tight break-words">
              Welcome back, {user.firstName || display}
            </h1>
            <p className="mt-1 text-sm muted truncate">{user.email}</p>
            <div className="mt-3">
              <VerifiedBadge verified={user.emailVerified} />
            </div>
          </div>
        </div>
        {/* Right: buttons — stack below on mobile, side on desktop */}
        <div className="flex flex-col sm:flex-row gap-2 md:flex-shrink-0">
          <Link href="/developer" className="btn-primary whitespace-nowrap">Open Developer Portal</Link>
          <Link href="/account" className="btn-secondary whitespace-nowrap">Account</Link>
        </div>
      </div>
    </section>
  );
}
