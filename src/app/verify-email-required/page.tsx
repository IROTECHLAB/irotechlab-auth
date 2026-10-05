import { Suspense } from 'react';
import RequiredClient from './client';

export default function Page() {
  return (
    <Suspense fallback={<div className="card mx-auto max-w-md">Loading…</div>}>
      <RequiredClient />
    </Suspense>
  );
}
