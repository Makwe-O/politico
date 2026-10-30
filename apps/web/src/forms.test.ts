import { describe, expect, it } from 'vitest';
import { UpdatePartyBody, SignupBody } from '@politico/shared';
import { FORM_ERROR, blankToUndefined, fieldErrors, safeNext } from './forms';
import { initials } from './format';

describe('safeNext', () => {
  it.each([
    ['/profile', '/profile'],
    ['/offices/5?tab=results#top', '/offices/5?tab=results#top'],
    [null, '/'],
    ['', '/'],
    ['profile', '/'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['https://evil.example/', '/'],
    ['javascript:alert(1)', '/'],
  ])('%s → %s', (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});

describe('fieldErrors', () => {
  it('keeps the first message per field', () => {
    const result = SignupBody.safeParse({
      firstname: '',
      lastname: 'x',
      email: 'no',
      password: '',
    });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!)).toEqual({
      firstname: 'Required',
      email: 'Enter a valid email address',
      password: 'Password must be at least 8 characters',
    });
  });

  it('puts whole-body refinements under FORM_ERROR', () => {
    const result = UpdatePartyBody.safeParse({});
    expect(fieldErrors(result.error!)).toEqual({ [FORM_ERROR]: 'Provide at least one field' });
  });
});

describe('helpers', () => {
  it('blankToUndefined trims and drops blanks', () => {
    expect(blankToUndefined('  ')).toBeUndefined();
    expect(blankToUndefined(' https://x.test ')).toBe('https://x.test');
  });

  it('initials uses the first two words', () => {
    expect(initials('Green Party')).toBe('GP');
    expect(initials('all progressives congress')).toBe('AP');
    expect(initials('(Independent)')).toBe('I');
    expect(initials('')).toBe('?');
  });
});
