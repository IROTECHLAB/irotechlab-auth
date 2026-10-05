'use client';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from './Avatar';

interface Props {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
    emailVerified: boolean;
  };
}

export function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const display = `${user.firstName} ${user.lastName}`.trim() || user.email;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-1 pr-3 hover:border-brand-400"
        aria-label="Account menu"
      >
        <Avatar user={user} size={32} />
        <span className="hidden text-sm font-medium sm:inline">{user.firstName || user.email}</span>
        {user.emailVerified && (
          <span title="Email verified" className="text-brand-600 dark:text-brand-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2 4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6l-8-4zm-1.2 13.4-3.2-3.2 1.4-1.4 1.8 1.8 4.6-4.6 1.4 1.4-6 6z"/>
            </svg>
          </span>
        )}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] py-2 shadow-xl">
          <div className="border-b border-[rgb(var(--border))] px-4 py-3">
            <p className="text-sm font-medium text-[rgb(var(--fg))]">{display}</p>
            <p className="truncate text-xs text-[rgb(var(--fg-muted))]">{user.email}</p>
            {user.emailVerified ? (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6l-8-4zm-1.2 13.4-3.2-3.2 1.4-1.4 1.8 1.8 4.6-4.6 1.4 1.4-6 6z"/></svg>
                Verified
              </span>
            ) : (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Not verified
              </span>
            )}
          </div>
          <Link href="/account" className="block px-4 py-2 text-sm text-[rgb(var(--fg))] hover:bg-[rgb(var(--surface-2))]" onClick={() => setOpen(false)}>
            Account settings
          </Link>
          <Link href="/developer" className="block px-4 py-2 text-sm text-[rgb(var(--fg))] hover:bg-[rgb(var(--surface-2))]" onClick={() => setOpen(false)}>
            Developer settings
          </Link>
          <button
            onClick={logout}
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
