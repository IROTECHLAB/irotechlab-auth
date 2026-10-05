"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VerifyClient() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [state, setState] = useState<"pending" | "ok" | "error">("pending");
  const [msg, setMsg] = useState("Verifying your email…");

  useEffect(() => {
    if (!token) { setState("error"); setMsg("Missing token."); return; }
    (async () => {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setState("ok");
        setMsg("Email verified. Redirecting…");
        setTimeout(() => router.push("/developer"), 1500);
      } else {
        setState("error");
        setMsg(j.error === "invalid_or_expired_token"
          ? "This link is invalid or has expired. Request a new one below."
          : j.error ?? "Verification failed.");
      }
    })();
  }, [token, router]);

  return (
    <div className="card mx-auto max-w-md text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white">I</div>
      <h1 className="text-2xl font-semibold">
        {state === "ok" ? "Verified ✓" : state === "error" ? "Verification failed" : "Verifying…"}
      </h1>
      <p className="text-sm text-[rgb(var(--fg-muted))]">{msg}</p>
      {state === "error" && <ResendButton />}
    </div>
  );
}

function ResendButton() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function resend() {
    setBusy(true);
    const res = await fetch("/api/auth/resend-verification", { method: "POST" });
    setBusy(false);
    setSent(res.ok || res.status === 401);
  }

  if (sent) return <p className="text-sm text-green-700">If you&apos;re signed in, a new link was sent.</p>;
  return (
    <button onClick={resend} disabled={busy} className="btn-primary w-full">
      {busy ? "Sending…" : "Resend verification email"}
    </button>
  );
}
