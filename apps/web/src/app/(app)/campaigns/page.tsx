'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { InfoCallout } from '@/components/InfoCallout';
import Link from 'next/link';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/Toast';

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
  const { success, error: toastError } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [content, setContent] = useState('');
  const [recipientsCsv, setRecipientsCsv] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirmStart, setConfirmStart] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    const [s, c] = await Promise.all([
      api<Session[]>('/api/v1/sessions'),
      api<Campaign[]>('/api/v1/campaigns'),
    ]);
    setSessions(s.filter((x) => x.status === 'connected'));
    setCampaigns(c);
    const connected = s.find((x) => x.status === 'connected');
    if (!sessionId && connected) setSessionId(connected.id);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    load().catch((err) => toastError(err instanceof Error ? err.message : 'Failed to load'));
  }, [load, toastError]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 5000);
    return () => clearInterval(interval);
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const recipients = recipientsCsv
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((phoneNumber) => ({ phoneNumber }));

      await api('/api/v1/campaigns', {
        method: 'POST',
        body: JSON.stringify({ name, sessionId, content, recipients }),
      });
      success('Campaign created');
      setName('');
      setContent('');
      setRecipientsCsv('');
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  }

  async function startCampaign(id: string) {
    setActionLoading(true);
    try {
      await api(`/api/v1/campaigns/${id}/start`, { method: 'POST' });
      success('Campaign started');
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to start');
    } finally {
      setActionLoading(false);
      setConfirmStart(null);
    }
  }

  async function campaignAction(id: string, action: 'pause' | 'cancel') {
    setActionLoading(true);
    try {
      await api(`/api/v1/campaigns/${id}/${action}`, { method: 'POST' });
      success(`Campaign ${action}ed`);
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingState label="Loading campaigns..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk campaigns"
        description="Create safe, scheduled campaigns with opt-in recipients."
        actions={<Button type="button" onClick={() => document.getElementById('campaign-form')?.scrollIntoView({ behavior: 'smooth' })}>+ New campaign</Button>}
      />

      <InfoCallout title="Bulk campaign checklist" variant="tip">
        <ul className="list-disc pl-5 space-y-1">
          <li>Only message users who opted in to receive WhatsApp from you.</li>
          <li>Start with a small test list before large sends.</li>
          <li>Keep content clear and include an opt-out when required.</li>
        </ul>
      </InfoCallout>

      <InfoCallout title="Bulk messaging safety" variant="warning">
        <ul className="list-disc pl-5 space-y-1">
          <li>Abusive bulk messaging can get your WhatsApp number banned.</li>
          <li>Respect local regulations and WhatsApp Business policies.</li>
          <li>Use campaigns for legitimate notifications, not spam.</li>
        </ul>
      </InfoCallout>

      <form id="campaign-form" onSubmit={onCreate} className="card p-5 space-y-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" required />
        <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="input-field" required>
          <option value="">Select session</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Message content" className="input-field min-h-[80px]" required />
        <textarea
          value={recipientsCsv}
          onChange={(e) => setRecipientsCsv(e.target.value)}
          placeholder="One phone number per line"
          className="input-field min-h-[120px] font-mono text-sm"
          required
        />
        <Button type="submit" loading={creating}>Create campaign</Button>
      </form>

      {campaigns.length === 0 ? (
        <EmptyState title="No campaigns yet" description="Create a campaign above to send bulk messages." />
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const progress = c.totalCount > 0 ? Math.round(((c.sentCount + c.failedCount) / c.totalCount) * 100) : 0;
            return (
              <div key={c.id} className="card p-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold">{c.name}</h2>
                    <p className="text-sm text-[var(--muted)]">{c.session.name} · {c.sentCount}/{c.totalCount} sent · {c.failedCount} failed</p>
                    {c.status === 'RUNNING' && (
                      <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden max-w-xs">
                        <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className="badge-gray">{c.status}</span>
                    {c.status === 'DRAFT' && (
                      <Button onClick={() => setConfirmStart(c.id)}>Start</Button>
                    )}
                    {c.status === 'RUNNING' && (
                      <>
                        <Button variant="secondary" onClick={() => campaignAction(c.id, 'pause')}>Pause</Button>
                        <Button variant="danger" onClick={() => campaignAction(c.id, 'cancel')}>Cancel</Button>
                      </>
                    )}
                    {c.status === 'PAUSED' && (
                      <>
                        <Button onClick={() => setConfirmStart(c.id)}>Resume</Button>
                        <Button variant="danger" onClick={() => campaignAction(c.id, 'cancel')}>Cancel</Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmStart}
        title="Start campaign?"
        description="Messages will be sent to all recipients. This uses your message quota."
        confirmLabel="Start"
        loading={actionLoading}
        onConfirm={() => confirmStart && startCampaign(confirmStart)}
        onCancel={() => setConfirmStart(null)}
      />
    </div>
  );
}
