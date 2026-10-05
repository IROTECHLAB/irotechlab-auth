'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUpload } from '@/components/FileUpload';

export default function NewAppPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'secret'>('form');
  const [credentials, setCredentials] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', homepageUrl: '', logo: undefined as string | undefined,
    redirectUris: [''], allowedScopes: ['openid', 'profile', 'email'] as string[],
    isPublic: false,
  });

  function setRedirect(i: number, v: string) {
    const next = [...form.redirectUris]; next[i] = v; setForm({ ...form, redirectUris: next });
  }
  function toggleScope(s: string) {
    setForm({
      ...form,
      allowedScopes: form.allowedScopes.includes(s)
        ? form.allowedScopes.filter(x => x !== s)
        : [...form.allowedScopes, s],
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const res = await fetch('/api/dev/apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        redirectUris: form.redirectUris.filter(Boolean),
        description: form.description || undefined,
        homepageUrl: form.homepageUrl || undefined,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Failed to create app');
      return;
    }
    const j = await res.json();
    setCredentials(j);
    setStep('secret');
  }

  if (step === 'secret' && credentials) {
    return (
      <div className="card mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold text-green-700">App created ✓</h1>
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          {credentials.warning ?? 'Copy your credentials now.'}
        </p>
        <div>
          <label className="label">Client ID</label>
          <CopyField value={credentials.clientId} />
        </div>
        {credentials.clientSecret && (
          <div>
            <label className="label">Client Secret</label>
            <CopyField value={credentials.clientSecret} />
          </div>
        )}
        <button className="btn-primary w-full" onClick={() => router.push(`/developer/apps/${credentials.app.id}`)}>
          Go to app dashboard
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold">Create OAuth App</h1>
      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div><label className="label">App name *</label>
        <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
      <div><label className="label">Description</label>
        <textarea className="input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
      <div><label className="label">Homepage URL</label>
        <input className="input" type="url" placeholder="https://yourapp.com" value={form.homepageUrl} onChange={e => setForm({ ...form, homepageUrl: e.target.value })} /></div>
      <div>
        <label className="label">Logo</label>
        <FileUpload
          value={form.logo}
          onChange={(logo) => setForm({ ...form, logo })}
          label="Upload logo"
          shape="square"
          size={64}
        />
      </div>

      <div>
        <label className="label">Redirect URIs *</label>
        {form.redirectUris.map((u, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input className="input" placeholder="https://yourapp.com/callback" value={u} onChange={e => setRedirect(i, e.target.value)} />
            {form.redirectUris.length > 1 && (
              <button type="button" className="btn-secondary" onClick={() => setForm({ ...form, redirectUris: form.redirectUris.filter((_, idx) => idx !== i) })}>×</button>
            )}
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={() => setForm({ ...form, redirectUris: [...form.redirectUris, ''] })}>Add URI</button>
      </div>

      <div>
        <label className="label">Allowed scopes *</label>
        {['openid', 'profile', 'email'].map(s => (
          <label key={s} className="mr-4 inline-flex items-center gap-2">
            <input type="checkbox" checked={form.allowedScopes.includes(s)} onChange={() => toggleScope(s)} />
            <span className="text-sm">{s}</span>
          </label>
        ))}
      </div>

      <div>
        <label className="label">Client type</label>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={!form.isPublic} onChange={() => setForm({ ...form, isPublic: false })} />
            Confidential (server-side apps, uses client secret)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={form.isPublic} onChange={() => setForm({ ...form, isPublic: true })} />
            Public (SPA / mobile, PKCE only)
          </label>
        </div>
      </div>

      <button className="btn-primary w-full">Create App</button>
    </form>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input className="input font-mono text-xs" value={value} readOnly />
      <button type="button" className="btn-secondary" onClick={async () => {
        await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500);
      }}>{copied ? 'Copied' : 'Copy'}</button>
    </div>
  );
}
