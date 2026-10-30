import { useState, type FormEvent } from 'react';
import { CreateOfficeBody, OfficeType } from '@politico/shared';
import { Banner } from '../../components/Banner';
import { SelectField, TextField } from '../../components/Field';
import { useCreateOffice } from '../../data/hooks';
import { OFFICE_TYPE_LABELS } from '../../format';
import { fieldErrors, type FieldErrors } from '../../forms';

export function CreateOfficeForm() {
  const create = useCreateOffice();
  const [type, setType] = useState<string>(OfficeType.enum.federal);
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<FieldErrors<CreateOfficeBody>>({});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    create.reset();
    const parsed = CreateOfficeBody.safeParse({ type, name });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    create.mutate(parsed.data, { onSuccess: () => setName('') });
  }

  return (
    <section aria-labelledby="admin-office-heading" className="section admin-section">
      <h2 id="admin-office-heading">Create office</h2>
      <form className="card form" noValidate onSubmit={onSubmit}>
        {create.isError && <Banner kind="error">{create.error.message}</Banner>}
        {create.isSuccess && (
          <Banner kind="success">
            Created {OFFICE_TYPE_LABELS[create.data.type].toLowerCase()} office {create.data.name}.
          </Banner>
        )}
        <div className="field-row">
          <SelectField
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            error={errors.type}
          >
            {OfficeType.options.map((option) => (
              <option key={option} value={option}>
                {OFFICE_TYPE_LABELS[option]}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Office name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
        </div>
        <button type="submit" className="button" disabled={create.isPending}>
          {create.isPending ? 'Creating…' : 'Create office'}
        </button>
      </form>
    </section>
  );
}
