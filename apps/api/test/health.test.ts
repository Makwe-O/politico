import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makeTestApp } from './helpers';

describe('GET /api/v1/health', () => {
  let ctx: Awaited<ReturnType<typeof makeTestApp>>;
  beforeAll(async () => {
    ctx = await makeTestApp();
  });
  afterAll(() => ctx.close());

  it('reports the API and database are up', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      status: 200,
      data: [{ ok: true, service: 'politico-api' }],
    });
  });

  it('returns the error envelope for unknown routes', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ status: 404, error: 'Route not found' });
  });
});
