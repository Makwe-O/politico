import { useState, type FormEvent } from 'react';
import { CreatePartyBody, UpdatePartyBody, type Party } from '@politico/shared';
import { Banner, FeedbackBanner, type Feedback } from '../../components/Banner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { TextField } from '../../components/Field';
import { PartyLogo } from '../../components/PartyLogo';
import { Loading, QueryError } from '../../components/Status';
import { useCreateParty, useDeleteParty, useParties, useUpdateParty } from '../../data/hooks';
import { FORM_ERROR, blankToUndefined, fieldErrors, type FieldErrors } from '../../forms';

export function PartiesAdmin() {
  const parties = useParties();
  const remove = useDeleteParty();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<Party | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  function confirmDelete() {
    if (!toDelete) return;
    const party = toDelete;
    remove.mutate(party.id, {
      onSuccess: () => setFeedback({ kind: 'success', text: `Deleted ${party.name}.` }),
      // e.g. 409 when the party still has candidates
      onError: (err) => setFeedback({ kind: 'error', text: err.message }),
      onSettled: () => setToDelete(null),
    });
  }

  return (
    <section aria-labelledby="admin-parties-heading" className="section admin-section">
      <h2 id="admin-parties-heading">Parties</h2>
      <FeedbackBanner feedback={feedback} />

      {parties.isPending ? (
        <Loading />
      ) : parties.isError ? (
        <QueryError what="parties" error={parties.error} />
      ) : parties.data.length === 0 ? (
        <p className="empty">No parties yet. Add the first one below.</p>
      ) : (
        <div className="table-wrap" role="region" aria-label="Parties table" tabIndex={0}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">HQ address</th>
                <th scope="col">Logo</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {parties.data.map((party) =>
                party.id === editingId ? (
                  <PartyEditRow
                    key={party.id}
                    party={party}
                    onDone={() => setEditingId(null)}
                    onFeedback={setFeedback}
                  />
                ) : (
                  <tr key={party.id}>
                    <td>{party.name}</td>
                    <td>{party.hqAddress}</td>
                    <td>
                      <PartyLogo name={party.name} logoUrl={party.logoUrl} size="sm" />
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        aria-label={`Edit ${party.name}`}
                        onClick={() => {
                          setFeedback(null);
                          setEditingId(party.id);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="button button-danger button-small"
                        aria-label={`Delete ${party.name}`}
                        onClick={() => {
                          setFeedback(null);
                          setToDelete(party);
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <CreatePartyForm />

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${toDelete?.name ?? 'party'}?`}
        confirmLabel="Delete party"
        pendingLabel="Deleting…"
        pending={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        <p>This can't be undone. Parties that still have candidates can't be deleted.</p>
      </ConfirmDialog>
    </section>
  );
}

function PartyEditRow({
  party,
  onDone,
  onFeedback,
}: {
  party: Party;
  onDone: () => void;
  onFeedback: (feedback: Feedback) => void;
}) {
  const update = useUpdateParty();
  const [values, setValues] = useState({
    name: party.name,
    hqAddress: party.hqAddress,
    logoUrl: party.logoUrl ?? '',
  });
  const [errors, setErrors] = useState<FieldErrors<UpdatePartyBody>>({});
  const formId = `edit-party-${party.id}`;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // PATCH only what changed. A cleared logo URL becomes `null` (removes the logo).
    const changes: UpdatePartyBody = {};
    const name = values.name.trim();
    const hqAddress = values.hqAddress.trim();
    const logoUrl = blankToUndefined(values.logoUrl) ?? null;
    if (name !== party.name) changes.name = name;
    if (hqAddress !== party.hqAddress) changes.hqAddress = hqAddress;
    if (logoUrl !== party.logoUrl) changes.logoUrl = logoUrl;
    if (Object.keys(changes).length === 0) return onDone();

    const parsed = UpdatePartyBody.safeParse(changes);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    update.mutate(
      { id: party.id, body: parsed.data },
      {
        onSuccess: (saved) => {
          onFeedback({ kind: 'success', text: `Saved ${saved.name}.` });
          onDone();
        },
        onError: (err) => onFeedback({ kind: 'error', text: err.message }),
      },
    );
  }

  return (
    <tr className="editing">
      <td>
        <TextField
          label="Name"
          hideLabel
          form={formId}
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          error={errors.name}
        />
      </td>
      <td>
        <TextField
          label="HQ address"
          hideLabel
          form={formId}
          value={values.hqAddress}
          onChange={(e) => setValues({ ...values, hqAddress: e.target.value })}
          error={errors.hqAddress}
        />
      </td>
      <td>
        <TextField
          label="Logo URL"
          hideLabel
          type="url"
          placeholder="https://…"
          form={formId}
          value={values.logoUrl}
          onChange={(e) => setValues({ ...values, logoUrl: e.target.value })}
          error={errors.logoUrl}
        />
      </td>
      <td className="actions">
        <form id={formId} noValidate onSubmit={onSubmit}>
          <button type="submit" className="button button-small" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="button button-secondary button-small" onClick={onDone}>
            Cancel
          </button>
        </form>
        {errors[FORM_ERROR] && <p className="field-error">{errors[FORM_ERROR]}</p>}
      </td>
    </tr>
  );
}

const emptyParty = { name: '', hqAddress: '', logoUrl: '' };

function CreatePartyForm() {
  const create = useCreateParty();
  const [values, setValues] = useState(emptyParty);
  const [errors, setErrors] = useState<FieldErrors<CreatePartyBody>>({});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    create.reset();
    const parsed = CreatePartyBody.safeParse({
      name: values.name,
      hqAddress: values.hqAddress,
      logoUrl: blankToUndefined(values.logoUrl),
    });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    create.mutate(parsed.data, { onSuccess: () => setValues(emptyParty) });
  }

  return (
    <form className="card form" noValidate onSubmit={onSubmit} aria-labelledby="add-party-heading">
      <h3 id="add-party-heading">Add a party</h3>
      {create.isError && <Banner kind="error">{create.error.message}</Banner>}
      {create.isSuccess && <Banner kind="success">Created {create.data.name}.</Banner>}
      <TextField
        label="Name"
        value={values.name}
        onChange={(e) => setValues({ ...values, name: e.target.value })}
        error={errors.name}
      />
      <TextField
        label="HQ address"
        value={values.hqAddress}
        onChange={(e) => setValues({ ...values, hqAddress: e.target.value })}
        error={errors.hqAddress}
      />
      <TextField
        label="Logo URL (optional)"
        type="url"
        placeholder="https://…"
        value={values.logoUrl}
        onChange={(e) => setValues({ ...values, logoUrl: e.target.value })}
        error={errors.logoUrl}
      />
      <button type="submit" className="button" disabled={create.isPending}>
        {create.isPending ? 'Adding…' : 'Add party'}
      </button>
    </form>
  );
}
