import { API_PREFIX, type ApiResponse } from '@politico/shared';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Calls the Politico API and unwraps the `{ status, data }` envelope. Throws ApiError on failure. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T[]> {
  const res = await fetch(`${API_PREFIX}${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!body) throw new ApiError(res.status, `Unexpected response (${res.status})`);
  if ('error' in body) throw new ApiError(body.status, body.error);
  return body.data;
}
