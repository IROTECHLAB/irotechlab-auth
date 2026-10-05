'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';

export default function ResetClient() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setBusy(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(
        j.error === 'invalid_or_expired_token'
          ? 'This link is invalid or has expired. Request a new one.'
          : j.error === 'token_already_used'
          ? 'This reset link has already been used.'
          : j.error ?? 'Reset failed.'
      );
      return;
    }
    setDone(true);
    setTimeout(() => router.push('/login?reset=1'), 1500);
  }

  if (!token) {
    return (
      <div className="card mx-auto max-w-md text-center space-y-4">
        <div className="flex justify-center text-brand-600 dark:text-brand-400">
          <Logo size={56} />
        </div>
        <h1 className="text-2xl font-semibold">Invalid reset link</h1>
        <p className="text-sm muted">This link is missing its token.</p>
        <Link href="/forgot-password" className="btn-primary block w-full">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-md space-y-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="text-brand-600 dark:text-brand-400">
          <Logo size={56} />
        </div>
        <h1 className="text-2xl font-semibold">Set a new password</h1>
      </div>

      {done ? (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 ring-1 ring-green-200 dark:bg-green-950/40 dark:text-green-300 dark:ring-green-900 text-center">
          Password updated. Redirecting to sign in…
        </div>
      ) : (
        <>
          {error && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900">
              {error}
            </div>
          )}
          <div>
            <label className="label">New password</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="mt-1 text-xs subtle">
              8+ characters, at least one uppercase, lowercase, and number.
            </p>
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </>
      )}
    </form>
  );
}
