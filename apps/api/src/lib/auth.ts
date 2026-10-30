import fastifyCookie, { type CookieSerializeOptions } from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Role } from '@politico/shared';
import { users } from '../db/schema';
import { HttpError } from './http';

export const AUTH_COOKIE = 'politico_token';
const SESSION_SECONDS = 60 * 60 * 24; // 1 day
const BCRYPT_ROUNDS = 10;

export interface SessionUser {
  id: number;
  role: Role;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: SessionUser;
    user: SessionUser;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * onRequest hook: 401 unless the request carries a valid session cookie for a user that
     * still exists. Sets `req.user`, with the role read fresh from the database.
     */
    authenticate: (req: FastifyRequest) => Promise<void>;
    authCookieOptions: CookieSerializeOptions;
  }
}

/** Registers cookie + JWT plugins and the `authenticate` hook on the root instance. */
export async function registerAuth(
  app: FastifyInstance,
  opts: { jwtSecret: string; secureCookies: boolean },
) {
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret: opts.jwtSecret,
    cookie: { cookieName: AUTH_COOKIE, signed: false },
    sign: { expiresIn: SESSION_SECONDS },
  });

  app.decorate('authCookieOptions', {
    httpOnly: true,
    sameSite: 'lax',
    secure: opts.secureCookies,
    path: '/',
    maxAge: SESSION_SECONDS,
  } satisfies CookieSerializeOptions);

  app.decorate('authenticate', async (req: FastifyRequest) => {
    try {
      await req.jwtVerify();
    } catch {
      throw new HttpError(401, 'Authentication required');
    }
    // Don't trust the role baked into the token: a demoted or deleted user loses access now,
    // not when the token expires.
    const [row] = await app.db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, req.user.id));
    if (!row) throw new HttpError(401, 'Authentication required');
    req.user = { id: req.user.id, role: row.role };
  });
}

/**
 * onRequest hook factory. Use after `app.authenticate`:
 * `{ onRequest: [app.authenticate, requireRole('admin')] }`
 */
export function requireRole(role: Role) {
  return async (req: FastifyRequest) => {
    if (req.user.role !== role) throw new HttpError(403, `Requires ${role} role`);
  };
}

/** Signs a JWT for the user and sets it as the httpOnly session cookie. */
export async function startSession(reply: FastifyReply, user: SessionUser) {
  const token = await reply.jwtSign({ id: user.id, role: user.role });
  reply.setCookie(AUTH_COOKIE, token, reply.server.authCookieOptions);
}

export function endSession(reply: FastifyReply) {
  const { maxAge, ...opts } = reply.server.authCookieOptions;
  reply.clearCookie(AUTH_COOKIE, opts);
}

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
