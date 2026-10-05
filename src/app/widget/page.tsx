'use client';
import { useState } from 'react';
import { IrotechLabWidget } from '@/components/IrotechLabWidget';
import { Logo } from '@/components/Logo';

const MARK_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">
  <g fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
    <circle cx="50" cy="18" r="8" fill="currentColor" stroke="none"/>
    <path d="M 25 30 L 75 30 L 75 55 Q 75 75 50 88 Q 25 75 25 55 Z"/>
    <circle cx="50" cy="52" r="5" fill="currentColor" stroke="none"/>
    <rect x="47.4" y="55" width="5" height="11" rx="2.5" fill="currentColor" stroke="none"/>
  </g>
</svg>`;

export default function WidgetShowcase() {
  const [clientId, setClientId] = useState('iro_your_client_id');

  const htmlSnippet = `<a href="https://auth.irotechlab.xi.to/api/oauth/widget?client_id=${clientId}"
   class="iro-widget iro-widget-brand iro-widget-md iro-widget-rounded">
  <span class="iro-widget-mark" style="width:22px;height:22px">
    ${MARK_SVG}
  </span>
  <span>Continue with IrotechLab</span>
</a>`;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex justify-center text-brand-600 dark:text-brand-400">
          <Logo size={64} />
        </div>
        <h1 className="text-3xl font-semibold">Continue with IrotechLab</h1>
        <p className="mt-2 text-sm muted">
          Drop-in OAuth button — add IrotechLab sign-in to any site in seconds.
        </p>
      </div>

      <div className="card">
        <label className="label">Your client ID</label>
        <input
          className="input font-mono text-xs"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="iro_..."
        />
        <p className="mt-2 text-xs subtle">
          Get one at{' '}
          <a className="text-brand-600 hover:underline dark:text-brand-400" href="/developer/new">
            /developer/new
          </a>
          .
        </p>
      </div>

      <section className="card space-y-6">
        <h2 className="text-lg font-semibold">Live previews</h2>

        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide subtle">Brand (default)</p>
          <div className="flex flex-wrap items-center gap-3">
            <IrotechLabWidget clientId={clientId} variant="brand" size="sm" />
            <IrotechLabWidget clientId={clientId} variant="brand" size="md" />
            <IrotechLabWidget clientId={clientId} variant="brand" size="lg" />
            <IrotechLabWidget clientId={clientId} variant="brand" iconOnly />
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide subtle">Light</p>
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3">
            <IrotechLabWidget clientId={clientId} variant="light" size="sm" />
            <IrotechLabWidget clientId={clientId} variant="light" size="md" />
            <IrotechLabWidget clientId={clientId} variant="light" size="lg" />
            <IrotechLabWidget clientId={clientId} variant="light" iconOnly />
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide subtle">Dark</p>
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-neutral-900 p-3">
            <IrotechLabWidget clientId={clientId} variant="dark" size="sm" />
            <IrotechLabWidget clientId={clientId} variant="dark" size="md" />
            <IrotechLabWidget clientId={clientId} variant="dark" size="lg" />
            <IrotechLabWidget clientId={clientId} variant="dark" iconOnly />
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide subtle">Pill shape</p>
          <div className="flex flex-wrap items-center gap-3">
            <IrotechLabWidget clientId={clientId} shape="pill" />
            <IrotechLabWidget clientId={clientId} shape="pill" variant="light" />
            <IrotechLabWidget clientId={clientId} shape="pill" variant="dark" />
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide subtle">Full width</p>
          <IrotechLabWidget clientId={clientId} block />
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">Copy the snippet</h2>
        <p className="mt-1 text-sm muted">
          Paste this HTML anywhere to add IrotechLab sign-in.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-neutral-900 p-4 text-xs text-neutral-100">
{htmlSnippet}
        </pre>
        <button
          type="button"
          className="btn-secondary mt-3"
          onClick={async () => {
            await navigator.clipboard.writeText(htmlSnippet);
            alert('Copied');
          }}
        >
          Copy HTML
        </button>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">How it works</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm muted">
          <li>
            Button points at{' '}
            <code className="rounded bg-[rgb(var(--surface-2))] px-1">
              /api/oauth/widget?client_id=YOUR_ID
            </code>
          </li>
          <li>
            The server generates PKCE, sets a cookie, and redirects to{' '}
            <code className="rounded bg-[rgb(var(--surface-2))] px-1">/api/oauth/authorize</code>
          </li>
          <li>User logs in, approves consent</li>
          <li>
            Browser redirects back to your registered callback with{' '}
            <code className="rounded bg-[rgb(var(--surface-2))] px-1">?code=...&state=...</code>
          </li>
          <li>
            Your server exchanges the code at{' '}
            <code className="rounded bg-[rgb(var(--surface-2))] px-1">/api/oauth/token</code>
          </li>
        </ol>
      </section>
    </div>
  );
}
