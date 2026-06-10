'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NAV_SECTIONS } from '@/lib/nav';
import { api } from '@/lib/api';

export function Sidebar() {
  const pathname = usePathname();
  const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(null);

  useEffect(() => {
    api<{ trialRemaining: number; trialLimit: number }>('/api/v1/dashboard')
      .then((d) => setQuota({ remaining: d.trialRemaining, limit: d.trialLimit }))
      .catch(() => {});
  }, [pathname]);

  return (
    <aside className="w-64 shrink-0 border-r border-[var(--border)] bg-[var(--card)] min-h-screen flex flex-col">
      <div className="p-4 border-b border-[var(--border)]">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg group">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-emerald-600 text-white text-sm shadow-sm group-hover:shadow-md transition">
            WS
          </span>
          <div>
            <span className="block leading-tight">WhatsApp Sender</span>
            <span className="text-[10px] font-normal text-[var(--muted)]">Multi-tenant SaaS</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold px-3 mb-1.5">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    title={link.description}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                      active
                        ? 'bg-brand/15 text-brand font-semibold shadow-sm'
                        : 'text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="w-5 text-center text-xs opacity-70">{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--border)] space-y-2">
        {quota && (
          <div className="rounded-xl bg-brand/5 border border-brand/20 px-3 py-2 text-xs">
            <p className="font-semibold text-brand">Message quota</p>
            <p className="text-[var(--muted)] mt-0.5">{quota.remaining} / {quota.limit} left</p>
            <Link href="/packages" className="text-brand hover:underline mt-1 inline-block">Upgrade →</Link>
          </div>
        )}
        <Link href="/getting-started" className="block card p-3 text-xs text-[var(--muted)] hover:border-brand/30 transition">
          <p className="font-semibold text-[var(--text)]">Quick start</p>
          Login → Session → QR → API
        </Link>
      </div>
    </aside>
  );
}
