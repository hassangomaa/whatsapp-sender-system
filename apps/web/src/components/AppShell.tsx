'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { ThemeToggle } from './ThemeToggle';
import { LoadingState } from './LoadingState';
import { Button } from './ui/Button';
import { authApi, clearAuth } from '@/lib/api';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string | null; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then((res) => setUser(res.user))
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState label="Loading workspace..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav />
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 sm:px-6 py-3 sm:py-4 bg-[var(--card)]">
          <p className="text-xs sm:text-sm text-[var(--muted)] hidden sm:block">Multi-tenant WhatsApp control center</p>
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <ThemeToggle />
            {user && (
              <div className="text-right text-sm hidden sm:block">
                <div className="font-semibold truncate max-w-[160px]">{user.name ?? user.email}</div>
                <div className="text-[var(--muted)] text-xs truncate max-w-[160px]">{user.email}</div>
              </div>
            )}
            <Button
              variant="secondary"
              className="text-xs sm:text-sm"
              onClick={() => {
                clearAuth();
                router.push('/login');
              }}
            >
              Logout
            </Button>
          </div>
        </header>
        <main className="p-4 sm:p-6 flex-1">{children}</main>
      </div>
    </div>
  );
}
