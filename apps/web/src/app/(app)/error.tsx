'use client';

import { Button } from '@/components/ui/Button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card p-8 max-w-lg mx-auto mt-12 text-center">
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="text-sm text-[var(--muted)] mt-2">{error.message}</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
