import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useLogout, useMe } from '../data/hooks';
import { Banner } from './Banner';

export function Layout() {
  const { data: me, isPending } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand">
            Politico
          </Link>
          <nav aria-label="Main" className="main-nav">
            <ul className="nav-list">
              <li>
                <NavLink to="/" end>
                  Offices
                </NavLink>
              </li>
              <li>
                <NavLink to="/parties">Parties</NavLink>
              </li>
              {me && (
                <li>
                  <NavLink to="/profile">Profile</NavLink>
                </li>
              )}
              {me?.role === 'admin' && (
                <li>
                  <NavLink to="/admin">Admin</NavLink>
                </li>
              )}
            </ul>
          </nav>
          {/* Nothing until /auth/me answers, so the header doesn't flash "Log in". */}
          {!isPending && (
            <div className="auth-nav">
              {me ? (
                <>
                  <span className="auth-name">{me.firstname}</span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    className="link-button"
                    disabled={logout.isPending}
                    // replace: a guarded page may already have redirected to /login?next=…
                    onClick={() =>
                      logout.mutate(undefined, {
                        onSuccess: () => navigate('/', { replace: true }),
                      })
                    }
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/login">Log in</NavLink>
                  <NavLink to="/signup" className="button button-small">
                    Sign up
                  </NavLink>
                </>
              )}
            </div>
          )}
        </div>
      </header>
      <main id="main" className="container" tabIndex={-1}>
        {logout.isError && <Banner kind="error">Couldn't log out: {logout.error.message}</Banner>}
        <Outlet />
      </main>
    </>
  );
}
