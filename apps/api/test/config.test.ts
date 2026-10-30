import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

const EXAMPLE_SECRET = 'dev-only-change-me-politico-jwt-secret';

describe('loadConfig', () => {
  it('accepts the .env.example JWT secret in development', () => {
    expect(loadConfig({ NODE_ENV: 'development', JWT_SECRET: EXAMPLE_SECRET }).JWT_SECRET).toBe(
      EXAMPLE_SECRET,
    );
  });

  it('refuses the .env.example JWT secret in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', JWT_SECRET: EXAMPLE_SECRET })).toThrow(
      /JWT_SECRET is still the .env.example value/,
    );
  });

  it('accepts a real secret in production', () => {
    const secret = 'a-real-production-secret-value';
    expect(loadConfig({ NODE_ENV: 'production', JWT_SECRET: secret }).JWT_SECRET).toBe(secret);
  });
});
