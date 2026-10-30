import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { desc, eq } from 'drizzle-orm';
import { MyVote, successEnvelope } from '@politico/shared';
import { candidates, offices, parties, users, votes } from '../db/schema';
import { ok } from '../lib/http';
import { toMyVote } from '../lib/mappers';

export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/me/votes',
    { onRequest: [app.authenticate], schema: { response: { 200: successEnvelope(MyVote) } } },
    async (req, reply) => {
      const rows = await app.db
        .select({
          voteId: votes.id,
          createdAt: votes.createdAt,
          office: { id: offices.id, name: offices.name, type: offices.type },
          candidate: {
            id: candidates.id,
            firstname: users.firstname,
            lastname: users.lastname,
            partyName: parties.name,
          },
        })
        .from(votes)
        .innerJoin(offices, eq(offices.id, votes.officeId))
        .innerJoin(candidates, eq(candidates.id, votes.candidateId))
        .innerJoin(users, eq(users.id, candidates.userId))
        .innerJoin(parties, eq(parties.id, candidates.partyId))
        .where(eq(votes.voterId, req.user.id))
        // id breaks ties between votes cast in the same millisecond.
        .orderBy(desc(votes.createdAt), desc(votes.id));
      return ok(reply, rows.map(toMyVote));
    },
  );
};
