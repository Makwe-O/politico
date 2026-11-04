import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@politico/shared';
import { authApi } from './api';

const ME = ['auth', 'me'] as const;

/** `data` is the logged-in user, `null` when logged out, `undefined` while loading. */
export function useCurrentUser() {
  return useQuery({ queryKey: ME, queryFn: authApi.me, staleTime: Infinity });
}

function useSetCurrentUser() {
  const queryClient = useQueryClient();
  return (user: User | null) => queryClient.setQueryData(ME, user);
}

export function useLogin() {
  const setUser = useSetCurrentUser();
  return useMutation({ mutationFn: authApi.login, onSuccess: setUser });
}

export function useSignup() {
  const setUser = useSetCurrentUser();
  return useMutation({ mutationFn: authApi.signup, onSuccess: setUser });
}

export function useLogout() {
  const setUser = useSetCurrentUser();
  return useMutation({ mutationFn: authApi.logout, onSuccess: () => setUser(null) });
}
