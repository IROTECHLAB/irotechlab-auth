'use client';
import { useEffect, useState } from 'react';

type Webhook = {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  failure_count: number;
};

const EVENT_LABELS: Record<string, string> = {
  'user.authorized': 'User authorized the app',
  'user.revoked': 'User revoked access',
  'user.revoked_all': 'All users revoked by app owner',
  'refresh_token.rotated': 'Refresh token rotated',
  'client.updated': 'App settings updated',
  'client.disabled': 'App disabled',
  'client.deleted': 'App deleted',
  'email.verified': 'User verified their email',
};

export function WebhooksPanel({ appId }: { appId: string }) {
  const [hooks, setHooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [rotateTarget, setRotateTarget] = useState<Webhook | null>(null);
  const [rotateSecret, setRotateSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/dev/apps/${appId}/webhooks`);
    const j = await r.json().catch(() => ({}));
    setHooks(j.webhooks ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [appId]);

  function flash(kind: 'ok' | 'err', text: string) {
    setMsg({ kind, text });
    if (kind === 'ok') setTimeout(() => setMsg(null), 4000);
  }

  async function addHook(url: string, events: string[]) {
    const r = await fetch(`/api/dev/apps/${appId}/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, events }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      flash('err', j.message ?? 'Failed to add webhook.');
      return;
    }
    setNewSecret(j.secret);
    setShowAdd(false);
    load();
  }

  async function doRotate() {
    if (!rotateTarget) return;
    setBusy(true);
    const r = await fetch(
      `/api/dev/apps/${appId}/webhooks/${rotateTarget.id}/rotate-secret`,
      { method: 'POST' }
    );
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      flash('err', j.message ?? 'Failed to rotate secret.');
      setRotateTarget(null);
      return;
    }
    setRotateSecret(j.secret);
    setRotateTarget(null);
    flash('ok', 'New secret generated. Copy it now — the old one is revoked.');
    load();
  }

  async function toggleActive(h: Webhook) {
    await fetch(`/api/dev/apps/${appId}/webhooks/${h.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !h.is_active }),
    });
    load();
  }

  async function remove(h: Webhook) {
    if (!confirm(`Delete webhook for ${h.url}?`)) return;
    await fetch(`/api/dev/apps/${appId}/webhooks/${h.id}`, { method: 'DELETE' });
    load();
  }

  async function test(h: Webhook) {
    flash('ok', 'Test event sent…');
    const r = await fetch(`/api/dev/apps/${appId}/webhooks/${h.id}/test`, {
      method: 'POST',
    });
    const j = await r.json().catch(() => ({}));
    const d = j.delivery;
    if (d && d.status_code >= 200 && d.status_code < 300) {
      flash('ok', `Test delivered — HTTP ${d.status_code}`);
    } else if (d) {
      flash('err', `Test failed — HTTP ${d.status_code}${d.error ? ` (${d.error})` : ''}`);
    } else {
      flash('err', 'Test failed — no response recorded.');
    }
    load();
  }

  async function viewDeliveries(h: Webhook) {
    const r = await fetch(`/api/dev/apps/${appId}/webhooks/${h.id}/deliveries`);
    const j = await r.json().catch(() => ({}));
    const list = (j.deliveries ?? []) as any[];
    if (list.length === 0) {
      alert('No deliveries recorded yet.');
      return;
    }
    const lines = list
      .map(
        (d) =>
          `${new Date(d.created_at).toLocaleString()}  ${d.event.padEnd(20)}  ${
            d.delivered_at
              ? `✓ ${d.status_code}`
              : `✗ ${d.status_code || ''} ${d.error || ''}`
          }`
      )
      .join('\n');
    alert(`Last ${list.length} deliveries:\n\n${lines}`);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
  }

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="mt-1 text-sm muted">
            Get notified when users authorize, revoke, or when tokens rotate.
          </p>
        </div>
        <button
          className="btn-secondary whitespace-nowrap"
          onClick={() => setShowAdd(!showAdd)}
        >
          {showAdd ? 'Cancel' : 'Add webhook'}
        </button>
      </div>

      {msg && (
        <div
          className={[
            'rounded-lg border p-3 text-sm',
            msg.kind === 'ok'
              ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200'
              : 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
          ].join(' ')}
        >
          {msg.text}
        </div>
      )}

      {/* New webhook secret (creation) */}
      {newSecret && (
        <SecretCard
          title="⚠️ Save this signing secret now"
          hint="This is the only time it will be shown. Use it to verify incoming webhooks on your server."
          value={newSecret}
          onCopy={() => copy(newSecret)}
          onDismiss={() => setNewSecret(null)}
        />
      )}

      {/* Rotated secret */}
      {rotateSecret && (
        <SecretCard
          title="⚠️ New secret generated"
          hint="The previous secret has been revoked. Update your receiver immediately — this is the only time the new secret will be shown."
          value={rotateSecret}
          onCopy={() => copy(rotateSecret)}
          onDismiss={() => setRotateSecret(null)}
        />
      )}

      {showAdd && <AddWebhookForm onSubmit={addHook} />}

      {loading ? (
        <p className="text-sm muted">Loading…</p>
      ) : hooks.length === 0 ? (
        <p className="text-sm muted">No webhooks yet. Add one to receive events.</p>
      ) : (
        <ul className="space-y-3">
          {hooks.map((h) => (
            <li
              key={h.id}
              className="rounded-lg border border-[rgb(var(--border))] p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <code className="block truncate font-mono text-xs">{h.url}</code>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {h.events.map((e) => (
                      <span
                        key={e}
                        className="rounded bg-[rgb(var(--surface-2))] px-2 py-0.5 text-[10px] font-medium"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
                <span
                  className={[
                    'rounded-full px-2 py-0.5 text-[10px] font-medium',
                    h.is_active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
                  ].join(' ')}
                >
                  {h.is_active ? 'Active' : 'Paused'}
                </span>
              </div>

              {h.last_error && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Last error: {h.last_error}
                </p>
              )}
              {h.last_success_at && (
                <p className="text-xs subtle">
                  Last delivered: {new Date(h.last_success_at).toLocaleString()}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button className="btn-secondary text-xs" onClick={() => test(h)}>
                  Test
                </button>
                <button
                  className="btn-secondary text-xs"
                  onClick={() => viewDeliveries(h)}
                >
                  Deliveries
                </button>
                <button
                  className="btn-secondary text-xs"
                  onClick={() => setRotateTarget(h)}
                >
                  Regenerate secret
                </button>
                <button
                  className="btn-secondary text-xs"
                  onClick={() => toggleActive(h)}
                >
                  {h.is_active ? 'Pause' : 'Resume'}
                </button>
                <button className="btn-danger text-xs" onClick={() => remove(h)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Rotate confirmation modal */}
      {rotateTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setRotateTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Regenerate webhook secret?</h3>
            <p className="mt-3 text-sm muted">
              Generating a new secret will{' '}
              <strong className="text-red-600 dark:text-red-400">
                immediately invalidate the current one
              </strong>
              . Your receiver will reject events until you deploy the new secret.
            </p>
            <p className="mt-2 text-sm muted">
              You will see the new secret <strong>once</strong>. Copy it before closing.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRotateTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={doRotate}
                disabled={busy}
              >
                {busy ? 'Generating…' : 'Yes, regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** Shared secret-display card for both "created" and "rotated". */
function SecretCard({
  title,
  hint,
  value,
  onCopy,
  onDismiss,
}: {
  title: string;
  hint: string;
  value: string;
  onCopy: () => void;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{title}</p>
      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{hint}</p>
      <div className="mt-3 flex gap-2">
        <input
          className="input font-mono text-xs"
          value={value}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          className="btn-secondary whitespace-nowrap"
          onClick={() => {
            onCopy();
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <button
        type="button"
        className="mt-2 text-xs text-amber-700 hover:underline dark:text-amber-300"
        onClick={onDismiss}
      >
        Dismiss
      </button>
    </div>
  );
}

function AddWebhookForm({
  onSubmit,
}: {
  onSubmit: (url: string, events: string[]) => void;
}) {
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([
    'user.authorized',
    'user.revoked',
    'user.revoked_all',
  ]);

  function toggle(e: string) {
    setEvents((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-4">
      <div>
        <label className="label">Endpoint URL</label>
        <input
          className="input"
          placeholder="https://yourapp.com/webhooks/iro"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <p className="mt-1 text-xs subtle">
          We&apos;ll POST JSON here with an <code>X-Iro-Signature</code> header (HMAC-SHA256).
        </p>
      </div>

      <div>
        <label className="label">Events</label>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {Object.entries(EVENT_LABELS).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={events.includes(key)}
                onChange={() => toggle(key)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        className="btn-primary"
        disabled={!url || events.length === 0}
        onClick={() => onSubmit(url, events)}
      >
        Create webhook
      </button>
    </div>
  );
}
