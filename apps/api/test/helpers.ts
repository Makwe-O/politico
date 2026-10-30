import { expect } from 'vitest';
import type { OfficeType, Role } from '@politico/shared';
import { API_PREFIX } from '@politico/shared';
import { buildApp, type App } from '../src/app';
import { openDb, type Db } from '../src/db/client';
import { candidates, offices, parties, users } from '../src/db/schema';
import { AUTH_COOKIE, hashPassword } from '../src/lib/auth';
import { one, publicUserColumns } from '../src/lib/queries';

/** Fresh app + in-memory Postgres per call. Call `close()` in afterAll/afterEach. */
export async function makeTestApp() {
  const db = await openDb();
  const app = await buildApp({ db, jwtSecret: 'test-secret-at-least-16-chars' });
  await app.ready();
  return {
    app,
    db,
    close: async () => {
      await app.close();
      await db.$client.close();
    },
  };
}

export type TestCtx = Awaited<ReturnType<typeof makeTestApp>>;

/** `/api/v1` + path. */
export const url = (path: string) => `${API_PREFIX}${path}`;

export const DEFAULT_PASSWORD = 'correct-horse-battery';
// bcrypt is deliberately slow; hash the shared test password once per file.
let defaultHash: Promise<string> | undefined;
const hashFor = (password: string) =>
  password === DEFAULT_PASSWORD
    ? (defaultHash ??= hashPassword(DEFAULT_PASSWORD))
    : hashPassword(password);

let seq = 0;
/** Unique-per-file suffix for names and emails. */
export const uniq = () => ++seq;

/** Inserts a user directly (bypassing signup). Returns the public row, without the hash. */
export async function createUser(
  db: Db,
  opts: {
    role?: Role;
    email?: string;
    password?: string;
    firstname?: string;
    lastname?: string;
  } = {},
) {
  const n = uniq();
  const {
    role = 'voter',
    email = `user${n}@example.test`,
    password = DEFAULT_PASSWORD,
    firstname = 'Test',
    lastname = `User${n}`,
  } = opts;
  return one(
    await db
      .insert(users)
      .values({
        firstname,
        lastname,
        email: email.toLowerCase(),
        passwordHash: await hashFor(password),
        role,
      })
      .returning(publicUserColumns),
  );
}

/** Logs in through the API and returns a `cookie` header value for `app.inject({ headers: { cookie } })`. */
export async function login(app: App, email: string, password: string) {
  const res = await app.inject({
    method: 'POST',
    url: url('/auth/login'),
    payload: { email, password },
  });
  expect(res.statusCode).toBe(200);
  return cookieFrom(res.headers['set-cookie']);
}

/** `politico_token=<jwt>` from a `set-cookie` header. */
export function cookieFrom(setCookie: string | string[] | undefined) {
  const header = [setCookie ?? []].flat().find((c) => c.startsWith(`${AUTH_COOKIE}=`));
  if (!header) throw new Error(`No ${AUTH_COOKIE} cookie in response`);
  return header.split(';')[0] as string;
}

/** Creates a user with the given role and logs them in. */
export async function loginAs(ctx: TestCtx, role: Role) {
  const user = await createUser(ctx.db, { role });
  const cookie = await login(ctx.app, user.email, DEFAULT_PASSWORD);
  return { user, cookie };
}

export const adminCookie = async (ctx: TestCtx) => (await loginAs(ctx, 'admin')).cookie;
export const voterCookie = async (ctx: TestCtx) => (await loginAs(ctx, 'voter')).cookie;

export async function createParty(
  db: Db,
  opts: { name?: string; hqAddress?: string; logoUrl?: string | null } = {},
) {
  const { name = `Party ${uniq()}`, hqAddress = '1 Main Street', logoUrl = null } = opts;
  return one(await db.insert(parties).values({ name, hqAddress, logoUrl }).returning());
}

export async function createOffice(db: Db, opts: { name?: string; type?: OfficeType } = {}) {
  const { name = `Office ${uniq()}`, type = 'federal' } = opts;
  return one(await db.insert(offices).values({ name, type }).returning());
}

/** Inserts a candidate (creating the user and party unless given). */
export async function createCandidate(
  db: Db,
  officeId: number,
  opts: { userId?: number; partyId?: number; firstname?: string; lastname?: string } = {},
) {
  const userId =
    opts.userId ??
    (await createUser(db, { firstname: opts.firstname, lastname: opts.lastname })).id;
  const partyId = opts.partyId ?? (await createParty(db)).id;
  return one(await db.insert(candidates).values({ officeId, userId, partyId }).returning());
}
