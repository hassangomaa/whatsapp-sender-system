'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/LoadingState';
import { CopyButton } from '@/components/CopyButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Session = {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  apiKeyPrefix: string;
  canSendMessages: boolean;
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [name, setName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    api<Session[]>('/api/v1/sessions')
      .then(setSessions)
      .finally(() => setLoading(false));

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const res = await api<Session & { apiKey: string }>('/api/v1/sessions', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setCreatedKey(res.apiKey);
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingState label="Loading sessions..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        description="Each session is a WhatsApp device connection with its own API key."
      />

      <form onSubmit={onCreate} className="card p-4 sm:p-5 flex flex-col sm:flex-row gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Session name (e.g. TabletPOS)"
          className="flex-1"
          required
        />
        <Button type="submit" loading={creating} className="shrink-0">
          Create session
        </Button>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {createdKey && (
        <div className="card p-5 border-brand/50 bg-brand/5">
          <p className="font-semibold text-brand">Save your API key — shown only once</p>
          <code className="block mt-3 break-all text-sm bg-black/5 dark:bg-white/5 p-3 rounded-xl">{createdKey}</code>
          <div className="mt-3">
            <CopyButton text={createdKey} label="Copy API key" />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sessions.map((s) => (
          <Link
            key={s.id}
            href={`/sessions/${s.id}`}
            className="card p-5 hover:shadow-md hover:border-brand/30 transition block"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-semibold text-lg truncate">{s.name}</h2>
                <p className="text-sm text-[var(--muted)] mt-1">{s.phone ?? 'No phone linked'}</p>
                <p className="text-xs text-[var(--muted)] mt-1 font-mono">{s.apiKeyPrefix}…</p>
              </div>
              <span className={s.status === 'connected' ? 'badge-green shrink-0' : s.status === 'qr_pending' ? 'badge-gray shrink-0' : 'badge-red shrink-0'}>
                {s.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs mt-4 text-[var(--muted)]">
              {s.canSendMessages ? 'Ready to send' : 'Connect via QR to enable sending'}
            </p>
          </Link>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="card p-8 text-center text-[var(--muted)]">
          <p>No sessions yet. Create one above to get your API key and QR code.</p>
        </div>
      )}
    </div>
  );
}
