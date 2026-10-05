'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUpload } from '@/components/FileUpload';
import { WebhooksPanel } from '@/components/WebhooksPanel';

function humanizeError(code: string, fallback?: string): string {
  switch (code) {
    case 'unauthorized': return 'You must be signed in.';
    case 'not_found': return 'App not found, or you do not own it.';
    case 'public_client': return 'Public clients use PKCE instead of a client secret.';
    case 'app_disabled': return 'This app is disabled. Enable it before rotating the secret.';
    case 'rate_limited': return 'Too many requests. Wait a minute and try again.';
    case 'invalid_input': {
      if (fallback?.toLowerCase().includes('https'))
        return 'Redirect URIs must use https:// (http://localhost allowed for development).';
      return fallback || 'Some fields are invalid.';
    }
    default: return fallback || code || 'Something went wrong. Please try again.';
  }
}

export default function AppClient({
  app,
  authorizedCount,
}: {
  app: any;
  authorizedCount: number;
}) {
  const router = useRouter();
  const [state, setState] = useState(app);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [count, setCount] = useState(authorizedCount);
  const [busy, setBusy] = useState(false);
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  function flash(kind: 'ok' | 'err', text: string) {
    setMsg({ kind, text });
    if (kind === 'ok') setTimeout(() => setMsg(null), 4000);
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    for (const u of state.redirectUris) {
      if (!u) continue;
      if (!/^https:\/\/.+/.test(u) && !/^http:\/\/localhost(:\d+)?/.test(u)) {
        setBusy(false);
        flash('err', `Invalid redirect URI "${u}" — must start with https:// (or http://localhost).`);
        return;
      }
    }

    let res: Response;
    try {
      res = await fetch(`/api/dev/apps/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: state.name,
          description: state.description && state.description.trim() !== '' ? state.description : null,
          homepageUrl: state.homepageUrl && state.homepageUrl.trim() !== '' ? state.homepageUrl : null,
          logo: state.logo ?? null,
          redirectUris: state.redirectUris.filter(Boolean),
          allowedScopes: state.allowedScopes,
          isActive: state.isActive,
        }),
      });
    } catch {
      setBusy(false);
      flash('err', 'Network error. Check your connection and try again.');
      return;
    }
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const detail = j.message || humanizeError(j.error, j.message);
      flash('err', detail);
      return;
    }
    flash('ok', 'Changes saved.');
  }

  async function rotate() {
    setBusy(true);
    setShowRotateModal(false);
    let res: Response;
    try {
      res = await fetch(`/api/dev/apps/${app.id}/rotate-secret`, { method: 'POST' });
    } catch {
      setBusy(false);
      flash('err', 'Network error. Check your connection and try again.');
      return;
    }
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      flash('err', humanizeError(j.error, j.message));
      return;
    }
    setNewSecret(j.clientSecret);
    setState({ ...state, secretPrefix: j.clientSecretPrefix });
    flash('ok', 'New secret generated. Copy it now — the old one is revoked.');
  }

  async function revokeAll() {
    setBusy(true);
    setShowRevokeAllModal(false);
    let res: Response;
    try {
      res = await fetch(`/api/dev/apps/${app.id}/revoke-all-users`, { method: 'POST' });
    } catch {
      setBusy(false);
      flash('err', 'Network error. Check your connection and try again.');
      return;
    }
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      flash('err', humanizeError(j.error, j.message));
      return;
    }
    setCount(0);
    flash('ok', 'All users revoked. They will need to authorize again.');
  }

  async function del() {
    if (!confirm('Delete this app? This cannot be undone.')) return;
    setBusy(true);
    const res = await fetch(`/api/dev/apps/${app.id}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      flash('err', humanizeError(j.error, j.message));
      return;
    }
    router.push('/developer');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {state.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={state.logo}
            alt=""
            className="h-14 w-14 rounded-xl object-cover ring-1 ring-[rgb(var(--border))]"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-500/10 text-xl font-bold text-brand-600 ring-1 ring-[rgb(var(--border))] dark:text-brand-400">
            {(state.name?.[0] ?? '?').toUpperCase()}
          </div>
        )}
        <h1 className="text-2xl font-semibold">{state.name}</h1>
      </div>

      {msg && (
        <div
          className={[
            'rounded-lg border p-4 text-sm',
            msg.kind === 'ok'
              ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200'
              : 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
          ].join(' ')}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5">{msg.kind === 'ok' ? '✓' : '⚠'}</span>
            <div className="flex-1">{msg.text}</div>
          </div>
        </div>
      )}

      {/* Credentials */}
      <div className="card space-y-4">
        <div>
          <label className="label">Client ID</label>
          <div className="flex gap-2">
            <input className="input font-mono text-xs" value={app.clientId} readOnly />
            <button type="button" className="btn-secondary whitespace-nowrap"
              onClick={() => copy(app.clientId, 'cid')}>
              {copied === 'cid' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {!state.isPublic && (
          <div>
            <label className="label">Client Secret</label>
            {newSecret ? (
              <div className="space-y-2">
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <strong className="block">⚠️ Save this now</strong>
                  This is the only time the new secret will be shown. The old secret has already
                  stopped working.
                </div>
                <div className="flex gap-2">
                  <input className="input font-mono text-xs" value={newSecret} readOnly />
                  <button type="button" className="btn-secondary whitespace-nowrap"
                    onClick={() => copy(newSecret, 'sec')}>
                    {copied === 'sec' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <button type="button" className="text-xs text-[rgb(var(--fg-muted))] hover:underline"
                  onClick={() => setNewSecret(null)}>Hide secret</button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input className="input font-mono text-xs" readOnly
                    value={state.secretPrefix
                      ? `${state.secretPrefix} (hidden)`
                      : 'No secret — click Generate'} />
                  <button type="button" className="btn-secondary whitespace-nowrap"
                    disabled={busy} onClick={() => setShowRotateModal(true)}>
                    {state.secretPrefix ? 'Regenerate' : 'Generate secret'}
                  </button>
                </div>
                <p className="text-xs subtle">
                  {state.secretPrefix
                    ? 'The full secret is only shown when it is generated. Regenerate to get a new one — the old one stops working immediately.'
                    : 'This app does not have a secret yet. Generate one to enable the token exchange.'}
                </p>
              </div>
            )}
          </div>
        )}

        {state.isPublic && (
          <p className="rounded-lg bg-[rgb(var(--surface-2))] p-3 text-xs subtle">
            This is a <strong>public client</strong>. It uses PKCE for token exchange and does not
            have a client secret.
          </p>
        )}
      </div>

      {/* Settings */}
      <form onSubmit={save} className="card space-y-4">
        <h2 className="text-lg font-semibold">Settings</h2>

        <div>
          <label className="label">Logo</label>
          <FileUpload
            value={state.logo ?? undefined}
            onChange={(logo) => setState({ ...state, logo: logo ?? null })}
            label={state.logo ? 'Change logo' : 'Upload logo'}
            shape="square"
            size={64}
          />
          <p className="mt-1 text-xs subtle">
            Shown to users on the consent screen when they authorize your app.
          </p>
        </div>

        <div>
          <label className="label">Name</label>
          <input className="input" value={state.name}
            onChange={(e) => setState({ ...state, name: e.target.value })} />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={2} value={state.description ?? ''}
            onChange={(e) => setState({ ...state, description: e.target.value })} />
        </div>

        <div>
          <label className="label">Homepage URL</label>
          <input className="input" value={state.homepageUrl ?? ''}
            onChange={(e) => setState({ ...state, homepageUrl: e.target.value })} />
        </div>

        <div>
          <label className="label">Redirect URIs</label>
          <p className="mb-2 text-xs subtle">Must use HTTPS (http://localhost allowed for development).</p>
          {state.redirectUris.map((u: string, i: number) => (
            <div key={i} className="mb-2 flex gap-2">
              <input className="input" value={u}
                onChange={(e) => {
                  const next = [...state.redirectUris];
                  next[i] = e.target.value;
                  setState({ ...state, redirectUris: next });
                }} />
              <button type="button" className="btn-secondary"
                onClick={() => setState({
                  ...state,
                  redirectUris: state.redirectUris.filter((_: any, j: number) => j !== i),
                })}>×</button>
            </div>
          ))}
          <button type="button" className="btn-secondary"
            onClick={() => setState({ ...state, redirectUris: [...state.redirectUris, ''] })}>
            Add URI
          </button>
        </div>

        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={state.isActive}
            onChange={(e) => setState({ ...state, isActive: e.target.checked })} />
          Active
        </label>

        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="btn-danger" onClick={del} disabled={busy}>
            Delete App
          </button>
        </div>
      </form>

      {/* Authorized users count */}
      <section className="card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Authorized users</h2>
            <p className="mt-1 text-sm muted">
              {count === 0
                ? 'No users have authorized this app yet.'
                : `${count} user${count === 1 ? '' : 's'} have signed in through this app.`}
            </p>
          </div>
          {count > 0 && (
            <button
              type="button"
              className="btn-danger"
              disabled={busy}
              onClick={() => setShowRevokeAllModal(true)}
            >
              Revoke all
            </button>
          )}
        </div>
      </section>

      <WebhooksPanel appId={app.id} />

      {/* Rotate confirm */}
      {showRotateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowRotateModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Regenerate client secret?</h3>
            <p className="mt-3 text-sm text-[rgb(var(--fg-muted))]">
              Generating a new secret will <strong className="text-red-600 dark:text-red-400">immediately invalidate the current one</strong>.
              Any app using it will fail to exchange tokens until you deploy the new secret.
            </p>
            <p className="mt-2 text-sm text-[rgb(var(--fg-muted))]">
              You will see the new secret <strong>once</strong>. Copy it before closing.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setShowRotateModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={rotate} disabled={busy}>
                {busy ? 'Generating…' : 'Yes, regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke all confirm */}
      {showRevokeAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowRevokeAllModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Revoke all users?</h3>
            <p className="mt-3 text-sm text-[rgb(var(--fg-muted))]">
              This will immediately revoke all <strong>{count}</strong> authorized user
              {count === 1 ? '' : 's'} and invalidate every refresh token issued to this app.
            </p>
            <p className="mt-2 text-sm text-[rgb(var(--fg-muted))]">
              Users will need to authorize again the next time they sign in.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setShowRevokeAllModal(false)}>Cancel</button>
              <button className="btn-danger" onClick={revokeAll} disabled={busy}>
                {busy ? 'Revoking…' : `Yes, revoke all ${count}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
