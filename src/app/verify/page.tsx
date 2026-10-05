import { Suspense } from 'react';
import VerifyClient from './client';

export default function Page() {
  return (
    <Suspense fallback={<div className="card mx-auto max-w-md">Loading…</div>}>
      <VerifyClient />
    </Suspense>
  );
}
