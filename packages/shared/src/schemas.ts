import { z } from 'zod';

// ---------- Primitives ----------

export const Role = z.enum(['admin', 'voter']);
export type Role = z.infer<typeof Role>;

export const OfficeType = z.enum(['federal', 'legislative', 'state', 'local']);
export type OfficeType = z.infer<typeof OfficeType>;

/** Postgres `integer` max. Bounding ids keeps oversized values a 400, not a DB error. */
const MAX_ID = 2_147_483_647;
const Id = z.number().int().positive().max(MAX_ID);
const Timestamp = z.string(); // ISO 8601, e.g. "2026-10-30T10:00:00.000Z"
const Name = z.string().trim().min(1, 'Required').max(100);
const Email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'));
/** Logos are rendered for every visitor, so only allow plain http(s) image URLs. */
const LogoUrl = z.url({ protocol: /^https?$/, error: 'Enter a valid http(s) URL' });

/** Route params like `/parties/:id`. */
export const IdParams = z.object({ id: z.coerce.number().int().positive().max(MAX_ID) });
export type IdParams = z.infer<typeof IdParams>;

export const Message = z.object({ message: z.string() });
export type Message = z.infer<typeof Message>;

// ---------- Entities (response shapes) ----------

/** Public user shape. Never includes the password hash. */
export const User = z.object({
  id: Id,
  firstname: z.string(),
  lastname: z.string(),
  email: z.string(),
  role: Role,
  createdAt: Timestamp,
});
export type User = z.infer<typeof User>;

export const Party = z.object({
  id: Id,
  name: z.string(),
  hqAddress: z.string(),
  logoUrl: z.string().nullable(),
  createdAt: Timestamp,
});
export type Party = z.infer<typeof Party>;

export const Office = z.object({
  id: Id,
  type: OfficeType,
  name: z.string(),
  createdAt: Timestamp,
});
export type Office = z.infer<typeof Office>;

/** A party's flag bearer for an office, with the details a ballot needs. */
export const Candidate = z.object({
  id: Id,
  officeId: Id,
  user: z.object({ id: Id, firstname: z.string(), lastname: z.string() }),
  party: z.object({ id: Id, name: z.string(), logoUrl: z.string().nullable() }),
  createdAt: Timestamp,
});
export type Candidate = z.infer<typeof Candidate>;

export const Vote = z.object({
  id: Id,
  officeId: Id,
  candidateId: Id,
  voterId: Id,
  createdAt: Timestamp,
});
export type Vote = z.infer<typeof Vote>;

/** One row per candidate in the office (including candidates with 0 votes), sorted by votes desc. */
export const OfficeResult = z.object({
  officeId: Id,
  candidateId: Id,
  candidateName: z.string(), // "firstname lastname"
  partyName: z.string(),
  votes: z.number().int().nonnegative(),
});
export type OfficeResult = z.infer<typeof OfficeResult>;

/** A vote the current user cast, for the profile page. Newest first. */
export const MyVote = z.object({
  voteId: Id,
  office: z.object({ id: Id, name: z.string(), type: OfficeType }),
  candidate: z.object({ id: Id, name: z.string(), partyName: z.string() }),
  createdAt: Timestamp,
});
export type MyVote = z.infer<typeof MyVote>;

// ---------- Request bodies ----------

export const SignupBody = z.object({
  firstname: Name,
  lastname: Name,
  email: Email,
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});
export type SignupBody = z.infer<typeof SignupBody>;

export const LoginBody = z.object({
  email: Email,
  password: z.string().min(1, 'Required'),
});
export type LoginBody = z.infer<typeof LoginBody>;

export const CreatePartyBody = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(120),
  hqAddress: z.string().trim().min(2, 'At least 2 characters').max(200),
  logoUrl: LogoUrl.optional(),
});
export type CreatePartyBody = z.infer<typeof CreatePartyBody>;

/** Partial update. Send `logoUrl: null` to remove the logo. At least one field is required. */
export const UpdatePartyBody = z
  .object({
    name: CreatePartyBody.shape.name.optional(),
    hqAddress: CreatePartyBody.shape.hqAddress.optional(),
    logoUrl: LogoUrl.nullable().optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), 'Provide at least one field');
export type UpdatePartyBody = z.infer<typeof UpdatePartyBody>;

export const CreateOfficeBody = z.object({
  type: OfficeType,
  name: z.string().trim().min(2, 'At least 2 characters').max(120),
});
export type CreateOfficeBody = z.infer<typeof CreateOfficeBody>;

export const RegisterCandidateBody = z.object({
  userId: Id,
  partyId: Id,
});
export type RegisterCandidateBody = z.infer<typeof RegisterCandidateBody>;

/** The office is derived from the candidate, so a vote can't target the wrong office. */
export const CastVoteBody = z.object({
  candidateId: Id,
});
export type CastVoteBody = z.infer<typeof CastVoteBody>;
