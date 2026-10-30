import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { useMe } from '../data/hooks';
import { Loading, QueryError } from './Status';

/** `/login?next=<current path>`, so login can send the user back where they were. */
export function loginPath(next: string) {
  return `/login?next=${encodeURIComponent(next)}`;
}

function useCurrentPath() {
  const location = useLocation();
  return `${location.pathname}${location.search}`;
}

/** Layout route: renders children for logged-in users, otherwise redirects to login. */
export function RequireAuth() {
  const me = useMe();
  const path = useCurrentPath();
  if (me.isPending) return <Loading />;
  if (me.isError) return <QueryError what="your session" error={me.error} />;
  if (!me.data) return <Navigate to={loginPath(path)} replace />;
  return <Outlet />;
}

/** Layout route: admins only. Logged-out users go to login, voters get a polite refusal. */
export function RequireAdmin() {
  const me = useMe();
  const path = useCurrentPath();
  if (me.isPending) return <Loading />;
  if (me.isError) return <QueryError what="your session" error={me.error} />;
  if (!me.data) return <Navigate to={loginPath(path)} replace />;
  if (me.data.role !== 'admin') {
    return (
      <section className="notice-page">
        <title>Admins only · Politico</title>
        <h1>Admins only</h1>
        <p>This area is for the electoral body. You're logged in as a voter.</p>
        <p>
          <Link to="/">Back to offices</Link>
        </p>
      </section>
    );
  }
  return <Outlet />;
}
