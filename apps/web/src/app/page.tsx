'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';
import { getApiUrl, getWebUrl } from '@/lib/config';

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace('/dashboard');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;

  const apiUrl = getApiUrl();
  const webUrl = getWebUrl();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white text-sm">WS</span>
            WhatsApp Sender System
          </div>
          <div className="flex gap-2">
            <Link href="/login" className="btn-secondary text-sm">Sign in</Link>
            <Link href="/register" className="btn-primary text-sm">Get started</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              WhatsApp messaging for your business
            </h1>
            <p className="text-lg text-[var(--muted)] mt-4">
              Multi-tenant SaaS with QR login, public API, webhooks, and bulk campaigns.
              Compatible with ttakka-apis and egy-guests consumers.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link href="/register" className="btn-primary">Start free trial</Link>
              <Link href="/login" className="btn-secondary">Sign in</Link>
            </div>
            <p className="text-xs text-[var(--muted)] mt-6">
              API: <code>{apiUrl}</code> · Dashboard: <code>{webUrl}</code>
            </p>
          </div>
          <div className="card p-8 space-y-4">
            <h2 className="font-semibold text-lg">5-minute setup</h2>
            {['Register & create workspace', 'Create session + scan QR', 'Send via dashboard or API', 'Integrate webhooks'].map((step, i) => (
              <div key={step} className="flex items-center gap-3 text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-xs">{i + 1}</span>
                {step}
              </div>
            ))}
            <Link href="/register" className="btn-primary w-full text-center block mt-4">Create account</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
