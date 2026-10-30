import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { admin, greens, president, senate, unity, voter } from '../../test/fixtures';
import {
  fail,
  mockApi,
  ok,
  renderWithProviders,
  requestsTo,
  type MockHandler,
} from '../../test/utils';

const adminApi = (overrides: Record<string, MockHandler> = {}) => ({
  'GET /auth/me': ok([admin]),
  'GET /parties': ok([greens, unity]),
  'GET /offices': ok([president, senate]),
  'GET /users': ok([admin, voter]),
  ...overrides,
});

const section = async (name: string) => within(await screen.findByRole('region', { name }));

describe('AdminPage', () => {
  it('lists parties in a table', async () => {
    mockApi(adminApi());
    renderWithProviders('/admin');

    const table = within(await screen.findByRole('table'));
    expect(table.getByRole('cell', { name: 'Green Party' })).toBeInTheDocument();
    expect(table.getByRole('cell', { name: '9 Bridge Road, Abuja' })).toBeInTheDocument();
  });

  it('confirms before deleting a party and shows a 409 in the banner', async () => {
    const fetchMock = mockApi(
      adminApi({
        'DELETE /parties/10': fail(409, 'Party has candidates and cannot be deleted'),
      }),
    );
    const { user } = renderWithProviders('/admin');

    await user.click(await screen.findByRole('button', { name: 'Delete Green Party' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Delete Green Party?' }));
    expect(requestsTo(fetchMock, 'DELETE /parties/10')).toHaveLength(0);

    await user.click(dialog.getByRole('button', { name: 'Delete party' }));

    expect(await (await section('Parties')).findByRole('alert')).toHaveTextContent(
      'Party has candidates and cannot be deleted',
    );
    expect(requestsTo(fetchMock, 'DELETE /parties/10')).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cancelling the delete dialog sends nothing', async () => {
    const fetchMock = mockApi(adminApi());
    const { user } = renderWithProviders('/admin');

    await user.click(await screen.findByRole('button', { name: 'Delete Unity Alliance' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(requestsTo(fetchMock, 'DELETE /parties/11')).toHaveLength(0);
  });

  it('edits a party inline, sending only the changed fields', async () => {
    const fetchMock = mockApi(
      adminApi({ 'PATCH /parties/11': (req) => ok([{ ...unity, ...(req.body as object) }]) }),
    );
    const { user } = renderWithProviders('/admin');

    await user.click(await screen.findByRole('button', { name: 'Edit Unity Alliance' }));
    const row = within(screen.getByRole('table'));
    await user.clear(row.getByRole('textbox', { name: 'HQ address' }));
    await user.type(row.getByRole('textbox', { name: 'HQ address' }), '10 Bridge Road, Abuja');
    await user.clear(row.getByRole('textbox', { name: 'Logo URL' }));
    await user.click(row.getByRole('button', { name: 'Save' }));

    expect(await (await section('Parties')).findByRole('status')).toHaveTextContent(
      'Saved Unity Alliance.',
    );
    expect(requestsTo(fetchMock, 'PATCH /parties/11')[0]?.body).toEqual({
      hqAddress: '10 Bridge Road, Abuja',
      logoUrl: null,
    });
  });

  it('validates the create-party form and omits an empty logo URL', async () => {
    const fetchMock = mockApi(
      adminApi({
        'POST /parties': (req) => ok([{ ...greens, id: 12, ...(req.body as object) }], 201),
      }),
    );
    const { user } = renderWithProviders('/admin');
    await screen.findByRole('table');
    const form = within(screen.getByRole('form', { name: 'Add a party' }));

    await user.click(form.getByRole('button', { name: 'Add party' }));
    expect(form.getAllByText('At least 2 characters')).toHaveLength(2);
    expect(requestsTo(fetchMock, 'POST /parties')).toHaveLength(0);

    await user.type(form.getByLabelText('Name'), 'Peoples Front');
    await user.type(form.getByLabelText('HQ address'), '3 Market Street, Kano');
    await user.click(form.getByRole('button', { name: 'Add party' }));

    expect(await form.findByRole('status')).toHaveTextContent('Created Peoples Front.');
    expect(requestsTo(fetchMock, 'POST /parties')[0]?.body).toEqual({
      name: 'Peoples Front',
      hqAddress: '3 Market Street, Kano',
    });
  });

  it('creates an office', async () => {
    const fetchMock = mockApi(
      adminApi({
        'POST /offices': (req) => ok([{ ...president, id: 8, ...(req.body as object) }], 201),
      }),
    );
    const { user } = renderWithProviders('/admin');
    const office = await section('Create office');

    await user.selectOptions(await office.findByLabelText('Type'), 'local');
    await user.type(office.getByLabelText('Office name'), 'Chairman, Ikeja LGA');
    await user.click(office.getByRole('button', { name: 'Create office' }));

    expect(await office.findByRole('status')).toHaveTextContent(
      'Created local office Chairman, Ikeja LGA.',
    );
    expect(requestsTo(fetchMock, 'POST /offices')[0]?.body).toEqual({
      type: 'local',
      name: 'Chairman, Ikeja LGA',
    });
  });

  it('registers a candidate, requiring every select', async () => {
    const fetchMock = mockApi(
      adminApi({
        'POST /offices/6/candidates': ok(
          [
            {
              id: 200,
              officeId: 6,
              user: { id: voter.id, firstname: voter.firstname, lastname: voter.lastname },
              party: { id: greens.id, name: greens.name, logoUrl: null },
              createdAt: '2026-10-30T12:00:00.000Z',
            },
          ],
          201,
        ),
      }),
    );
    const { user } = renderWithProviders('/admin');
    const form = await section('Register candidate');

    await user.click(await form.findByRole('button', { name: 'Register candidate' }));
    expect(form.getByText('Choose an office')).toHaveClass('field-error');
    expect(form.getByText('Choose a user')).toHaveClass('field-error');
    expect(form.getByText('Choose a party')).toHaveClass('field-error');

    await waitFor(() => expect(form.getByLabelText('User')).toBeEnabled());
    await user.selectOptions(form.getByLabelText('Office'), 'Senate (Lagos West)');
    await user.selectOptions(form.getByLabelText('User'), 'Voter, Vera (voter@politico.test)');
    await user.selectOptions(form.getByLabelText('Party'), 'Green Party');
    await user.click(form.getByRole('button', { name: 'Register candidate' }));

    expect(await form.findByRole('status')).toHaveTextContent(
      'Registered Vera Voter (Green Party) for Senate (Lagos West).',
    );
    expect(requestsTo(fetchMock, 'POST /offices/6/candidates')[0]?.body).toEqual({
      userId: voter.id,
      partyId: greens.id,
    });
  });
});
