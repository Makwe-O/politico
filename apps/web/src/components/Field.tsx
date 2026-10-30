import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

interface FieldShellProps {
  label: string;
  error?: string;
  /** Keep the label for assistive tech but hide it visually (e.g. inside a table with headers). */
  hideLabel?: boolean;
  id: string;
  children: ReactNode;
}

function FieldShell({ label, error, hideLabel, id, children }: FieldShellProps) {
  return (
    <div className="field">
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : undefined}>
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, error?: string) =>
  error ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {};

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  error?: string;
  hideLabel?: boolean;
};

export function TextField({ label, error, hideLabel, ...input }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hideLabel={hideLabel}>
      <input id={id} {...describedBy(id, error)} {...input} />
    </FieldShell>
  );
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  label: string;
  error?: string;
  children: ReactNode;
};

export function SelectField({ label, error, children, ...select }: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error}>
      <select id={id} {...describedBy(id, error)} {...select}>
        {children}
      </select>
    </FieldShell>
  );
}
