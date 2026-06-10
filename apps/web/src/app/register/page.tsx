'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/AuthLayout';
import { PhoneInput } from '@/components/PhoneInput';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi, setAuth } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    if (!phone || phone.length < 10) {
      setError('Enter a valid phone number');
      return;
    }
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

  async function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const res = await authApi.verifyOtp(phone, code, {
        name: String(form.get('name') || '') || undefined,
        email: String(form.get('email') || '') || undefined,
      });
      setAuth(res.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="Verify your phone with WhatsApp OTP — 30-message trial included"
      footer={
        <>
          Already have an account? <Link href="/login" className="text-brand font-medium">Sign in</Link>
        </>
      }
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300 mb-4">
          {error}
        </div>
      )}

      {step === 'phone' ? (
        <div className="space-y-4">
          <PhoneInput value={phone} onChange={(digits) => setPhone(digits)} required />
          <Button type="button" loading={loading} className="w-full" onClick={sendOtp}>
            Send verification code
          </Button>
        </div>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Code sent to <span className="font-medium text-[var(--text)]">+{phone}</span>
            {' '}
            <button type="button" className="text-brand hover:underline" onClick={() => setStep('phone')}>
              Change
            </button>
          </p>
          <Input
            label="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
          />
          <Input name="name" label="Full name (optional)" placeholder="Your name" autoComplete="name" />
          <Input name="email" type="email" label="Email (optional)" placeholder="you@company.com" autoComplete="email" />
          <Button type="submit" loading={loading} className="w-full" disabled={code.length !== 6}>
            Create account
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
