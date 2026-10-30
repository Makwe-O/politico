import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { SignupBody } from '@politico/shared';
import { Banner } from '../components/Banner';
import { TextField } from '../components/Field';
import { useMe, useSignup } from '../data/hooks';
import { fieldErrors, type FieldErrors } from '../forms';
import { useNext } from './LoginPage';

const empty = { firstname: '', lastname: '', email: '', password: '' };

export function SignupPage() {
  const { next, carry } = useNext();
  const me = useMe();
  const signup = useSignup();
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<FieldErrors<SignupBody>>({});

  if (me.data) return <Navigate to={next} replace />;

  const bind = (key: keyof typeof empty) => ({
    name: key,
    value: values[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => setValues({ ...values, [key]: e.target.value }),
    error: errors[key],
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    signup.reset();
    const parsed = SignupBody.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    signup.mutate(parsed.data);
  }

  return (
    <div className="auth-page">
      <title>Sign up · Politico</title>
      <h1>Create an account</h1>
      {signup.isError && <Banner kind="error">{signup.error.message}</Banner>}
      <form className="card form" noValidate onSubmit={onSubmit}>
        <div className="field-row">
          <TextField label="First name" autoComplete="given-name" {...bind('firstname')} />
          <TextField label="Last name" autoComplete="family-name" {...bind('lastname')} />
        </div>
        <TextField label="Email" type="email" autoComplete="email" {...bind('email')} />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          {...bind('password')}
        />
        <p className="hint">At least 8 characters.</p>
        <button type="submit" className="button" disabled={signup.isPending}>
          {signup.isPending ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p>
        Already registered? <Link to={`/login${carry}`}>Log in</Link>
      </p>
    </div>
  );
}
