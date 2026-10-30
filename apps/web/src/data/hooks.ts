import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  CastVoteBody,
  CreateOfficeBody,
  CreatePartyBody,
  LoginBody,
  RegisterCandidateBody,
  SignupBody,
  UpdatePartyBody,
  User,
} from '@politico/shared';
import { ApiError } from '../api';
import * as endpoints from './endpoints';

/**
 * Query keys. Top-level segments are kept distinct so invalidation can be targeted:
 * `['candidates']` hits every office's candidate list without touching the office queries.
 */
export const queryKeys = {
  me: ['me'] as const,
  myVotes: ['my-votes'] as const,
  users: ['users'] as const,
  parties: ['parties'] as const,
  party: (id: number) => ['parties', id] as const,
  offices: ['offices'] as const,
  office: (id: number) => ['offices', id] as const,
  allCandidates: ['candidates'] as const,
  candidates: (officeId: number) => ['candidates', officeId] as const,
  allResults: ['results'] as const,
  results: (officeId: number) => ['results', officeId] as const,
};

/** Queries whose data belongs to whoever is logged in. Dropped whenever the session changes. */
const userScopedKeys = [queryKeys.myVotes, queryKeys.users];

export const RESULTS_REFRESH_MS = 10_000;

function resetUserScoped(qc: QueryClient) {
  for (const queryKey of userScopedKeys) qc.removeQueries({ queryKey });
}

// ---------- Auth ----------

/** The current user, or `null` when logged out. A 401 is the logged-out state, not an error. */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async (): Promise<User | null> => {
      try {
        return await endpoints.getMe();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: 5 * 60_000,
  });
}

/** Sets `me` directly. An in-flight `/auth/me` (e.g. a 401 from before login) is cancelled first. */
async function setSession(qc: QueryClient, user: User | null) {
  await qc.cancelQueries({ queryKey: queryKeys.me });
  resetUserScoped(qc);
  qc.setQueryData(queryKeys.me, user);
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginBody) => endpoints.login(body),
    onSuccess: (user) => setSession(qc, user),
  });
}

export function useSignup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SignupBody) => endpoints.signup(body),
    onSuccess: (user) => setSession(qc, user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => endpoints.logout(),
    onSuccess: () => setSession(qc, null),
  });
}

// ---------- Users ----------

export function useUsers() {
  return useQuery({ queryKey: queryKeys.users, queryFn: endpoints.listUsers });
}

// ---------- Parties ----------

export function useParties() {
  return useQuery({ queryKey: queryKeys.parties, queryFn: endpoints.listParties });
}

export function useCreateParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePartyBody) => endpoints.createParty(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.parties }),
  });
}

export function useUpdateParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdatePartyBody }) =>
      endpoints.updateParty(id, body),
    // Party name and logo are denormalised into candidates, results and my votes.
    onSuccess: () =>
      Promise.all(
        [queryKeys.parties, queryKeys.allCandidates, queryKeys.allResults, queryKeys.myVotes].map(
          (queryKey) => qc.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

export function useDeleteParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => endpoints.deleteParty(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.parties }),
  });
}

// ---------- Offices ----------

export function useOffices() {
  return useQuery({ queryKey: queryKeys.offices, queryFn: endpoints.listOffices });
}

export function useOffice(id: number) {
  return useQuery({ queryKey: queryKeys.office(id), queryFn: () => endpoints.getOffice(id) });
}

export function useCreateOffice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOfficeBody) => endpoints.createOffice(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.offices, exact: true }),
  });
}

export function useCandidates(officeId: number) {
  return useQuery({
    queryKey: queryKeys.candidates(officeId),
    queryFn: () => endpoints.listCandidates(officeId),
  });
}

export function useRegisterCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ officeId, body }: { officeId: number; body: RegisterCandidateBody }) =>
      endpoints.registerCandidate(officeId, body),
    onSuccess: (_candidate, { officeId }) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.candidates(officeId) }),
        qc.invalidateQueries({ queryKey: queryKeys.results(officeId) }),
      ]),
  });
}

export function useResults(officeId: number) {
  return useQuery({
    queryKey: queryKeys.results(officeId),
    queryFn: () => endpoints.getResults(officeId),
    refetchInterval: RESULTS_REFRESH_MS,
  });
}

// ---------- Votes ----------

export function useMyVotes({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: queryKeys.myVotes, queryFn: endpoints.listMyVotes, enabled });
}

/** Refreshes my votes and the office's results on success, and on a 409 (stale UI). */
export function useCastVote(officeId: number) {
  const qc = useQueryClient();
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.myVotes }),
      qc.invalidateQueries({ queryKey: queryKeys.results(officeId) }),
    ]);
  return useMutation({
    mutationFn: (body: CastVoteBody) => endpoints.castVote(body),
    onSuccess: refresh,
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) void refresh();
    },
  });
}
