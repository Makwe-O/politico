import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { asc, eq } from 'drizzle-orm';
import {
  CreatePartyBody,
  IdParams,
  Message,
  Party,
  successEnvelope,
  UpdatePartyBody,
} from '@politico/shared';
import { parties } from '../db/schema';
import { requireRole } from '../lib/auth';
import { isForeignKeyViolation, isUniqueViolation } from '../lib/errors';
import { HttpError, notFound, ok } from '../lib/http';
import { toParty } from '../lib/mappers';
import { one } from '../lib/queries';

const NAME_TAKEN = 'A party with that name already exists';

const rethrowNameTaken = (err: unknown): never => {
  if (isUniqueViolation(err)) throw new HttpError(409, NAME_TAKEN);
  throw err;
};

export const partyRoutes: FastifyPluginAsyncZod = async (app) => {
  const adminOnly = [app.authenticate, requireRole('admin')];

  app.get(
    '/parties',
    { schema: { response: { 200: successEnvelope(Party) } } },
    async (_req, reply) => {
      const rows = await app.db.select().from(parties).orderBy(asc(parties.name));
      return ok(reply, rows.map(toParty));
    },
  );

  app.get(
    '/parties/:id',
    { schema: { params: IdParams, response: { 200: successEnvelope(Party) } } },
    async (req, reply) => {
      const [party] = await app.db.select().from(parties).where(eq(parties.id, req.params.id));
      if (!party) throw notFound('Party');
      return ok(reply, [toParty(party)]);
    },
  );

  app.post(
    '/parties',
    {
      onRequest: adminOnly,
      schema: { body: CreatePartyBody, response: { 201: successEnvelope(Party) } },
    },
    async (req, reply) => {
      const { name, hqAddress, logoUrl } = req.body;
      const party = one(
        await app.db
          .insert(parties)
          .values({ name, hqAddress, logoUrl: logoUrl ?? null })
          .returning()
          .catch(rethrowNameTaken),
      );
      return ok(reply, [toParty(party)], 201);
    },
  );

  app.patch(
    '/parties/:id',
    {
      onRequest: adminOnly,
      schema: {
        params: IdParams,
        body: UpdatePartyBody,
        response: { 200: successEnvelope(Party) },
      },
    },
    async (req, reply) => {
      // Drizzle skips `undefined` fields, so only the provided ones change (`logoUrl: null` clears it).
      const [party] = await app.db
        .update(parties)
        .set(req.body)
        .where(eq(parties.id, req.params.id))
        .returning()
        .catch(rethrowNameTaken);
      if (!party) throw notFound('Party');
      return ok(reply, [toParty(party)]);
    },
  );

  app.delete(
    '/parties/:id',
    {
      onRequest: adminOnly,
      schema: { params: IdParams, response: { 200: successEnvelope(Message) } },
    },
    async (req, reply) => {
      let deleted;
      try {
        deleted = await app.db
          .delete(parties)
          .where(eq(parties.id, req.params.id))
          .returning({ id: parties.id });
      } catch (err) {
        // candidates.party_id is ON DELETE RESTRICT.
        if (isForeignKeyViolation(err))
          throw new HttpError(409, 'Party has registered candidates and cannot be deleted');
        throw err;
      }
      if (deleted.length === 0) throw notFound('Party');
      return ok(reply, [{ message: 'Party deleted' }]);
    },
  );
};
