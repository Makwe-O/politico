import type { Candidate, MyVote, Office, OfficeResult, Party, User } from '@politico/shared';

const createdAt = '2026-10-30T12:00:00.000Z';

export const voter: User = {
  id: 2,
  firstname: 'Vera',
  lastname: 'Voter',
  email: 'voter@politico.test',
  role: 'voter',
  createdAt,
};

export const admin: User = {
  id: 1,
  firstname: 'Ada',
  lastname: 'Admin',
  email: 'admin@politico.test',
  role: 'admin',
  createdAt,
};

export const greens: Party = {
  id: 10,
  name: 'Green Party',
  hqAddress: '1 Leaf Lane, Lagos',
  logoUrl: null,
  createdAt,
};

export const unity: Party = {
  id: 11,
  name: 'Unity Alliance',
  hqAddress: '9 Bridge Road, Abuja',
  logoUrl: 'https://example.test/unity.png',
  createdAt,
};

export const president: Office = { id: 5, type: 'federal', name: 'President', createdAt };
export const senate: Office = {
  id: 6,
  type: 'legislative',
  name: 'Senate (Lagos West)',
  createdAt,
};
export const governor: Office = { id: 7, type: 'state', name: 'Governor of Lagos', createdAt };

export const jane: Candidate = {
  id: 100,
  officeId: president.id,
  user: { id: 20, firstname: 'Jane', lastname: 'Doe' },
  party: { id: greens.id, name: greens.name, logoUrl: greens.logoUrl },
  createdAt,
};

export const john: Candidate = {
  id: 101,
  officeId: president.id,
  user: { id: 21, firstname: 'John', lastname: 'Roe' },
  party: { id: unity.id, name: unity.name, logoUrl: unity.logoUrl },
  createdAt,
};

export const resultsFor = (janeVotes: number, johnVotes: number): OfficeResult[] =>
  [
    {
      officeId: president.id,
      candidateId: jane.id,
      candidateName: 'Jane Doe',
      partyName: greens.name,
      votes: janeVotes,
    },
    {
      officeId: president.id,
      candidateId: john.id,
      candidateName: 'John Roe',
      partyName: unity.name,
      votes: johnVotes,
    },
  ].sort((a, b) => b.votes - a.votes);

export const myVoteForJane: MyVote = {
  voteId: 1000,
  office: { id: president.id, name: president.name, type: president.type },
  candidate: { id: jane.id, name: 'Jane Doe', partyName: greens.name },
  createdAt,
};
