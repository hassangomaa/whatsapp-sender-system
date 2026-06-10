'use client';

import { CopyButton } from '@/components/CopyButton';
import { PageHeader } from '@/components/PageHeader';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010';

const sendExample = `curl -X POST '${API_URL}/api/v1/whatsapp/public/message/send' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: sk_live_<your_session_key>' \\
  -H 'Idempotency-Key: order-123-whatsapp' \\
  -d '{"phoneNumber":"201277785111","content":"Hello from API"}'`;

const mediaExample = `curl -X POST '${API_URL}/api/v1/whatsapp/public/media/send' \\
  -H 'x-api-key: sk_live_<your_session_key>' \\
  -H 'Idempotency-Key: media-123' \\
  -F 'phoneNumber=201277785111' \\
  -F 'mediaType=image' \\
  -F 'caption=Hello' \\
  -F 'file=@/path/to/image.jpg'`;

export default function DocsPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="API Documentation"
        description="Public endpoints compatible with ttakka-apis and egy-guests-apis consumers."
      />

      <section className="card p-6 space-y-4">
        <h2 className="font-semibold text-lg">Authentication</h2>
        <p className="text-sm text-[var(--muted)]">
          Each WhatsApp session has a unique API key (shown once at creation). Pass it via the <code className="text-xs bg-black/5 dark:bg-white/5 px-1 rounded">x-api-key</code> header.
        </p>
        <ul className="text-sm space-y-2 list-disc pl-5 text-[var(--muted)]">
          <li>Session must be <span className="badge-green">connected</span> before sending</li>
          <li>Use <code className="text-xs">Idempotency-Key</code> to prevent duplicate sends</li>
          <li>Phone numbers are normalized to digits (e.g. 201277785111)</li>
        </ul>
      </section>

      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-semibold text-lg">POST /api/v1/whatsapp/public/message/send</h2>
          <CopyButton text={sendExample} label="Copy curl" />
        </div>
        <pre className="text-xs overflow-x-auto bg-black/5 dark:bg-white/5 p-4 rounded-xl">{sendExample}</pre>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium mb-1">Request body</p>
            <pre className="text-xs bg-black/5 dark:bg-white/5 p-3 rounded-lg">{`{
  "phoneNumber": "201277785111",
  "content": "Hello"
}`}</pre>
          </div>
          <div>
            <p className="font-medium mb-1">Success response</p>
            <pre className="text-xs bg-black/5 dark:bg-white/5 p-3 rounded-lg">{`{
  "id": "clx...",
  "messageId": "clx..."
}`}</pre>
          </div>
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-semibold text-lg">POST /api/v1/whatsapp/public/media/send</h2>
          <CopyButton text={mediaExample} label="Copy curl" />
        </div>
        <pre className="text-xs overflow-x-auto bg-black/5 dark:bg-white/5 p-4 rounded-xl">{mediaExample}</pre>
      </section>

      <section className="card p-6 space-y-3">
        <h2 className="font-semibold text-lg">Webhooks</h2>
        <p className="text-sm text-[var(--muted)]">
          Enable webhook scope on a session and set a URL. Events are signed with <code className="text-xs">X-Webhook-Signature</code> (HMAC-SHA256).
        </p>
        <pre className="text-xs bg-black/5 dark:bg-white/5 p-3 rounded-lg">{`{ "event": "message.sent", "messageId": "...", "phoneNumber": "...", "status": "sent" }`}</pre>
      </section>

      <section className="card p-6 space-y-3">
        <h2 className="font-semibold text-lg">Quota & limits</h2>
        <p className="text-sm text-[var(--muted)]">
          Trial workspaces get 30 messages and 1 session. Upgrade on the Packages page. Rate limit defaults to 1 message per 3 seconds per session.
        </p>
      </section>
    </div>
  );
}
