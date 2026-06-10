'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi, setAuth } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const res = await authApi.login(
        String(form.get('email')),
        String(form.get('password')),
      );
      setAuth(res.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage sessions, messages, and packages"
      footer={
        <>
          No account? <Link href="/register" className="text-brand font-medium">Create one</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        <Input name="email" type="email" label="Email" required placeholder="you@company.com" autoComplete="email" />
        <Input name="password" type="password" label="Password" required placeholder="••••••••" autoComplete="current-password" />
        <Button type="submit" loading={loading} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
