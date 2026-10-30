import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCandidate, createOffice, createParty, loginAs, makeTestApp, url } from './helpers';
import type { TestCtx } from './helpers';

describe('GET /me/votes', () => {
  let ctx: TestCtx;
  beforeAll(async () => {
    ctx = await makeTestApp();
  });
  afterAll(() => ctx.close());

  const myVotes = (cookie: string) =>
    ctx.app.inject({ method: 'GET', url: url('/me/votes'), headers: { cookie } });

  it("returns only the current user's votes, newest first, in the MyVote shape", async () => {
    const president = await createOffice(ctx.db, { name: 'President', type: 'federal' });
    const mayor = await createOffice(ctx.db, { name: 'Mayor', type: 'local' });
    const party = await createParty(ctx.db, { name: 'Civic Party' });
    const forPresident = await createCandidate(ctx.db, president.id, {
      firstname: 'Ola',
      lastname: 'Bello',
      partyId: party.id,
    });
    const forMayor = await createCandidate(ctx.db, mayor.id, {
      firstname: 'Ken',
      lastname: 'Ito',
    });

    const me = await loginAs(ctx, 'voter');
    const other = await loginAs(ctx, 'voter');
    const cast = (cookie: string, candidateId: number) =>
      ctx.app.inject({
        method: 'POST',
        url: url('/votes'),
        payload: { candidateId },
        headers: { cookie },
      });
    const first = (await cast(me.cookie, forPresident.id)).json().data[0];
    const second = (await cast(me.cookie, forMayor.id)).json().data[0];
    await cast(other.cookie, forPresident.id);

    const res = await myVotes(me.cookie);
    expect(res.statusCode).toBe(200);
    const { data } = res.json();
    expect(data).toHaveLength(2);
    expect(data.map((v: { voteId: number }) => v.voteId)).toEqual([second.id, first.id]);
    expect(data[1]).toEqual({
      voteId: first.id,
      office: { id: president.id, name: 'President', type: 'federal' },
      candidate: { id: forPresident.id, name: 'Ola Bello', partyName: 'Civic Party' },
      createdAt: first.createdAt,
    });
  });

  it('returns an empty list when the user has not voted', async () => {
    const { cookie } = await loginAs(ctx, 'voter');
    expect((await myVotes(cookie)).json()).toEqual({ status: 200, data: [] });
  });

  it('401s without a cookie', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: url('/me/votes') });
    expect(res.statusCode).toBe(401);
  });
});
