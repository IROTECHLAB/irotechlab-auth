import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import LoginClient from './client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const session = await getSession();

  // Signed in? Honour ?next=/api/oauth/authorize... so OAuth flow still works.
  // Otherwise, go to the account page.
  if (session.userId) {
    const next = sp?.next;
    if (next && next.startsWith('/')) redirect(next);
    redirect('/account');
  }

  return (
    <Suspense fallback={<div className="card mx-auto max-w-md">Loading…</div>}>
      <LoginClient />
    </Suspense>
  );
}
