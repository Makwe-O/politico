import type { z } from 'zod';

/** Key for errors that don't belong to a single field (e.g. a `.refine()` on the whole body). */
export const FORM_ERROR = '_form';

export type FieldErrors<T> = Partial<Record<Extract<keyof T, string> | typeof FORM_ERROR, string>>;

/**
 * First Zod message per top-level field, for showing next to inputs.
 * `overrides` swaps Zod's generic message for a friendlier one (e.g. "Select a party").
 */
export function fieldErrors<T>(
  error: z.ZodError<T>,
  overrides: Partial<Record<Extract<keyof T, string>, string>> = {},
): FieldErrors<T> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : FORM_ERROR;
    out[key] ??= (overrides as Record<string, string | undefined>)[key] ?? issue.message;
  }
  return out as FieldErrors<T>;
}

/** Blank optional inputs become `undefined`, so we never send `logoUrl: ""`. */
export function blankToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** `<select>` value → id, or `undefined` while nothing is selected. */
export const toId = (value: string): number | undefined =>
  value === '' ? undefined : Number(value);

/**
 * Sanitises `?next=` so login can't be turned into an open redirect.
 * Only same-origin, root-relative paths survive (`//evil.com`, `/\evil.com`, `https://…` don't).
 */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/')) return '/';
  try {
    const url = new URL(next, window.location.origin);
    if (url.origin !== window.location.origin) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}
