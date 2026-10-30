import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { vi, type Mock } from 'vitest';
import { API_PREFIX } from '@politico/shared';
import { routes } from '../routes';

export interface MockRequest {
  method: string;
  path: string;
  body: unknown;
}

export interface MockReply {
  status: number;
  data?: unknown[];
  error?: string;
}

export type MockHandler = MockReply | ((req: MockRequest) => MockReply);
export type FetchMock = Mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>;

export const ok = (data: unknown[], status = 200): MockReply => ({ status, data });
export const fail = (status: number, error: string): MockReply => ({ status, error });
export const loggedOut = fail(401, 'Authentication required');

function parseRequest(input: RequestInfo | URL, init: RequestInit = {}): MockRequest {
  const url = new URL(String(input), 'http://localhost');
  return {
    method: (init.method ?? 'GET').toUpperCase(),
    path: url.pathname.replace(API_PREFIX, ''),
    body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
  };
}

/**
 * Stubs global `fetch` with handlers keyed by `"METHOD /path"` (path without `/api/v1`).
 * Anything unmocked answers 501 so a missing stub fails loudly instead of hanging.
 */
export function mockApi(handlers: Record<string, MockHandler>): FetchMock {
  const fetchMock: FetchMock = vi.fn(async (input, init) => {
    const req = parseRequest(input, init);
    const handler = handlers[`${req.method} ${req.path}`];
    const reply =
      handler === undefined
        ? fail(501, `No mock for ${req.method} ${req.path}`)
        : typeof handler === 'function'
          ? handler(req)
          : handler;
    const payload =
      reply.error !== undefined
        ? { status: reply.status, error: reply.error }
        : { status: reply.status, data: reply.data ?? [] };
    return new Response(JSON.stringify(payload), {
      status: reply.status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** The requests made to `"METHOD /path"`, with parsed JSON bodies. */
export function requestsTo(fetchMock: FetchMock, key: string): MockRequest[] {
  return fetchMock.mock.calls
    .map(([input, init]) => parseRequest(input, init))
    .filter((req) => `${req.method} ${req.path}` === key);
}

/** Renders the real route tree in a memory router with a fresh, non-retrying QueryClient. */
export function renderWithProviders(initialPath = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  const user = userEvent.setup();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...view, user, router, queryClient };
}
