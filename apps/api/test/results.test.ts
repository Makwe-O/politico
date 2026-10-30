import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCandidate, createOffice, createParty, loginAs, makeTestApp, url } from './helpers';
import type { TestCtx } from './helpers';

describe('GET /offices/:id/results', () => {
  let ctx: TestCtx;
  beforeAll(async () => {
    ctx = await makeTestApp();
  });
  afterAll(() => ctx.close());

  it('counts votes per candidate, includes zero-vote candidates, sorts by votes then name', async () => {
    const office = await createOffice(ctx.db, { name: 'Results Office' });
    const otherOffice = await createOffice(ctx.db);
    const add = async (firstname: string, lastname: string, partyName: string) =>
      createCandidate(ctx.db, office.id, {
        firstname,
        lastname,
        partyId: (await createParty(ctx.db, { name: partyName })).id,
      });
    const cara = await add('Cara', 'Diaz', 'Party C');
    const bob = await add('Bob', 'Evans', 'Party B');
    const abe = await add('Abe', 'Fox', 'Party A');
    const zed = await add('Zed', 'Young', 'Party Z'); // gets no votes
    const elsewhere = await createCandidate(ctx.db, otherOffice.id);

    // Cara 2, Abe 1, Bob 1, Zed 0. A vote in another office must not be counted.
    const ballots = [cara, cara, bob, abe];
    for (const candidate of ballots) {
      const { cookie } = await loginAs(ctx, 'voter');
      const res = await ctx.app.inject({
        method: 'POST',
        url: url('/votes'),
        payload: { candidateId: candidate.id },
        headers: { cookie },
      });
      expect(res.statusCode).toBe(201);
      if (candidate === cara) {
        await ctx.app.inject({
          method: 'POST',
          url: url('/votes'),
          payload: { candidateId: elsewhere.id },
          headers: { cookie },
        });
      }
    }

    const res = await ctx.app.inject({ method: 'GET', url: url(`/offices/${office.id}/results`) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      status: 200,
      data: [
        {
          officeId: office.id,
          candidateId: cara.id,
          candidateName: 'Cara Diaz',
          partyName: 'Party C',
          votes: 2,
        },
        {
          officeId: office.id,
          candidateId: abe.id,
          candidateName: 'Abe Fox',
          partyName: 'Party A',
          votes: 1,
        },
        {
          officeId: office.id,
          candidateId: bob.id,
          candidateName: 'Bob Evans',
          partyName: 'Party B',
          votes: 1,
        },
        {
          officeId: office.id,
          candidateId: zed.id,
          candidateName: 'Zed Young',
          partyName: 'Party Z',
          votes: 0,
        },
      ],
    });
  });

  it('returns an empty list for an office with no candidates', async () => {
    const office = await createOffice(ctx.db);
    const res = await ctx.app.inject({ method: 'GET', url: url(`/offices/${office.id}/results`) });
    expect(res.json()).toEqual({ status: 200, data: [] });
  });

  it('404s for an unknown office', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: url('/offices/99999/results') });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ status: 404, error: 'Office not found' });
  });
});
