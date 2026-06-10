'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

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
  const [redeemCode, setRedeemCode] = useState('');

  useEffect(() => {
    api<StatusSummary>('/api/v1/status').then(setData).catch(console.error);
  }, []);

  if (!data) return <div>Loading status...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Status Center</h1>

      <div className="grid md:grid-cols-4 gap-4">
        {[
          ['Connected Sessions', `${data.connectedSessions}/${data.totalSessions}`],
          ['Webhook Health', `${data.webhookHealthy}/${data.webhookTotal}`],
          ['Quota Alerts', data.quotaAlerts],
          ['Trial Remaining', data.trialRemaining],
        ].map(([label, value]) => (
          <div key={String(label)} className="card p-5">
            <div className="text-sm text-[var(--muted)]">{label}</div>
            <div className="text-3xl font-bold mt-2">{value}</div>
          </div>
        ))}
      </div>

      {data.referralCode && (
        <div className="card p-5">
          <h2 className="font-semibold">Trial & referral</h2>
          <p className="text-sm mt-2">Referral code: <code>{data.referralCode}</code></p>
          <p className="text-sm text-[var(--muted)]">{data.trialUsed}/{data.trialLimit} used — {data.trialRemaining} remaining</p>
          <div className="flex gap-2 mt-3">
            <input
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value)}
              placeholder="Redeem code"
              className="rounded-xl border border-[var(--border)] px-3 py-2 bg-transparent"
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                api('/api/v1/packages/redeem', {
                  method: 'POST',
                  body: JSON.stringify({ code: redeemCode }),
                }).then(() => api<StatusSummary>('/api/v1/status').then(setData))
              }
            >
              Redeem code
            </button>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Recommended actions</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          {data.recommendedActions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
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
              <tr key={s.id} className="border-t border-[var(--border)]">
                <td className="p-3">{s.name}<br /><span className="text-[var(--muted)]">{s.phone}</span></td>
                <td className="p-3"><span className={s.status === 'connected' ? 'badge-green' : 'badge-gray'}>{s.status}</span></td>
                <td className="p-3">{s.webhookConfigured ? <span className="badge-green">Configured</span> : <span className="badge-gray">Not configured</span>}</td>
                <td className="p-3"><span className={s.quotaLabel === 'exhausted' ? 'badge-red' : 'badge-gray'}>TRIAL {s.quotaUsed}/{s.quotaLimit}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
