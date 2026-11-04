import { Link, Outlet } from 'react-router';
import { useCurrentUser, useLogout } from '../auth';

export function Layout() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <>
      <header className="site-header">
        <nav className="container nav">
          <Link to="/" className="brand">
            Politico
          </Link>
          {user && (
            <div className="nav-links">
              <span className="nav-user">
                {user.firstname} {user.lastname}
                <span className="role-badge">{user.role}</span>
              </span>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                Log out
              </button>
            </div>
          )}
          {user === null && (
            <div className="nav-links">
              <Link to="/login">Log in</Link>
              <Link to="/signup" className="button">
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </header>
      <main className="container">
        {logout.error && (
          <p className="banner banner-error" role="alert">
            Could not log out: {logout.error.message}
          </p>
        )}
        <Outlet />
      </main>
    </>
  );
}
