'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Session = { id: string; name: string; status: string };
type Campaign = {
  id: string;
  name: string;
  status: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  session: { name: string };
};

export default function CampaignsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [content, setContent] = useState('');
  const [recipientsCsv, setRecipientsCsv] = useState('201277785111\n201009631419');

  const load = async () => {
    const [s, c] = await Promise.all([
      api<Session[]>('/api/v1/sessions'),
      api<Campaign[]>('/api/v1/campaigns'),
    ]);
    setSessions(s.filter((x) => x.status === 'connected'));
    setCampaigns(c);
    if (!sessionId && s[0]) setSessionId(s[0].id);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const recipients = recipientsCsv
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((phoneNumber) => ({ phoneNumber }));

    await api('/api/v1/campaigns', {
      method: 'POST',
      body: JSON.stringify({ name, sessionId, content, recipients }),
    });
    setName('');
    setContent('');
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bulk campaigns</h1>

      <form onSubmit={onCreate} className="card p-5 space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" className="w-full rounded-xl border border-[var(--border)] px-3 py-2 bg-transparent" required />
        <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="w-full rounded-xl border border-[var(--border)] px-3 py-2 bg-transparent" required>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Message content" className="w-full rounded-xl border border-[var(--border)] px-3 py-2 bg-transparent min-h-[80px]" required />
        <textarea value={recipientsCsv} onChange={(e) => setRecipientsCsv(e.target.value)} placeholder="One phone number per line" className="w-full rounded-xl border border-[var(--border)] px-3 py-2 bg-transparent min-h-[120px] font-mono text-sm" required />
        <button type="submit" className="btn-primary">Create campaign</button>
      </form>

      <div className="space-y-3">
        {campaigns.map((c) => (
          <div key={c.id} className="card p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold">{c.name}</h2>
              <p className="text-sm text-[var(--muted)]">{c.session.name} · {c.sentCount}/{c.totalCount} sent · {c.failedCount} failed</p>
            </div>
            <div className="flex gap-2 items-center">
              <span className="badge-gray">{c.status}</span>
              {c.status === 'DRAFT' && (
                <button type="button" className="btn-primary" onClick={() => api(`/api/v1/campaigns/${c.id}/start`, { method: 'POST' }).then(load)}>
                  Start
                </button>
              )}
              {c.status === 'RUNNING' && (
                <button type="button" className="btn-secondary" onClick={() => api(`/api/v1/campaigns/${c.id}/pause`, { method: 'POST' }).then(load)}>
                  Pause
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
