'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/sessions', label: 'Sessions' },
  { href: '/status', label: 'Status' },
  { href: '/messages', label: 'Messages' },
  { href: '/campaigns', label: 'Bulk campaigns' },
  { href: '/packages', label: 'Packages' },
  { href: '/docs', label: 'Documentation' },
  { href: '/settings', label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-[var(--border)] bg-[var(--card)] min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <div className="flex items-center gap-2 font-bold text-lg">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white text-sm">WS</span>
          WhatsApp Sender
        </div>
        <p className="text-xs text-[var(--muted)] mt-2">Control center for sessions, messages, campaigns, and packages.</p>
      </div>

      <nav className="space-y-1 flex-1">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)] mb-2">Main menu</p>
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-xl px-3 py-2 text-sm ${
                active ? 'bg-brand/10 text-brand font-semibold' : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="card p-3 text-xs text-[var(--muted)]">
        <p className="font-semibold text-[var(--text)] mb-1">Need help?</p>
        Start with Sessions, then Packages, then Messages.
      </div>
    </aside>
  );
}
