import Link from 'next/link';
import { ReactNode } from 'react';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-brand to-emerald-800 text-white p-12">
        <div>
          <div className="flex items-center gap-3 font-bold text-xl">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">WS</span>
            WhatsApp Sender System
          </div>
          <h2 className="mt-12 text-4xl font-bold leading-tight max-w-md">
            Multi-tenant WhatsApp messaging for your business
          </h2>
          <p className="mt-4 text-white/80 max-w-md">
            Create sessions, scan QR codes, send messages via API or dashboard. Scale with packages and campaigns.
          </p>
        </div>
        <ul className="space-y-3 text-sm text-white/90">
          <li>✓ 30-message free trial</li>
          <li>✓ Public API compatible with ttakka & egy-guests</li>
          <li>✓ Bulk campaigns & webhooks</li>
        </ul>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white text-sm">WS</span>
            WhatsApp Sender
          </div>
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-[var(--muted)] mt-1">{subtitle}</p>
          </div>
          <div className="card p-6 sm:p-8">{children}</div>
          <p className="text-sm text-center text-[var(--muted)]">{footer}</p>
          <p className="text-center text-xs text-[var(--muted)]">
            API docs available after sign-in under Documentation
          </p>
        </div>
      </div>
    </div>
  );
}
