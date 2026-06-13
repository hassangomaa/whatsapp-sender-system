'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NAV_SECTIONS, ADMIN_NAV_ITEM } from '@/lib/nav';
import { NAV_ICONS } from '@/lib/nav-icons';
import { api, authApi } from '@/lib/api';
import { WorkspaceCard } from './WorkspaceCard';
import { SidebarHelpBox } from './SidebarHelpBox';

export function Sidebar() {
  const pathname = usePathname();
  const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    authApi.me().then((me) => setIsPlatformAdmin(Boolean(me.isPlatformAdmin))).catch(() => {});
  }, []);

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

      <WorkspaceCard />

      <nav className="flex-1 overflow-y-auto px-3 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold px-3 mb-1.5">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                const Icon = NAV_ICONS[link.iconKey];
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    title={link.description}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition relative ${
                      active
                        ? 'bg-brand/15 text-brand font-semibold shadow-sm'
                        : 'text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {Icon && <Icon className="w-4 h-4 shrink-0 opacity-80" />}
                    <span className="flex-1">{link.label}</span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        {isPlatformAdmin && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold px-3 mb-1.5">
              Platform
            </p>
            <div className="space-y-0.5">
              {(() => {
                const link = ADMIN_NAV_ITEM;
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                const Icon = NAV_ICONS[link.iconKey];
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    title={link.description}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition relative ${
                      active
                        ? 'bg-brand/15 text-brand font-semibold shadow-sm'
                        : 'text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {Icon && <Icon className="w-4 h-4 shrink-0 opacity-80" />}
                    <span className="flex-1">{link.label}</span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />}
                  </Link>
                );
              })()}
            </div>
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-[var(--border)] space-y-2">
        {quota && (
          <div className="rounded-xl bg-brand/5 border border-brand/20 px-3 py-2 text-xs">
            <p className="font-semibold text-brand">Message quota</p>
            <p className="text-[var(--muted)] mt-0.5">{quota.remaining} / {quota.limit} left</p>
            <Link href="/packages" className="text-brand hover:underline mt-1 inline-block">Upgrade →</Link>
          </div>
        )}
        <SidebarHelpBox />
      </div>
    </aside>
  );
}
