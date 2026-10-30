import type {
  CastVoteBody,
  Candidate,
  CreateOfficeBody,
  CreatePartyBody,
  Health,
  LoginBody,
  Message,
  MyVote,
  Office,
  OfficeResult,
  Party,
  RegisterCandidateBody,
  SignupBody,
  UpdatePartyBody,
  User,
  Vote,
} from '@politico/shared';
import { ApiError, api } from '../api';

/** Single-item endpoints still return `data: [item]`. Unwrap it, failing loudly if it's empty. */
async function one<T>(request: Promise<T[]>): Promise<T> {
  const [item] = await request;
  if (item === undefined) throw new ApiError(500, 'Empty response from the server');
  return item;
}

const send = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

// ---------- Auth ----------

export const signup = (body: SignupBody) => one(api<User>('/auth/signup', send('POST', body)));
export const login = (body: LoginBody) => one(api<User>('/auth/login', send('POST', body)));
export const logout = () => one(api<Message>('/auth/logout', send('POST')));
export const getMe = () => one(api<User>('/auth/me'));

// ---------- Users ----------

export const listUsers = () => api<User>('/users');

// ---------- Parties ----------

export const listParties = () => api<Party>('/parties');
export const getParty = (id: number) => one(api<Party>(`/parties/${id}`));
export const createParty = (body: CreatePartyBody) =>
  one(api<Party>('/parties', send('POST', body)));
export const updateParty = (id: number, body: UpdatePartyBody) =>
  one(api<Party>(`/parties/${id}`, send('PATCH', body)));
export const deleteParty = (id: number) => one(api<Message>(`/parties/${id}`, send('DELETE')));

// ---------- Offices ----------

export const listOffices = () => api<Office>('/offices');
export const getOffice = (id: number) => one(api<Office>(`/offices/${id}`));
export const createOffice = (body: CreateOfficeBody) =>
  one(api<Office>('/offices', send('POST', body)));
export const listCandidates = (officeId: number) =>
  api<Candidate>(`/offices/${officeId}/candidates`);
export const registerCandidate = (officeId: number, body: RegisterCandidateBody) =>
  one(api<Candidate>(`/offices/${officeId}/candidates`, send('POST', body)));
export const getResults = (officeId: number) => api<OfficeResult>(`/offices/${officeId}/results`);

// ---------- Votes ----------

export const castVote = (body: CastVoteBody) => one(api<Vote>('/votes', send('POST', body)));
export const listMyVotes = () => api<MyVote>('/me/votes');

// ---------- Health ----------

export const getHealth = () => one(api<Health>('/health'));
