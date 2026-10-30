import type {
  Candidate,
  MyVote,
  Office,
  OfficeResult,
  OfficeType,
  Party,
  User,
  Vote,
} from '@politico/shared';
import type { candidates, offices, parties, users, votes } from '../db/schema';

type UserRow = typeof users.$inferSelect;
type PartyRow = typeof parties.$inferSelect;
type OfficeRow = typeof offices.$inferSelect;
type CandidateRow = typeof candidates.$inferSelect;
type VoteRow = typeof votes.$inferSelect;

type NameParts = Pick<UserRow, 'firstname' | 'lastname'>;

export const fullName = (u: NameParts) => `${u.firstname} ${u.lastname}`;

/** Picks the public fields explicitly, so `passwordHash` can never leak even if a full row is passed. */
export const toUser = (row: Omit<UserRow, 'passwordHash'>): User => ({
  id: row.id,
  firstname: row.firstname,
  lastname: row.lastname,
  email: row.email,
  role: row.role,
  createdAt: row.createdAt.toISOString(),
});

export const toParty = (row: PartyRow): Party => ({
  id: row.id,
  name: row.name,
  hqAddress: row.hqAddress,
  logoUrl: row.logoUrl,
  createdAt: row.createdAt.toISOString(),
});

export const toOffice = (row: OfficeRow): Office => ({
  id: row.id,
  type: row.type,
  name: row.name,
  createdAt: row.createdAt.toISOString(),
});

export interface CandidateJoinRow {
  candidate: Pick<CandidateRow, 'id' | 'officeId' | 'createdAt'>;
  user: Pick<UserRow, 'id' | 'firstname' | 'lastname'>;
  party: Pick<PartyRow, 'id' | 'name' | 'logoUrl'>;
}

export const toCandidate = ({ candidate, user, party }: CandidateJoinRow): Candidate => ({
  id: candidate.id,
  officeId: candidate.officeId,
  user: { id: user.id, firstname: user.firstname, lastname: user.lastname },
  party: { id: party.id, name: party.name, logoUrl: party.logoUrl },
  createdAt: candidate.createdAt.toISOString(),
});

export const toVote = (row: VoteRow): Vote => ({
  id: row.id,
  officeId: row.officeId,
  candidateId: row.candidateId,
  voterId: row.voterId,
  createdAt: row.createdAt.toISOString(),
});

export interface OfficeResultRow extends NameParts {
  officeId: number;
  candidateId: number;
  partyName: string;
  votes: number | string | bigint;
}

export const toOfficeResult = (row: OfficeResultRow): OfficeResult => ({
  officeId: row.officeId,
  candidateId: row.candidateId,
  candidateName: fullName(row),
  partyName: row.partyName,
  // Postgres count() is a bigint; drivers may hand it back as a string or bigint.
  votes: Number(row.votes),
});

export interface MyVoteRow {
  voteId: number;
  createdAt: Date;
  office: { id: number; name: string; type: OfficeType };
  candidate: NameParts & { id: number; partyName: string };
}

export const toMyVote = (row: MyVoteRow): MyVote => ({
  voteId: row.voteId,
  office: { id: row.office.id, name: row.office.name, type: row.office.type },
  candidate: {
    id: row.candidate.id,
    name: fullName(row.candidate),
    partyName: row.candidate.partyName,
  },
  createdAt: row.createdAt.toISOString(),
});
