import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { asc, count, desc, eq, sql } from 'drizzle-orm';
import { IdParams, OfficeResult, successEnvelope } from '@politico/shared';
import { candidates, parties, users, votes } from '../db/schema';
import { ok } from '../lib/http';
import { toOfficeResult } from '../lib/mappers';
import { getOfficeOr404 } from '../lib/queries';

export const resultRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/offices/:id/results',
    { schema: { params: IdParams, response: { 200: successEnvelope(OfficeResult) } } },
    async (req, reply) => {
      const office = await getOfficeOr404(app.db, req.params.id);
      // count() is bigint in Postgres; cast so the driver returns a JS number.
      const voteCount = sql<number>`cast(${count(votes.id)} as integer)`.mapWith(Number);
      const rows = await app.db
        .select({
          officeId: candidates.officeId,
          candidateId: candidates.id,
          firstname: users.firstname,
          lastname: users.lastname,
          partyName: parties.name,
          votes: voteCount,
        })
        .from(candidates)
        .innerJoin(users, eq(users.id, candidates.userId))
        .innerJoin(parties, eq(parties.id, candidates.partyId))
        // LEFT JOIN so candidates with no votes still get a row (count = 0).
        .leftJoin(votes, eq(votes.candidateId, candidates.id))
        .where(eq(candidates.officeId, office.id))
        .groupBy(candidates.id, users.id, parties.id)
        .orderBy(
          desc(voteCount),
          asc(sql`${users.firstname} || ' ' || ${users.lastname}`),
          asc(candidates.id),
        );
      return ok(reply, rows.map(toOfficeResult));
    },
  );
};
