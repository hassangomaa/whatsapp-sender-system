'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { TopHeader } from './TopHeader';
import { LoadingState } from './LoadingState';
import { authApi, clearAuth } from '@/lib/api';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string | null; email: string | null; phone: string | null } | null>(null);
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
    <div className="flex min-h-screen flex-col lg:flex-row bg-[var(--bg)]">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav />
        {user && (
          <TopHeader
            user={user}
            onLogout={() => {
              clearAuth();
              router.push('/login');
            }}
          />
        )}
        <main className="p-4 sm:p-6 flex-1 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
