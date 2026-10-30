import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AUTH_COOKIE } from '../src/lib/auth';
import { cookieFrom, createUser, DEFAULT_PASSWORD, login, makeTestApp, url } from './helpers';
import type { TestCtx } from './helpers';

const signupBody = {
  firstname: 'Ada',
  lastname: 'Lovelace',
  email: 'Ada@Example.test',
  password: 'analytical-engine',
};

describe('auth routes', () => {
  let ctx: TestCtx;
  beforeAll(async () => {
    ctx = await makeTestApp();
  });
  afterAll(() => ctx.close());

  describe('POST /auth/signup', () => {
    it('creates a voter, sets the session cookie and never returns the hash', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: url('/auth/signup'),
        // A role in the body must be ignored.
        payload: { ...signupBody, role: 'admin' },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body).toEqual({
        status: 201,
        data: [
          {
            id: expect.any(Number),
            firstname: 'Ada',
            lastname: 'Lovelace',
            email: 'ada@example.test',
            role: 'voter',
            createdAt: expect.any(String),
          },
        ],
      });
      expect(res.body).not.toMatch(/password/i);
      expect(new Date(body.data[0].createdAt).toISOString()).toBe(body.data[0].createdAt);

      const cookie = res.cookies.find((c) => c.name === AUTH_COOKIE);
      expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
      expect(cookie?.value).toBeTruthy();
    });

    it('409s on a duplicate email, case-insensitively', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: url('/auth/signup'),
        payload: { ...signupBody, email: 'ADA@EXAMPLE.TEST' },
      });
      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({
        status: 409,
        error: 'An account with that email already exists',
      });
    });

    it.each([
      ['a short password', { ...signupBody, email: 'x@example.test', password: 'short' }],
      ['a bad email', { ...signupBody, email: 'not-an-email' }],
      ['a blank name', { ...signupBody, email: 'y@example.test', firstname: '   ' }],
      ['a missing field', { email: 'z@example.test', password: 'long-enough' }],
    ])('400s on %s', async (_label, payload) => {
      const res = await ctx.app.inject({ method: 'POST', url: url('/auth/signup'), payload });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ status: 400, error: expect.stringMatching(/^body\./) });
    });
  });

  describe('POST /auth/login', () => {
    let email: string;
    beforeAll(async () => {
      email = (await createUser(ctx.db, { email: 'login@example.test' })).email;
    });

    it('logs in and sets the cookie', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: url('/auth/login'),
        payload: { email: 'LOGIN@example.test', password: DEFAULT_PASSWORD },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ status: 200, data: [{ email, role: 'voter' }] });
      expect(res.body).not.toMatch(/password/i);
      expect(cookieFrom(res.headers['set-cookie'])).toMatch(new RegExp(`^${AUTH_COOKIE}=.+`));
    });

    it('ignores surrounding whitespace in the email', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: url('/auth/login'),
        payload: { email: '  Login@Example.test ', password: DEFAULT_PASSWORD },
      });
      expect(res.statusCode).toBe(200);
    });

    it('401s on a wrong password and an unknown email with the same message', async () => {
      const wrong = await ctx.app.inject({
        method: 'POST',
        url: url('/auth/login'),
        payload: { email, password: 'not-the-password' },
      });
      const unknown = await ctx.app.inject({
        method: 'POST',
        url: url('/auth/login'),
        payload: { email: 'nobody@example.test', password: DEFAULT_PASSWORD },
      });
      for (const res of [wrong, unknown]) {
        expect(res.statusCode).toBe(401);
        expect(res.json()).toEqual({ status: 401, error: 'Invalid email or password' });
        expect(res.headers['set-cookie']).toBeUndefined();
      }
    });

    it('400s on an invalid body', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: url('/auth/login'),
        payload: { email: 'login@example.test' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /auth/me', () => {
    it('401s without a cookie', async () => {
      const res = await ctx.app.inject({ method: 'GET', url: url('/auth/me') });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ status: 401, error: 'Authentication required' });
    });

    it('401s with a garbage cookie', async () => {
      const res = await ctx.app.inject({
        method: 'GET',
        url: url('/auth/me'),
        headers: { cookie: `${AUTH_COOKIE}=not-a-jwt` },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns the current user', async () => {
      const user = await createUser(ctx.db, { role: 'admin', email: 'me@example.test' });
      const cookie = await login(ctx.app, user.email, DEFAULT_PASSWORD);
      const res = await ctx.app.inject({
        method: 'GET',
        url: url('/auth/me'),
        headers: { cookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        status: 200,
        data: [{ ...user, createdAt: user.createdAt.toISOString() }],
      });
    });

    it("401s when the token's user no longer exists", async () => {
      const token = ctx.app.jwt.sign({ id: 999_999, role: 'voter' });
      const res = await ctx.app.inject({
        method: 'GET',
        url: url('/auth/me'),
        headers: { cookie: `${AUTH_COOKIE}=${token}` },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('clears the cookie', async () => {
      const res = await ctx.app.inject({ method: 'POST', url: url('/auth/logout') });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: 200, data: [{ message: 'Logged out' }] });
      const cookie = res.cookies.find((c) => c.name === AUTH_COOKIE);
      expect(cookie?.value).toBe('');
      expect(cookie?.expires?.getTime()).toBeLessThanOrEqual(Date.now());
      expect(cookie).toMatchObject({ path: '/', httpOnly: true });
    });
  });
});
