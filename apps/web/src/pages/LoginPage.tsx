import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useCurrentUser, useLogin } from '../auth';

export function LoginPage() {
  const { data: user } = useCurrentUser();
  const login = useLogin();
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    login.mutate(
      { email: String(form.get('email')), password: String(form.get('password')) },
      { onSuccess: () => navigate('/') },
    );
  };

  return (
    <section className="auth-card">
      <h1>Log in</h1>
      {login.error && (
        <p className="banner banner-error" role="alert">
          {login.error.message}
        </p>
      )}
      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="field">
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit" className="button" disabled={login.isPending}>
          {login.isPending ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="muted">
        New here? <Link to="/signup">Create an account</Link>
      </p>
    </section>
  );
}
