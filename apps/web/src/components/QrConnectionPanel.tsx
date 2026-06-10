'use client';

import { useEffect, useState } from 'react';

const SCAN_STEPS = [
  'Open WhatsApp on your phone',
  'Tap Menu (⋮) or Settings → Linked devices',
  'Tap Link a device',
  'Point your camera at the QR code below',
];

type Props = {
  status: string;
  qr: string | null;
  qrExpiresAt: number | null;
  qrRefreshSeconds: number;
  baileysMock: boolean;
  phone: string | null;
  pairing: boolean;
  connecting: boolean;
};

export function QrConnectionPanel({
  status,
  qr,
  qrExpiresAt,
  qrRefreshSeconds,
  baileysMock,
  phone,
  pairing,
  connecting,
}: Props) {
  const [secondsLeft, setSecondsLeft] = useState(qrRefreshSeconds);

  useEffect(() => {
    if (!qrExpiresAt || status === 'connected' || connecting) return;

    const tick = () => {
      const left = Math.max(0, Math.ceil((qrExpiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [qrExpiresAt, status, qr, connecting]);

  useEffect(() => {
    if (qrExpiresAt && !connecting) {
      setSecondsLeft(Math.max(0, Math.ceil((qrExpiresAt - Date.now()) / 1000)));
    }
  }, [qr, qrExpiresAt, connecting]);

  if (status === 'connected') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center text-2xl text-emerald-600">
          ✓
        </div>
        <p className="font-medium text-emerald-700 dark:text-emerald-400">WhatsApp linked successfully</p>
        {phone && <p className="text-sm text-[var(--muted)]">+{phone}</p>}
        {baileysMock && (
          <p className="text-xs text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-lg max-w-sm">
            Demo mode — this was a simulated connection. Set <code className="font-mono">BAILEYS_MOCK=0</code> in
            .env and restart the worker to pair a real device.
          </p>
        )}
      </div>
    );
  }

  if (connecting || status === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10 text-center min-h-[220px]">
        <div className="w-12 h-12 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        <div>
          <p className="font-medium text-brand">Scan accepted — linking device…</p>
          <p className="text-sm text-[var(--muted)] mt-2 max-w-sm">
            WhatsApp is finishing the connection. Keep this page open — do not scan again.
          </p>
        </div>
        {qr && (
          <p className="text-xs text-[var(--muted)]">Previous QR is no longer needed.</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 w-full">
      <div className="space-y-3">
        <p className="text-sm font-medium">How to scan</p>
        <ol className="text-sm text-[var(--muted)] space-y-2 list-decimal list-inside">
          {SCAN_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {baileysMock && (
          <p className="text-xs text-amber-600 bg-amber-500/10 px-3 py-2 rounded-lg">
            <strong>Demo mode active</strong> — QR auto-refreshes every {qrRefreshSeconds}s and simulates
            connection without a real scan. For real WhatsApp pairing, set{' '}
            <code className="font-mono">BAILEYS_MOCK=0</code> in .env and restart the worker.
          </p>
        )}
        {pairing && !qr && (
          <p className="text-sm text-brand animate-pulse">Generating QR code…</p>
        )}
      </div>

      <div className="flex flex-col items-center justify-center min-h-[220px]">
        {qr ? (
          <>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt="WhatsApp pairing QR code"
                className="w-52 h-52 sm:w-60 sm:h-60 rounded-xl border-2 border-[var(--border)] bg-white p-2"
              />
              {secondsLeft > 0 && secondsLeft <= qrRefreshSeconds && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[var(--card)] border border-[var(--border)] px-3 py-1 rounded-full text-xs font-mono shadow-sm">
                  Refreshes in {secondsLeft}s
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--muted)] mt-5 text-center max-w-xs">
              QR codes expire every ~{qrRefreshSeconds} seconds — a new one appears automatically. Keep this page
              open while scanning.
            </p>
          </>
        ) : (
          <div className="text-center space-y-3 py-8">
            <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-[var(--muted)]">
              {pairing ? 'Waiting for QR from WhatsApp…' : 'Click Init / QR above to start pairing'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
