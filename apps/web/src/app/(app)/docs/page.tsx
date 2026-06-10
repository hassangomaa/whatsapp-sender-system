'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { PageHeader } from '@/components/PageHeader';
import { ApiStatusBanner } from '@/components/ApiStatusBanner';
import { ApiPlayground } from '@/components/ApiPlayground';
import { getApiUrl, getWebUrl, API_ENDPOINTS } from '@/lib/config';

const SECTIONS = [
  { id: 'auth', label: 'Authentication' },
  { id: 'send', label: 'Send message' },
  { id: 'media', label: 'Media send' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'limits', label: 'Quota & limits' },
  { id: 'playground', label: 'Playground' },
];

export default function DocsPage() {
  const apiUrl = getApiUrl();
  const webUrl = getWebUrl();

  const sendExample = useMemo(
    () => `curl -X POST '${apiUrl}${API_ENDPOINTS.send}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: sk_live_<your_session_key>' \\
  -H 'Idempotency-Key: order-123-whatsapp' \\
  -d '{"phoneNumber":"201277785111","content":"Hello from API"}'`,
    [apiUrl],
  );

  const mediaExample = useMemo(
    () => `curl -X POST '${apiUrl}${API_ENDPOINTS.mediaSend}' \\
  -H 'x-api-key: sk_live_<your_session_key>' \\
  -H 'Idempotency-Key: media-123' \\
  -F 'phoneNumber=201277785111' \\
  -F 'mediaType=image' \\
  -F 'caption=Hello' \\
  -F 'file=@/path/to/image.jpg'`,
    [apiUrl],
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-6xl">
      <nav className="lg:w-48 shrink-0">
        <div className="lg:sticky lg:top-6 space-y-1">
          <p className="text-xs font-semibold uppercase text-[var(--muted)] mb-2 px-2">On this page</p>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="block rounded-lg px-2 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5">
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="flex-1 space-y-8 min-w-0">
        <PageHeader
          title="API Documentation"
          description="Dynamic reference — URLs reflect your current deployment."
        />

        <ApiStatusBanner />

        <div className="card p-4 text-sm grid sm:grid-cols-2 gap-3">
          <div>
            <span className="text-[var(--muted)]">Dashboard</span>
            <code className="block font-mono text-xs mt-1 break-all">{webUrl}</code>
          </div>
          <div>
            <span className="text-[var(--muted)]">Health</span>
            <code className="block font-mono text-xs mt-1 break-all">{apiUrl}{API_ENDPOINTS.health}</code>
            <CopyButton text={`${apiUrl}${API_ENDPOINTS.health}`} label="Copy" />
          </div>
        </div>

        <section id="auth" className="card p-6 space-y-4 scroll-mt-6">
          <h2 className="font-semibold text-lg">Authentication</h2>
          <p className="text-sm text-[var(--muted)]">
            Each session has a unique API key (shown once at creation on{' '}
            <Link href="/sessions" className="text-brand">Sessions</Link>).
          </p>
          <ul className="text-sm space-y-2 list-disc pl-5 text-[var(--muted)]">
            <li>Header: <code className="text-xs">x-api-key: sk_live_...</code></li>
            <li>Session must be <span className="badge-green">connected</span></li>
            <li>Optional: <code className="text-xs">Idempotency-Key</code> prevents duplicates</li>
          </ul>
        </section>

        <section id="send" className="card p-6 space-y-4 scroll-mt-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="font-semibold text-lg">POST {API_ENDPOINTS.send}</h2>
            <CopyButton text={sendExample} label="Copy curl" />
          </div>
          <pre className="text-xs overflow-x-auto bg-black/5 dark:bg-white/5 p-4 rounded-xl">{sendExample}</pre>
        </section>

        <section id="media" className="card p-6 space-y-4 scroll-mt-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="font-semibold text-lg">POST {API_ENDPOINTS.mediaSend}</h2>
            <CopyButton text={mediaExample} label="Copy curl" />
          </div>
          <pre className="text-xs overflow-x-auto bg-black/5 dark:bg-white/5 p-4 rounded-xl">{mediaExample}</pre>
        </section>

        <section id="webhooks" className="card p-6 space-y-3 scroll-mt-6">
          <h2 className="font-semibold text-lg">Webhooks</h2>
          <p className="text-sm text-[var(--muted)]">
            Signed with <code className="text-xs">X-Webhook-Signature</code> (HMAC-SHA256). Configure on session detail or{' '}
            <Link href="/settings" className="text-brand">Settings</Link>.
          </p>
          <Link href="/webhooks" className="btn-secondary text-sm inline-flex">View delivery log →</Link>
        </section>

        <section id="limits" className="card p-6 space-y-3 scroll-mt-6">
          <h2 className="font-semibold text-lg">Quota & limits</h2>
          <ul className="list-disc pl-5 text-sm text-[var(--muted)] space-y-1">
            <li><code>403 quota_exhausted</code> — upgrade on <Link href="/packages" className="text-brand">Packages</Link></li>
            <li><code>403 session_limit_reached</code> — plan session cap</li>
            <li><code>503</code> — session not connected (scan QR first)</li>
          </ul>
        </section>

        <section id="playground" className="scroll-mt-6">
          <ApiPlayground />
        </section>
      </div>
    </div>
  );
}
