import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { voter } from '../test/fixtures';
import { fail, loggedOut, mockApi, ok, renderWithProviders, requestsTo } from '../test/utils';

async function fillSignup(
  user: ReturnType<typeof renderWithProviders>['user'],
  { password = 'long-enough-pw' } = {},
) {
  await user.type(await screen.findByLabelText('First name'), 'Vera');
  await user.type(screen.getByLabelText('Last name'), 'Voter');
  await user.type(screen.getByLabelText('Email'), 'voter@politico.test');
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign up' }));
}

describe('SignupPage', () => {
  it('shows per-field errors from the shared schema', async () => {
    const fetchMock = mockApi({ 'GET /auth/me': loggedOut });
    const { user } = renderWithProviders('/signup');

    await fillSignup(user, { password: 'short' });

    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(requestsTo(fetchMock, 'POST /auth/signup')).toHaveLength(0);
  });

  it('shows a 409 from the server in the alert banner', async () => {
    mockApi({
      'GET /auth/me': loggedOut,
      'POST /auth/signup': fail(409, 'Email is already registered'),
    });
    const { user } = renderWithProviders('/signup');

    await fillSignup(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Email is already registered');
  });

  it('signs up and lands on the home page', async () => {
    mockApi({
      'GET /auth/me': loggedOut,
      'POST /auth/signup': ok([voter], 201),
      'GET /offices': ok([]),
    });
    const { user, router } = renderWithProviders('/signup');

    await fillSignup(user);

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(await screen.findByText('Vera')).toBeInTheDocument();
  });
});
