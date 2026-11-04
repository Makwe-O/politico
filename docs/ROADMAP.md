# Roadmap

Start with the simplest thing that works, then add one capability (and one agentic lesson) per phase.

## Phase 0: Walking skeleton ✅

- [x] pnpm monorepo: `apps/api`, `apps/web`, `packages/shared`
- [x] Fastify API with `/api/v1/health`, error envelope, PGlite + Drizzle migrations
- [x] Vite + React page that calls the API
- [x] ESLint, Prettier, Vitest, GitHub Actions CI
- [x] CLAUDE.md as the project's working agreement

## Phase 1: MVP, the core election loop

- [x] Sign up / log in / log out (JWT in an httpOnly cookie), roles `admin` and `voter`
- [ ] Admin: create, edit and delete political parties
- [ ] Admin: create political offices (federal / legislative / state / local)
- [ ] Admin: register a user as a party's candidate for an office
- [ ] Voter: one vote per office (enforced by the DB), clear error on a second attempt
- [ ] Public results per office
- [ ] Profile: offices I voted in and for whom
- [ ] Seeded demo data on first boot

## Phase 2: Hardening

- [ ] Election cycles (open/closed); `cycle_id` becomes part of the one-vote key
- [ ] Party archive instead of hard delete; edit offices
- [ ] OpenAPI docs via `@fastify/swagger` (the Zod schemas already describe every route)
- [ ] Playwright E2E for the vote flow
- [ ] Optimistic vote UI with rollback
- [ ] Vote receipt (hash of vote id + timestamp + server secret)
- [ ] Short-lived access token + rotating refresh token
- [ ] Password reset (optional feature from the original spec)

## Phase 3: First AI feature, manifesto Q&A

- [ ] Candidates author manifestos (markdown) with revision history
- [ ] "Ask about this candidate": pass the manifesto as a document block with Claude citations enabled; every answer quotes its source
- [ ] No vector DB yet. Manifestos fit in context. Only add retrieval once they don't

## Phase 4: Agent patterns

- [ ] Moderation for comments/petitions: **routing** (classify → allow / hold for review / block) + human review queue
- [ ] Stance comparison matrix: **parallelization** (one call per policy category) + structured outputs, citations required
- [ ] Petition analyzer: **prompt chaining** (extract claims → assess evidence → rank urgency); a triage aid for officers, never a verdict
- [ ] "Ask Politico": a real **agent** using the Tool Runner, with tools built from the shared Zod schemas (`listOffices`, `getCandidates`, `searchManifestos`, `getResults`)
- [ ] pgvector retrieval once the manifesto corpus outgrows the context window
- [ ] Evals for each AI feature before tuning prompts

## Phase 5: Integrity & scale

- [ ] Split votes into `participation(voter, office, cycle)` + anonymous hash-chained `ballots` (fixes ballot secrecy)
- [ ] Public verification portal for receipts and chain continuity
- [ ] Live results (SSE first, WebSockets if needed)
- [ ] Roles: super admin / electoral officer / candidate / voter; TOTP MFA for privileged roles
- [ ] Real Postgres + Docker Compose, Redis cache, deploy

## Explicitly out of scope (for now)

Multi-region DR, 99.99% SLOs, 10k concurrent sockets, national ID validation, and "zero-knowledge" anything. These are real-world requirements, but not for a portfolio project.
