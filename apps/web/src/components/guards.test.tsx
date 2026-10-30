import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { admin, voter } from '../test/fixtures';
import { loggedOut, mockApi, ok, renderWithProviders } from '../test/utils';

describe('route guards', () => {
  it('RequireAdmin: a voter on /admin sees "Admins only"', async () => {
    mockApi({ 'GET /auth/me': ok([voter]) });
    renderWithProviders('/admin');

    expect(await screen.findByRole('heading', { name: 'Admins only' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('RequireAdmin: an admin gets the admin page', async () => {
    mockApi({
      'GET /auth/me': ok([admin]),
      'GET /parties': ok([]),
      'GET /offices': ok([]),
      'GET /users': ok([admin, voter]),
    });
    renderWithProviders('/admin');

    expect(await screen.findByRole('heading', { level: 1, name: 'Admin' })).toBeInTheDocument();
  });

  it('RequireAuth: logged out on /profile redirects to login with ?next=', async () => {
    mockApi({ 'GET /auth/me': loggedOut });
    const { router } = renderWithProviders('/profile');

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toBe('?next=%2Fprofile');
  });

  it('RequireAdmin: logged out on /admin redirects to login too', async () => {
    mockApi({ 'GET /auth/me': loggedOut });
    const { router } = renderWithProviders('/admin');

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toBe('?next=%2Fadmin');
  });

  it('shows a 404 page for unknown routes', async () => {
    mockApi({ 'GET /auth/me': loggedOut });
    renderWithProviders('/nope');

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
