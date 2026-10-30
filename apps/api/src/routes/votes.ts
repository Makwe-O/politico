import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq } from 'drizzle-orm';
import { CastVoteBody, successEnvelope, Vote } from '@politico/shared';
import { candidates, votes } from '../db/schema';
import { isUniqueViolation } from '../lib/errors';
import { HttpError, notFound, ok } from '../lib/http';
import { toVote } from '../lib/mappers';
import { one } from '../lib/queries';

export const voteRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/votes',
    {
      onRequest: [app.authenticate],
      schema: { body: CastVoteBody, response: { 201: successEnvelope(Vote) } },
    },
    async (req, reply) => {
      const [candidate] = await app.db
        .select({ id: candidates.id, officeId: candidates.officeId })
        .from(candidates)
        .where(eq(candidates.id, req.body.candidateId));
      if (!candidate) throw notFound('Candidate');

      // The office comes from the candidate, never the client. votes(voter_id, office_id) is unique.
      const vote = one(
        await app.db
          .insert(votes)
          .values({ voterId: req.user.id, officeId: candidate.officeId, candidateId: candidate.id })
          .returning()
          .catch((err: unknown) => {
            if (isUniqueViolation(err))
              throw new HttpError(409, 'You have already voted for this office');
            throw err;
          }),
      );
      return ok(reply, [toVote(vote)], 201);
    },
  );
};
