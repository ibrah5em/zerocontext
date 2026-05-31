# CLAUDE.md

Guidance for Claude Code (and any AI agent) working in this repository.

## What ZeroContext is

ZeroContext is a **local MCP server** that serves only the rules matching the
file/stack you're working on right now — instead of front-loading an entire
`CLAUDE.md` / `.cursorrules` into every AI session. Less context in the window means
lower token cost, lower API spend, and better-targeted answers, with zero config files
cluttering the repo.

The one-line pitch:

> Your AI tools waste tokens on rules you don't need right now. ZeroContext serves only
> the rules that match the code you're working on.

The headline metric is **rule tokens resident in the window vs. `CLAUDE.md`** — how much
rule context you keep *out* of every message by serving only the matching slice. This is
a scoping number, **not** a session-cost claim: the Phase 0 A/B found just-in-time ran
cost-neutral-to-higher end to end (a preloaded `CLAUDE.md` is prompt-cached and every turn
re-reads the whole window), so never market dollar/token savings. The pitch is relevance
and a leaner window. See [[token-savings-economics]] and [[phase0-finding]] in memory.

## How it works

ZeroContext is **agent-pulled, just-in-time** — not a reactive editor hook. The agent
fetches the rules it needs when it needs them; nothing else lands in the window.

1. Your AI tool (Claude Code first; Cursor/Windsurf later) connects to ZeroContext as a
   **local MCP server** — spawned per session as a stdio subprocess by the client. There
   is no long-running daemon to manage.
2. On startup it inspects the working directory and detects the stack from project
   signals.
3. It exposes a `get_rules` MCP tool. When the agent starts working on a file or task,
   it calls the tool and gets back **only the matching rule slice** — not the whole
   rule file. A one-line pointer (in `CLAUDE.md` or the server's MCP `instructions`)
   tells the agent to fetch rules before editing.

> **Why agent-pulled and not reactive file-switch?** Claude Code is a terminal agent —
> it has no "current file" cursor and receives no file-switch event an MCP server could
> react to. MCP servers are *pulled* by the client. So the honest, buildable mechanism
> is just-in-time fetch (+ optional session-start injection), and that is exactly what
> we ship and market. See the Phase 0 gate below.

CLI surface:

```bash
npx zerocontext init      # writes MCP config pointing at the local server
npx zerocontext serve     # stdio MCP server: inspects the project, serves matching rules on request
npx zerocontext analyze   # prints what your CLAUDE.md/.cursorrules costs in tokens per message
```

`analyze` is the shareable front door: it runs on *anyone's* repo and prints a concrete
"your rules cost N tokens on every message" number. That number is the wedge — build it
early and keep it honest.

## Stack autodetection (start narrow — do not over-build)

| Signal | Rules served |
|---|---|
| `package.json` + `tsconfig.json` | TypeScript + React / Node |
| `Cargo.toml` | Rust |
| `pyproject.toml` | Python (FastAPI variant if `fastapi` in deps) |
| `pnpm-workspace.yaml` / `nx.json` | Monorepo routing |
| `.zerocontext.yaml` | Manual override (pointers only, never rules) |

Skip every other stack. Add more only when there's real need or a PR brings it.

## Launch rule sets (only these five)

React + TypeScript · Next.js · FastAPI · Rust · Node + Postgres + Drizzle. Keep sets
small and file-relevant — the whole premise is *less* context, not more. More arrive via
PRs after launch; don't curate stacks you don't write.

**Phase 1 builds the FastAPI (Python) set first** — it's the daily-driver stack to
dogfood on (detected via `pyproject.toml` + a `fastapi` dep). The other four follow once
the injection path is proven on real usage.

## Hard constraints — read before building

- **Phase 0 prototype gate first.** Before writing real product code, resolve
  empirically: *does the agent actually call a `get_rules` tool mid-task, and how many
  tokens does that save vs. a preloaded `CLAUDE.md`?* Confirm the mechanism with a
  logging-server spike (see the `mcp-probe` skill) before any product code or marketing
  copy. **Never market reactive file-switch behavior — it isn't built and isn't
  available without an IDE extension.**
- **No enterprise scope.** Cryptographic signing, KMS/HSM, SOC2 audit schemas,
  Sigma/EDR detection signatures, and token revocation are **explicitly parked** in the
  governing plan. Do not build them. They re-enter only with real traction + inbound
  demand.
- **Zero repo footprint**, with the single exception of an optional `.zerocontext.yaml`
  pointer file (pointers only, never inline rules).
- **Instrument the resident-token metric from day one** so the README number is a real
  `analyze` query, not a guess. No invented numbers, and **no dollar/token savings claim** —
  the Phase 0 A/B settled that JIT is cost-neutral-to-higher in a multi-turn session. Report
  "fewer rule tokens resident in the window," never "N% cheaper."
- **Lead with the value, never the negative** in any user-facing copy: "just-in-time,
  per-file AI context over MCP," not "no more dotfiles."

## Mental model

This is a solo open-source tool that scratches a real itch — not a startup. The bar for
"this worked" is ~500 stars in 90 days, 50+ weekly users, and a couple of PRs from
strangers. Stars come from packaging (a magical demo + a concrete number), not
architecture. Ship the smallest thing that kills the dotfile pain, use it on real
projects, measure, then package.

## Repo layout

- `README.md` — the public, launch-facing pitch.
- `Archive/` — planning docs and prior iterations (git-ignored, local reference only).
  - **`Archive/ZeroContext_Plan_v3.md` is the governing plan (Builder Edition).** Read
    it for full Phase 0–2 detail, distribution sequence, star math, and failure modes.
    Note: the plan's "reactive file-switch" question is resolved in this repo as
    agent-pulled JIT (above) — when they conflict, this CLAUDE.md wins.
  - Earlier enterprise-framed iterations (`ZeroContext_Final_Plan.md`, etc.) are
    superseded — do not build from them.

## Working notes for agents

- `.claude/` (git-ignored) holds project agents and skills aligned to this plan:
  - **Agents:** `mcp-gateway-engineer` (the MCP server, CLI, autodetection, injection
    path) and `launch-packager` (README, demo, positioning, distribution).
  - **Skills:** `rule-registry` (authoring/validating rule sets), `token-benchmark` (the
    headline number + `analyze`), and `mcp-probe` (the Phase 0 logging-server spike).
- When in doubt about MCP behavior, write a small spike rather than guessing — the
  Phase 0 question is empirical. Use the `mcp-probe` skill.
