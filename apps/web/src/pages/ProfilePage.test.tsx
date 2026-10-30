import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { myVoteForJane, voter } from '../test/fixtures';
import { mockApi, ok, renderWithProviders } from '../test/utils';

describe('ProfilePage', () => {
  it("shows the user's details and a table of their votes", async () => {
    mockApi({ 'GET /auth/me': ok([voter]), 'GET /me/votes': ok([myVoteForJane]) });
    renderWithProviders('/profile');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Vera Voter' }),
    ).toBeInTheDocument();
    expect(screen.getByText('voter@politico.test')).toBeInTheDocument();

    const table = within(await screen.findByRole('table'));
    const [, row] = table.getAllByRole('row');
    const cells = within(row!).getAllByRole('cell');
    expect(cells.map((c) => c.textContent)).toEqual([
      'President',
      'Federal',
      'Jane Doe',
      'Green Party',
      expect.stringContaining('30 Oct 2026'),
    ]);
    expect(within(cells[0]!).getByRole('link')).toHaveAttribute('href', '/offices/5');
  });

  it('shows an empty state when the user has not voted', async () => {
    mockApi({ 'GET /auth/me': ok([voter]), 'GET /me/votes': ok([]) });
    renderWithProviders('/profile');

    expect(await screen.findByText(/You haven't voted yet/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
