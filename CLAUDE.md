# CLAUDE.md

Guidance for Claude Code (and any AI agent) working in this repository.

## What ZeroContext is

ZeroContext is a **local MCP daemon** that injects only the rules matching the file/stack
you're currently editing — instead of loading an entire `CLAUDE.md` / `.cursorrules`
into every AI session. Less context in the window means lower token cost, lower API
spend, and better-targeted answers, with zero config files cluttering the repo.

The one-line pitch:

> Your AI tools waste tokens on rules you don't need right now. ZeroContext only injects
> what matches the file you're editing.

The headline metric is **token savings vs. `CLAUDE.md`** — measured on real projects,
same task, same model, only the context source changes.

## How it works

1. Your IDE (Claude Code first; Cursor/Windsurf later) connects to ZeroContext as a
   local MCP server.
2. On session start, the daemon inspects the working directory and detects the stack
   from project signals.
3. It resolves the matching rule set and streams **only those rules** to the AI.

CLI surface:

```bash
npx zerocontext init     # writes MCP config pointing at the local daemon
npx zerocontext start    # daemon: inspects the project, serves context over MCP
```

## Stack autodetection (start narrow — do not over-build)

| Signal | Rules injected |
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

## Hard constraints — read before building

- **Phase 0 prototype gate first.** Before writing real product code, resolve: *can an
  MCP server refresh context on a file-switch without an IDE extension?* If no, ship
  session-boundary (session-start) injection only and say so honestly. **Never market
  file-switch behavior that wasn't built.**
- **No enterprise scope.** Cryptographic signing, KMS/HSM, SOC2 audit schemas,
  Sigma/EDR detection signatures, and token revocation are **explicitly parked** in the
  governing plan. Do not build them. They re-enter only with real traction + inbound
  demand.
- **Zero repo footprint**, with the single exception of an optional `.zerocontext.yaml`
  pointer file (pointers only, never inline rules).
- **Instrument token savings from day one** so the README benchmark is a real query, not
  a guess. No invented numbers — the 73% figure in the README is a target to measure.
- **Lead with the value, never the negative** in any user-facing copy: "per-file AI
  context injection over MCP," not "no more dotfiles."

## Mental model

This is a solo open-source tool that scratches a real itch — not a startup. The bar for
"this worked" is ~500 stars in 90 days, 50+ weekly users, and a couple of PRs from
strangers. Stars come from packaging (a magical demo GIF + a concrete number), not
architecture. Ship the smallest thing that kills the dotfile pain, use it on real
projects, measure, then package.

## Repo layout

- `README.md` — the public, launch-facing pitch.
- `Archive/` — planning docs and prior iterations (git-ignored, local reference only).
  - **`Archive/ZeroContext_Plan_v3.md` is the governing plan (Builder Edition).** Read
    it for full Phase 0–2 detail, distribution sequence, star math, and failure modes.
  - Earlier enterprise-framed iterations (`ZeroContext_Final_Plan.md`, etc.) are
    superseded — do not build from them.

## Working notes for agents

- `.claude/` (git-ignored) holds project agents and skills aligned to this plan:
  `mcp-gateway-engineer` and `launch-packager` agents; `rule-registry` and
  `token-benchmark` skills.
- When in doubt about MCP behavior, write a small spike rather than guessing — the
  Phase 0 question is empirical.
