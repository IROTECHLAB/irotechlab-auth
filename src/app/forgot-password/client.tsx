'use client';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { IrocapWidget } from '@/components/IrocapWidget';
import { markFormStart, formElapsedMs, getCsrfToken } from '@/lib/bot-signals';

export default function ForgotClient() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    markFormStart();
  }, []);

  const handleToken = useCallback((t: string | null) => setCaptchaToken(t), []);
  const ready = captchaToken !== null && email.length > 0 && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!captchaToken) {
      setError('Please wait for the captcha to finish verifying.');
      return;
    }
    setLoading(true);

    let csrf: string;
    try {
      csrf = await getCsrfToken();
    } catch {
      setLoading(false);
      setError('Could not initialise the form. Reload the page.');
      return;
    }

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, website, csrf,
        formElapsedMs: formElapsedMs(),
        'irocap-token': captchaToken,
      }),
    });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(j.message ?? j.error ?? 'Failed to send reset link.');
      return;
    }
    setDone(true);
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-md space-y-5">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        aria-hidden="true"
      />

      <div className="flex flex-col items-center gap-3 text-center">
        <div className="text-brand-600 dark:text-brand-400">
          <Logo size={56} />
        </div>
        <h1 className="text-2xl font-semibold">Forgot your password?</h1>
        <p className="text-sm muted">Enter your email and we&rsquo;ll send you a link to reset it.</p>
      </div>

      {done ? (
        <>
          <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 ring-1 ring-green-200 dark:bg-green-950/40 dark:text-green-300 dark:ring-green-900">
            If an account exists for <strong>{email}</strong>, a reset link is on its way.
          </div>
          <Link href="/login" className="btn-secondary block w-full text-center">Back to sign in</Link>
        </>
      ) : (
        <>
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          <IrocapWidget onToken={handleToken} />
          <button className="btn-primary w-full" disabled={!ready}>
            {loading ? 'Sending…' : captchaToken ? 'Send reset link' : 'Waiting for captcha…'}
          </button>
          <p className="text-center text-sm muted">
            Remembered it?{' '}
            <Link href="/login" className="text-brand-600 hover:underline dark:text-brand-400">Sign in</Link>
          </p>
        </>
      )}
    </form>
  );
}
