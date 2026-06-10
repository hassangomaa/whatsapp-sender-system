const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ws_token');
}

export function setAuth(token: string) {
  localStorage.setItem('ws_token', token);
}

export function clearAuth() {
  localStorage.removeItem('ws_token');
}

function parseApiError(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (typeof b.message === 'string') return b.message;
    if (Array.isArray(b.message)) return b.message.join(', ');
    if (typeof b.error === 'string') return b.error;
  }
  return `HTTP ${status}`;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    clearAuth();
    window.location.href = '/login';
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseApiError(body, res.status));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ token: string; user: { name: string | null; email: string } }>(
      '/api/v1/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),
  register: (email: string, password: string, name?: string) =>
    api<{ token: string }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  me: () =>
    api<{
      user: { name: string | null; email: string };
      workspace: { id: string; name: string };
    }>('/api/v1/auth/me'),
};
