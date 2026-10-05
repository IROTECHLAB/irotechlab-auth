import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import SignupClient from './client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  const session = await getSession();
  if (session.userId) redirect('/account');
  return <SignupClient />;
}
