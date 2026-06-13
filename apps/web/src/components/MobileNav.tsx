'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ALL_NAV_ITEMS, ADMIN_NAV_ITEM } from '@/lib/nav';
import { NAV_ICONS } from '@/lib/nav-icons';
import { authApi } from '@/lib/api';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    authApi.me().then((me) => setIsPlatformAdmin(Boolean(me.isPlatformAdmin))).catch(() => {});
  }, []);

  const items = isPlatformAdmin ? [...ALL_NAV_ITEMS, ADMIN_NAV_ITEM] : ALL_NAV_ITEMS;

  return (
    <div className="lg:hidden border-b border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="font-bold text-sm flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs">WS</span>
          WhatsApp Sender
        </Link>
        <button type="button" className="btn-secondary text-xs px-3 py-1.5" onClick={() => setOpen(!open)}>
          {open ? 'Close' : 'Menu'}
        </button>
      </div>
      {open && (
        <nav className="px-3 pb-3 grid gap-0.5 max-h-[70vh] overflow-y-auto">
          {items.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            const Icon = NAV_ICONS[link.iconKey];
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${active ? 'bg-brand/10 text-brand font-semibold' : ''}`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
