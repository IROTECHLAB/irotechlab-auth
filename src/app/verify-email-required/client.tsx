"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function RequiredClient() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/developer";
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function resend() {
    setBusy(true);
    const res = await fetch("/api/auth/resend-verification", { method: "POST" });
    setBusy(false);
    setSent(res.ok);
  }

  return (
    <div className="card mx-auto max-w-md space-y-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">✉️</div>
      <h1 className="text-2xl font-semibold">Verify your email first</h1>
      <p className="text-sm text-[rgb(var(--fg-muted))]">
        To use the developer portal or authorize apps, please verify your email address.
      </p>
      {sent ? (
        <p className="rounded bg-green-50 p-3 text-sm text-green-700">
          Verification email sent. Check your inbox and click the link.
        </p>
      ) : (
        <button onClick={resend} disabled={busy} className="btn-primary w-full">
          {busy ? "Sending…" : "Send verification email"}
        </button>
      )}
      <a href={next} className="block text-sm text-brand-600 hover:underline">
        I&apos;ve verified — continue
      </a>
    </div>
  );
}
