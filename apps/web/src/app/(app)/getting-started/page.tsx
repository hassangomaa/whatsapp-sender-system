'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { ApiStatusBanner } from '@/components/ApiStatusBanner';
import { CopyButton } from '@/components/CopyButton';
import { api } from '@/lib/api';
import { getApiUrl, API_ENDPOINTS } from '@/lib/config';

type Step = {
  id: number;
  title: string;
  done: boolean;
  action: React.ReactNode;
  detail: string;
};

export default function GettingStartedPage() {
  const [funnel, setFunnel] = useState({
    sessionCreated: false,
    sessionConnected: false,
    firstMessageSent: false,
    sessionId: null as string | null,
  });
  const apiUrl = getApiUrl();

  useEffect(() => {
    api<{
      funnel: {
        sessionCreated: boolean;
        sessionConnected: boolean;
        firstMessageSent: boolean;
        connectedSession: { id: string } | null;
      };
    }>('/api/v1/dashboard')
      .then((d) =>
        setFunnel({
          sessionCreated: d.funnel.sessionCreated,
          sessionConnected: d.funnel.sessionConnected,
          firstMessageSent: d.funnel.firstMessageSent,
          sessionId: d.funnel.connectedSession?.id ?? null,
        }),
      )
      .catch(() => {});
  }, []);

  const curlExample = `curl -X POST '${apiUrl}${API_ENDPOINTS.send}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: YOUR_SESSION_KEY' \\
  -H 'Idempotency-Key: test-001' \\
  -d '{"phoneNumber":"201277785111","content":"Hello from API"}'`;

  const steps: Step[] = [
    {
      id: 1,
      title: 'Create account & sign in',
      done: true,
      detail: 'You are signed in. New workspaces get a 30-message trial.',
      action: <Link href="/register" className="btn-secondary text-sm">Invite teammate (register)</Link>,
    },
    {
      id: 2,
      title: 'Create a WhatsApp session',
      done: funnel.sessionCreated,
      detail: 'Each session gets a unique API key (shown once).',
      action: <Link href="/sessions" className="btn-primary text-sm">Create session →</Link>,
    },
    {
      id: 3,
      title: 'Scan QR code',
      done: funnel.sessionConnected,
      detail: 'Open session → Init / QR → scan with WhatsApp (QR refreshes every ~20s).',
      action: funnel.sessionId ? (
        <Link href={`/sessions/${funnel.sessionId}`} className="btn-primary text-sm">Open session QR →</Link>
      ) : (
        <Link href="/sessions" className="btn-secondary text-sm">Go to sessions</Link>
      ),
    },
    {
      id: 4,
      title: 'Send first message',
      done: funnel.firstMessageSent,
      detail: 'Use the dashboard or public API below.',
      action: <Link href="/messages" className="btn-primary text-sm">Send message →</Link>,
    },
    {
      id: 5,
      title: 'Integrate via API',
      done: funnel.firstMessageSent,
      detail: 'Copy the curl example — URLs use your live API base.',
      action: <Link href="/docs" className="btn-secondary text-sm">Full API docs →</Link>,
    },
  ];

  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title="Getting started"
        description="Complete setup in about 5 minutes: session, QR, and your first API call."
      />

      <ApiStatusBanner />

      <div className="card p-5">
        <div className="flex justify-between items-center mb-3">
          <span className="font-semibold">Progress</span>
          <span className="text-sm text-[var(--muted)]">{completed}/{steps.length} steps</span>
        </div>
        <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${(completed / steps.length) * 100}%` }} />
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`card p-5 border-l-4 ${step.done ? 'border-l-brand' : 'border-l-[var(--border)]'}`}
          >
            <div className="flex items-start gap-4">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step.done ? 'bg-brand text-white' : 'bg-black/10 dark:bg-white/10'}`}>
                {step.done ? '✓' : step.id}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-[var(--muted)] mt-1">{step.detail}</p>
                <div className="mt-3">{step.action}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="card p-6 space-y-3">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h2 className="font-semibold">Try the public API</h2>
          <CopyButton text={curlExample} label="Copy curl" />
        </div>
        <pre className="text-xs overflow-x-auto bg-black/5 dark:bg-white/5 p-4 rounded-xl">{curlExample}</pre>
        <p className="text-xs text-[var(--muted)]">
          Replace <code>YOUR_SESSION_KEY</code> with the key from <Link href="/sessions" className="text-brand">Sessions</Link>.
          Health check: <code>{apiUrl}{API_ENDPOINTS.health}</code>
        </p>
      </section>
    </div>
  );
}
