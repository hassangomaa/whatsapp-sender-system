'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, getToken } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/LoadingState';
import { CopyButton } from '@/components/CopyButton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { QrConnectionPanel } from '@/components/QrConnectionPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/Toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010';
const QR_REFRESH_SECONDS = 20;

type Session = {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  apiKeyPrefix: string | null;
  hasApiKey: boolean;
  qrCode: string | null;
  scopes: { send: boolean; media: boolean; webhook: boolean };
  webhookUrl: string | null;
  canSendMessages: boolean;
};

type StreamEvent = {
  type?: string;
  qr?: string;
  qrExpiresAt?: number;
  status?: string;
  phone?: string;
  mock?: boolean;
  apiKey?: string;
  message?: string;
};

export default function SessionDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [session, setSession] = useState<Session | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null);
  const [baileysMock, setBaileysMock] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [scopes, setScopes] = useState({ send: true, media: true, webhook: false });
  const [webhookUrl, setWebhookUrl] = useState('');
  const [initLoading, setInitLoading] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingScopes, setSavingScopes] = useState(false);
  const { success, error: toastError } = useToast();
  const pairingRef = useRef(false);
  const connectingRef = useRef(false);

  const applyStreamEvent = useCallback((data: StreamEvent) => {
    if (data.mock !== undefined) setBaileysMock(data.mock);
    if (data.type === 'pairing_accepted' || data.status === 'connecting') {
      connectingRef.current = true;
      setConnecting(true);
      setPairing(true);
      pairingRef.current = true;
    }
    if (data.qr && !connectingRef.current) {
      setQr(data.qr);
      setQrExpiresAt(data.qrExpiresAt ?? Date.now() + QR_REFRESH_SECONDS * 1000);
      setPairing(true);
      pairingRef.current = true;
    }
    if (data.type === 'connected' || data.status === 'connected') {
      setQr(null);
      setQrExpiresAt(null);
      setPairing(false);
      connectingRef.current = false;
      setConnecting(false);
      pairingRef.current = false;
    }
    if (data.type === 'api_key_ready' && data.apiKey) {
      setApiKey(data.apiKey);
    }
    if (data.type === 'disconnected' || data.status === 'disconnected') {
      if (data.type === 'disconnected') {
        setQr(null);
        setQrExpiresAt(null);
        connectingRef.current = false;
        setConnecting(false);
        setApiKey(null);
      }
    }
  }, []);

  const load = useCallback(() => api<Session>(`/api/v1/sessions/${id}`).then((s) => {
    setSession(s);
    setScopes(s.scopes);
    setWebhookUrl(s.webhookUrl ?? '');
    if (s.status === 'connecting') {
      connectingRef.current = true;
      setConnecting(true);
      setPairing(true);
      pairingRef.current = true;
    }
    if (s.status === 'qr_pending' && s.qrCode) {
      setQr(s.qrCode);
      setQrExpiresAt(Date.now() + QR_REFRESH_SECONDS * 1000);
      setPairing(true);
      setConnecting(false);
    }
    if (s.status === 'connected') {
      setQr(null);
      setPairing(false);
      setConnecting(false);
      pairingRef.current = false;
    }
  }), [id]);

  useEffect(() => {
    load().catch((err) => toastError(err instanceof Error ? err.message : 'Failed to load'));
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then((h) => setBaileysMock(Boolean(h?.capabilities?.baileysMock)))
      .catch(() => {});
  }, [load, toastError]);

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
      let buffer = '';

      while (!cancelled) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6)) as StreamEvent;
            applyStreamEvent(data);
            if (data.type === 'connected' || data.type === 'api_key_ready') load();
            if (data.type === 'snapshot' && data.status) {
              if (data.status === 'connecting') setConnecting(true);
              if (data.status !== 'connected' && data.status !== 'connecting') {
                setPairing(pairingRef.current);
              }
            }
          } catch {}
        }
      }
    }

    streamQr().catch(console.error);
    return () => { cancelled = true; };
  }, [id, load, applyStreamEvent]);

  useEffect(() => {
    if (!pairing || session?.status === 'connected') return;
    const poll = setInterval(() => {
      load().catch(() => {});
    }, 5000);
    return () => clearInterval(poll);
  }, [pairing, session?.status, load]);

  if (!session) return <LoadingState label="Loading session..." />;

  const sendUrl = `${API_URL}/api/v1/whatsapp/public/message/send`;
  const keyForCurl = apiKey ?? (session.hasApiKey ? `${session.apiKeyPrefix}…` : 'sk_live_<available_after_connect>');
  const curlExample = `curl -X POST '${sendUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: ${keyForCurl}' \\
  -H 'Idempotency-Key: unique-key-1' \\
  -d '{"phoneNumber":"201277785111","content":"Hello"}'`;

  const statusLabel = connecting || session.status === 'connecting'
    ? 'linking device'
    : session.status.replace('_', ' ');

  const initDisabled = initLoading || connecting || session.status === 'connecting' ||
    (session.status === 'qr_pending' && pairing);

  return (
    <div className="space-y-6">
      <Link href="/sessions" className="text-sm text-brand hover:underline">← Back to sessions</Link>
      <PageHeader
        title={session.name}
        description={
          session.phone
            ? `+${session.phone}`
            : session.hasApiKey
              ? `Not linked yet · ${session.apiKeyPrefix}…`
              : 'Not linked yet · API key after pairing'
        }
        actions={
          <>
            <Button
              loading={initLoading}
              disabled={initDisabled}
              onClick={async () => {
                setInitLoading(true);
                setPairing(true);
                pairingRef.current = true;
                connectingRef.current = false;
                setConnecting(false);
                setQr(null);
                try {
                  await api(`/api/v1/sessions/${id}/init`, { method: 'POST' });
                  success('Pairing started — scan the QR with WhatsApp');
                  await load();
                } catch (err) {
                  setPairing(false);
                  pairingRef.current = false;
                  toastError(err instanceof Error ? err.message : 'Init failed');
                } finally {
                  setInitLoading(false);
                }
              }}
            >
              {session.status === 'connected' ? 'Re-link device' : 'Init / QR'}
            </Button>
            <Button variant="secondary" onClick={() => setDisconnectOpen(true)}>
              Disconnect
            </Button>
          </>
        }
      />

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold mb-2">Connection</h2>
          <span
            className={
              session.status === 'connected'
                ? 'badge-green'
                : connecting || session.status === 'connecting' || session.status === 'qr_pending' || pairing
                  ? 'badge-gray'
                  : 'badge-red'
            }
          >
            {pairing && session.status !== 'connected' && session.status !== 'connecting'
              ? 'waiting for scan'
              : statusLabel}
          </span>
          <ul className="text-sm mt-4 space-y-2 text-[var(--muted)]">
            <li>Linked: {session.status === 'connected' ? 'Yes' : 'No'}</li>
            <li>Can send: {session.canSendMessages ? 'Yes' : 'No'}</li>
            <li>API key: {session.hasApiKey || apiKey ? 'Ready' : 'After pairing'}</li>
            <li>QR refresh: every {QR_REFRESH_SECONDS}s</li>
            <li className="font-mono text-xs break-all">ID: {session.id}</li>
          </ul>
        </div>

        <div className="card p-5 md:col-span-2">
          <h2 className="font-semibold mb-4">Pair WhatsApp</h2>
          <QrConnectionPanel
            status={session.status}
            qr={qr}
            qrExpiresAt={qrExpiresAt}
            qrRefreshSeconds={QR_REFRESH_SECONDS}
            baileysMock={baileysMock}
            phone={session.phone}
            pairing={pairing || session.status === 'qr_pending'}
            connecting={connecting || session.status === 'connecting'}
          />
        </div>
      </div>

      {(session.status === 'connected' && (apiKey || session.hasApiKey)) && (
        <div className="card p-5 border-brand/50 bg-brand/5">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
            <h2 className="font-semibold">API key</h2>
            {apiKey && <CopyButton text={apiKey} label="Copy API key" />}
          </div>
          {apiKey ? (
            <>
              <p className="text-sm text-[var(--muted)] mb-3">Save this key — shown once after pairing.</p>
              <code className="block break-all text-sm bg-black/5 dark:bg-white/5 p-3 rounded-xl">{apiKey}</code>
            </>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Key prefix <code className="font-mono">{session.apiKeyPrefix}</code> — full key was shown when you
              first connected. Disconnect and re-pair to generate a new key.
            </p>
          )}
        </div>
      )}

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
          loading={savingScopes}
          onClick={async () => {
            setSavingScopes(true);
            try {
              await api(`/api/v1/sessions/${id}/scopes`, {
                method: 'PATCH',
                body: JSON.stringify({ ...scopes, webhookUrl }),
              });
              success('Scopes saved');
              await load();
            } catch (err) {
              toastError(err instanceof Error ? err.message : 'Save failed');
            } finally {
              setSavingScopes(false);
            }
          }}
        >
          Save scopes
        </Button>
      </div>

      <ConfirmDialog
        open={disconnectOpen}
        title="Disconnect session?"
        description="This logs out the linked WhatsApp device and clears pairing data. You will need to scan a new QR code to reconnect."
        confirmLabel="Disconnect"
        variant="danger"
        loading={disconnecting}
        onConfirm={async () => {
          setDisconnecting(true);
          try {
            await api(`/api/v1/sessions/${id}/disconnect`, { method: 'POST' });
            setQr(null);
            setPairing(false);
            setConnecting(false);
            setApiKey(null);
            pairingRef.current = false;
            success('Session disconnected — scan a new QR to reconnect');
            await load();
          } catch (err) {
            toastError(err instanceof Error ? err.message : 'Disconnect failed');
          } finally {
            setDisconnecting(false);
            setDisconnectOpen(false);
          }
        }}
        onCancel={() => setDisconnectOpen(false)}
      />

      <div className="card p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
          <h2 className="font-semibold">API example</h2>
          {apiKey && <CopyButton text={curlExample} label="Copy curl" />}
        </div>
        {!session.hasApiKey && !apiKey && (
          <p className="text-sm text-[var(--muted)] mb-3">API key becomes available after WhatsApp is linked.</p>
        )}
        <pre className="text-xs overflow-x-auto bg-black/5 dark:bg-white/5 p-4 rounded-xl">{curlExample}</pre>
      </div>
    </div>
  );
}
