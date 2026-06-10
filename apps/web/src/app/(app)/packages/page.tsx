'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/LoadingState';
import { CopyButton } from '@/components/CopyButton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/Toast';

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
  const { success, error: toastError } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [pkg, setPkg] = useState<WorkspacePackage | null>(null);
  const [sessionsUsed, setSessionsUsed] = useState(0);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);

  const load = useCallback(async () => {
    const [p, w, sessions] = await Promise.all([
      api<Plan[]>('/api/v1/packages/plans'),
      api<WorkspacePackage>('/api/v1/packages'),
      api<{ id: string }[]>('/api/v1/sessions'),
    ]);
    setPlans(p);
    setPkg(w);
    setSessionsUsed(sessions.length);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch((err) => toastError(err instanceof Error ? err.message : 'Failed to load'));
  }, [load, toastError]);

  async function activatePlan(plan: Plan) {
    setActivating(plan.slug);
    try {
      await api('/api/v1/packages/activate', {
        method: 'POST',
        body: JSON.stringify({ planSlug: plan.slug }),
      });
      success(`${plan.name} plan activated`);
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Activation failed');
    } finally {
      setActivating(null);
      setConfirmPlan(null);
    }
  }

  async function redeem() {
    setRedeeming(true);
    try {
      await api('/api/v1/packages/redeem', { method: 'POST', body: JSON.stringify({ code }) });
      success('Code redeemed successfully');
      setCode('');
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setRedeeming(false);
    }
  }

  if (loading || !pkg) return <LoadingState label="Loading packages..." />;

  const trialPlan = plans.find((p) => p.isTrial);
  const paidPlans = plans.filter((p) => !p.isTrial);
  const msgPercent = Math.min(100, Math.round((pkg.usage.messagesSent / pkg.usage.messageLimit) * 100));
  const maxSessions = pkg.subscription?.plan.maxSessions ?? trialPlan?.maxSessions ?? 1;
  const sessionPercent = Math.min(100, Math.round((sessionsUsed / maxSessions) * 100));
  const quotaExhausted = pkg.usage.remaining <= 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Packages" description="Manage message quota, session limits, and your subscription plan." />

      {quotaExhausted && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm">
          <strong>Quota exhausted.</strong> Redeem a code below or activate a paid plan to continue sending.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-6">
          <h2 className="font-semibold">Message quota</h2>
          <p className="text-3xl font-bold mt-2">{pkg.usage.messagesSent} <span className="text-lg text-[var(--muted)] font-normal">/ {pkg.usage.messageLimit}</span></p>
          <div className="mt-4 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-brand rounded-full" style={{ width: `${msgPercent}%` }} />
          </div>
          <p className="text-sm text-[var(--muted)] mt-2">{pkg.usage.remaining} remaining</p>
          {pkg.subscription && <p className="text-sm mt-2">Active plan: <strong>{pkg.subscription.plan.name}</strong></p>}
        </div>

        <div className="card p-6">
          <h2 className="font-semibold">Session limit</h2>
          <p className="text-3xl font-bold mt-2">{sessionsUsed} <span className="text-lg text-[var(--muted)] font-normal">/ {maxSessions}</span></p>
          <div className="mt-4 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-brand rounded-full" style={{ width: `${sessionPercent}%` }} />
          </div>
          {sessionsUsed >= maxSessions && (
            <p className="text-sm text-amber-600 mt-2">Session limit reached — upgrade to add more.</p>
          )}
        </div>
      </div>

      {pkg.referralCode && (
        <div className="card p-6">
          <h2 className="font-semibold">Referral code</h2>
          <code className="block mt-2 text-lg font-mono">{pkg.referralCode}</code>
          <div className="mt-3"><CopyButton text={pkg.referralCode} label="Copy referral code" /></div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trialPlan && (
          <div className="card p-6 border-dashed opacity-90">
            <span className="badge-gray text-xs">Current trial</span>
            <h3 className="font-semibold text-lg mt-2">{trialPlan.name}</h3>
            <p className="text-3xl font-bold mt-2">{trialPlan.messageLimit}</p>
            <p className="text-sm text-[var(--muted)]">messages · {trialPlan.maxSessions} session</p>
            <p className="text-sm text-[var(--muted)] mt-4">Included with every new workspace</p>
          </div>
        )}
        {paidPlans.map((plan) => (
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
              onClick={() => setConfirmPlan(plan)}
            >
              Activate {plan.name}
            </Button>
          </div>
        ))}
      </div>

      <div className="card p-5 flex flex-col sm:flex-row gap-3">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Redeem code (e.g. WELCOME100)" className="flex-1" />
        <Button variant="secondary" loading={redeeming} onClick={redeem}>Redeem code</Button>
      </div>

      <ConfirmDialog
        open={!!confirmPlan}
        title={`Activate ${confirmPlan?.name}?`}
        description="This will update your message limit and session cap for this workspace."
        confirmLabel="Activate"
        loading={!!activating}
        onConfirm={() => confirmPlan && activatePlan(confirmPlan)}
        onCancel={() => setConfirmPlan(null)}
      />
    </div>
  );
}
