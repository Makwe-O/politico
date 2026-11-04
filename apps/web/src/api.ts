import {
  API_PREFIX,
  type ApiResponse,
  type LoginInput,
  type SignupInput,
  type User,
} from '@politico/shared';

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

function only<T>(rows: T[]): T {
  const [row] = rows;
  if (row === undefined) throw new ApiError(500, 'Expected one item in the response');
  return row;
}

const post = (body?: unknown): RequestInit => ({
  method: 'POST',
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const authApi = {
  /** The logged-in user, or null when there is no valid session. */
  me: async (): Promise<User | null> => {
    try {
      return only(await api<User>('/auth/me'));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },
  login: async (input: LoginInput) => only(await api<User>('/auth/login', post(input))),
  signup: async (input: SignupInput) => only(await api<User>('/auth/signup', post(input))),
  logout: async () => {
    await api<never>('/auth/logout', post());
  },
};
