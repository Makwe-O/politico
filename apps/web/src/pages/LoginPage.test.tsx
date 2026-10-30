import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { voter } from '../test/fixtures';
import { fail, loggedOut, mockApi, ok, renderWithProviders, requestsTo } from '../test/utils';

describe('LoginPage', () => {
  it('shows Zod field errors on an empty submit and sends nothing', async () => {
    const fetchMock = mockApi({ 'GET /auth/me': loggedOut });
    const { user } = renderWithProviders('/login');

    await user.click(await screen.findByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(requestsTo(fetchMock, 'POST /auth/login')).toHaveLength(0);
  });

  it('shows the server 401 message in an alert banner', async () => {
    mockApi({
      'GET /auth/me': loggedOut,
      'POST /auth/login': fail(401, 'Invalid email or password'),
    });
    const { user } = renderWithProviders('/login');

    await user.type(await screen.findByLabelText('Email'), 'voter@politico.test');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
  });

  it('logs in, lowercases the email and returns to ?next=', async () => {
    const fetchMock = mockApi({
      'GET /auth/me': loggedOut,
      'POST /auth/login': ok([voter]),
      'GET /me/votes': ok([]),
    });
    const { user, router } = renderWithProviders('/login?next=%2Fprofile');

    await user.type(await screen.findByLabelText('Email'), ' Voter@Politico.test ');
    await user.type(screen.getByLabelText('Password'), 'politico-voter-dev');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/profile'));
    expect(requestsTo(fetchMock, 'POST /auth/login')[0]?.body).toEqual({
      email: 'voter@politico.test',
      password: 'politico-voter-dev',
    });
    expect(await screen.findByRole('heading', { name: 'Vera Voter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });

  it('ignores an off-site ?next= and goes home instead', async () => {
    mockApi({
      'GET /auth/me': loggedOut,
      'POST /auth/login': ok([voter]),
      'GET /offices': ok([]),
    });
    const { user, router } = renderWithProviders('/login?next=%2F%2Fevil.example');

    await user.type(await screen.findByLabelText('Email'), 'voter@politico.test');
    await user.type(screen.getByLabelText('Password'), 'politico-voter-dev');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('links to sign up, keeping ?next=', async () => {
    mockApi({ 'GET /auth/me': loggedOut });
    renderWithProviders('/login?next=%2Foffices%2F5');

    expect(await screen.findByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/signup?next=%2Foffices%2F5',
    );
  });
});
