import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { jane, john, myVoteForJane, president, resultsFor, voter } from '../test/fixtures';
import {
  fail,
  loggedOut,
  mockApi,
  ok,
  renderWithProviders,
  requestsTo,
  type MockHandler,
} from '../test/utils';

const officeApi = (overrides: Record<string, MockHandler> = {}) => ({
  'GET /auth/me': ok([voter]),
  'GET /offices/5': ok([president]),
  'GET /offices/5/candidates': ok([jane, john]),
  'GET /offices/5/results': ok(resultsFor(0, 0)),
  'GET /me/votes': ok([]),
  ...overrides,
});

describe('OfficePage', () => {
  it('renders the office and its candidates, with logo or initials', async () => {
    mockApi(officeApi());
    const { container } = renderWithProviders('/offices/5');

    expect(await screen.findByRole('heading', { level: 1, name: 'President' })).toBeInTheDocument();
    const candidates = within(screen.getByRole('region', { name: 'Candidates' }));
    const items = await candidates.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Jane Doe');
    expect(items[0]).toHaveTextContent('Green Party');
    expect(items[0]).toHaveTextContent('GP'); // no logo → initials
    expect(items[1]).toHaveTextContent('Unity Alliance');
    expect(container.querySelector('img[src="https://example.test/unity.png"]')).not.toBeNull();
    expect(await screen.findByRole('button', { name: 'Vote for Jane Doe' })).toBeEnabled();
  });

  it('asks logged-out visitors to log in instead of showing vote buttons', async () => {
    mockApi(officeApi({ 'GET /auth/me': loggedOut }));
    renderWithProviders('/offices/5');

    expect(await screen.findByRole('link', { name: 'Log in to vote' })).toHaveAttribute(
      'href',
      '/login?next=%2Foffices%2F5',
    );
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Vote for/ })).not.toBeInTheDocument();
  });

  it('disables voting and says who you voted for when you already voted here', async () => {
    mockApi(officeApi({ 'GET /me/votes': ok([myVoteForJane]) }));
    renderWithProviders('/offices/5');

    expect(await screen.findByText('You voted for Jane Doe.')).toBeInTheDocument();
    expect(screen.getByText('Your vote')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vote for Jane Doe' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vote for John Roe' })).toBeDisabled();
  });

  it('casts a vote and shows a success banner', async () => {
    const fetchMock = mockApi(
      officeApi({
        'POST /votes': ok(
          [{ id: 1, officeId: 5, candidateId: john.id, voterId: voter.id, createdAt: '' }],
          201,
        ),
      }),
    );
    const { user } = renderWithProviders('/offices/5');

    await user.click(await screen.findByRole('button', { name: 'Vote for John Roe' }));

    expect(
      await screen.findByText('Your vote for John Roe has been recorded.'),
    ).toBeInTheDocument();
    expect(requestsTo(fetchMock, 'POST /votes')[0]?.body).toEqual({ candidateId: john.id });
    // My votes and results are refetched after a successful vote.
    await waitFor(() => expect(requestsTo(fetchMock, 'GET /me/votes')).toHaveLength(2));
    expect(requestsTo(fetchMock, 'GET /offices/5/results').length).toBeGreaterThanOrEqual(2);
  });

  it('shows the server message on a 409 and refreshes my votes', async () => {
    // Stale tab: the vote was cast elsewhere, so /me/votes only knows about it on the refetch.
    let votedElsewhere = false;
    mockApi(
      officeApi({
        'GET /me/votes': () => ok(votedElsewhere ? [myVoteForJane] : []),
        'POST /votes': () => {
          votedElsewhere = true;
          return fail(409, 'You have already voted for this office');
        },
      }),
    );
    const { user } = renderWithProviders('/offices/5');

    await user.click(await screen.findByRole('button', { name: 'Vote for John Roe' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You have already voted for this office',
    );
    expect(await screen.findByText('You voted for Jane Doe.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vote for John Roe' })).toBeDisabled();
  });

  it('re-checks the session when a vote gets a 401', async () => {
    let expired = false;
    mockApi(
      officeApi({
        'GET /auth/me': () => (expired ? loggedOut : ok([voter])),
        'POST /votes': () => {
          expired = true;
          return fail(401, 'Authentication required');
        },
      }),
    );
    const { user } = renderWithProviders('/offices/5');

    await user.click(await screen.findByRole('button', { name: 'Vote for Jane Doe' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Authentication required');
    expect(await screen.findByRole('link', { name: 'Log in to vote' })).toBeInTheDocument();
  });

  it('shows a not-found message for an unknown office', async () => {
    mockApi(officeApi({ 'GET /offices/999': fail(404, 'Office not found') }));
    renderWithProviders('/offices/999');

    expect(await screen.findByRole('heading', { name: 'Office not found' })).toBeInTheDocument();
  });
});

describe('Office results', () => {
  it('renders a bar per candidate with counts and percentages', async () => {
    mockApi(officeApi({ 'GET /offices/5/results': ok(resultsFor(1, 3)) }));
    renderWithProviders('/offices/5');

    const results = within(await screen.findByRole('region', { name: 'Results' }));
    const rows = await results.findAllByRole('listitem');
    expect(rows).toHaveLength(2);

    // Sorted by votes desc, as the API returns them.
    expect(rows[0]).toHaveTextContent('John Roe');
    expect(within(rows[0]!).getByText('3 votes')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('75%')).toBeInTheDocument();
    expect(rows[0]!.querySelector('.result-bar')).toHaveStyle({ width: '75%' });

    expect(within(rows[1]!).getByText('1 vote')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('25%')).toBeInTheDocument();
    expect(rows[1]!.querySelector('.result-bar')).toHaveStyle({ width: '25%' });

    expect(results.getByText(/Total votes:/)).toHaveTextContent('Total votes: 4');
  });

  it('rounds percentages to one decimal', async () => {
    mockApi(officeApi({ 'GET /offices/5/results': ok(resultsFor(2, 1)) }));
    renderWithProviders('/offices/5');

    const results = within(await screen.findByRole('region', { name: 'Results' }));
    expect(await results.findByText('66.7%')).toBeInTheDocument();
    expect(results.getByText('33.3%')).toBeInTheDocument();
  });

  it('shows an empty state when nobody has voted yet', async () => {
    mockApi(officeApi());
    renderWithProviders('/offices/5');

    const results = within(await screen.findByRole('region', { name: 'Results' }));
    expect(await results.findByText(/No votes yet/)).toBeInTheDocument();
    expect(results.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
