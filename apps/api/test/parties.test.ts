import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  adminCookie,
  createCandidate,
  createOffice,
  createParty,
  makeTestApp,
  url,
} from './helpers';
import type { TestCtx } from './helpers';

describe('parties routes', () => {
  let ctx: TestCtx;
  let cookie: string;
  beforeAll(async () => {
    ctx = await makeTestApp();
    cookie = await adminCookie(ctx);
  });
  afterAll(() => ctx.close());

  const create = (payload: object) =>
    ctx.app.inject({ method: 'POST', url: url('/parties'), payload, headers: { cookie } });

  describe('POST /parties', () => {
    it('creates a party (logoUrl defaults to null)', async () => {
      const res = await create({ name: '  Labour Union  ', hqAddress: '5 Workers Way' });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual({
        status: 201,
        data: [
          {
            id: expect.any(Number),
            name: 'Labour Union',
            hqAddress: '5 Workers Way',
            logoUrl: null,
            createdAt: expect.any(String),
          },
        ],
      });
    });

    it('stores a logo URL', async () => {
      const res = await create({
        name: 'Logo Party',
        hqAddress: '9 Brand Street',
        logoUrl: 'https://example.test/logo.png',
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().data[0].logoUrl).toBe('https://example.test/logo.png');
    });

    it('409s on a duplicate name', async () => {
      const res = await create({ name: 'Labour Union', hqAddress: 'Elsewhere' });
      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ status: 409, error: 'A party with that name already exists' });
    });

    it('409s on a duplicate name that differs only by case', async () => {
      const res = await create({ name: 'LABOUR union', hqAddress: 'Elsewhere' });
      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ status: 409, error: 'A party with that name already exists' });
    });

    it('400s on a non-http(s) logo URL', async () => {
      const res = await create({
        name: 'Script Party',
        hqAddress: '1 Hack Lane',
        logoUrl: 'javascript:alert(1)',
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toMatch(/logoUrl/);
    });

    it.each([
      ['a short name', { name: 'A', hqAddress: '5 Workers Way' }],
      ['a missing address', { name: 'No Address' }],
      ['a bad logo URL', { name: 'Bad Logo', hqAddress: '1 Road', logoUrl: 'nope' }],
    ])('400s on %s', async (_label, payload) => {
      expect((await create(payload)).statusCode).toBe(400);
    });
  });

  describe('GET /parties', () => {
    it('lists parties sorted by name', async () => {
      const res = await ctx.app.inject({ method: 'GET', url: url('/parties') });
      expect(res.statusCode).toBe(200);
      const names = res.json<{ data: { name: string }[] }>().data.map((p) => p.name);
      expect(names).toEqual(['Labour Union', 'Logo Party']);
    });
  });

  describe('GET /parties/:id', () => {
    it('returns one party', async () => {
      const party = await createParty(ctx.db, { name: 'Fetched Party' });
      const res = await ctx.app.inject({ method: 'GET', url: url(`/parties/${party.id}`) });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        status: 200,
        data: [{ id: party.id, name: 'Fetched Party' }],
      });
    });

    it('404s for an unknown id', async () => {
      const res = await ctx.app.inject({ method: 'GET', url: url('/parties/99999') });
      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({ status: 404, error: 'Party not found' });
    });

    it.each(['abc', '0', '-1', '1.5'])('400s for id %s', async (id) => {
      const res = await ctx.app.inject({ method: 'GET', url: url(`/parties/${id}`) });
      expect(res.statusCode).toBe(400);
    });

    it('400s (not 500) for an id beyond the int4 range', async () => {
      const res = await ctx.app.inject({ method: 'GET', url: url('/parties/99999999999') });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PATCH /parties/:id', () => {
    const patch = (id: number, payload: object) =>
      ctx.app.inject({ method: 'PATCH', url: url(`/parties/${id}`), payload, headers: { cookie } });

    it('updates only the provided fields', async () => {
      const party = await createParty(ctx.db, {
        name: 'Before',
        hqAddress: 'Old HQ',
        logoUrl: 'https://example.test/a.png',
      });
      const res = await patch(party.id, { hqAddress: 'New HQ' });
      expect(res.statusCode).toBe(200);
      expect(res.json().data[0]).toMatchObject({
        id: party.id,
        name: 'Before',
        hqAddress: 'New HQ',
        logoUrl: 'https://example.test/a.png',
      });
    });

    it('clears the logo with logoUrl: null', async () => {
      const party = await createParty(ctx.db, { logoUrl: 'https://example.test/b.png' });
      const res = await patch(party.id, { logoUrl: null });
      expect(res.statusCode).toBe(200);
      expect(res.json().data[0].logoUrl).toBeNull();
    });

    it('400s on an empty body', async () => {
      const party = await createParty(ctx.db);
      const res = await patch(party.id, {});
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ status: 400, error: 'body: Provide at least one field' });
    });

    it('404s for an unknown party', async () => {
      const res = await patch(99999, { name: 'Ghost' });
      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({ status: 404, error: 'Party not found' });
    });

    it('409s when renaming to a taken name', async () => {
      const party = await createParty(ctx.db);
      const res = await patch(party.id, { name: 'Labour Union' });
      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ status: 409, error: 'A party with that name already exists' });
    });
  });

  describe('DELETE /parties/:id', () => {
    const del = (id: number) =>
      ctx.app.inject({ method: 'DELETE', url: url(`/parties/${id}`), headers: { cookie } });

    it('deletes a party', async () => {
      const party = await createParty(ctx.db);
      const res = await del(party.id);
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: 200, data: [{ message: 'Party deleted' }] });
      const after = await ctx.app.inject({ method: 'GET', url: url(`/parties/${party.id}`) });
      expect(after.statusCode).toBe(404);
    });

    it('404s for an unknown party', async () => {
      const res = await del(99999);
      expect(res.statusCode).toBe(404);
    });

    it('409s when the party has a registered candidate', async () => {
      const party = await createParty(ctx.db);
      const office = await createOffice(ctx.db);
      await createCandidate(ctx.db, office.id, { partyId: party.id });
      const res = await del(party.id);
      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({
        status: 409,
        error: 'Party has registered candidates and cannot be deleted',
      });
    });
  });
});
