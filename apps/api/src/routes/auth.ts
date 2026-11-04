import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { LoginInput, SignupInput } from '@politico/shared';
import { users } from '../db/schema';
import { isUniqueViolation } from '../lib/errors';
import { HttpError, ok } from '../lib/http';
import { toUser } from '../lib/users';

const BCRYPT_ROUNDS = 10;
/** Compared against when the email is unknown, so both failure paths take the same time. */
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);
const invalidCredentials = () => new HttpError(401, 'Invalid email or password');

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post('/auth/signup', { schema: { body: SignupInput } }, async (req, reply) => {
    const { password, ...profile } = req.body;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    // Role is never taken from the request: everyone signs up as a voter.
    const row = await app.db
      .insert(users)
      .values({ ...profile, passwordHash })
      .returning()
      .then(([r]) => r)
      .catch((err: unknown) => {
        if (isUniqueViolation(err)) {
          throw new HttpError(409, 'An account with that email already exists');
        }
        throw err;
      });
    if (!row) throw new Error('Insert returned no row');

    await reply.startSession(row);
    return ok(reply, [toUser(row)], 201);
  });

  app.post('/auth/login', { schema: { body: LoginInput } }, async (req, reply) => {
    const { email, password } = req.body;
    const row = await app.db.query.users.findFirst({ where: eq(users.email, email) });
    const matches = await bcrypt.compare(password, row?.passwordHash ?? DUMMY_HASH);
    if (!row || !matches) throw invalidCredentials();

    await reply.startSession(row);
    return ok(reply, [toUser(row)]);
  });

  app.post('/auth/logout', async (_req, reply) => {
    reply.endSession();
    return ok(reply, []);
  });

  app.get('/auth/me', { preHandler: app.authenticate }, async (req, reply) => {
    const row = await app.db.query.users.findFirst({ where: eq(users.id, req.user.id) });
    // A valid token for a user that no longer exists is as good as no token.
    if (!row) throw new HttpError(401, 'You need to log in');
    return ok(reply, [toUser(row)]);
  });
};
