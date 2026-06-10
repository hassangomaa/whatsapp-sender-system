'use client';

import { useEffect, useState } from 'react';
import { getApiUrl, API_ENDPOINTS } from '@/lib/config';

export function ApiStatusBanner() {
  const [status, setStatus] = useState<'loading' | 'online' | 'offline'>('loading');
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    const url = getApiUrl();
    setApiUrl(url);
    fetch(`${url}${API_ENDPOINTS.health}`)
      .then((r) => (r.ok ? setStatus('online') : setStatus('offline')))
      .catch(() => setStatus('offline'));
  }, []);

  return (
    <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-brand/20 bg-brand/5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">Live API base URL</p>
        <code className="text-sm font-mono break-all mt-1 block">{apiUrl}</code>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`inline-flex h-2 w-2 rounded-full ${
            status === 'online' ? 'bg-green-500 animate-pulse' : status === 'offline' ? 'bg-red-500' : 'bg-gray-400'
          }`}
        />
        <span className="text-sm font-medium">
          {status === 'loading' ? 'Checking…' : status === 'online' ? 'API online' : 'API offline'}
        </span>
      </div>
    </div>
  );
}
