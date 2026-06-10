'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/AuthLayout';
import { PhoneInput } from '@/components/PhoneInput';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi, setAuth } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'otp' | 'email'>('otp');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    setLoading(true);
    setError('');
    try {
      await authApi.requestOtp(phone);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authApi.verifyOtp(phone, code);
      setAuth(res.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

  async function loginEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const res = await authApi.login(String(form.get('email')), String(form.get('password')));
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
      subtitle="Sign in with your phone or legacy email account"
      footer={
        <>
          New here? <Link href="/register" className="text-brand font-medium">Create account</Link>
        </>
      }
    >
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          className={`flex-1 rounded-xl py-2 text-sm font-medium ${mode === 'otp' ? 'bg-brand/15 text-brand' : 'border border-[var(--border)]'}`}
          onClick={() => { setMode('otp'); setStep('phone'); setError(''); }}
        >
          Phone OTP
        </button>
        <button
          type="button"
          className={`flex-1 rounded-xl py-2 text-sm font-medium ${mode === 'email' ? 'bg-brand/15 text-brand' : 'border border-[var(--border)]'}`}
          onClick={() => { setMode('email'); setError(''); }}
        >
          Email
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {mode === 'otp' ? (
        step === 'phone' ? (
          <div className="space-y-4">
            <PhoneInput value={phone} onChange={(digits) => setPhone(digits)} required />
            <Button type="button" loading={loading} className="w-full" onClick={sendOtp}>
              Send code
            </Button>
          </div>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <Input
              label="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              inputMode="numeric"
            />
            <Button type="submit" loading={loading} className="w-full" disabled={code.length !== 6}>
              Sign in
            </Button>
          </form>
        )
      ) : (
        <form onSubmit={loginEmail} className="space-y-4">
          <Input name="email" type="email" label="Email" required placeholder="you@company.com" />
          <Input name="password" type="password" label="Password" required placeholder="Your password" />
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
