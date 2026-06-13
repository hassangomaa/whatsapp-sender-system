/** Runtime API / app URLs — works in local dev and production even if build-time env was wrong. */
export function getApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;

    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return envUrl;
      }
      // whatsapp.arheb.net → api.whatsapp.arheb.net
      return `${protocol}//api.${hostname}`;
    }

    return envUrl ?? `${protocol}//${hostname}:3010`;
  }

  return envUrl ?? 'http://localhost:3010';
}

export function getWebUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, '') ?? 'http://localhost:3011';
}

export const API_ENDPOINTS = {
  health: '/health',
  send: '/api/v1/whatsapp/public/message/send',
  mediaSend: '/api/v1/whatsapp/public/media/send',
  sessions: '/api/v1/sessions',
} as const;
