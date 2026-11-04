import type { User } from '@politico/shared';
import type { users } from '../db/schema';

/** Maps a DB row to the public `User` shape, dropping `passwordHash`. */
export function toUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    firstname: row.firstname,
    lastname: row.lastname,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
  };
}
