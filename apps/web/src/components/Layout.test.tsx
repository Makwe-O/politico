import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '../data/hooks';
import { admin, voter } from '../test/fixtures';
import { mockApi, ok, renderWithProviders, requestsTo } from '../test/utils';

describe('Layout header', () => {
  it('shows Profile and Admin links plus "firstname · Log out" for an admin', async () => {
    mockApi({ 'GET /auth/me': ok([admin]), 'GET /parties': ok([]) });
    renderWithProviders('/parties');

    const header = within(screen.getByRole('banner'));
    expect(await header.findByText('Ada')).toBeInTheDocument();
    expect(header.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(header.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
    expect(header.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
    expect(header.getByRole('link', { name: 'Parties' })).toHaveAttribute('aria-current', 'page');
    expect(header.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
  });

  it('hides the Admin link from voters', async () => {
    mockApi({ 'GET /auth/me': ok([voter]), 'GET /offices': ok([]) });
    renderWithProviders('/');

    const header = within(screen.getByRole('banner'));
    expect(await header.findByRole('link', { name: 'Profile' })).toBeInTheDocument();
    expect(header.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('logs out: clears the user and their cached votes, then goes home', async () => {
    const fetchMock = mockApi({
      'GET /auth/me': ok([voter]),
      'GET /me/votes': ok([]),
      'GET /offices': ok([]),
      'POST /auth/logout': ok([{ message: 'Logged out' }]),
    });
    const { user, router, queryClient } = renderWithProviders('/profile');
    const header = within(screen.getByRole('banner'));
    await screen.findByRole('heading', { name: 'Vera Voter' });
    expect(queryClient.getQueryData(queryKeys.myVotes)).toEqual([]);

    await user.click(header.getByRole('button', { name: 'Log out' }));

    expect(await header.findByRole('link', { name: 'Log in' })).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(requestsTo(fetchMock, 'POST /auth/logout')).toHaveLength(1);
    expect(queryClient.getQueryData(queryKeys.me)).toBeNull();
    expect(queryClient.getQueryData(queryKeys.myVotes)).toBeUndefined();
  });

  it('logs out from a guarded page and lands home, not on the login redirect', async () => {
    mockApi({
      'GET /auth/me': ok([admin]),
      'GET /parties': ok([]),
      'GET /offices': ok([]),
      'GET /users': ok([]),
      'POST /auth/logout': ok([{ message: 'Logged out' }]),
    });
    const { user, router } = renderWithProviders('/admin');
    const header = within(screen.getByRole('banner'));
    await user.click(await header.findByRole('button', { name: 'Log out' }));

    expect(await header.findByRole('link', { name: 'Log in' })).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(router.state.location.search).toBe('');
  });
});
