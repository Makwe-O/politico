import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { App } from '../App';

type Handler = (init?: RequestInit) => { status: number; body: unknown };

/**
 * Stubs `fetch` with one handler per "METHOD /path" (path without the /api/v1 prefix).
 * Unknown routes return the 404 envelope. Returns the mock so tests can inspect calls.
 */
export function stubApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).replace(/^\/api\/v1/, '');
    const handler = routes[`${init?.method ?? 'GET'} ${path}`];
    const { status, body } = handler
      ? handler(init)
      : { status: 404, body: { status: 404, error: 'Route not found' } };
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export const success = (data: unknown[], status = 200) => ({ status, body: { status, data } });
export const failure = (status: number, error: string) => ({ status, body: { status, error } });

export function renderApp(path = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
