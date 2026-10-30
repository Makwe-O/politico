import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { InjectOptions } from 'fastify';
import { eq } from 'drizzle-orm';
import { users } from '../src/db/schema';
import { loginAs, makeTestApp, url, voterCookie } from './helpers';
import type { TestCtx } from './helpers';

type Method = NonNullable<InjectOptions['method']>;

// Deliberately invalid (or empty) bodies: auth runs in onRequest, so 401/403 must win over 400.
const ADMIN_ROUTES: [Method, string, object | undefined][] = [
  ['GET', '/users', undefined],
  ['POST', '/parties', { name: '' }],
  ['PATCH', '/parties/1', {}],
  ['DELETE', '/parties/1', undefined],
  ['POST', '/offices', { type: 'galactic' }],
  ['POST', '/offices/1/candidates', {}],
];

const USER_ROUTES: [Method, string, object | undefined][] = [
  ['GET', '/auth/me', undefined],
  ['POST', '/votes', {}],
  ['GET', '/me/votes', undefined],
];

describe('route guards', () => {
  let ctx: TestCtx;
  let voter: string;
  beforeAll(async () => {
    ctx = await makeTestApp();
    voter = await voterCookie(ctx);
  });
  afterAll(() => ctx.close());

  it.each([...ADMIN_ROUTES, ...USER_ROUTES])(
    '%s %s 401s without a cookie',
    async (method, path, payload) => {
      const res = await ctx.app.inject({ method, url: url(path), payload });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ status: 401, error: 'Authentication required' });
    },
  );

  it.each(ADMIN_ROUTES)('%s %s 403s for a voter', async (method, path, payload) => {
    const res = await ctx.app.inject({
      method,
      url: url(path),
      payload,
      headers: { cookie: voter },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ status: 403, error: 'Requires admin role' });
  });

  it('re-reads the role from the database, not the token', async () => {
    const { user, cookie } = await loginAs(ctx, 'admin');
    await ctx.db.update(users).set({ role: 'voter' }).where(eq(users.id, user.id));
    const res = await ctx.app.inject({ method: 'GET', url: url('/users'), headers: { cookie } });
    expect(res.statusCode).toBe(403);
  });

  it('401s for a valid token whose user no longer exists', async () => {
    const { user, cookie } = await loginAs(ctx, 'voter');
    await ctx.db.delete(users).where(eq(users.id, user.id));
    const res = await ctx.app.inject({ method: 'GET', url: url('/me/votes'), headers: { cookie } });
    expect(res.statusCode).toBe(401);
  });
});
