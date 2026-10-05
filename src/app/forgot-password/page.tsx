import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import ForgotClient from './client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session.userId) redirect('/account');
  return <ForgotClient />;
}
