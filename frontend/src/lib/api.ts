const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:4000';

export interface ApiError {
  status: number;
  message: string;
  fields?: Record<string, string>;
}

function getToken(): string | null {
  return localStorage.getItem('taskflow_token');
}

export async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((opts.headers as Record<string, string>) || {}),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });

  if (res.status === 204) return undefined as T;

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      message: body?.error || res.statusText || 'request failed',
      fields: body?.fields,
    };
    if (res.status === 401) {
      localStorage.removeItem('taskflow_token');
      localStorage.removeItem('taskflow_user');
    }
    throw err;
  }

  return body as T;
}

export { API_URL };
