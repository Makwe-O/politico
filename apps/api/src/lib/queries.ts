import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { candidates, offices, parties, users } from '../db/schema';
import { notFound } from './http';

/** First row of a query that must return one (e.g. `insert ... returning()`). */
export function one<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) throw new Error('Expected the query to return a row');
  return row;
}

/** Every `users` column except `passwordHash`. */
export const publicUserColumns = {
  id: users.id,
  firstname: users.firstname,
  lastname: users.lastname,
  email: users.email,
  role: users.role,
  createdAt: users.createdAt,
};

/** Select shape for `toCandidate()`. Join `users` and `parties` onto `candidates`. */
export const candidateColumns = {
  candidate: { id: candidates.id, officeId: candidates.officeId, createdAt: candidates.createdAt },
  user: { id: users.id, firstname: users.firstname, lastname: users.lastname },
  party: { id: parties.id, name: parties.name, logoUrl: parties.logoUrl },
};

/** Loads an office or throws 404 "Office not found". */
export async function getOfficeOr404(db: Db, id: number) {
  const [office] = await db.select().from(offices).where(eq(offices.id, id));
  if (!office) throw notFound('Office');
  return office;
}
