import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User } from '@politico/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failure, renderApp, stubApi, success } from './test/utils';

const ada: User = {
  id: 1,
  firstname: 'Ada',
  lastname: 'Lovelace',
  email: 'ada@example.com',
  role: 'voter',
  createdAt: '2026-11-01T10:00:00Z',
};

const health = () => success([{ ok: true, service: 'politico-api', time: '2026-11-01T10:00:00Z' }]);
const loggedOut = () => failure(401, 'You need to log in');

describe('auth', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('logs in and shows the user in the header', async () => {
    const fetchMock = stubApi({
      'GET /health': health,
      'GET /auth/me': loggedOut,
      'POST /auth/login': () => success([ada]),
    });
    const user = userEvent.setup();
    renderApp('/login');

    await user.type(await screen.findByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('heading', { name: 'Welcome, Ada' })).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();

    const loginCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/auth/login'));
    expect(JSON.parse(String(loginCall?.[1]?.body))).toEqual({
      email: 'ada@example.com',
      password: 'correct-horse',
    });
  });

  it('shows the API error inline when login fails', async () => {
    stubApi({
      'GET /auth/me': loggedOut,
      'POST /auth/login': () => failure(401, 'Invalid email or password'),
    });
    const user = userEvent.setup();
    renderApp('/login');

    await user.type(await screen.findByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  });

  it('signs up and lands on the home page logged in', async () => {
    stubApi({
      'GET /health': health,
      'GET /auth/me': loggedOut,
      'POST /auth/signup': () => success([ada], 201),
    });
    const user = userEvent.setup();
    renderApp('/signup');

    await user.type(await screen.findByLabelText('First name'), 'Ada');
    await user.type(screen.getByLabelText('Last name'), 'Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByRole('heading', { name: 'Welcome, Ada' })).toBeInTheDocument();
  });

  it('shows a conflict error when the email is taken', async () => {
    stubApi({
      'GET /auth/me': loggedOut,
      'POST /auth/signup': () => failure(409, 'An account with that email already exists'),
    });
    const user = userEvent.setup();
    renderApp('/signup');

    await user.type(await screen.findByLabelText('First name'), 'Ada');
    await user.type(screen.getByLabelText('Last name'), 'Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with that email already exists',
    );
  });

  it('logs out and shows the log in link again', async () => {
    stubApi({
      'GET /health': health,
      'GET /auth/me': () => success([ada]),
      'POST /auth/logout': () => success([]),
    });
    const user = userEvent.setup();
    renderApp('/');

    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
  });

  it('sends a logged-in user away from the login page', async () => {
    stubApi({ 'GET /health': health, 'GET /auth/me': () => success([ada]) });
    renderApp('/login');
    expect(await screen.findByRole('heading', { name: 'Welcome, Ada' })).toBeInTheDocument();
  });
});
