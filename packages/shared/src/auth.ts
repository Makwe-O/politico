import { z } from 'zod';

export const Role = z.enum(['admin', 'voter']);
export type Role = z.infer<typeof Role>;

/** Emails are compared case-insensitively, so normalise before they reach the DB. */
const Email = z.string().trim().toLowerCase().pipe(z.email());

export const SignupInput = z.object({
  firstname: z.string().trim().min(1).max(100),
  lastname: z.string().trim().min(1).max(100),
  email: Email,
  // bcrypt ignores everything past 72 bytes.
  password: z.string().min(8).max(72),
});
export type SignupInput = z.infer<typeof SignupInput>;

export const LoginInput = z.object({
  email: Email,
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginInput>;

/** A user as the API returns it. Never includes the password hash. */
export const User = z.object({
  id: z.number().int(),
  firstname: z.string(),
  lastname: z.string(),
  email: z.string(),
  role: Role,
  createdAt: z.string(),
});
export type User = z.infer<typeof User>;
