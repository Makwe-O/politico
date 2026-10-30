import { buildApp } from '../src/app';
import { openDb } from '../src/db/client';

/** Fresh app + in-memory Postgres per call. Call `close()` in afterAll/afterEach. */
export async function makeTestApp() {
  const db = await openDb();
  const app = await buildApp({ db, jwtSecret: 'test-secret-at-least-16-chars' });
  await app.ready();
  return {
    app,
    db,
    close: async () => {
      await app.close();
      await db.$client.close();
    },
  };
}
