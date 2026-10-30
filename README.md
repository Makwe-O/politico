# Politico

[![CI](https://github.com/Makwe-O/politico/actions/workflows/ci.yml/badge.svg)](https://github.com/Makwe-O/politico/actions/workflows/ci.yml)

The general elections are around corner, hence it’s a political season. Get into the mood of the
season and help build a platform which both the politicians and citizens can use.
Politico enables citizens give their mandate to politicians running for different government offices
while building trust in the process through transparency.

## Quick start

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm dev
```

Open http://localhost:5173. The database is [PGlite](https://pglite.dev) (Postgres running in-process), so there's nothing else to install. It's created and seeded on first boot. Dev-only demo logins are in `apps/api/.env.example`.

## Stack

| Layer   | Tech                                                 |
| ------- | ---------------------------------------------------- |
| Web     | Vite, React 19, React Router, TanStack Query         |
| API     | Fastify 5, Zod (shared contract), JWT cookie auth    |
| DB      | Postgres via PGlite + Drizzle ORM                    |
| Quality | TypeScript, ESLint, Prettier, Vitest, GitHub Actions |

## Docs

- [Roadmap](docs/ROADMAP.md): phases from MVP to AI features
- [API](docs/API.md): endpoints and response envelope
- [Agentic workflows log](docs/AGENTIC.md): how this is being built with (and will include) AI agents
