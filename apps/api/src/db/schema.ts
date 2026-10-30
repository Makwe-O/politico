import {
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['admin', 'voter']);
export const officeTypeEnum = pgEnum('office_type', ['federal', 'legislative', 'state', 'local']);

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  firstname: text('firstname').notNull(),
  lastname: text('lastname').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('voter'),
  createdAt: createdAt(),
});

export const parties = pgTable('parties', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull().unique(),
  hqAddress: text('hq_address').notNull(),
  logoUrl: text('logo_url'),
  createdAt: createdAt(),
});

export const offices = pgTable('offices', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  type: officeTypeEnum('type').notNull(),
  name: text('name').notNull().unique(),
  createdAt: createdAt(),
});

/** A party's flag bearer for an office. One candidate per (office, user) and per (office, party). */
export const candidates = pgTable(
  'candidates',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    officeId: integer('office_id')
      .notNull()
      .references(() => offices.id, { onDelete: 'restrict' }),
    partyId: integer('party_id')
      .notNull()
      .references(() => parties.id, { onDelete: 'restrict' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
  },
  (t) => [
    unique('candidates_office_user_uq').on(t.officeId, t.userId),
    unique('candidates_office_party_uq').on(t.officeId, t.partyId),
    // Lets votes reference (candidate, office) together, so a vote can't point at a
    // candidate from a different office.
    unique('candidates_id_office_uq').on(t.id, t.officeId),
  ],
);

/** One vote per voter per office, enforced by the database, not just the API. */
export const votes = pgTable(
  'votes',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    voterId: integer('voter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    officeId: integer('office_id').notNull(),
    candidateId: integer('candidate_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('votes_voter_office_uq').on(t.voterId, t.officeId),
    foreignKey({
      name: 'votes_candidate_office_fk',
      columns: [t.candidateId, t.officeId],
      foreignColumns: [candidates.id, candidates.officeId],
    }).onDelete('restrict'),
    index('votes_office_candidate_idx').on(t.officeId, t.candidateId),
  ],
);
