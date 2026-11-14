import type { LoginResponse } from './types';

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? '/api';
const TOKEN_KEY = 'indigo_access_token';
const REFRESH_KEY = 'indigo_refresh_token';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    return null;
  }

  const data = (await response.json()) as LoginResponse;
  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

function buildQuery(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, 'Unable to connect to the server.');
  }

  if (response.status === 401 && retry && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiRequest<T>(path, options, false);
    }
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as any;
    let errorMsg = body?.error || body?.message || body?.title;
    if (!errorMsg && body?.errors && typeof body.errors === 'object') {
      const messages = Object.values(body.errors).flat().filter(Boolean);
      if (messages.length > 0) errorMsg = messages.join(' ');
    }
    throw new ApiError(response.status, errorMsg || response.statusText || 'Request failed.');
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function apiDownload(path: string, retry = true): Promise<Blob> {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).catch(() => { throw new ApiError(0, 'Unable to connect to the server.'); });
  if (response.status === 401 && retry && token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiDownload(path, false);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as any;
    throw new ApiError(response.status, body?.error || body?.message || body?.title || response.statusText || 'Download failed.');
  }
  return response.blob();
}

export const api = {
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return apiRequest<T>(`${path}${buildQuery(params)}`);
  },
  post<T>(path: string, body?: unknown) {
    return apiRequest<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  },
  put<T>(path: string, body?: unknown) {
    return apiRequest<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
  },
  delete(path: string) {
    return apiRequest<void>(path, { method: 'DELETE' });
  },
  upload<T>(path: string, formData: FormData) {
    return apiRequest<T>(path, { method: 'POST', body: formData });
  },
  async download(path: string, fileName: string) {
    const blob = await apiDownload(path);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  },
};
