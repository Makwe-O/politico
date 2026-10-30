# Agentic workflows log

This project is also a way to learn agentic workflows from two angles:

1. **Building with agents:** using Claude Code to plan, parallelize and review the work.
2. **Building agents into the app:** Claude API features inside Politico (Phase 3+).

Each entry records the pattern, why it was used, and what actually happened.

---

## Phase 0: CLAUDE.md + plan mode

**Pattern.** Before any code, plan mode produced a phased plan and the open questions (DB choice, git identity, repo visibility) were asked up front. `CLAUDE.md` then captures the decisions an agent would otherwise have to rediscover every session: commands, layout, conventions, and the definition of done.

**Why.** Agents start every session with no memory. `CLAUDE.md` is loaded automatically, so it acts as the project's long-term memory and working agreement. Keep it short and factual. If a rule keeps getting violated, it belongs here.

**Lesson.** The plan surfaced decisions the specs never mentioned: no Docker on the machine (so PGlite), a work vs personal GitHub account, and ballot secrecy conflicting with "show who I voted for". A cheap planning pass is where those get caught.

---

## Phase 1: Contract-first, then parallel subagents in worktrees

**Pattern.**

1. I wrote the contract myself in one commit:
   - Zod schemas in `packages/shared`
   - the endpoint table in `docs/API.md`
   - the DB schema and the security-sensitive auth core (`lib/auth.ts`)
2. Two subagents then ran **in parallel, each in its own git worktree**: an API agent and a web agent. Each had a self-contained brief: read these files, touch only `apps/api/**` or `apps/web/**`, add no dependencies, report contract problems instead of fixing them.
3. I merged both branches, ran everything end to end in the browser, then ran `/code-review` on the full diff.

**What worked**

- **Zero merge conflicts.** Scope fences (separate directories, all dependencies pre-installed, the shared contract read-only) made the two branches disjoint by construction.
- **Response schemas as a contract tripwire.** Every route declares `response: successEnvelope(X)`, so if the API returns the wrong shape, the tests get a 500. The web agent never saw the real API and still integrated first time.
- **The agents found real bugs in my code.** The API agent saw that Postgres raises `23001`, not `23503`, for `ON DELETE RESTRICT`, so "delete a party with candidates" was a 500. It also flagged that the JWT role was trusted without a DB check. Asking agents to report "Contract issues" instead of silently working around them paid off.
- **Agents verified their own work.** Both ran the full gate, and both did a browser or HTTP smoke test on a non-default port.

**What broke**

- **Worktrees branch from the default branch, not from my current branch.** The web agent's worktree started on `main` (without the contract commit). It noticed and branched from the contract commit explicitly. Next time, put the base commit in the brief, or push the contract to the default branch first.
- **Unit tests didn't catch a real-browser race.** Logging out from `/admin` landed on `/login?next=/admin`, because the route guard redirected before the header's navigation. It passed in jsdom and failed in Chrome. A manual end-to-end pass is not optional, and Playwright (Phase 2) will make it repeatable.
- **Dev tooling bit harder than the app code.**
  - A leftover server from an earlier smoke test held port 3001.
  - The web port (5173) was taken by another project.
  - `tsx watch` spawned **several overlapping API processes** from one file save. They all opened the same PGlite directory, which can corrupt it.
  - Fixes: a strict web port (5180), an exclusive lock file on the PGlite data dir (`openDb`), fast idempotent shutdown, and `node --watch`, which waits for the old process to exit.
- **CI went red on the first push** because I wrote docs after running Prettier. A formatting hook (Phase 2) would have caught it.

**Review.** `/code-review` on the merged diff found 10 issues. Six were fixed in the PR:

- demo seed running in production
- the example JWT secret accepted in production
- `javascript:` logo URLs accepted
- case-sensitive name uniqueness
- email trimming
- roadmap hygiene

The rest went onto the Phase 2 list with reasons. Reviewing the _merged_ result matters because neither agent could see the other's half.

**Rule of thumb.** Parallelize only after the contract is frozen. The human (or lead agent) owns the contract, the security core and integration; subagents own well-fenced implementation slices.

---

## Building agents: the pattern ladder (reference)

Use the simplest rung that works:

| Rung            | What it is                                     | Politico feature                       |
| --------------- | ---------------------------------------------- | -------------------------------------- |
| Single call     | One prompt, one answer                         | Manifesto Q&A with citations (Phase 3) |
| Routing         | Classify, then send to a handler               | Moderation (Phase 4)                   |
| Parallelization | Fan out independent calls, merge               | Stance matrix per category (Phase 4)   |
| Prompt chaining | Fixed sequence of steps, each feeding the next | Petition analyzer (Phase 4)            |
| Agent           | Model picks tools in a loop until done         | "Ask Politico" (Phase 4)               |

Workflows (rungs 1 to 4) are code-controlled and predictable. Agents trade predictability for flexibility, so reach for one only when the steps genuinely can't be known in advance.
