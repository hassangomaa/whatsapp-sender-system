'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/LoadingState';
import { CopyButton } from '@/components/CopyButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Plan = {
  id: string;
  slug: string;
  name: string;
  messageLimit: number;
  maxSessions: number;
  priceCents: number;
  isTrial: boolean;
};

type WorkspacePackage = {
  subscription: { plan: Plan } | null;
  usage: { messagesSent: number; messageLimit: number; remaining: number; maxSessions?: number; planName?: string };
  referralCode: string | null;
};

export default function PackagesPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [pkg, setPkg] = useState<WorkspacePackage | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);

  const load = async () => {
    const [p, w] = await Promise.all([
      api<Plan[]>('/api/v1/packages/plans'),
      api<WorkspacePackage>('/api/v1/packages'),
    ]);
    setPlans(p);
    setPkg(w);
    setLoading(false);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  if (loading || !pkg) return <LoadingState label="Loading packages..." />;

  const usagePercent = Math.min(100, Math.round((pkg.usage.messagesSent / pkg.usage.messageLimit) * 100));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Packages"
        description="Manage your message quota, session limits, and subscription plan."
      />

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-6">
          <h2 className="font-semibold">Current usage</h2>
          <p className="text-3xl font-bold mt-2">
            {pkg.usage.messagesSent}
            <span className="text-lg text-[var(--muted)] font-normal"> / {pkg.usage.messageLimit}</span>
          </p>
          <div className="mt-4 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${usagePercent}%` }} />
          </div>
          <p className="text-sm text-[var(--muted)] mt-2">{pkg.usage.remaining} messages remaining</p>
          {pkg.subscription && (
            <p className="text-sm mt-3">
              Plan: <span className="font-medium">{pkg.subscription.plan.name}</span>
              {' · '}
              {pkg.subscription.plan.maxSessions} session{pkg.subscription.plan.maxSessions !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {pkg.referralCode && (
          <div className="card p-6">
            <h2 className="font-semibold">Referral code</h2>
            <p className="text-sm text-[var(--muted)] mt-1">Share with others to earn bonus messages</p>
            <code className="block mt-3 text-lg font-mono">{pkg.referralCode}</code>
            <div className="mt-3">
              <CopyButton text={pkg.referralCode} label="Copy referral code" />
            </div>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.filter((p) => !p.isTrial).map((plan) => (
          <div key={plan.id} className="card p-6 flex flex-col">
            <h3 className="font-semibold text-lg">{plan.name}</h3>
            <p className="text-3xl font-bold mt-2">{plan.messageLimit.toLocaleString()}</p>
            <p className="text-sm text-[var(--muted)]">messages / period</p>
            <ul className="text-sm text-[var(--muted)] mt-3 space-y-1 flex-1">
              <li>{plan.maxSessions} WhatsApp session{plan.maxSessions !== 1 ? 's' : ''}</li>
              <li>{(plan.priceCents / 100).toFixed(0)} EGP</li>
            </ul>
            <Button
              className="mt-4 w-full"
              loading={activating === plan.slug}
              onClick={async () => {
                setActivating(plan.slug);
                await api('/api/v1/packages/activate', {
                  method: 'POST',
                  body: JSON.stringify({ planSlug: plan.slug }),
                }).finally(() => {
                  setActivating(null);
                  load();
                });
              }}
            >
              Activate {plan.name}
            </Button>
          </div>
        ))}
      </div>

      <div className="card p-5 flex flex-col sm:flex-row gap-3">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Redeem code (e.g. WELCOME100)"
          className="flex-1"
        />
        <Button
          variant="secondary"
          onClick={() =>
            api('/api/v1/packages/redeem', { method: 'POST', body: JSON.stringify({ code }) }).then(load)
          }
        >
          Redeem code
        </Button>
      </div>
    </div>
  );
}
