'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/Toast';
import type { WebhookDelivery } from '@/lib/types';

type Session = { id: string; name: string };

export default function WebhooksPage() {
  const { success, error: toastError } = useToast();
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testSessionId, setTestSessionId] = useState('');
  const [testUrl, setTestUrl] = useState('');

  const load = useCallback(async () => {
    const [d, s] = await Promise.all([
      api<WebhookDelivery[]>(`/api/v1/webhooks/deliveries?limit=50&filter=${filter}`),
      api<Session[]>('/api/v1/sessions'),
    ]);
    setDeliveries(d.map((row) => ({ ...row, createdAt: String(row.createdAt) })));
    setSessions(s);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    load().catch((err) => toastError(err instanceof Error ? err.message : 'Failed to load'));
  }, [load, toastError]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function retry(id: string) {
    setRetrying(id);
    try {
      await api(`/api/v1/webhooks/deliveries/${id}/retry`, { method: 'POST' });
      success('Webhook retry queued');
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setRetrying(null);
    }
  }

  async function onTest(e: FormEvent) {
    e.preventDefault();
    setTesting(true);
    try {
      await api('/api/v1/webhooks/test', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: testSessionId || undefined,
          url: testUrl || undefined,
        }),
      });
      success('Test webhook queued');
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  }

  if (loading) return <LoadingState label="Loading webhooks..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        description="Delivery log, retries, and test payloads for outbound events."
      />

      <form onSubmit={onTest} className="card p-5 space-y-3">
        <h2 className="font-semibold">Send test webhook</h2>
        <select value={testSessionId} onChange={(e) => setTestSessionId(e.target.value)} className="input-field">
          <option value="">Use workspace default URL</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <Input value={testUrl} onChange={(e) => setTestUrl(e.target.value)} placeholder="Override URL (optional)" />
        <Button type="submit" loading={testing}>Send test</Button>
      </form>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'success', 'failed'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${filter === f ? 'bg-brand/10 text-brand font-semibold' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
            onClick={() => { setLoading(true); setFilter(f); }}
          >
            {f}
          </button>
        ))}
        <Button variant="ghost" className="ml-auto text-sm" onClick={() => { setLoading(true); load(); }}>Refresh</Button>
      </div>

      {deliveries.length === 0 ? (
        <EmptyState title="No webhook deliveries" description="Enable webhooks on a session or send a test above." />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-responsive">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-black/5 dark:bg-white/5">
                <tr>
                  <th className="text-left p-3">Event</th>
                  <th className="text-left p-3">URL</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Attempts</th>
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3" />
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-t border-[var(--border)]">
                    <td className="p-3 font-mono text-xs">{d.event}</td>
                    <td className="p-3 max-w-[200px] truncate text-xs">{d.url}</td>
                    <td className="p-3">
                      {d.success ? (
                        <span className="badge-green">{d.statusCode ?? 'OK'}</span>
                      ) : (
                        <span className="badge-red" title={d.lastError ?? ''}>Failed</span>
                      )}
                    </td>
                    <td className="p-3">{d.attempts}</td>
                    <td className="p-3 text-xs text-[var(--muted)]">{new Date(d.createdAt).toLocaleString()}</td>
                    <td className="p-3">
                      {!d.success && (
                        <Button variant="secondary" className="text-xs" loading={retrying === d.id} onClick={() => retry(d.id)}>
                          Retry
                        </Button>
                      )}
                      {d.sessionId && (
                        <Link href={`/sessions/${d.sessionId}`} className="text-xs text-brand ml-2">Session</Link>
                      )}
                    </td>
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
