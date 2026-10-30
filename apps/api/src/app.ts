import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { API_PREFIX } from '@politico/shared';
import type { Db } from './db/client';
import { registerAuth } from './lib/auth';
import { errorHandler } from './lib/errors';
import { authRoutes } from './routes/auth';
import { candidateRoutes } from './routes/candidates';
import { healthRoutes } from './routes/health';
import { meRoutes } from './routes/me';
import { officeRoutes } from './routes/offices';
import { partyRoutes } from './routes/parties';
import { resultRoutes } from './routes/results';
import { userRoutes } from './routes/users';
import { voteRoutes } from './routes/votes';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}

export interface AppOptions {
  db: Db;
  jwtSecret: string;
  /** Set `Secure` on the auth cookie. True in production (HTTPS). */
  secureCookies?: boolean;
  logger?: FastifyServerOptions['logger'];
}

export async function buildApp(opts: AppOptions) {
  const app = Fastify({
    logger: opts.logger ?? false,
    // Drop keep-alive/polling connections on close so shutdown (and dev restarts) are immediate.
    forceCloseConnections: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((_req, reply) =>
    reply.code(404).send({ status: 404, error: 'Route not found' }),
  );
  app.decorate('db', opts.db);
  await registerAuth(app, {
    jwtSecret: opts.jwtSecret,
    secureCookies: opts.secureCookies ?? false,
  });

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(authRoutes);
      await api.register(userRoutes);
      await api.register(partyRoutes);
      await api.register(officeRoutes);
      await api.register(candidateRoutes);
      await api.register(resultRoutes);
      await api.register(voteRoutes);
      await api.register(meRoutes);
    },
    { prefix: API_PREFIX },
  );

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
