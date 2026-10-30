import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { asc, eq } from 'drizzle-orm';
import { Candidate, IdParams, RegisterCandidateBody, successEnvelope } from '@politico/shared';
import { candidates, parties, users } from '../db/schema';
import { requireRole } from '../lib/auth';
import { isUniqueViolation, pgConstraint } from '../lib/errors';
import { HttpError, notFound, ok } from '../lib/http';
import { toCandidate } from '../lib/mappers';
import { candidateColumns, getOfficeOr404, one } from '../lib/queries';

/** 409 messages keyed by the unique constraint names in `db/schema.ts`. */
const CONFLICTS: Record<string, string> = {
  candidates_office_user_uq: 'This user is already running for this office',
  candidates_office_party_uq: 'This party already has a candidate for this office',
};

export const candidateRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/offices/:id/candidates',
    { schema: { params: IdParams, response: { 200: successEnvelope(Candidate) } } },
    async (req, reply) => {
      const office = await getOfficeOr404(app.db, req.params.id);
      const rows = await app.db
        .select(candidateColumns)
        .from(candidates)
        .innerJoin(users, eq(users.id, candidates.userId))
        .innerJoin(parties, eq(parties.id, candidates.partyId))
        .where(eq(candidates.officeId, office.id))
        .orderBy(asc(parties.name));
      return ok(reply, rows.map(toCandidate));
    },
  );

  app.post(
    '/offices/:id/candidates',
    {
      onRequest: [app.authenticate, requireRole('admin')],
      schema: {
        params: IdParams,
        body: RegisterCandidateBody,
        response: { 201: successEnvelope(Candidate) },
      },
    },
    async (req, reply) => {
      const { userId, partyId } = req.body;
      const office = await getOfficeOr404(app.db, req.params.id);
      const [user] = await app.db
        .select(candidateColumns.user)
        .from(users)
        .where(eq(users.id, userId));
      if (!user) throw notFound('User');
      const [party] = await app.db
        .select(candidateColumns.party)
        .from(parties)
        .where(eq(parties.id, partyId));
      if (!party) throw notFound('Party');

      const candidate = one(
        await app.db
          .insert(candidates)
          .values({ officeId: office.id, userId, partyId })
          .returning()
          .catch((err: unknown) => {
            const message = isUniqueViolation(err) && CONFLICTS[pgConstraint(err) ?? ''];
            if (message) throw new HttpError(409, message);
            throw err;
          }),
      );
      return ok(reply, [toCandidate({ candidate, user, party })], 201);
    },
  );
};
