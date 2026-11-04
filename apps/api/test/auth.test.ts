import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { openDb } from '../src/db/client';
import { users } from '../src/db/schema';
import { AUTH_COOKIE, requireRole } from '../src/lib/auth';
import { makeTestApp } from './helpers';

type Ctx = Awaited<ReturnType<typeof makeTestApp>>;
type InjectResponse = Awaited<ReturnType<Ctx['app']['inject']>>;

const ada = {
  firstname: 'Ada',
  lastname: 'Lovelace',
  email: 'ada@example.com',
  password: 'correct-horse',
};

const authCookie = (res: InjectResponse) => res.cookies.find((c) => c.name === AUTH_COOKIE);

describe('auth', () => {
  let ctx: Ctx;
  beforeAll(async () => {
    ctx = await makeTestApp();
  });
  afterAll(() => ctx.close());

  const signup = (body: object) =>
    ctx.app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload: body });
  const login = (body: object) =>
    ctx.app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: body });
  const me = (token?: string) =>
    ctx.app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      cookies: token ? { [AUTH_COOKIE]: token } : {},
    });

  describe('POST /auth/signup', () => {
    it('creates a voter, logs them in and never returns the password hash', async () => {
      const res = await signup(ada);
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body).toMatchObject({
        status: 201,
        data: [{ firstname: 'Ada', lastname: 'Lovelace', email: 'ada@example.com', role: 'voter' }],
      });
      expect(body.data[0]).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(body)).not.toContain('correct-horse');

      const cookie = authCookie(res);
      expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
      expect((await me(cookie?.value)).json().data[0].email).toBe('ada@example.com');
    });

    it('ignores a role in the request body', async () => {
      const res = await signup({ ...ada, email: 'sneaky@example.com', role: 'admin' });
      expect(res.statusCode).toBe(201);
      expect(res.json().data[0].role).toBe('voter');
    });

    it('rejects a duplicate email, case-insensitively', async () => {
      const res = await signup({ ...ada, email: 'ADA@Example.com ' });
      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({
        status: 409,
        error: 'An account with that email already exists',
      });
    });

    it.each([
      ['an invalid email', { ...ada, email: 'not-an-email' }],
      ['a short password', { ...ada, email: 'b@example.com', password: 'short' }],
      ['a blank name', { ...ada, email: 'c@example.com', firstname: '  ' }],
      ['missing fields', { email: 'd@example.com' }],
    ])('returns 400 for %s', async (_label, body) => {
      const res = await signup(body);
      expect(res.statusCode).toBe(400);
      expect(res.json().status).toBe(400);
      expect(authCookie(res)).toBeUndefined();
    });
  });

  describe('POST /auth/login', () => {
    it('logs in with the right password, whatever the email case', async () => {
      const res = await login({ email: 'Ada@Example.com', password: ada.password });
      expect(res.statusCode).toBe(200);
      expect(res.json().data[0]).toMatchObject({ email: 'ada@example.com', role: 'voter' });
      expect(authCookie(res)?.value).toBeTruthy();
    });

    it.each([
      ['a wrong password', { email: ada.email, password: 'wrong-password' }],
      ['an unknown email', { email: 'nobody@example.com', password: ada.password }],
    ])('returns the same 401 for %s', async (_label, body) => {
      const res = await login(body);
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ status: 401, error: 'Invalid email or password' });
      expect(authCookie(res)).toBeUndefined();
    });

    it('returns 400 when fields are missing', async () => {
      const res = await login({ email: ada.email });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /auth/me', () => {
    it('returns 401 without a cookie', async () => {
      const res = await me();
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ status: 401, error: 'You need to log in' });
    });

    it('returns 401 for a forged token', async () => {
      const forged = await buildForgedToken();
      expect((await me(forged)).statusCode).toBe(401);
      expect((await me('garbage')).statusCode).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('clears the auth cookie', async () => {
      const res = await ctx.app.inject({ method: 'POST', url: '/api/v1/auth/logout' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: 200, data: [] });
      const cookie = authCookie(res);
      expect(cookie?.value).toBe('');
      expect(cookie?.expires?.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});

describe('requireRole', () => {
  it('lets admins through and returns 403 for voters', async () => {
    const db = await openDb();
    const app = await buildApp({ db, jwtSecret: 'test-secret-at-least-16-chars' });
    app.get('/admin-only', { preHandler: [app.authenticate, requireRole('admin')] }, async () => ({
      ok: true,
    }));
    await app.ready();

    const signedUp = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { ...ada },
    });
    const voterToken = authCookie(signedUp)?.value ?? '';
    const asVoter = await app.inject({
      method: 'GET',
      url: '/admin-only',
      cookies: { [AUTH_COOKIE]: voterToken },
    });
    expect(asVoter.statusCode).toBe(403);

    await db.update(users).set({ role: 'admin' }).where(eq(users.email, ada.email));
    const loggedIn = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: ada.email, password: ada.password },
    });
    const asAdmin = await app.inject({
      method: 'GET',
      url: '/admin-only',
      cookies: { [AUTH_COOKIE]: authCookie(loggedIn)?.value ?? '' },
    });
    expect(asAdmin.statusCode).toBe(200);

    const anonymous = await app.inject({ method: 'GET', url: '/admin-only' });
    expect(anonymous.statusCode).toBe(401);

    await app.close();
    await db.$client.close();
  });
});

/** A well-formed token signed with a different secret. */
async function buildForgedToken() {
  const db = await openDb();
  const other = await buildApp({ db, jwtSecret: 'a-completely-different-secret' });
  await other.ready();
  const token = other.jwt.sign({ sub: '1', role: 'admin' });
  await other.close();
  await db.$client.close();
  return token;
}
