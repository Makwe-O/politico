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
await seedIfEmpty(db, config);

const app = await buildApp({
  db,
  jwtSecret: config.JWT_SECRET,
  secureCookies: config.NODE_ENV === 'production',
  logger: { level: config.NODE_ENV === 'production' ? 'info' : 'debug' },
});

const shutdown = async () => {
  await app.close();
  await db.$client.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: config.PORT, host: config.HOST });
