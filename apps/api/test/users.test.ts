import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminCookie, createUser, makeTestApp, url } from './helpers';
import type { TestCtx } from './helpers';

describe('GET /users', () => {
  let ctx: TestCtx;
  beforeAll(async () => {
    ctx = await makeTestApp();
  });
  afterAll(() => ctx.close());

  it('lists users sorted by lastname, firstname, without password hashes', async () => {
    await createUser(ctx.db, { firstname: 'Zoe', lastname: 'Brown' });
    await createUser(ctx.db, { firstname: 'Adam', lastname: 'Brown' });
    await createUser(ctx.db, { firstname: 'Mia', lastname: 'Adams' });
    const cookie = await adminCookie(ctx);

    const res = await ctx.app.inject({ method: 'GET', url: url('/users'), headers: { cookie } });
    expect(res.statusCode).toBe(200);
    const { data } = res.json<{ data: { firstname: string; lastname: string }[] }>();
    const names = data.map((u) => `${u.lastname}, ${u.firstname}`);
    expect(names).toEqual([...names].sort());
    expect(names.filter((n) => !n.startsWith('User'))).toEqual([
      'Adams, Mia',
      'Brown, Adam',
      'Brown, Zoe',
    ]);
    expect(Object.keys(data[0] ?? {}).sort()).toEqual(
      ['createdAt', 'email', 'firstname', 'id', 'lastname', 'role'].sort(),
    );
    expect(res.body).not.toMatch(/password/i);
  });
});
