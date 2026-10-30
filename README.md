# Politico

[![CI](https://github.com/Makwe-O/politico/actions/workflows/ci.yml/badge.svg)](https://github.com/Makwe-O/politico/actions/workflows/ci.yml)

A platform where citizens vote for politicians running for government offices, built for transparency. It started as the Andela "Politico" challenge and is being modernized with React, TypeScript, Fastify and Postgres, then AI features (manifesto Q&A, moderation, petition triage) built with Claude.

## Quick start

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm dev
```

Open http://localhost:5173. The database is [PGlite](https://pglite.dev) (Postgres running in-process), so there's nothing else to install. It's created and seeded on first boot. Dev-only demo logins are in `apps/api/.env.example`.

## Stack

| Layer | Tech |
|---|---|
| Web | Vite, React 19, React Router, TanStack Query |
| API | Fastify 5, Zod (shared contract), JWT cookie auth |
| DB | Postgres via PGlite + Drizzle ORM |
| Quality | TypeScript, ESLint, Prettier, Vitest, GitHub Actions |

## Docs

- [Roadmap](docs/ROADMAP.md): phases from MVP to AI features
- [API](docs/API.md): endpoints and response envelope
- [Agentic workflows log](docs/AGENTIC.md): how this is being built with (and will include) AI agents
