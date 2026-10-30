import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api';

/** 4xx answers won't change on retry. Network blips and 5xx get two more attempts. */
function shouldRetry(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 2;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000 },
    },
  });
}
