'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IrocapWidget } from '@/components/IrocapWidget';
import { markFormStart, formElapsedMs, getCsrfToken } from '@/lib/bot-signals';

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/account';
  const resetDone = params.get('reset') === '1';
  const signupDone = params.get('signup') === '1';

  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    markFormStart();
  }, []);

  const handleToken = useCallback((t: string | null) => setCaptchaToken(t), []);
  const ready = captchaToken !== null && !loading;

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

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, password, website, csrf,
        formElapsedMs: formElapsedMs(),
        'irocap-token': captchaToken,
      }),
    });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(j.message ?? j.error ?? 'Login failed');
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Sign In</h1>

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

      {resetDone && (
        <div className="rounded bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
          Password reset successful. Sign in with your new password.
        </div>
      )}
      {signupDone && (
        <div className="rounded bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
          Account created. Verify your email, then sign in.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div>
        <label className="label">Email</label>
        <input className="input" type="email" autoComplete="email" value={email}
          onChange={e => setEmail(e.target.value)} required />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label">Password</label>
          <a href="/forgot-password" className="text-xs text-brand-600 hover:underline dark:text-brand-400">
            Forgot password?
          </a>
        </div>
        <input className="input" type="password" autoComplete="current-password" value={password}
          onChange={e => setPassword(e.target.value)} required />
      </div>

      <IrocapWidget onToken={handleToken} />

      <button className="btn-primary w-full" disabled={!ready}>
        {loading ? 'Signing in…' : captchaToken ? 'Sign In' : 'Waiting for captcha…'}
      </button>

      <p className="text-center text-sm muted">
        No account?{' '}
        <a href="/signup" className="text-brand-600 hover:underline dark:text-brand-400">Sign up</a>
      </p>
    </form>
  );
}
