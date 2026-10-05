"use client";
import { useEffect, useState } from "react";

export function VerifyBanner() {
  const [needsVerify, setNeedsVerify] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(async (r) => {
      if (r.ok) {
        const { user } = await r.json();
        setNeedsVerify(user && !user.emailVerified);
      }
    });
  }, []);

  if (!needsVerify) return null;

  async function resend() {
    setBusy(true);
    const r = await fetch("/api/auth/resend-verification", { method: "POST" });
    setBusy(false);
    if (r.ok) setSent(true);
  }

  return (
    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-900">
        ⚠️ Your email is not verified yet.
      </p>
      <p className="mt-1 text-sm text-amber-800">
        Verify your email to create OAuth apps or authorize third-party apps.
      </p>
      {sent ? (
        <p className="mt-2 text-sm text-green-700">Verification email sent — check your inbox.</p>
      ) : (
        <button onClick={resend} disabled={busy} className="btn-secondary mt-3">
          {busy ? "Sending…" : "Resend verification email"}
        </button>
      )}
    </div>
  );
}
