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

## Building agents: the pattern ladder (reference)

Use the simplest rung that works:

| Rung | What it is | Politico feature |
|---|---|---|
| Single call | One prompt, one answer | Manifesto Q&A with citations (Phase 3) |
| Routing | Classify, then send to a handler | Moderation (Phase 4) |
| Parallelization | Fan out independent calls, merge | Stance matrix per category (Phase 4) |
| Prompt chaining | Fixed sequence of steps, each feeding the next | Petition analyzer (Phase 4) |
| Agent | Model picks tools in a loop until done | "Ask Politico" (Phase 4) |

Workflows (rungs 1 to 4) are code-controlled and predictable. Agents trade predictability for flexibility, so reach for one only when the steps genuinely can't be known in advance.
