'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi, setAuth } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const res = await authApi.register(
        String(form.get('email')),
        String(form.get('password')),
        String(form.get('name') || ''),
      );
      setAuth(res.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="Start with a 30-message trial — no credit card required"
      footer={
        <>
          Already have an account? <Link href="/login" className="text-brand font-medium">Sign in</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        <Input name="name" label="Full name" placeholder="Your name" autoComplete="name" />
        <Input name="email" type="email" label="Work email" required placeholder="you@company.com" autoComplete="email" />
        <Input name="password" type="password" label="Password" required minLength={8} placeholder="Min. 8 characters" autoComplete="new-password" />
        <Button type="submit" loading={loading} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
