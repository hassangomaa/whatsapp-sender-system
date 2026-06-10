'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { InfoCallout } from '@/components/InfoCallout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
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
  const [textSessionId, setTextSessionId] = useState('');
  const [mediaSessionId, setMediaSessionId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mediaPhone, setMediaPhone] = useState('');
  const [content, setContent] = useState('');
  const [caption, setCaption] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const connected = sessions.filter((x) => x.status === 'connected');

  const load = useCallback(async (nextCursor?: string) => {
    const limit = 25;
    const path = nextCursor
      ? `/api/v1/messages?limit=${limit}&cursor=${nextCursor}`
      : `/api/v1/messages?limit=${limit}`;

    const [s, m] = await Promise.all([
      api<Session[]>('/api/v1/sessions'),
      api<Message[]>(path),
    ]);

    setSessions(s);
    const conn = s.filter((x) => x.status === 'connected');
    if (!textSessionId && conn[0]) setTextSessionId(conn[0].id);
    if (!mediaSessionId && conn[0]) setMediaSessionId(conn[0].id);

    if (nextCursor) setMessages((prev) => [...prev, ...m]);
    else setMessages(m);
    setHasMore(m.length === limit);
    if (m.length > 0) setCursor(m[m.length - 1].id);
    setLoading(false);
  }, [textSessionId, mediaSessionId]);

  useEffect(() => {
    load().catch((err) => toastError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  async function onSendText(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await api('/api/v1/messages', {
        method: 'POST',
        body: JSON.stringify({ sessionId: textSessionId, phoneNumber, content }),
      });
      success('Message queued');
      setContent('');
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }

  async function onSendMedia(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      toastError('Choose a file');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toastError('Max file size 20 MB');
      return;
    }
    setSendingMedia(true);
    try {
      const base64 = await fileToBase64(file);
      await api('/api/v1/messages/media', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: mediaSessionId,
          phoneNumber: mediaPhone,
          mediaType,
          mediaBase64: base64,
          caption: caption || undefined,
          filename: file.name,
        }),
      });
      success('Media queued');
      setFile(null);
      setCaption('');
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Media send failed');
    } finally {
      setSendingMedia(false);
    }
  }

  if (loading) return <LoadingState label="Loading messages..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Send text and media messages using your connected sessions."
      />

      <InfoCallout title="Before sending" variant="success">
        <ul className="list-disc pl-5 space-y-1">
          <li>Use international digits only (country code + number).</li>
          <li>Session must be <strong>connected</strong> before sending.</li>
          <li>Media uploads max 20 MB — enable media scope on the session.</li>
        </ul>
        <Link href="/status" className="text-brand hover:underline inline-block mt-2">Check session status →</Link>
      </InfoCallout>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm">
        Connected sessions: <strong>{connected.length}</strong>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={onSendText} className="card p-5 space-y-4">
          <h2 className="font-semibold">Send text message</h2>
          <Select label="Session" value={textSessionId} onChange={(e) => setTextSessionId(e.target.value)} required>
            <option value="">Select a session</option>
            {connected.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Input
            label="Recipient phone"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="201234567890"
            hint="Digits only (with country code). Example: 201234567890"
            required
          />
          <Textarea
            label="Message"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Hello! This is a test message."
            required
          />
          <div className="flex justify-end">
            <Button type="submit" loading={sending}>Send</Button>
          </div>
        </form>

        <form onSubmit={onSendMedia} className="card p-5 space-y-4">
          <h2 className="font-semibold">Send media</h2>
          <Select label="Session" value={mediaSessionId} onChange={(e) => setMediaSessionId(e.target.value)} required>
            <option value="">Select a session</option>
            {connected.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Input
            label="Recipient phone"
            value={mediaPhone}
            onChange={(e) => setMediaPhone(e.target.value)}
            placeholder="201234567890"
            required
          />
          <Select label="Media type" value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
            <option value="image">image</option>
            <option value="document">document</option>
          </Select>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Media file</span>
            <input
              type="file"
              className="input-field"
              accept={mediaType === 'image' ? 'image/*' : '*/*'}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-[var(--muted)]">Upload file directly (max 20 MB)</p>
          </label>
          <Input label="Caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Check this out" />
          <div className="flex justify-end">
            <Button type="submit" loading={sendingMedia}>Send media</Button>
          </div>
        </form>
      </div>

      {messages.length === 0 ? (
        <EmptyState title="No messages yet" description="Send your first message using the forms above." />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-responsive">
            <table className="data-table min-w-[600px]">
              <thead>
                <tr>
                  <th>To</th>
                  <th>Content</th>
                  <th>Session</th>
                  <th>Status</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id}>
                    <td>{m.phoneNumber}</td>
                    <td className="max-w-md truncate">{m.content}</td>
                    <td>{m.session.name}</td>
                    <td><span className={m.status === 'SENT' ? 'badge-green' : m.status === 'FAILED' ? 'badge-red' : 'badge-gray'}>{m.status}</span></td>
                    <td className="text-[var(--muted)] text-xs">{new Date(m.createdAt).toLocaleString()}</td>
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
