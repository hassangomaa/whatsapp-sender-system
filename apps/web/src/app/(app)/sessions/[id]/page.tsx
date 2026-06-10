'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, getToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010';

type Session = {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  apiKeyPrefix: string;
  qrCode: string | null;
  scopes: { send: boolean; media: boolean; webhook: boolean };
  webhookUrl: string | null;
  canSendMessages: boolean;
};

export default function SessionDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [session, setSession] = useState<Session | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [scopes, setScopes] = useState({ send: true, media: true, webhook: false });
  const [webhookUrl, setWebhookUrl] = useState('');

  const load = () => api<Session>(`/api/v1/sessions/${id}`).then((s) => {
    setSession(s);
    setScopes(s.scopes);
    setWebhookUrl(s.webhookUrl ?? '');
    setQr(s.qrCode);
  });

  useEffect(() => {
    load().catch(console.error);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const token = getToken();
    const es = new EventSource(`${API_URL}/api/v1/sessions/${id}/qr/stream`, {
      withCredentials: false,
    } as EventSourceInit);

    // EventSource doesn't support Authorization header — use fetch stream fallback
    let cancelled = false;

    async function streamQr() {
      const res = await fetch(`${API_URL}/api/v1/sessions/${id}/qr/stream`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      while (!cancelled) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.qr) setQr(data.qr);
              if (data.type === 'connected') load();
            } catch {}
          }
        }
      }
    }

    streamQr().catch(console.error);
    return () => {
      cancelled = true;
      es.close();
    };
  }, [id]);

  if (!session) return <div>Loading session...</div>;

  const sendUrl = `${API_URL}/api/v1/whatsapp/public/message/send`;
  const mediaUrl = `${API_URL}/api/v1/whatsapp/public/media/send`;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{session.name}</h1>
          <p className="text-sm text-[var(--muted)]">{session.phone ?? '—'} · {session.apiKeyPrefix}…</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-primary" onClick={() => api(`/api/v1/sessions/${id}/init`, { method: 'POST' }).then(load)}>
            Init / QR
          </button>
          <button type="button" className="btn-secondary" onClick={() => api(`/api/v1/sessions/${id}/disconnect`, { method: 'POST' }).then(load)}>
            Disconnect
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold mb-2">Connection status</h2>
          <span className={session.status === 'connected' ? 'badge-green' : 'badge-gray'}>{session.status}</span>
          <p className="text-sm mt-3">Connected: {session.status === 'connected' ? 'Yes' : 'No'}</p>
          <p className="text-sm">Can send messages: {session.canSendMessages ? 'Yes' : 'No'}</p>
        </div>

        <div className="card p-5 md:col-span-2">
          <h2 className="font-semibold mb-2">QR code</h2>
          {session.status === 'connected' ? (
            <p className="text-sm text-[var(--muted)]">Session is already connected, QR code not needed.</p>
          ) : qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="WhatsApp QR code" className="w-48 h-48 rounded-xl border border-[var(--border)]" />
          ) : (
            <p className="text-sm text-[var(--muted)]">Click Init / QR to generate a code, then scan with WhatsApp.</p>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Public API scopes</h2>
        <div className="flex gap-4 flex-wrap mb-4">
          {(['send', 'media', 'webhook'] as const).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={scopes[key]}
                onChange={(e) => setScopes({ ...scopes, [key]: e.target.checked })}
              />
              {key}
            </label>
          ))}
        </div>
        <input
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="Webhook URL"
          className="w-full rounded-xl border border-[var(--border)] px-3 py-2 bg-transparent mb-3"
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            api(`/api/v1/sessions/${id}/scopes`, {
              method: 'PATCH',
              body: JSON.stringify({ ...scopes, webhookUrl }),
            }).then(load)
          }
        >
          Save scopes
        </button>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-2">Public API documentation</h2>
        <p className="text-sm text-[var(--muted)] mb-2">Session ID: <code>{session.id}</code></p>
        <pre className="text-xs overflow-x-auto bg-black/5 dark:bg-white/5 p-4 rounded-xl">{`curl -X POST '${sendUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: sk_live_<your_key>' \\
  -H 'Idempotency-Key: unique-key-1' \\
  -d '{"phoneNumber":"201277785111","content":"Hello"}'

curl -X POST '${mediaUrl}' \\
  -H 'x-api-key: sk_live_<your_key>' \\
  -H 'Idempotency-Key: unique-key-2' \\
  -F 'phoneNumber=201277785111' \\
  -F 'mediaType=image' \\
  -F 'caption=Hello' \\
  -F 'file=@/path/to/image.jpg'`}</pre>
      </div>
    </div>
  );
}
