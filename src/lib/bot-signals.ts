'use client';

const T0_KEY = '__iro_form_t0';

/**
 * Marks the moment the form page loaded. Call once in useEffect on any page
 * that has a signup/login/forgot form.
 */
export function markFormStart() {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(T0_KEY, String(Date.now()));
}

/** Returns ms elapsed since markFormStart() was called. */
export function formElapsedMs(): number {
  if (typeof window === 'undefined') return 0;
  const t0 = Number(sessionStorage.getItem(T0_KEY) ?? Date.now());
  return Date.now() - t0;
}

/**
 * Fetches a CSRF nonce from /api/csrf and returns it.
 * Cached for 5 min to avoid hammering the endpoint on retries.
 */
let cached: { token: string; at: number } | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.token;
  const r = await fetch('/api/csrf', { method: 'GET', cache: 'no-store' });
  if (!r.ok) throw new Error('csrf-fetch-failed');
  const { token } = await r.json();
  cached = { token, at: Date.now() };
  return token;
}
