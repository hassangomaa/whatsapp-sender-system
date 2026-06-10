/** Runtime API / app URLs — always reflects deployed or local env. */
export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL ?? `${window.location.protocol}//${window.location.hostname}:3010`;
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010';
}

export function getWebUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3011';
}

export const API_ENDPOINTS = {
  health: '/health',
  send: '/api/v1/whatsapp/public/message/send',
  mediaSend: '/api/v1/whatsapp/public/media/send',
  sessions: '/api/v1/sessions',
} as const;
