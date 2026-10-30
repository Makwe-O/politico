import { buildApp } from './app';
import { loadConfig } from './config';
import { openDb } from './db/client';
import { seedIfEmpty } from './db/seed';

try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the real environment.
}

const config = loadConfig();
const db = await openDb(config.DATA_DIR);
// Demo data is for local dev only; a real deployment must never get fake candidates or seed logins.
if (config.NODE_ENV !== 'production') await seedIfEmpty(db, config);

const app = await buildApp({
  db,
  jwtSecret: config.JWT_SECRET,
  secureCookies: config.NODE_ENV === 'production',
  logger: { level: config.NODE_ENV === 'production' ? 'info' : 'debug' },
});

let closing = false;
const shutdown = async () => {
  if (closing) return;
  closing = true;
  // Never hang a restart: a watcher would SIGKILL us and leave PGlite's files dirty.
  setTimeout(() => process.exit(1), 4_000).unref();
  try {
    await app.close();
  } finally {
    await db.$client.close();
    process.exit(0);
  }
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: config.PORT, host: config.HOST });
