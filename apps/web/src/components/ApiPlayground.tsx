'use client';

import { FormEvent, useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { getApiUrl, API_ENDPOINTS } from '@/lib/config';

export function ApiPlayground() {
  const [apiKey, setApiKey] = useState('');
  const [phone, setPhone] = useState('201277785111');
  const [content, setContent] = useState('Hello from API playground');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const apiUrl = getApiUrl();
    try {
      const res = await fetch(`${apiUrl}${API_ENDPOINTS.send}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Idempotency-Key': `playground-${Date.now()}`,
        },
        body: JSON.stringify({ phoneNumber: phone, content }),
      });
      const body = await res.json().catch(() => ({}));
      setResult(JSON.stringify({ status: res.status, ...body }, null, 2));
    } catch (err) {
      setResult(JSON.stringify({ error: err instanceof Error ? err.message : 'Request failed' }, null, 2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4">
      <h2 className="font-semibold text-lg">API playground</h2>
      <p className="text-sm text-[var(--muted)]">
        Test send against <code className="text-xs">{getApiUrl()}{API_ENDPOINTS.send}</code>
      </p>
      <Input label="Session API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk_live_..." required />
      <Input label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      <Input label="Message" value={content} onChange={(e) => setContent(e.target.value)} required />
      <Button type="submit" loading={loading}>Send test message</Button>
      {result && (
        <pre className="text-xs bg-black/5 dark:bg-white/5 p-4 rounded-xl overflow-x-auto">{result}</pre>
      )}
    </form>
  );
}
