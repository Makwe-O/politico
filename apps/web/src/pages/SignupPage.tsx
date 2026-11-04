import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useCurrentUser, useSignup } from '../auth';

export function SignupPage() {
  const { data: user } = useCurrentUser();
  const signup = useSignup();
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    signup.mutate(
      {
        firstname: String(form.get('firstname')),
        lastname: String(form.get('lastname')),
        email: String(form.get('email')),
        password: String(form.get('password')),
      },
      { onSuccess: () => navigate('/') },
    );
  };

  return (
    <section className="auth-card">
      <h1>Create an account</h1>
      {signup.error && (
        <p className="banner banner-error" role="alert">
          {signup.error.message}
        </p>
      )}
      <form className="form" onSubmit={onSubmit}>
        <div className="field-row">
          <label className="field">
            First name
            <input name="firstname" autoComplete="given-name" required maxLength={100} />
          </label>
          <label className="field">
            Last name
            <input name="lastname" autoComplete="family-name" required maxLength={100} />
          </label>
        </div>
        <label className="field">
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="field">
          Password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            aria-describedby="password-hint"
          />
          <span id="password-hint" className="hint">
            At least 8 characters.
          </span>
        </label>
        <button type="submit" className="button" disabled={signup.isPending}>
          {signup.isPending ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="muted">
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </section>
  );
}
