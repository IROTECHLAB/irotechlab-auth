'use client';
import { useState } from 'react';

interface Props {
  query: Record<string, string>;
}

export function ConsentActions({ query }: Props) {
  const [submitting, setSubmitting] = useState<'approve' | 'deny' | null>(null);

  function submit(decision: 'approve' | 'deny') {
    setSubmitting(decision);
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/oauth/authorize';
    for (const [k, v] of Object.entries(query)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = k;
      input.value = v;
      form.appendChild(input);
    }
    const decisionInput = document.createElement('input');
    decisionInput.type = 'hidden';
    decisionInput.name = 'decision';
    decisionInput.value = decision;
    form.appendChild(decisionInput);
    document.body.appendChild(form);
    form.submit();
  }

  if (submitting === 'approve') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-brand-300 bg-brand-50 p-6 text-center dark:border-brand-700 dark:bg-brand-950/40">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600 dark:border-brand-800 dark:border-t-brand-400" />
        <p className="text-sm font-medium text-brand-700 dark:text-brand-200">
          Connecting to your app…
        </p>
        <p className="text-xs text-brand-600/80 dark:text-brand-300/80">
          Sending you back to the application
        </p>
      </div>
    );
  }

  if (submitting === 'deny') {
    return (
      <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-6 text-center">
        <p className="text-sm muted">Cancelling…</p>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => submit('approve')}
        className="btn-primary flex-1"
      >
        Allow
      </button>
      <button
        type="button"
        onClick={() => submit('deny')}
        className="btn-secondary flex-1"
      >
        Deny
      </button>
    </div>
  );
}
