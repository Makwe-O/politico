# Politico: notes for Claude

A civic election platform. Admins (electoral body) manage parties, offices and candidates. Citizens vote once per office and everyone can see the results. It gets built in phases; see `docs/ROADMAP.md`. Agentic patterns used along the way are logged in `docs/AGENTIC.md`.

## Commands (run from the repo root)

| Command                     | What it does                                                                    |
| --------------------------- | ------------------------------------------------------------------------------- |
| `pnpm dev`                  | API on :3001 + web on :5173 (Vite proxies `/api` to the API)                    |
| `pnpm test`                 | Vitest in every package                                                         |
| `pnpm lint` / `pnpm format` | ESLint / Prettier                                                               |
| `pnpm typecheck`            | `tsc` in every package                                                          |
| `pnpm db:generate`          | Generate a SQL migration after editing `apps/api/src/db/schema.ts`              |
| `pnpm db:reset`             | Delete the local PGlite data dir (it re-migrates and re-seeds on the next boot) |

Single test file: `pnpm --filter @politico/api exec vitest run test/votes.test.ts`.

## Layout

- `packages/shared`: **the API contract.** Zod schemas + TS types imported by both apps. Change it first, then the apps.
- `apps/api`: Fastify 5 + `fastify-type-provider-zod`, Drizzle ORM on PGlite (Postgres in WASM, in-process).
  - `src/app.ts` `buildApp()` is used by the server and by tests. `src/server.ts` boots it with a persistent DB.
  - `src/db/schema.ts` is the source of truth for tables. Migrations live in `apps/api/drizzle/` and are generated, never hand-edited.
  - `src/lib/auth.ts`: JWT in an httpOnly cookie, `app.authenticate`, `requireRole()`.
  - `src/lib/http.ts`: `ok(reply, data[], status)` and `HttpError`. `src/lib/errors.ts` maps errors to the envelope.
- `apps/web`: Vite + React 19 + React Router 7 + TanStack Query. Plain CSS with variables in `src/styles.css`. `src/api.ts` is the only place that calls `fetch`.

## Conventions

- **Response envelope, always:** `{ status, data: [...] }` on success, `{ status, error }` on failure. `data` is always an array.
- Routes live under `/api/v1`. Validate request input with the Zod schemas from `@politico/shared`.
- Enforce integrity rules in the **database** (unique/FK constraints), then translate errors: unique violation → 409, missing row → 404.
- Throw `HttpError` (or `notFound()`) from handlers. Never `reply.send` a raw error.
- Never return `passwordHash`. Map rows to the shared `User` shape.
- Web: no `alert()`. Show feedback in inline banners. Pages must work on mobile widths.
- Imports: `import type` for types (`verbatimModuleSyntax` is on).

## Testing

- API: `test/helpers.ts` `makeTestApp()` gives a fresh in-memory Postgres per test file. Use `app.inject()`. Every endpoint needs a happy-path test plus its auth/validation/conflict failures.
- Web: Vitest + Testing Library. Stub `fetch`, never hit the real API.

## Definition of done

`pnpm lint && pnpm format:check && pnpm typecheck && pnpm test` is green, the feature has been checked in the browser, and `docs/ROADMAP.md` is ticked.

## Git

- Feature branches + PRs into `main`. Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- This repo uses a **repo-local** identity (`Maks_onyeka`). Don't touch the global git config.
- The GitHub remote belongs to the `Makwe-O` account. The machine's active `gh` account is a work account, so switch to `Makwe-O` (`gh auth switch -u Makwe-O`) only for GitHub operations on this repo, then switch back.
- Never commit `.env` files or API keys. Dev-only seed credentials live in `apps/api/.env.example`.
