'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/sessions', label: 'Sessions' },
  { href: '/status', label: 'Status' },
  { href: '/messages', label: 'Messages' },
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/packages', label: 'Packages' },
  { href: '/docs', label: 'Docs' },
  { href: '/settings', label: 'Settings' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden border-b border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm">WhatsApp Sender</span>
        <button
          type="button"
          className="btn-secondary text-xs px-3 py-1.5"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>
      {open && (
        <nav className="mt-3 grid gap-1 pb-2">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm ${active ? 'bg-brand/10 text-brand font-semibold' : ''}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
