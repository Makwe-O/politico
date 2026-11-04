import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failure, renderApp, stubApi, success } from './test/utils';

const health = success([{ ok: true, service: 'politico-api', time: '2026-10-30T10:00:00Z' }]);

describe('App', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the API status', async () => {
    stubApi({
      'GET /health': () => health,
      'GET /auth/me': () => failure(401, 'You need to log in'),
    });
    renderApp();
    expect(await screen.findByText(/API is up/)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument();
  });
});
