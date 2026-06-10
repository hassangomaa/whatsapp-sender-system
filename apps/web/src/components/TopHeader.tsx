'use client';

import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/Button';

type Props = {
  user: { name: string | null; email: string | null; phone: string | null };
  onLogout: () => void;
};

function formatPhone(phone: string | null) {
  if (!phone) return null;
  return phone.startsWith('+') ? phone : `+${phone}`;
}

export function TopHeader({ user, onLogout }: Props) {
  const displayName = user.name ?? user.email ?? 'User';
  const subline = formatPhone(user.phone) ?? user.email ?? '';

  return (
    <header className="flex items-center justify-between border-b border-[var(--border)] px-4 sm:px-6 py-3 bg-[var(--card)] shrink-0">
      <p className="text-xs sm:text-sm text-[var(--muted)] hidden sm:block">Multi-tenant WhatsApp control center</p>
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        <ThemeToggle />
        <div className="flex items-center gap-2 text-right text-sm">
          <div className="w-9 h-9 rounded-full bg-brand/15 text-brand font-semibold flex items-center justify-center shrink-0">
            {(displayName[0] ?? 'U').toUpperCase()}
          </div>
          <div className="hidden sm:block min-w-0">
            <div className="font-semibold truncate max-w-[140px]">{displayName}</div>
            {subline && <div className="text-[var(--muted)] text-xs truncate max-w-[140px]">{subline}</div>}
          </div>
        </div>
        <Button variant="primary" className="text-xs sm:text-sm" onClick={onLogout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
