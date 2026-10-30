import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './schema';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../drizzle', import.meta.url));

function isAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/**
 * PGlite is single-process: two processes on one data dir (e.g. a watch-mode restart that
 * overlaps the old process) can corrupt it. Take an exclusive lock file, waiting for the
 * previous holder to exit; a lock left by a dead process is reclaimed. Returns the release fn.
 */
async function lockDataDir(dataDir: string, timeoutMs: number) {
  const lockPath = `${dataDir}.lock`;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const fd = openSync(lockPath, 'wx');
      writeFileSync(fd, String(process.pid));
      closeSync(fd);
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        rmSync(lockPath, { force: true });
      };
      process.once('exit', release);
      return release;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }
    // An empty/unparsable file means the holder is still writing its pid: wait, don't steal it.
    const holder = Number(readFileSync(lockPath, 'utf8'));
    if (Number.isInteger(holder) && holder > 0 && !isAlive(holder)) {
      rmSync(lockPath, { force: true });
      continue;
    }
    if (Date.now() > deadline) {
      throw new Error(`PGlite data dir ${dataDir} is in use by process ${holder || 'unknown'}`);
    }
    await sleep(100);
  }
}

/**
 * Opens a PGlite database (real Postgres in WASM) and applies migrations.
 * Pass a directory to persist to disk; omit it for a throwaway in-memory DB (tests).
 */
export async function openDb(dataDir?: string, { lockTimeoutMs = 10_000 } = {}) {
  let client: PGlite;
  if (dataDir) {
    mkdirSync(dataDir, { recursive: true });
    const release = await lockDataDir(dataDir, lockTimeoutMs);
    client = new PGlite(dataDir);
    const close = client.close.bind(client);
    client.close = async () => {
      await close();
      release();
    };
  } else {
    client = new PGlite();
  }
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

export type Db = Awaited<ReturnType<typeof openDb>>;
export { schema };
