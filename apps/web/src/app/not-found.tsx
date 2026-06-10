import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-10 text-center max-w-md">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-[var(--muted)] mt-2">This page does not exist.</p>
        <div className="flex gap-2 justify-center mt-6">
          <Link href="/dashboard" className="btn-primary text-sm">Dashboard</Link>
          <Link href="/getting-started" className="btn-secondary text-sm">Getting started</Link>
        </div>
      </div>
    </div>
  );
}
