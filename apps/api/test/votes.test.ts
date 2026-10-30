import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCandidate, createOffice, loginAs, makeTestApp, url } from './helpers';
import type { TestCtx } from './helpers';

describe('POST /votes', () => {
  let ctx: TestCtx;
  let voter: Awaited<ReturnType<typeof loginAs>>;
  beforeAll(async () => {
    ctx = await makeTestApp();
    voter = await loginAs(ctx, 'voter');
  });
  afterAll(() => ctx.close());

  const vote = (candidateId: unknown, cookie: string | undefined = voter.cookie) =>
    ctx.app.inject({
      method: 'POST',
      url: url('/votes'),
      payload: { candidateId },
      headers: cookie ? { cookie } : {},
    });

  it('casts a vote, deriving the office from the candidate', async () => {
    const office = await createOffice(ctx.db);
    const candidate = await createCandidate(ctx.db, office.id);
    const res = await vote(candidate.id);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      status: 201,
      data: [
        {
          id: expect.any(Number),
          officeId: office.id,
          candidateId: candidate.id,
          voterId: voter.user.id,
          createdAt: expect.any(String),
        },
      ],
    });
  });

  it('409s on a second vote in the same office, even for another candidate', async () => {
    const office = await createOffice(ctx.db);
    const first = await createCandidate(ctx.db, office.id);
    const second = await createCandidate(ctx.db, office.id);
    expect((await vote(first.id)).statusCode).toBe(201);
    for (const candidateId of [first.id, second.id]) {
      const res = await vote(candidateId);
      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ status: 409, error: 'You have already voted for this office' });
    }
  });

  it('allows a vote in a different office', async () => {
    const a = await createCandidate(ctx.db, (await createOffice(ctx.db)).id);
    const b = await createCandidate(ctx.db, (await createOffice(ctx.db)).id);
    expect((await vote(a.id)).statusCode).toBe(201);
    expect((await vote(b.id)).statusCode).toBe(201);
  });

  it('lets an admin vote too', async () => {
    const admin = await loginAs(ctx, 'admin');
    const candidate = await createCandidate(ctx.db, (await createOffice(ctx.db)).id);
    expect((await vote(candidate.id, admin.cookie)).statusCode).toBe(201);
  });

  it('404s for an unknown candidate', async () => {
    const res = await vote(99999);
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ status: 404, error: 'Candidate not found' });
  });

  it('400s on an invalid body', async () => {
    expect((await vote('abc')).statusCode).toBe(400);
    expect((await vote(-1)).statusCode).toBe(400);
  });

  it('401s without a cookie', async () => {
    const candidate = await createCandidate(ctx.db, (await createOffice(ctx.db)).id);
    const res = await vote(candidate.id, '');
    expect(res.statusCode).toBe(401);
  });
});
