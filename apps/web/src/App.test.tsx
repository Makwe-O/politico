import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('App', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the API status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 200,
            data: [{ ok: true, service: 'politico-api', time: '2026-10-30T10:00:00Z' }],
          }),
        ),
      ),
    );
    render(<App />);
    expect(await screen.findByText(/API is up/)).toBeInTheDocument();
  });
});
