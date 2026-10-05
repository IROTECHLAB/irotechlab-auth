import Link from 'next/link';
import { getSession } from '@/lib/session';
import { sql } from '@/lib/db';
import { UserMenu } from './UserMenu';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

export async function Header() {
  const session = await getSession();

  let user: { firstName: string; lastName: string; email: string; avatar: string | null; emailVerified: boolean } | null = null;

  if (session.userId) {
    const rows = await sql`
      SELECT first_name, last_name, email, avatar_base64, email_verified
      FROM users WHERE id = ${session.userId}
    `;
    if (rows[0]) {
      const u = rows[0];
      user = {
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        avatar: u.avatar_base64,
        emailVerified: u.email_verified,
      };
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-[rgb(var(--fg))]">
          <Logo size={32} />
          <span className="font-semibold text-brand-700 dark:text-brand-300">IrotechLab Auth</span>
        </Link>

        <div className="hidden items-center gap-4 md:flex">
            <a href="/widget" className="text-sm text-[rgb(var(--fg-muted))] hover:text-[rgb(var(--fg))]">Widget</a>
          </div>
          <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <UserMenu user={user} />
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <Link href="/login" className="btn-secondary">Login</Link>
              <Link href="/signup" className="btn-primary">Sign up</Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
