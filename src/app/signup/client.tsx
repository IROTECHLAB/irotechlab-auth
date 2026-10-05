'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileUpload } from '@/components/FileUpload';
import { IrocapWidget } from '@/components/IrocapWidget';
import { markFormStart, formElapsedMs, getCsrfToken } from '@/lib/bot-signals';

export default function SignupClient() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '', website: '',
  });
  const [avatar, setAvatar] = useState<string | undefined>();
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

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        avatar,
        website: form.website,
        csrf,
        formElapsedMs: formElapsedMs(),
        'irocap-token': captchaToken,
      }),
    });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(j.message ?? j.error ?? 'Signup failed');
      return;
    }
    router.push('/login?signup=1');
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Create Account</h1>

      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={form.website}
        onChange={(e) => setForm({ ...form, website: e.target.value })}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        aria-hidden="true"
      />

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">First name</label>
          <input className="input" value={form.firstName}
            onChange={e => setForm({ ...form, firstName: e.target.value })} required />
        </div>
        <div>
          <label className="label">Last name</label>
          <input className="input" value={form.lastName}
            onChange={e => setForm({ ...form, lastName: e.target.value })} required />
        </div>
      </div>

      <div>
        <label className="label">Email</label>
        <input className="input" type="email" autoComplete="email" value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })} required />
      </div>

      <div>
        <label className="label">Password</label>
        <input className="input" type="password" autoComplete="new-password" value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })} required />
        <p className="mt-1 text-xs subtle">8+ chars, uppercase, lowercase, number.</p>
      </div>

      <div>
        <label className="label">Avatar (optional)</label>
        <FileUpload value={avatar} onChange={setAvatar} label="Upload photo" shape="circle" size={64} />
      </div>

      <IrocapWidget onToken={handleToken} />

      <button className="btn-primary w-full" disabled={!ready}>
        {loading ? 'Creating…' : captchaToken ? 'Create Account' : 'Waiting for captcha…'}
      </button>

      <p className="text-center text-sm muted">
        Have an account?{' '}
        <a href="/login" className="text-brand-600 hover:underline dark:text-brand-400">Sign in</a>
      </p>
    </form>
  );
}
