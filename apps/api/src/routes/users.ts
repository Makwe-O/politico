import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { asc } from 'drizzle-orm';
import { successEnvelope, User } from '@politico/shared';
import { users } from '../db/schema';
import { requireRole } from '../lib/auth';
import { ok } from '../lib/http';
import { toUser } from '../lib/mappers';
import { publicUserColumns } from '../lib/queries';

export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/users',
    {
      onRequest: [app.authenticate, requireRole('admin')],
      schema: { response: { 200: successEnvelope(User) } },
    },
    async (_req, reply) => {
      const rows = await app.db
        .select(publicUserColumns)
        .from(users)
        .orderBy(asc(users.lastname), asc(users.firstname), asc(users.id));
      return ok(reply, rows.map(toUser));
    },
  );
};
