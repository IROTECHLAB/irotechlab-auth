'use client';
import { useState } from 'react';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Avatar } from '@/components/Avatar';
import { FileUpload } from '@/components/FileUpload';

export default function AccountClient({
  user,
  apps,
  banner,
}: {
  user: any;
  apps: any[];
  banner?: React.ReactNode;
}) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [avatar, setAvatar] = useState<string | undefined>(user.avatar);
  const [msg, setMsg] = useState<string | null>(null);
  const [list, setList] = useState(apps);


  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/auth/update-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, avatar }),
    });
    setMsg(res.ok ? 'Saved.' : 'Failed to save.');
  }

  async function revoke(clientId: string) {
    await fetch(`/api/oauth/revoke?client_id=${clientId}`, { method: 'POST' });
    setList(list.filter(a => a.clientId !== clientId));
  }

  async function signOutEverywhere() {
    if (!confirm('Sign out everywhere? All apps will need to re-authorize.')) return;
    await fetch('/api/auth/revoke-all', { method: 'POST' });
    location.href = '/login';
  }

  return (
    <div className="space-y-8">
      {banner}

      <form onSubmit={save} className="card max-w-xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Account</h1>
          <VerifiedBadge verified={Boolean(user.emailVerified)} />
        </div>
        {msg && <div className="rounded bg-green-50 p-3 text-sm text-green-700">{msg}</div>}

        <FileUpload
          value={avatar}
          onChange={setAvatar}
          label="Change photo"
          shape="circle"
          size={64}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">First name</label>
            <input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="label">Last name</label>
            <input className="input" value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Email</label>
          <input className="input" value={user.email} disabled />
        </div>

        <button className="btn-primary">Save Changes</button>
      </form>

      <section className="card max-w-xl">
        <h2 className="mb-4 text-xl font-semibold">Authorized Apps</h2>
        {list.length === 0 && <p className="text-sm text-[rgb(var(--fg-muted))]">No apps authorized yet.</p>}
        <ul className="space-y-3">
          {list.map(a => (
            <li key={a.clientId} className="flex items-center justify-between rounded border border-[rgb(var(--border))] p-3">
              <div className="flex items-center gap-3">
                {a.logo
                  ? <img src={a.logo} alt="" className="h-10 w-10 rounded object-cover" />
                  : <div className="h-10 w-10 rounded bg-[rgb(var(--surface-2))]" />}
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-[rgb(var(--fg-subtle))]">{a.scopes.join(', ')}</p>
                </div>
              </div>
              <button className="btn-danger" onClick={() => revoke(a.clientId)}>Revoke</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card max-w-xl">
        <h2 className="mb-2 text-xl font-semibold">Danger Zone</h2>
        <p className="mb-4 text-sm text-[rgb(var(--fg-muted))]">
          Sign out of every app that uses your IrotechLab account and revoke all refresh tokens.
        </p>
        <button className="btn-danger" onClick={signOutEverywhere}>
          Sign out everywhere
        </button>
      </section>
    </div>
  );
}
