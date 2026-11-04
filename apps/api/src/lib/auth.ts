import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Role } from '@politico/shared';
import { HttpError } from './http';

export const AUTH_COOKIE = 'politico_token';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface SessionUser {
  id: number;
  role: Role;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: Role };
    user: SessionUser;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    /** preHandler: 401 unless the request carries a valid auth cookie. Sets `req.user`. */
    authenticate: (req: FastifyRequest) => Promise<void>;
  }
  interface FastifyReply {
    startSession: (user: SessionUser) => Promise<void>;
    endSession: () => void;
  }
}

export interface AuthOptions {
  jwtSecret: string;
  secureCookies: boolean;
}

/** Registers on the root instance (not as an encapsulated plugin) so every route sees it. */
export async function registerAuth(app: FastifyInstance, opts: AuthOptions) {
  await app.register(cookie);
  await app.register(jwt, {
    secret: opts.jwtSecret,
    cookie: { cookieName: AUTH_COOKIE, signed: false },
    sign: { expiresIn: SESSION_TTL_SECONDS },
    formatUser: (payload) => ({ id: Number(payload.sub), role: payload.role }),
  });

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: opts.secureCookies,
    path: '/',
  } as const;

  app.decorateReply('startSession', async function (this: FastifyReply, user: SessionUser) {
    const token = await this.jwtSign({ sub: String(user.id), role: user.role });
    this.setCookie(AUTH_COOKIE, token, { ...cookieOptions, maxAge: SESSION_TTL_SECONDS });
  });
  app.decorateReply('endSession', function (this: FastifyReply) {
    this.clearCookie(AUTH_COOKIE, cookieOptions);
  });
  app.decorate('authenticate', async (req: FastifyRequest) => {
    try {
      await req.jwtVerify();
    } catch {
      throw new HttpError(401, 'You need to log in');
    }
  });
}

/** preHandler: 403 unless the user has one of `roles`. Put it after `app.authenticate`. */
export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest) => {
    if (!roles.includes(req.user.role)) {
      throw new HttpError(403, 'You do not have permission to do that');
    }
  };
}
