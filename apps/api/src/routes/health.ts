import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { sql } from 'drizzle-orm';
import { ok } from '../lib/http';

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/health', async (_req, reply) => {
    await app.db.execute(sql`select 1`);
    return ok(reply, [{ ok: true, service: 'politico-api', time: new Date().toISOString() }]);
  });
};
