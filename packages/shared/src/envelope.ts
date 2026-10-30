import { z } from 'zod';

/**
 * Every API response uses this envelope (carried over from the original Politico spec).
 * `data` is always an array, even for a single item.
 */
export interface ApiSuccess<T> {
  status: number;
  data: T[];
}

export interface ApiFailure {
  status: number;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export const API_PREFIX = '/api/v1';

/** Response schema for routes: `response: { 200: successEnvelope(Party) }`. */
export const successEnvelope = <T extends z.ZodType>(item: T) =>
  z.object({ status: z.number().int(), data: z.array(item) });
