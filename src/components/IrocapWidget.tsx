'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  onToken: (token: string | null) => void;
  onError?: (err: { stage: string; error: string }) => void;
}

declare global {
  interface Window {
    Irocap?: new (
      sitekey: string,
      options: {
        container: string | Element;
        callback?: (token: string, score: number) => void;
        'error-callback'?: (err: any) => void;
      }
    ) => any;
  }
}

// Base URL of the irocap instance — set at build time via NEXT_PUBLIC_IROCAP_BASE.
// irocap is self-hosted: https://github.com/IROTECHLAB/irocap
const IROCAP_BASE = process.env.NEXT_PUBLIC_IROCAP_BASE ?? '';

let scriptPromise: Promise<void> | null = null;

function loadIrocapScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Irocap) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  if (!IROCAP_BASE) {
    return Promise.reject(new Error('NEXT_PUBLIC_IROCAP_BASE is not set'));
  }

  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${IROCAP_BASE}/irocap.js`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('failed to load irocap.js'));
    document.head.appendChild(s);
  });

  return scriptPromise;
}

export function IrocapWidget({ onToken, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    const sitekey = process.env.NEXT_PUBLIC_IROCAP_SITEKEY;
    if (!sitekey) {
      setState('error');
      setErrMsg('Captcha not configured (missing NEXT_PUBLIC_IROCAP_SITEKEY)');
      return;
    }
    if (!IROCAP_BASE) {
      setState('error');
      setErrMsg('Captcha not configured (missing NEXT_PUBLIC_IROCAP_BASE)');
      return;
    }

    let cancelled = false;

    loadIrocapScript()
      .then(() => {
        if (cancelled || !window.Irocap || !containerRef.current) return;

        try {
          new window.Irocap(sitekey, {
            container: containerRef.current,
            callback: (token: string) => {
              onToken(token);
              setState('ready');
              setErrMsg(null);
            },
            'error-callback': (err: any) => {
              onToken(null);
              setState('error');
              const m =
                err?.error === 'unknown-sitekey'
                  ? 'Captcha sitekey is not registered.'
                  : err?.error === 'rate-limited'
                  ? 'Too many captcha attempts. Wait a minute.'
                  : 'Captcha failed. Please try again.';
              setErrMsg(m);
              onError?.(err);
            },
          });
        } catch (e: any) {
          setState('error');
          setErrMsg(e?.message ?? 'Captcha failed to initialize.');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState('error');
        setErrMsg('Could not load captcha script.');
        onError?.({ stage: 'network', error: 'script-load' });
      });

    return () => {
      cancelled = true;
    };
  }, [onToken, onError]);

  return (
    <div className="space-y-1">
      <div
        ref={containerRef}
        className="irocap min-h-[36px] rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-2"
      />
      {state === 'error' && errMsg && (
        <p className="text-xs text-red-600 dark:text-red-400">{errMsg}</p>
      )}
    </div>
  );
}
