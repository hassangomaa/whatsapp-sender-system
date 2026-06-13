'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, authApi, type PlatformAdminView, type PlatformSession } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/StatusBadge';
import { InfoCallout } from '@/components/InfoCallout';
import { PhoneInput } from '@/components/PhoneInput';
import { useToast } from '@/components/Toast';

function sessionTone(session: { status: string; liveConnected: boolean }) {
  if (session.liveConnected) return 'green' as const;
  if (session.status === 'connected') return 'amber' as const;
  if (session.status === 'qr_pending' || session.status === 'connecting') return 'blue' as const;
  return 'gray' as const;
}

function sessionLabel(session: { status: string; liveConnected: boolean }) {
  if (session.liveConnected) return 'Live';
  if (session.status === 'connected') return 'DB connected';
  return session.status.replace('_', ' ');
}

function PlatformSessionsPanel({
  sessions,
  onRefresh,
}: {
  sessions: PlatformSession[];
  onRefresh: () => Promise<void>;
}) {
  const { success, error: toastError } = useToast();
  const [name, setName] = useState('OTP Sender');
  const [creating, setCreating] = useState(false);
  const [initId, setInitId] = useState<string | null>(null);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    if (!qrSessionId) return;
    const tick = () => {
      adminApi.getSession(qrSessionId).then((s) => {
        setQrCode(s.qrCode);
        if (s.liveConnected || s.status === 'connected') {
          setQrSessionId(null);
          void onRefresh();
        }
      }).catch(() => {});
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, [qrSessionId, onRefresh]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await adminApi.createSession(name.trim() || 'OTP Sender');
      success('Session created');
      await onRefresh();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  async function onInit(sessionId: string) {
    setInitId(sessionId);
    try {
      await adminApi.initSession(sessionId);
      setQrSessionId(sessionId);
      success('QR generation started');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Init failed');
    } finally {
      setInitId(null);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onCreate} className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Session name" />
        </div>
        <Button type="submit" variant="secondary" disabled={creating}>
          {creating ? 'Creating…' : 'Create session'}
        </Button>
      </form>

      {sessions.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No platform sessions yet — create one above.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] p-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{s.name}</p>
                <p className="text-xs text-[var(--muted)] truncate">{s.id}</p>
              </div>
              <StatusBadge tone={sessionTone(s)}>{sessionLabel(s)}</StatusBadge>
              {!s.liveConnected && (
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs"
                  disabled={initId === s.id}
                  onClick={() => onInit(s.id)}
                >
                  {initId === s.id ? 'Starting…' : 'Init / QR'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {qrCode && (
        <div className="rounded-xl border border-[var(--border)] p-4 inline-block">
          <p className="text-sm font-medium mb-2">Scan QR with WhatsApp</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="WhatsApp QR" className="w-48 h-48" />
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [data, setData] = useState<PlatformAdminView | null>(null);
  const [otpSessionId, setOtpSessionId] = useState('');
  const [adminNotifySessionId, setAdminNotifySessionId] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminNotifyEnabled, setAdminNotifyEnabled] = useState(true);
  const [testPhone, setTestPhone] = useState('');

  function renderSessionOptions() {
    return (
      <>
        <option value="">— Not configured —</option>
        {data?.sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.phone ? ` (+${s.phone})` : ''} — {sessionLabel(s)}
          </option>
        ))}
      </>
    );
  }

  useEffect(() => {
    authApi
      .me()
      .then((me) => {
        if (!me.isPlatformAdmin) {
          router.replace('/dashboard');
          return;
        }
        return adminApi.getPlatform();
      })
      .then((platform) => {
        if (!platform) return;
        setData(platform);
        setOtpSessionId(platform.otpSessionId ?? '');
        setAdminNotifySessionId(platform.adminNotifySessionId ?? '');
        setAdminPhone(platform.adminPhone ?? '');
        setAdminNotifyEnabled(platform.adminNotifyEnabled);
      })
      .catch((err) => toastError(err instanceof Error ? err.message : 'Failed to load admin'))
      .finally(() => setLoading(false));
  }, [router, toastError]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await adminApi.updatePlatform({
        otpSessionId: otpSessionId || null,
        adminNotifySessionId: adminNotifySessionId || null,
        adminPhone: adminPhone || null,
        adminNotifyEnabled,
      });
      setData(updated);
      success('Platform settings saved');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function onTestOtp(e: FormEvent) {
    e.preventDefault();
    if (!testPhone) return;
    setTesting(true);
    try {
      const res = await adminApi.testOtp(testPhone);
      if (res.devMode) {
        success('Test OTP queued (dev mode — check API logs)');
      } else {
        success(`Test OTP sent — expires in ${res.expiresIn}s`);
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Test OTP failed');
    } finally {
      setTesting(false);
    }
  }

  if (loading) return <LoadingState label="Loading platform admin..." />;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform admin"
        description="Configure the WhatsApp session used for signup/login OTP and platform alerts."
      />

      <InfoCallout title="OTP sender must stay connected" variant="warning">
        <p>
          New users receive their verification code from the selected OTP session. If it disconnects,
          signup and login will fail until you reconnect it.
        </p>
        <p>
          Create and connect a session below (platform workspace), then select it as the OTP sender.
        </p>
      </InfoCallout>

      <div className="card p-5 space-y-2">
        <h2 className="font-semibold">Platform workspace</h2>
        <p className="text-sm text-[var(--muted)]">
          {data.platformWorkspaceName} · <code className="text-xs">{data.platformWorkspaceId}</code>
        </p>
        <Link href="/sessions" className="text-sm text-brand hover:underline inline-block">
          Manage sessions & QR →
        </Link>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold">Platform sessions</h2>
        <p className="text-sm text-[var(--muted)]">
          Create and connect WhatsApp sessions in the platform workspace (used for OTP delivery).
        </p>
        <PlatformSessionsPanel
          sessions={data.sessions}
          onRefresh={() => adminApi.getPlatform().then(setData)}
        />
      </div>

      <form onSubmit={onSave} className="card p-5 space-y-6">
        <div>
          <h2 className="font-semibold mb-4">OTP & alerts</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">OTP sender session</label>
              <Select
                value={otpSessionId}
                onChange={(e) => setOtpSessionId(e.target.value)}
              >
                {renderSessionOptions()}
              </Select>
              {data.otpSession && (
                <StatusBadge tone={sessionTone(data.otpSession)}>
                  {sessionLabel(data.otpSession)}
                </StatusBadge>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Admin alert session</label>
              <Select
                value={adminNotifySessionId}
                onChange={(e) => setAdminNotifySessionId(e.target.value)}
              >
                {renderSessionOptions()}
              </Select>
              {data.adminNotifySession && (
                <StatusBadge tone={sessionTone(data.adminNotifySession)}>
                  {sessionLabel(data.adminNotifySession)}
                </StatusBadge>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Admin alert phone</label>
            <Input
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value)}
              placeholder="966508334708"
            />
          </div>
          <div className="space-y-2 flex flex-col justify-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={adminNotifyEnabled}
                onChange={(e) => setAdminNotifyEnabled(e.target.checked)}
                className="rounded border-[var(--border)]"
              />
              Send admin WhatsApp alerts (signup, quota, etc.)
            </label>
          </div>
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save platform settings'}
        </Button>
      </form>

      <form onSubmit={onTestOtp} className="card p-5 space-y-4">
        <h2 className="font-semibold">Test OTP delivery</h2>
        <p className="text-sm text-[var(--muted)]">
          Sends a real verification code using the configured OTP session (60s cooldown applies).
        </p>
        <PhoneInput value={testPhone} onChange={(digits) => setTestPhone(digits)} />
        <Button type="submit" variant="secondary" disabled={testing || !otpSessionId}>
          {testing ? 'Sending…' : 'Send test OTP'}
        </Button>
      </form>
    </div>
  );
}
