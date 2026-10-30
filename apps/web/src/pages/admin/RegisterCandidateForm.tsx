import { useState, type FormEvent } from 'react';
import { IdParams, OfficeType, RegisterCandidateBody } from '@politico/shared';
import { Banner } from '../../components/Banner';
import { SelectField } from '../../components/Field';
import { QueryError } from '../../components/Status';
import { useOffices, useParties, useRegisterCandidate, useUsers } from '../../data/hooks';
import { OFFICE_TYPE_LABELS, fullName } from '../../format';
import { fieldErrors, toId, type FieldErrors } from '../../forms';

const empty = { officeId: '', userId: '', partyId: '' };
type Values = typeof empty;

export function RegisterCandidateForm() {
  const offices = useOffices();
  const users = useUsers();
  const parties = useParties();
  const register = useRegisterCandidate();
  const [values, setValues] = useState<Values>(empty);
  const [errors, setErrors] = useState<FieldErrors<Values>>({});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    register.reset();
    // The office is a path param, not part of the body, so it's validated separately.
    const office = IdParams.safeParse({ id: values.officeId });
    const body = RegisterCandidateBody.safeParse({
      userId: toId(values.userId),
      partyId: toId(values.partyId),
    });
    const next: FieldErrors<Values> = {
      ...(office.success ? {} : { officeId: 'Choose an office' }),
      ...(body.success
        ? {}
        : fieldErrors(body.error, { userId: 'Choose a user', partyId: 'Choose a party' })),
    };
    setErrors(next);
    if (!office.success || !body.success) return;
    register.mutate(
      { officeId: office.data.id, body: body.data },
      { onSuccess: () => setValues({ ...values, userId: '', partyId: '' }) },
    );
  }

  const registeredOffice =
    register.data && offices.data?.find((o) => o.id === register.data.officeId);

  return (
    <section aria-labelledby="admin-candidate-heading" className="section admin-section">
      <h2 id="admin-candidate-heading">Register candidate</h2>
      {users.isError && <QueryError what="users" error={users.error} />}
      <form className="card form" noValidate onSubmit={onSubmit}>
        {register.isError && <Banner kind="error">{register.error.message}</Banner>}
        {register.isSuccess && (
          <Banner kind="success">
            Registered {fullName(register.data.user)} ({register.data.party.name})
            {registeredOffice ? ` for ${registeredOffice.name}` : ''}.
          </Banner>
        )}
        <SelectField
          label="Office"
          value={values.officeId}
          onChange={(e) => setValues({ ...values, officeId: e.target.value })}
          error={errors.officeId}
          disabled={offices.isPending}
        >
          <option value="">{offices.isPending ? 'Loading…' : 'Select an office'}</option>
          {OfficeType.options.map((type) => {
            const group = offices.data?.filter((o) => o.type === type) ?? [];
            return group.length === 0 ? null : (
              <optgroup key={type} label={OFFICE_TYPE_LABELS[type]}>
                {group.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </SelectField>
        <div className="field-row">
          <SelectField
            label="User"
            value={values.userId}
            onChange={(e) => setValues({ ...values, userId: e.target.value })}
            error={errors.userId}
            disabled={users.isPending}
          >
            <option value="">{users.isPending ? 'Loading…' : 'Select a user'}</option>
            {users.data?.map((user) => (
              <option key={user.id} value={user.id}>
                {user.lastname}, {user.firstname} ({user.email})
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Party"
            value={values.partyId}
            onChange={(e) => setValues({ ...values, partyId: e.target.value })}
            error={errors.partyId}
            disabled={parties.isPending}
          >
            <option value="">{parties.isPending ? 'Loading…' : 'Select a party'}</option>
            {parties.data?.map((party) => (
              <option key={party.id} value={party.id}>
                {party.name}
              </option>
            ))}
          </SelectField>
        </div>
        <button type="submit" className="button" disabled={register.isPending}>
          {register.isPending ? 'Registering…' : 'Register candidate'}
        </button>
      </form>
    </section>
  );
}
