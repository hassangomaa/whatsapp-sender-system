'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, MessageSquare, Package, Smartphone } from 'lucide-react';
import { api, authApi } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/LoadingState';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/Toast';
import type { DashboardStats } from '@/lib/types';

export default function DashboardPage() {
  const { success, error: toastError } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [sessions, setSessions] = useState<{ id: string; name: string; status: string }[]>([]);
  const [funnelSessionId, setFunnelSessionId] = useState('');
  const [funnelPhone, setFunnelPhone] = useState('');
  const [funnelContent, setFunnelContent] = useState('Hello! This is my first test message.');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, me, sess] = await Promise.all([
        api<DashboardStats>('/api/v1/dashboard'),
        authApi.me(),
        api<{ id: string; name: string; status: string }[]>('/api/v1/sessions'),
      ]);
      setStats(s);
      setSessions(sess);
      setUserName(me.user.name ?? me.user.phone ?? me.user.email);
      const connected = sess.find((x) => x.status === 'connected');
      if (connected && !funnelSessionId) setFunnelSessionId(connected.id);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [funnelSessionId]);

  useEffect(() => {
    load();
    const onVis = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load]);

  async function sendFirst(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await api('/api/v1/messages', {
        method: 'POST',
        body: JSON.stringify({ sessionId: funnelSessionId, phoneNumber: funnelPhone, content: funnelContent }),
      });
      success('First message sent!');
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingState label="Loading dashboard..." />;

  if (error || !stats) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto">
        <p className="text-red-600 text-sm">{error || 'Failed to load'}</p>
        <Button className="mt-4" onClick={load}>Retry</Button>
      </div>
    );
  }

  const msgPercent = Math.min(100, Math.round((stats.trialUsed / stats.trialLimit) * 100));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back${userName ? `, ${userName.split(' ')[0]}` : ''}`}
        description="Multi-tenant WhatsApp control center"
        actions={
          <>
            <Link href="/sessions" className="btn-secondary text-sm">Manage sessions</Link>
            <Link href="/status" className="btn-secondary text-sm">Open status</Link>
            <Link href="/messages" className="btn-primary text-sm inline-flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" /> Send message
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Sessions" value={stats.totalSessions} href="/sessions" icon={<Smartphone className="w-5 h-5 text-brand" />} />
        <StatCard label="Connected Sessions" value={stats.connectedSessions} href="/sessions" footer={`Connection health: ${stats.connectionHealthPercent}%`} icon={<LayoutDashboard className="w-5 h-5 text-sky-500" />} />
        <StatCard label="Active Packages" value={stats.activePackages} href="/packages" icon={<Package className="w-5 h-5 text-violet-500" />} />
        <StatCard label="Messages Sent" value={stats.messagesSent} href="/messages" icon={<MessageSquare className="w-5 h-5 text-emerald-500" />} />
      </div>

      <section className="card p-6">
        <h2 className="font-semibold mb-1">5-minute activation funnel</h2>
        <p className="text-sm text-[var(--muted)] mb-4">Create session → scan QR → send first message</p>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-[var(--border)] p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-sm">1. Create session</h3>
              {stats.funnel.sessionCreated && <span className="badge-green">✓</span>}
            </div>
            <Select value={funnelSessionId} onChange={(e) => setFunnelSessionId(e.target.value)}>
              <option value="">Select session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.status.toUpperCase()})</option>
              ))}
            </Select>
            <Link href="/sessions" className="text-xs text-brand mt-2 inline-block">Manage sessions →</Link>
          </div>

          <div className="rounded-xl border border-[var(--border)] p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-sm">2. Scan QR</h3>
              {stats.funnel.sessionConnected && <span className="badge-green">✓</span>}
            </div>
            {stats.funnel.sessionConnected ? (
              <p className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3">Session is connected and ready.</p>
            ) : (
              <p className="text-sm text-[var(--muted)]">Init / QR on session detail, then scan with WhatsApp.</p>
            )}
            {stats.funnel.connectedSession && (
              <Link href={`/sessions/${stats.funnel.connectedSession.id}`} className="text-xs text-brand mt-2 inline-block">Open session →</Link>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-sm">3. Send first message</h3>
              {stats.funnel.firstMessageSent && <span className="badge-green">✓</span>}
            </div>
            {!stats.funnel.firstMessageSent ? (
              <form onSubmit={sendFirst} className="space-y-2">
                <Input value={funnelPhone} onChange={(e) => setFunnelPhone(e.target.value)} placeholder="Recipient phone" required />
                <Textarea value={funnelContent} onChange={(e) => setFunnelContent(e.target.value)} className="min-h-[72px]" required />
                <Button type="submit" loading={sending} className="w-full" disabled={!stats.funnel.sessionConnected}>
                  Send first message
                </Button>
              </form>
            ) : (
              <p className="text-sm text-emerald-600">First message sent successfully.</p>
            )}
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold mb-2">Recommended next action</h3>
          <p className="text-sm text-[var(--muted)] mb-4">{stats.recommendedAction}</p>
          <div className="flex gap-2 flex-wrap">
            <Link href="/messages" className="btn-primary text-sm">Open messages</Link>
            <Link href="/campaigns" className="btn-secondary text-sm">Bulk campaigns</Link>
          </div>
        </div>
        <div className="card p-5 bg-[var(--callout-blue)]">
          <h3 className="font-semibold mb-2">Message quota</h3>
          <p className="text-2xl font-bold">{stats.trialUsed} / {stats.trialLimit}</p>
          <div className="mt-3 h-2 rounded-full bg-black/10 overflow-hidden">
            <div className="h-full bg-brand rounded-full" style={{ width: `${msgPercent}%` }} />
          </div>
          <Link href="/packages" className="text-sm text-brand mt-3 inline-block">Open packages →</Link>
        </div>
      </div>

      <p className="page-footer-tip">
        Keep one clear workflow: create session, connect, buy package, then send messages.
      </p>
    </div>
  );
}
