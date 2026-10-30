import { z } from 'zod';

/** The value committed in .env.example. Fine locally, a forged-admin-token risk anywhere real. */
const EXAMPLE_JWT_SECRET = 'dev-only-change-me-politico-jwt-secret';

const Env = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    HOST: z.string().default('127.0.0.1'),
    DATA_DIR: z.string().default('.data/politico'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    SEED_ADMIN_EMAIL: z.string().optional(),
    SEED_ADMIN_PASSWORD: z.string().optional(),
    SEED_VOTER_EMAIL: z.string().optional(),
    SEED_VOTER_PASSWORD: z.string().optional(),
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.JWT_SECRET !== EXAMPLE_JWT_SECRET, {
    message: 'JWT_SECRET is still the .env.example value; set a real secret in production',
    path: ['JWT_SECRET'],
  });

export type Config = z.infer<typeof Env>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return Env.parse(env);
}
