import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-6 py-16 text-center">
      <div className="mx-auto flex justify-center text-brand-600 dark:text-brand-400">
        <Logo size={72} />
      </div>

      <div>
        <h1 className="text-6xl font-bold tracking-tight">404</h1>
        <h2 className="mt-2 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm muted">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/" className="btn-primary">
          Go home
        </Link>
        <Link href="/developer" className="btn-secondary">
          Developer portal
        </Link>
      </div>
    </div>
  );
}
