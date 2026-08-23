// ─── API Client ──────────────────────────────────────────────────────────────
// Wrapper centralizado de fetch. Inyecta el token JWT del localStorage y
// maneja respuestas de error del backend ({ error, code }).

const BASE = import.meta.env.VITE_API_URL as string;

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  skipAuthRedirect: boolean = false,
): Promise<T> {
  const token = localStorage.getItem('siae_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401 && !skipAuthRedirect) {
      localStorage.removeItem('siae_token');
      localStorage.removeItem('siae_user');
      window.location.hash = '#/login';
    }
    let errMsg = res.statusText;
    let errCode: string | undefined;
    try {
      const body = await res.json();
      errMsg = body.error ?? errMsg;
      errCode = body.code;
    } catch { /* ignore parse errors */ }
    throw new ApiRequestError(res.status, errMsg, errCode);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string, skipAuthRedirect = false)                          => request<T>(path, undefined, skipAuthRedirect),
  post:   <T>(path: string, body: unknown, skipAuthRedirect = false)           => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }, skipAuthRedirect),
  put:    <T>(path: string, body: unknown, skipAuthRedirect = false)           => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }, skipAuthRedirect),
  delete: <T>(path: string, skipAuthRedirect = false)                          => request<T>(path, { method: 'DELETE' }, skipAuthRedirect),
  patch:  <T>(path: string, body: unknown, skipAuthRedirect = false)           => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }, skipAuthRedirect),
};
