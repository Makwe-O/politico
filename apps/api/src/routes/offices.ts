import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { asc } from 'drizzle-orm';
import { CreateOfficeBody, IdParams, Office, successEnvelope } from '@politico/shared';
import { offices } from '../db/schema';
import { requireRole } from '../lib/auth';
import { isUniqueViolation } from '../lib/errors';
import { HttpError, ok } from '../lib/http';
import { toOffice } from '../lib/mappers';
import { getOfficeOr404, one } from '../lib/queries';

export const officeRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/offices',
    { schema: { response: { 200: successEnvelope(Office) } } },
    async (_req, reply) => {
      // `type` is a Postgres enum, so it sorts in declaration order: federal, legislative, state, local.
      const rows = await app.db
        .select()
        .from(offices)
        .orderBy(asc(offices.type), asc(offices.name));
      return ok(reply, rows.map(toOffice));
    },
  );

  app.get(
    '/offices/:id',
    { schema: { params: IdParams, response: { 200: successEnvelope(Office) } } },
    async (req, reply) => {
      const office = await getOfficeOr404(app.db, req.params.id);
      return ok(reply, [toOffice(office)]);
    },
  );

  app.post(
    '/offices',
    {
      onRequest: [app.authenticate, requireRole('admin')],
      schema: { body: CreateOfficeBody, response: { 201: successEnvelope(Office) } },
    },
    async (req, reply) => {
      const office = one(
        await app.db
          .insert(offices)
          .values(req.body)
          .returning()
          .catch((err: unknown) => {
            if (isUniqueViolation(err))
              throw new HttpError(409, 'An office with that name already exists');
            throw err;
          }),
      );
      return ok(reply, [toOffice(office)], 201);
    },
  );
};
