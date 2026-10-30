import type { OfficeType } from '@politico/shared';

export const OFFICE_TYPE_LABELS: Record<OfficeType, string> = {
  federal: 'Federal',
  legislative: 'Legislative',
  state: 'State',
  local: 'Local',
};

export const fullName = (person: { firstname: string; lastname: string }) =>
  `${person.firstname} ${person.lastname}`;

/** Up to two initials from the first words of a name, e.g. "Green Party" → "GP". */
export function initials(name: string): string {
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  return (
    words
      .slice(0, 2)
      .map((word) => Array.from(word)[0]!.toUpperCase())
      .join('') || '?'
  );
}

const percentFormat = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 });
/** 0.6667 → "66.7%", 0.5 → "50%". */
export const formatPercent = (share: number) => percentFormat.format(share);

export const formatVotes = (count: number) =>
  `${count.toLocaleString('en')} ${count === 1 ? 'vote' : 'votes'}`;

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));
