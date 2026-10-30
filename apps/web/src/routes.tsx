import type { RouteObject } from 'react-router';
import { RequireAdmin, RequireAuth } from './components/guards';
import { Layout } from './components/Layout';
import { AdminPage } from './pages/admin/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { ErrorPage, NotFoundPage } from './pages/NotFoundPage';
import { OfficePage } from './pages/OfficePage';
import { OfficesPage } from './pages/OfficesPage';
import { PartiesPage } from './pages/PartiesPage';
import { ProfilePage } from './pages/ProfilePage';
import { SignupPage } from './pages/SignupPage';

/** Shared by the browser router (App) and the memory router (tests). */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        // Pathless so render errors show inside the layout, keeping the header usable.
        errorElement: <ErrorPage />,
        children: [
          { index: true, element: <OfficesPage /> },
          { path: 'offices/:id', element: <OfficePage /> },
          { path: 'parties', element: <PartiesPage /> },
          { path: 'login', element: <LoginPage /> },
          { path: 'signup', element: <SignupPage /> },
          { element: <RequireAuth />, children: [{ path: 'profile', element: <ProfilePage /> }] },
          { element: <RequireAdmin />, children: [{ path: 'admin', element: <AdminPage /> }] },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
