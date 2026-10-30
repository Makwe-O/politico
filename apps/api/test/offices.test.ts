import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminCookie, makeTestApp, url } from './helpers';
import type { TestCtx } from './helpers';

describe('offices routes', () => {
  let ctx: TestCtx;
  let cookie: string;
  beforeAll(async () => {
    ctx = await makeTestApp();
    cookie = await adminCookie(ctx);
  });
  afterAll(() => ctx.close());

  const create = (payload: object) =>
    ctx.app.inject({ method: 'POST', url: url('/offices'), payload, headers: { cookie } });

  it('POST /offices creates an office', async () => {
    const res = await create({ type: 'local', name: 'Mayor, Testville' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      status: 201,
      data: [
        {
          id: expect.any(Number),
          type: 'local',
          name: 'Mayor, Testville',
          createdAt: expect.any(String),
        },
      ],
    });
  });

  it('POST /offices 409s on a duplicate name', async () => {
    const res = await create({ type: 'state', name: 'Mayor, Testville' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ status: 409, error: 'An office with that name already exists' });
  });

  it('POST /offices 409s on a duplicate name that differs only by case', async () => {
    const res = await create({ type: 'local', name: 'MAYOR, testville' });
    expect(res.statusCode).toBe(409);
  });

  it.each([
    ['an invalid type', { type: 'galactic', name: 'Emperor' }],
    ['a missing type', { name: 'Emperor' }],
    ['a short name', { type: 'federal', name: 'X' }],
  ])('POST /offices 400s on %s', async (_label, payload) => {
    expect((await create(payload)).statusCode).toBe(400);
  });

  it('GET /offices lists by type (enum order), then name', async () => {
    await create({ type: 'federal', name: 'Vice President' });
    await create({ type: 'federal', name: 'President' });
    await create({ type: 'legislative', name: 'Senator, North' });
    const res = await ctx.app.inject({ method: 'GET', url: url('/offices') });
    expect(res.statusCode).toBe(200);
    const rows = res.json<{ data: { type: string; name: string }[] }>().data;
    expect(rows.map((o) => `${o.type}:${o.name}`)).toEqual([
      'federal:President',
      'federal:Vice President',
      'legislative:Senator, North',
      'local:Mayor, Testville',
    ]);
  });

  it('GET /offices/:id returns one office', async () => {
    const created = (await create({ type: 'state', name: 'Governor, Lakes' })).json().data[0];
    const res = await ctx.app.inject({ method: 'GET', url: url(`/offices/${created.id}`) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 200, data: [created] });
  });

  it('GET /offices/:id 404s / 400s', async () => {
    const missing = await ctx.app.inject({ method: 'GET', url: url('/offices/99999') });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ status: 404, error: 'Office not found' });
    const bad = await ctx.app.inject({ method: 'GET', url: url('/offices/abc') });
    expect(bad.statusCode).toBe(400);
  });
});
