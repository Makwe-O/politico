import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { count, eq } from 'drizzle-orm';
import { candidates, offices, parties, users } from '../src/db/schema';
import { seedIfEmpty, type SeedConfig } from '../src/db/seed';
import { createUser, makeTestApp, url } from './helpers';
import type { TestCtx } from './helpers';

const config: SeedConfig = {
  SEED_ADMIN_EMAIL: 'Admin@Seed.test',
  SEED_ADMIN_PASSWORD: 'seed-admin-password',
  SEED_VOTER_EMAIL: 'voter@seed.test',
  SEED_VOTER_PASSWORD: 'seed-voter-password',
};
const quiet = () => {};

describe('seedIfEmpty', () => {
  let ctx: TestCtx;
  beforeEach(async () => {
    ctx = await makeTestApp();
  });
  afterEach(() => ctx.close());

  const counts = async () => {
    const n = async (table: typeof users | typeof parties | typeof offices | typeof candidates) =>
      (await ctx.db.select({ n: count() }).from(table))[0]?.n;
    return {
      users: await n(users),
      parties: await n(parties),
      offices: await n(offices),
      candidates: await n(candidates),
    };
  };

  it('seeds an empty database, and a second call is a no-op', async () => {
    const logs: string[] = [];
    const summary = await seedIfEmpty(ctx.db, config, (m) => logs.push(m));
    // 2 accounts + 10 candidate users; 3 + 3 + 2 + 2 candidates.
    const expected = { users: 12, parties: 3, offices: 4, candidates: 10 };
    expect(summary).toEqual(expected);
    expect(await counts()).toEqual(expected);
    expect(logs).toHaveLength(1);

    expect(await seedIfEmpty(ctx.db, config, quiet)).toBeNull();
    expect(await counts()).toEqual(expected);
  });

  it('creates a usable admin and voter with lowercased emails', async () => {
    await seedIfEmpty(ctx.db, config, quiet);
    const [admin] = await ctx.db.select().from(users).where(eq(users.email, 'admin@seed.test'));
    expect(admin?.role).toBe('admin');

    const res = await ctx.app.inject({
      method: 'POST',
      url: url('/auth/login'),
      payload: { email: 'voter@seed.test', password: 'seed-voter-password' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data[0].role).toBe('voter');
  });

  it('gives every office one type each and 2-3 candidates from different parties', async () => {
    await seedIfEmpty(ctx.db, config, quiet);
    const officeRows = await ctx.db.select().from(offices);
    expect(officeRows.map((o) => o.type).sort()).toEqual(
      ['federal', 'legislative', 'local', 'state'].sort(),
    );
    for (const office of officeRows) {
      const rows = await ctx.db.select().from(candidates).where(eq(candidates.officeId, office.id));
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows.length).toBeLessThanOrEqual(3);
      expect(new Set(rows.map((c) => c.partyId)).size).toBe(rows.length);
    }
  });

  it('skips accounts whose env vars are missing', async () => {
    const summary = await seedIfEmpty(ctx.db, { SEED_ADMIN_EMAIL: 'only@seed.test' }, quiet);
    expect(summary?.users).toBe(10);
    const [admin] = await ctx.db.select().from(users).where(eq(users.role, 'admin'));
    expect(admin).toBeUndefined();
  });

  it('does nothing when users already exist', async () => {
    await createUser(ctx.db);
    expect(await seedIfEmpty(ctx.db, config, quiet)).toBeNull();
    expect(await counts()).toEqual({ users: 1, parties: 0, offices: 0, candidates: 0 });
  });
});
