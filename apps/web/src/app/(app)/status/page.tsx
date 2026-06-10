'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/Button';

type StatusSummary = {
  connectedSessions: number;
  totalSessions: number;
  webhookHealthy: number;
  webhookTotal: number;
  quotaAlerts: number;
  trialRemaining: number;
  trialUsed: number;
  trialLimit: number;
  referralCode: string | null;
  sessions: {
    id: string;
    name: string;
    phone: string | null;
    status: string;
    webhookConfigured: boolean;
    quotaLabel: string;
    quotaUsed: number;
    quotaLimit: number;
  }[];
  recommendedActions: string[];
};

export default function StatusPage() {
  const [data, setData] = useState<StatusSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api<StatusSummary>('/api/v1/status');
      setData(res);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <LoadingState label="Loading status..." />;

  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-600 text-sm">{error}</p>
        <Button className="mt-4" onClick={load}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Status Center"
        description="Monitor session health, webhooks, and quota across your workspace."
        actions={<Link href="/webhooks" className="btn-secondary text-sm">Webhook log</Link>}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Connected sessions" value={`${data.connectedSessions}/${data.totalSessions}`} href="/sessions" />
        <StatCard label="Webhook health" value={`${data.webhookHealthy}/${data.webhookTotal}`} href="/webhooks" />
        <StatCard label="Quota alerts" value={data.quotaAlerts} href="/packages" />
        <StatCard label="Messages remaining" value={data.trialRemaining} href="/packages" footer={`${data.trialUsed}/${data.trialLimit} used`} />
      </div>

      {data.referralCode && (
        <div className="card p-5">
          <h2 className="font-semibold">Referral code</h2>
          <p className="text-sm mt-2 font-mono">{data.referralCode}</p>
          <Link href="/packages" className="text-sm text-brand mt-2 inline-block">Redeem codes on Packages →</Link>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Recommended actions</h2>
        {data.recommendedActions.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">All systems healthy.</p>
        ) : (
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {data.recommendedActions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
      </div>

      {data.sessions.length === 0 ? (
        <EmptyState title="No sessions" description="Create a session to see health status." action={<Link href="/sessions" className="btn-primary text-sm">Go to Sessions</Link>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-responsive">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-black/5 dark:bg-white/5">
                <tr>
                  <th className="text-left p-3">Session</th>
                  <th className="text-left p-3">Health</th>
                  <th className="text-left p-3">Webhook</th>
                  <th className="text-left p-3">Quota</th>
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((s) => (
                  <tr key={s.id} className="border-t border-[var(--border)] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="p-3">
                      <Link href={`/sessions/${s.id}`} className="font-medium hover:text-brand">{s.name}</Link>
                      <br /><span className="text-[var(--muted)] text-xs">{s.phone ?? '—'}</span>
                    </td>
                    <td className="p-3"><span className={s.status === 'connected' ? 'badge-green' : 'badge-gray'}>{s.status}</span></td>
                    <td className="p-3">{s.webhookConfigured ? <span className="badge-green">OK</span> : <span className="badge-gray">None</span>}</td>
                    <td className="p-3"><span className={s.quotaLabel === 'exhausted' ? 'badge-red' : 'badge-gray'}>{s.quotaUsed}/{s.quotaLimit}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
