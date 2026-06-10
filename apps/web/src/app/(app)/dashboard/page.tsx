'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, authApi } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/LoadingState';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/Button';
import type { DashboardStats } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, me] = await Promise.all([
        api<DashboardStats>('/api/v1/dashboard'),
        authApi.me(),
      ]);
      setStats(s);
      setUserName(me.user.name ?? me.user.email);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
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

  if (loading) return <LoadingState label="Loading dashboard..." />;

  if (error || !stats) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto">
        <p className="text-red-600 text-sm">{error || 'Failed to load'}</p>
        <Button className="mt-4" onClick={load}>Retry</Button>
      </div>
    );
  }

  const msgPercent = Math.min(100, Math.round((stats.trialUsed / stats.trialLimit) * 100));
  const sessionPercent = Math.min(100, Math.round((stats.sessionsUsed / stats.maxSessions) * 100));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back${userName ? `, ${userName.split(' ')[0]}` : ''}`}
        description={`${stats.planName} plan · ${stats.connectedSessions} of ${stats.totalSessions} sessions connected`}
        actions={
          <>
            <Link href="/sessions" className="btn-secondary text-sm">Sessions</Link>
            <Link href="/messages" className="btn-primary text-sm">Send message</Link>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Sessions" value={stats.totalSessions} href="/sessions" />
        <StatCard
          label="Connected"
          value={`${stats.connectedSessions} (${stats.connectionHealthPercent}%)`}
          href="/sessions"
        />
        <StatCard label="Messages sent" value={stats.messagesSent} href="/messages" />
        <StatCard
          label="Webhook failures (24h)"
          value={stats.recentWebhookFailures}
          href="/webhooks"
          footer={`${stats.webhookStats.failed} total failed`}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Message quota</h3>
            <Link href="/packages" className="text-xs text-brand">Upgrade</Link>
          </div>
          <p className="text-2xl font-bold">{stats.trialUsed} / {stats.trialLimit}</p>
          <div className="mt-3 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-brand rounded-full" style={{ width: `${msgPercent}%` }} />
          </div>
          <p className="text-sm text-[var(--muted)] mt-2">{stats.trialRemaining} remaining</p>
        </div>

        <div className="card p-5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Session limit</h3>
            <Link href="/packages" className="text-xs text-brand">Upgrade</Link>
          </div>
          <p className="text-2xl font-bold">{stats.sessionsUsed} / {stats.maxSessions}</p>
          <div className="mt-3 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-brand rounded-full" style={{ width: `${sessionPercent}%` }} />
          </div>
          <p className="text-sm text-[var(--muted)] mt-2">
            {stats.sessionsUsed >= stats.maxSessions ? 'Limit reached' : `${stats.maxSessions - stats.sessionsUsed} slots available`}
          </p>
        </div>
      </div>

      <section className="card p-6">
        <h2 className="font-semibold mb-4">Activation funnel</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <FunnelStep title="1. Create session" done={stats.funnel.sessionCreated} detail={stats.funnel.connectedSession?.name ?? 'Create your first session'} />
          <FunnelStep title="2. Scan QR" done={stats.funnel.sessionConnected} detail={stats.funnel.sessionConnected ? 'Connected' : 'Init and scan QR'} />
          <FunnelStep title="3. First message" done={stats.funnel.firstMessageSent} detail={stats.funnel.firstMessageSent ? 'Sent' : 'Send from Messages'} />
        </div>
        <p className="text-sm text-[var(--muted)] mt-4">{stats.recommendedAction}</p>
      </section>

      <section className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">Recent activity</h2>
          <Link href="/messages" className="text-sm text-brand">View all</Link>
        </div>
        {stats.recentMessages.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No messages yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-black/5 dark:bg-white/5">
                <tr>
                  <th className="text-left p-2">To</th>
                  <th className="text-left p-2">Content</th>
                  <th className="text-left p-2">Session</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentMessages.map((m) => (
                  <tr key={m.id} className="border-t border-[var(--border)]">
                    <td className="p-2">{m.phoneNumber}</td>
                    <td className="p-2 max-w-xs truncate">{m.content}</td>
                    <td className="p-2">{m.session.name}</td>
                    <td className="p-2"><span className={m.status === 'SENT' ? 'badge-green' : 'badge-gray'}>{m.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function FunnelStep({ title, done, detail }: { title: string; done: boolean; detail: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">{title}</h3>
        {done ? <span className="badge-green">Done</span> : <span className="badge-gray">Pending</span>}
      </div>
      <p className="text-sm text-[var(--muted)] mt-2">{detail}</p>
    </div>
  );
}
