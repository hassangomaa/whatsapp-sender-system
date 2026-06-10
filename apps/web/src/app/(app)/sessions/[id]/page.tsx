'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, getToken } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/LoadingState';
import { CopyButton } from '@/components/CopyButton';
import { Button } from '@/components/ui/Button';

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
  const [initLoading, setInitLoading] = useState(false);

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
    return () => { cancelled = true; };
  }, [id]);

  if (!session) return <LoadingState label="Loading session..." />;

  const sendUrl = `${API_URL}/api/v1/whatsapp/public/message/send`;
  const curlExample = `curl -X POST '${sendUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: sk_live_<your_key>' \\
  -H 'Idempotency-Key: unique-key-1' \\
  -d '{"phoneNumber":"201277785111","content":"Hello"}'`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={session.name}
        description={`${session.phone ?? 'No phone'} · ${session.apiKeyPrefix}…`}
        actions={
          <>
            <Button
              loading={initLoading}
              onClick={async () => {
                setInitLoading(true);
                await api(`/api/v1/sessions/${id}/init`, { method: 'POST' }).then(load).finally(() => setInitLoading(false));
              }}
            >
              Init / QR
            </Button>
            <Button variant="secondary" onClick={() => api(`/api/v1/sessions/${id}/disconnect`, { method: 'POST' }).then(load)}>
              Disconnect
            </Button>
          </>
        }
      />

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold mb-2">Connection</h2>
          <span className={session.status === 'connected' ? 'badge-green' : session.status === 'qr_pending' ? 'badge-gray' : 'badge-red'}>
            {session.status.replace('_', ' ')}
          </span>
          <ul className="text-sm mt-4 space-y-2 text-[var(--muted)]">
            <li>Connected: {session.status === 'connected' ? 'Yes' : 'No'}</li>
            <li>Can send: {session.canSendMessages ? 'Yes' : 'No'}</li>
            <li className="font-mono text-xs break-all">ID: {session.id}</li>
          </ul>
        </div>

        <div className="card p-5 md:col-span-2 flex flex-col items-center justify-center min-h-[220px]">
          <h2 className="font-semibold mb-3 self-start">QR code</h2>
          {session.status === 'connected' ? (
            <p className="text-sm text-[var(--muted)]">Session connected — QR not needed.</p>
          ) : qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="WhatsApp QR code" className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl border border-[var(--border)]" />
          ) : (
            <p className="text-sm text-[var(--muted)] text-center">Click Init / QR, then scan with WhatsApp on your phone.</p>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">API scopes</h2>
        <div className="flex gap-4 flex-wrap mb-4">
          {(['send', 'media', 'webhook'] as const).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={scopes[key]}
                onChange={(e) => setScopes({ ...scopes, [key]: e.target.checked })}
                className="rounded"
              />
              {key}
            </label>
          ))}
        </div>
        <input
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="Webhook URL (optional)"
          className="input-field mb-3"
        />
        <Button
          variant="secondary"
          onClick={() =>
            api(`/api/v1/sessions/${id}/scopes`, {
              method: 'PATCH',
              body: JSON.stringify({ ...scopes, webhookUrl }),
            }).then(load)
          }
        >
          Save scopes
        </Button>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
          <h2 className="font-semibold">API example</h2>
          <CopyButton text={curlExample} label="Copy curl" />
        </div>
        <pre className="text-xs overflow-x-auto bg-black/5 dark:bg-white/5 p-4 rounded-xl">{curlExample}</pre>
      </div>
    </div>
  );
}
