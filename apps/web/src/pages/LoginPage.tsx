import { useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { LoginBody } from '@politico/shared';
import { Banner } from '../components/Banner';
import { TextField } from '../components/Field';
import { useLogin, useMe } from '../data/hooks';
import { fieldErrors, safeNext, type FieldErrors } from '../forms';

/** `?next=` sanitised, plus a query string to carry it over to the sibling auth page. */
export function useNext() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  return { next, carry: next === '/' ? '' : `?next=${encodeURIComponent(next)}` };
}

export function LoginPage() {
  const { next, carry } = useNext();
  const me = useMe();
  const login = useLogin();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<LoginBody>>({});

  // Covers both "already logged in" and "just logged in" (useLogin sets the `me` query).
  if (me.data) return <Navigate to={next} replace />;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    login.reset();
    const parsed = LoginBody.safeParse({ ...values, email: values.email.trim() });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    login.mutate(parsed.data);
  }

  return (
    <div className="auth-page">
      <title>Log in · Politico</title>
      <h1>Log in</h1>
      {login.isError && <Banner kind="error">{login.error.message}</Banner>}
      <form className="card form" noValidate onSubmit={onSubmit}>
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
          error={errors.email}
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(e) => setValues({ ...values, password: e.target.value })}
          error={errors.password}
        />
        <button type="submit" className="button" disabled={login.isPending}>
          {login.isPending ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p>
        New to Politico? <Link to={`/signup${carry}`}>Create an account</Link>
      </p>
    </div>
  );
}
