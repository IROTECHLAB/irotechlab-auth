import { Suspense } from 'react';
import ResetClient from './client';

export default function Page() {
  return (
    <Suspense fallback={<div className="card mx-auto max-w-md">Loading…</div>}>
      <ResetClient />
    </Suspense>
  );
}
