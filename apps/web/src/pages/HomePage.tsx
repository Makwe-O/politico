import { useEffect, useState } from 'react';
import type { Health } from '@politico/shared';
import { api } from '../api';
import { useCurrentUser } from '../auth';

export function HomePage() {
  const { data: user } = useCurrentUser();
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Health>('/health')
      .then(([h]) => setHealth(h ?? null))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <h1>{user ? `Welcome, ${user.firstname}` : 'Politico'}</h1>
      <p>Transparent elections for citizens and politicians.</p>
      {health && <p className="banner banner-success">API is up ({health.time})</p>}
      {error && <p className="banner banner-error">API unreachable: {error}</p>}
    </>
  );
}
