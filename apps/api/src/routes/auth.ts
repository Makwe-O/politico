import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq } from 'drizzle-orm';
import { LoginBody, Message, SignupBody, successEnvelope, User } from '@politico/shared';
import { users } from '../db/schema';
import { endSession, hashPassword, startSession, verifyPassword } from '../lib/auth';
import { isUniqueViolation } from '../lib/errors';
import { HttpError, ok } from '../lib/http';
import { toUser } from '../lib/mappers';
import { one, publicUserColumns } from '../lib/queries';

const INVALID_CREDENTIALS = 'Invalid email or password';

/**
 * Compared against when the email is unknown, so that path costs the same bcrypt work as a
 * wrong password and response timing doesn't reveal which emails have accounts.
 */
const dummyHash = hashPassword(randomUUID());

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/auth/signup',
    { schema: { body: SignupBody, response: { 201: successEnvelope(User) } } },
    async (req, reply) => {
      const { firstname, lastname, email, password } = req.body;
      const passwordHash = await hashPassword(password);
      let user;
      try {
        // Public signup always creates a voter; the role is never taken from the body.
        user = one(
          await app.db
            .insert(users)
            .values({ firstname, lastname, email, passwordHash, role: 'voter' })
            .returning(publicUserColumns),
        );
      } catch (err) {
        if (isUniqueViolation(err))
          throw new HttpError(409, 'An account with that email already exists');
        throw err;
      }
      await startSession(reply, user);
      return ok(reply, [toUser(user)], 201);
    },
  );

  app.post(
    '/auth/login',
    { schema: { body: LoginBody, response: { 200: successEnvelope(User) } } },
    async (req, reply) => {
      const { email, password } = req.body;
      const [row] = await app.db.select().from(users).where(eq(users.email, email));
      const valid = await verifyPassword(password, row?.passwordHash ?? (await dummyHash));
      if (!row || !valid) throw new HttpError(401, INVALID_CREDENTIALS);
      await startSession(reply, row);
      return ok(reply, [toUser(row)]);
    },
  );

  app.post(
    '/auth/logout',
    { schema: { response: { 200: successEnvelope(Message) } } },
    async (_req, reply) => {
      endSession(reply);
      return ok(reply, [{ message: 'Logged out' }]);
    },
  );

  app.get(
    '/auth/me',
    { onRequest: [app.authenticate], schema: { response: { 200: successEnvelope(User) } } },
    async (req, reply) => {
      const [user] = await app.db
        .select(publicUserColumns)
        .from(users)
        .where(eq(users.id, req.user.id));
      // A valid token for a user that no longer exists (e.g. after `pnpm db:reset`).
      if (!user) throw new HttpError(401, 'Authentication required');
      return ok(reply, [toUser(user)]);
    },
  );
};
