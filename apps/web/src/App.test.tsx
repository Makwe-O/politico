import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { governor, president, senate } from './test/fixtures';
import { loggedOut, mockApi, ok } from './test/utils';

describe('App', () => {
  it('boots on the offices page, grouped by type, with a logged-out header', async () => {
    mockApi({ 'GET /auth/me': loggedOut, 'GET /offices': ok([president, senate, governor]) });
    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Offices' })).toBeInTheDocument();
    const federal = within(await screen.findByRole('region', { name: 'Federal' }));
    expect(federal.getByRole('link', { name: 'President' })).toHaveAttribute('href', '/offices/5');
    expect(screen.getByRole('region', { name: 'Legislative' })).toHaveTextContent('Senate');
    expect(screen.getByRole('region', { name: 'State' })).toHaveTextContent('Governor of Lagos');
    expect(screen.queryByRole('region', { name: 'Local' })).not.toBeInTheDocument();

    const nav = within(screen.getByRole('banner'));
    expect(await nav.findByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(nav.getByRole('link', { name: 'Sign up' })).toBeInTheDocument();
    expect(nav.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument();
  });
});
