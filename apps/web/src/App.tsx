import { useEffect, useState } from 'react';
import type { Health } from '@politico/shared';
import { api } from './api';

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Health>('/health')
      .then(([h]) => setHealth(h ?? null))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <main className="container">
      <h1>Politico</h1>
      <p>Transparent elections for citizens and politicians.</p>
      {health && <p className="banner banner-success">API is up ({health.time})</p>}
      {error && <p className="banner banner-error">API unreachable: {error}</p>}
    </main>
  );
}
