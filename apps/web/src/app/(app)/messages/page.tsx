'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/Toast';

type Session = { id: string; name: string; status: string };
type Message = {
  id: string;
  phoneNumber: string;
  content: string | null;
  status: string;
  createdAt: string;
  session: { name: string };
};

export default function MessagesPage() {
  const { success, error: toastError } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (nextCursor?: string) => {
    const limit = 25;
    const path = nextCursor
      ? `/api/v1/messages?limit=${limit}&cursor=${nextCursor}`
      : `/api/v1/messages?limit=${limit}`;

    const [s, m] = await Promise.all([
      api<Session[]>('/api/v1/sessions'),
      api<Message[]>(path),
    ]);

    setSessions(s.filter((x) => x.status === 'connected'));
    if (nextCursor) {
      setMessages((prev) => [...prev, ...m]);
    } else {
      setMessages(m);
    }
    setHasMore(m.length === limit);
    if (m.length > 0) setCursor(m[m.length - 1].id);
    if (!sessionId && s.length > 0) {
      const connected = s.find((x) => x.status === 'connected');
      if (connected) setSessionId(connected.id);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    load().catch((err) => toastError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await api('/api/v1/messages', {
        method: 'POST',
        body: JSON.stringify({ sessionId, phoneNumber, content }),
      });
      success('Message queued for delivery');
      setContent('');
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingState label="Loading messages..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="Send WhatsApp messages and view delivery history." />

      <form onSubmit={onSend} className="card p-5 space-y-3">
        <select
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          className="input-field"
          required
        >
          <option value="">Select connected session</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {sessions.length === 0 && (
          <p className="text-sm text-amber-600">No connected sessions. Connect one from Sessions first.</p>
        )}
        <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone number (e.g. 201277785111)" required />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Message content"
          className="input-field min-h-[100px]"
          required
        />
        <Button type="submit" loading={sending}>Send message</Button>
      </form>

      {messages.length === 0 ? (
        <EmptyState title="No messages yet" description="Send your first message using the form above." />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-responsive">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-black/5 dark:bg-white/5">
                <tr>
                  <th className="text-left p-3">To</th>
                  <th className="text-left p-3">Content</th>
                  <th className="text-left p-3">Session</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Sent</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id} className="border-t border-[var(--border)]">
                    <td className="p-3">{m.phoneNumber}</td>
                    <td className="p-3 max-w-md truncate">{m.content}</td>
                    <td className="p-3">{m.session.name}</td>
                    <td className="p-3"><span className={m.status === 'SENT' ? 'badge-green' : m.status === 'FAILED' ? 'badge-red' : 'badge-gray'}>{m.status}</span></td>
                    <td className="p-3 text-[var(--muted)] text-xs">{new Date(m.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && cursor && (
            <div className="p-3 border-t border-[var(--border)]">
              <Button variant="secondary" className="w-full" onClick={() => load(cursor)}>Load more</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
