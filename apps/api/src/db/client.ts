import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './schema';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../drizzle', import.meta.url));

/**
 * Opens a PGlite database (real Postgres in WASM) and applies migrations.
 * Pass a directory to persist to disk; omit it for a throwaway in-memory DB (tests).
 */
export async function openDb(dataDir?: string) {
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

export type Db = Awaited<ReturnType<typeof openDb>>;
export { schema };
