import { randomUUID } from 'node:crypto';
import { count } from 'drizzle-orm';
import type { OfficeType, Role } from '@politico/shared';
import type { Config } from '../config';
import { hashPassword } from '../lib/auth';
import type { Db } from './client';
import { candidates, offices, parties, users } from './schema';

export type SeedConfig = Pick<
  Config,
  'SEED_ADMIN_EMAIL' | 'SEED_ADMIN_PASSWORD' | 'SEED_VOTER_EMAIL' | 'SEED_VOTER_PASSWORD'
>;

export interface SeedSummary {
  users: number;
  parties: number;
  offices: number;
  candidates: number;
}

// All fictional.
const PARTIES = [
  { name: 'Progressive Alliance', hqAddress: '12 Unity Avenue, Harbour City' },
  { name: 'National Unity Party', hqAddress: '1 Federal Square, Central District' },
  { name: 'Green Future Movement', hqAddress: '48 Riverside Road, River State' },
] as const;

type PartyName = (typeof PARTIES)[number]['name'];

const OFFICES: {
  name: string;
  type: OfficeType;
  candidates: { firstname: string; lastname: string; party: PartyName }[];
}[] = [
  {
    name: 'President',
    type: 'federal',
    candidates: [
      { firstname: 'Amara', lastname: 'Okafor', party: 'Progressive Alliance' },
      { firstname: 'Daniel', lastname: 'Brennan', party: 'National Unity Party' },
      { firstname: 'Leila', lastname: 'Haddad', party: 'Green Future Movement' },
    ],
  },
  {
    name: 'Senator, Central District',
    type: 'legislative',
    candidates: [
      { firstname: 'Tomas', lastname: 'Varga', party: 'Progressive Alliance' },
      { firstname: 'Grace', lastname: 'Mensah', party: 'National Unity Party' },
      { firstname: 'Ravi', lastname: 'Iyer', party: 'Green Future Movement' },
    ],
  },
  {
    name: 'Governor, River State',
    type: 'state',
    candidates: [
      { firstname: 'Ingrid', lastname: 'Solberg', party: 'National Unity Party' },
      { firstname: 'Kwame', lastname: 'Asante', party: 'Green Future Movement' },
    ],
  },
  {
    name: 'Mayor, Harbour City',
    type: 'local',
    candidates: [
      { firstname: 'Sofia', lastname: 'Marquez', party: 'Progressive Alliance' },
      { firstname: 'Henrik', lastname: 'Lund', party: 'Green Future Movement' },
    ],
  },
];

type NewUser = typeof users.$inferInsert;

const candidateEmail = (c: { firstname: string; lastname: string }) =>
  `${c.firstname}.${c.lastname}@candidates.politico.test`.toLowerCase();

async function accountFromEnv(
  email: string | undefined,
  password: string | undefined,
  role: Role,
  firstname: string,
  lastname: string,
): Promise<NewUser | undefined> {
  if (!email || !password) return undefined;
  // Login lowercases the email it receives, so store it lowercased too.
  const passwordHash = await hashPassword(password);
  return { firstname, lastname, email: email.trim().toLowerCase(), passwordHash, role };
}

/**
 * Seeds demo data when the `users` table is empty; otherwise does nothing.
 * Returns what was inserted, or `null` if the database already had users.
 */
export async function seedIfEmpty(
  db: Db,
  config: SeedConfig,
  log: (message: string) => void = console.info,
): Promise<SeedSummary | null> {
  const isEmpty = async (q: Pick<Db, 'select'>) =>
    (await q.select({ n: count() }).from(users))[0]?.n === 0;
  if (!(await isEmpty(db))) return null;

  // Hash outside the transaction (bcrypt is slow) and keep the transaction short.
  const accounts = (
    await Promise.all([
      accountFromEnv(
        config.SEED_ADMIN_EMAIL,
        config.SEED_ADMIN_PASSWORD,
        'admin',
        'Electoral',
        'Admin',
      ),
      accountFromEnv(config.SEED_VOTER_EMAIL, config.SEED_VOTER_PASSWORD, 'voter', 'Demo', 'Voter'),
    ])
  ).filter((a) => a !== undefined);
  const candidateUsers = await Promise.all(
    OFFICES.flatMap((o) => o.candidates).map(async (c): Promise<NewUser> => ({
      firstname: c.firstname,
      lastname: c.lastname,
      email: candidateEmail(c),
      // Candidates don't need to log in.
      passwordHash: await hashPassword(randomUUID()),
      role: 'voter',
    })),
  );

  const summary = await db.transaction(async (tx) => {
    if (!(await isEmpty(tx))) return null; // Lost a race with another seeder.

    const insertedUsers = await tx
      .insert(users)
      .values([...accounts, ...candidateUsers])
      .returning({ id: users.id, email: users.email });
    const userIdByEmail = new Map(insertedUsers.map((u) => [u.email, u.id]));

    const insertedParties = await tx
      .insert(parties)
      .values(PARTIES.map((p) => ({ ...p, logoUrl: null })))
      .returning({ id: parties.id, name: parties.name });
    const partyIdByName = new Map(insertedParties.map((p) => [p.name, p.id]));

    const insertedOffices = await tx
      .insert(offices)
      .values(OFFICES.map(({ name, type }) => ({ name, type })))
      .returning({ id: offices.id, name: offices.name });
    const officeIdByName = new Map(insertedOffices.map((o) => [o.name, o.id]));

    const candidateRows = OFFICES.flatMap((o) =>
      o.candidates.map((c) => {
        const email = candidateEmail(c);
        const officeId = officeIdByName.get(o.name);
        const userId = userIdByEmail.get(email);
        const partyId = partyIdByName.get(c.party);
        if (!officeId || !userId || !partyId) throw new Error(`Seed data mismatch for ${email}`);
        return { officeId, userId, partyId };
      }),
    );
    await tx.insert(candidates).values(candidateRows);

    return {
      users: insertedUsers.length,
      parties: insertedParties.length,
      offices: insertedOffices.length,
      candidates: candidateRows.length,
    };
  });

  if (summary) {
    log(
      `Seeded ${summary.users} users, ${summary.parties} parties, ${summary.offices} offices, ` +
        `${summary.candidates} candidates`,
    );
  }
  return summary;
}
