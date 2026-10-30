import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  adminCookie,
  createCandidate,
  createOffice,
  createParty,
  createUser,
  makeTestApp,
  url,
} from './helpers';
import type { TestCtx } from './helpers';

describe('candidates routes', () => {
  let ctx: TestCtx;
  let cookie: string;
  beforeAll(async () => {
    ctx = await makeTestApp();
    cookie = await adminCookie(ctx);
  });
  afterAll(() => ctx.close());

  const register = (officeId: number, payload: object) =>
    ctx.app.inject({
      method: 'POST',
      url: url(`/offices/${officeId}/candidates`),
      payload,
      headers: { cookie },
    });

  describe('POST /offices/:id/candidates', () => {
    it('registers a candidate and returns the full shape', async () => {
      const office = await createOffice(ctx.db);
      const user = await createUser(ctx.db, { firstname: 'Nia', lastname: 'Long' });
      const party = await createParty(ctx.db, {
        name: 'Shape Party',
        logoUrl: 'https://example.test/shape.png',
      });
      const res = await register(office.id, { userId: user.id, partyId: party.id });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual({
        status: 201,
        data: [
          {
            id: expect.any(Number),
            officeId: office.id,
            user: { id: user.id, firstname: 'Nia', lastname: 'Long' },
            party: { id: party.id, name: 'Shape Party', logoUrl: 'https://example.test/shape.png' },
            createdAt: expect.any(String),
          },
        ],
      });
    });

    it.each([
      ['office', 'Office not found'],
      ['user', 'User not found'],
      ['party', 'Party not found'],
    ])('404s for a missing %s', async (missing, message) => {
      const office = await createOffice(ctx.db);
      const user = await createUser(ctx.db);
      const party = await createParty(ctx.db);
      const res = await register(missing === 'office' ? 99999 : office.id, {
        userId: missing === 'user' ? 99999 : user.id,
        partyId: missing === 'party' ? 99999 : party.id,
      });
      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({ status: 404, error: message });
    });

    it('409s when the user is already running for the office', async () => {
      const office = await createOffice(ctx.db);
      const user = await createUser(ctx.db);
      await createCandidate(ctx.db, office.id, { userId: user.id });
      const otherParty = await createParty(ctx.db);
      const res = await register(office.id, { userId: user.id, partyId: otherParty.id });
      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({
        status: 409,
        error: 'This user is already running for this office',
      });
    });

    it('409s when the party already has a candidate for the office', async () => {
      const office = await createOffice(ctx.db);
      const party = await createParty(ctx.db);
      await createCandidate(ctx.db, office.id, { partyId: party.id });
      const otherUser = await createUser(ctx.db);
      const res = await register(office.id, { userId: otherUser.id, partyId: party.id });
      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({
        status: 409,
        error: 'This party already has a candidate for this office',
      });
    });

    it('lets the same user and party run for different offices', async () => {
      const user = await createUser(ctx.db);
      const party = await createParty(ctx.db);
      for (const office of [await createOffice(ctx.db), await createOffice(ctx.db)]) {
        const res = await register(office.id, { userId: user.id, partyId: party.id });
        expect(res.statusCode).toBe(201);
      }
    });

    it('400s on an invalid body', async () => {
      const office = await createOffice(ctx.db);
      const res = await register(office.id, { userId: 'one' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /offices/:id/candidates', () => {
    it('lists candidates sorted by party name', async () => {
      const office = await createOffice(ctx.db);
      for (const name of ['Zeta Party', 'Alpha Party', 'Mu Party']) {
        const party = await createParty(ctx.db, { name });
        await createCandidate(ctx.db, office.id, { partyId: party.id });
      }
      // A candidate for a different office must not show up.
      await createCandidate(ctx.db, (await createOffice(ctx.db)).id);

      const res = await ctx.app.inject({
        method: 'GET',
        url: url(`/offices/${office.id}/candidates`),
      });
      expect(res.statusCode).toBe(200);
      const data = res.json<{ data: { officeId: number; party: { name: string } }[] }>().data;
      expect(data.map((c) => c.party.name)).toEqual(['Alpha Party', 'Mu Party', 'Zeta Party']);
      expect(data.every((c) => c.officeId === office.id)).toBe(true);
    });

    it('returns an empty list for an office with no candidates', async () => {
      const office = await createOffice(ctx.db);
      const res = await ctx.app.inject({
        method: 'GET',
        url: url(`/offices/${office.id}/candidates`),
      });
      expect(res.json()).toEqual({ status: 200, data: [] });
    });

    it('404s for an unknown office', async () => {
      const res = await ctx.app.inject({ method: 'GET', url: url('/offices/99999/candidates') });
      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({ status: 404, error: 'Office not found' });
    });
  });
});
