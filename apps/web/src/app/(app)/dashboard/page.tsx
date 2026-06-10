'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

type DashboardStats = {
  totalSessions: number;
  connectedSessions: number;
  connectionHealthPercent: number;
  activePackages: number;
  messagesSent: number;
  trialRemaining: number;
  trialUsed: number;
  trialLimit: number;
  funnel: {
    sessionCreated: boolean;
    sessionConnected: boolean;
    firstMessageSent: boolean;
    connectedSession: { id: string; name: string; status: string } | null;
  };
  recommendedAction: string;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api<DashboardStats>('/api/v1/dashboard').then(setStats).catch(console.error);
  }, []);

  if (!stats) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <span className="badge-green mt-2">Live workspace</span>
        </div>
        <div className="flex gap-2">
          <Link href="/sessions" className="btn-secondary">Manage sessions</Link>
          <Link href="/status" className="btn-secondary">Open status</Link>
          <Link href="/messages" className="btn-primary">Send message</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          ['Total Sessions', stats.totalSessions, '/sessions'],
          ['Connected Sessions', `${stats.connectedSessions} (${stats.connectionHealthPercent}%)`, '/sessions'],
          ['Active Packages', stats.activePackages, '/packages'],
          ['Messages Sent', stats.messagesSent, '/messages'],
        ].map(([label, value, href]) => (
          <Link key={String(label)} href={href as string} className="card p-5 hover:shadow-md transition">
            <div className="text-sm text-[var(--muted)]">{label}</div>
            <div className="text-3xl font-bold mt-2">{value}</div>
          </Link>
        ))}
      </div>

      <section className="card p-6">
        <h2 className="font-semibold mb-4">5-Minute Activation Funnel</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <FunnelStep
            title="1. Create Session"
            done={stats.funnel.sessionCreated}
            detail={stats.funnel.connectedSession ? `${stats.funnel.connectedSession.name} (${stats.funnel.connectedSession.status})` : 'Create your first session'}
          />
          <FunnelStep
            title="2. Scan QR"
            done={stats.funnel.sessionConnected}
            detail={stats.funnel.sessionConnected ? 'Session is connected and ready' : 'Init session and scan QR'}
          />
          <FunnelStep
            title="3. Send First Message"
            done={stats.funnel.firstMessageSent}
            detail={stats.funnel.firstMessageSent ? 'First message sent successfully' : 'Send from Messages page'}
          />
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold">Recommended next action</h3>
          <p className="text-sm text-[var(--muted)] mt-2">{stats.recommendedAction}</p>
          <div className="flex gap-2 mt-4">
            <Link href="/packages" className="btn-primary">Buy package</Link>
            <Link href="/campaigns" className="btn-secondary">Bulk campaigns</Link>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold">Trial usage</h3>
          <p className="text-3xl font-bold mt-2">{stats.trialUsed}/{stats.trialLimit}</p>
          <p className="text-sm text-[var(--muted)]">{stats.trialRemaining} remaining</p>
        </div>
      </div>
    </div>
  );
}

function FunnelStep({ title, done, detail }: { title: string; done: boolean; detail: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        {done ? <span className="badge-green">Done</span> : <span className="badge-gray">Pending</span>}
      </div>
      <p className="text-sm text-[var(--muted)] mt-2">{detail}</p>
    </div>
  );
}
