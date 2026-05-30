# ZeroContext

> **Your AI tools waste tokens on rules you don't need right now. ZeroContext only injects what matches the file you're editing.**

`CLAUDE.md` and `.cursorrules` load *everything you've ever written* into every
session — burning tokens on rules that have nothing to do with the file in front of
you. ZeroContext is a local MCP daemon that inspects your project and streams only the
rules that match the active stack. Less context, lower cost, better answers, and zero
config files cluttering your repo.

```bash
npx zerocontext init     # writes MCP config pointing to the local daemon
npx zerocontext start    # daemon: inspects your project, serves context over MCP
```

> 📉 **Saved 73% of system-prompt tokens on a typical Cursor session.**
> Same project. Same task. Better answers. *(benchmark in progress — see below)*

## `CLAUDE.md` vs. ZeroContext

| | `CLAUDE.md` / `.cursorrules` | ZeroContext |
|---|---|---|
| Context loaded per session | Everything you've ever written | Only what matches the active file type |
| Tokens spent on irrelevant rules | ~2–8k per session | ~0 |
| Cost on the Claude API at scale | Real money | Less real money |
| Files in your repo | One per AI tool | Zero (or one pointer file for monorepos) |

## How it works (3 sentences)

ZeroContext runs as a local MCP server that your IDE connects to. When a session
starts, it inspects the working directory, detects the stack from project signals, and
resolves the matching rule set. It then streams only those rules to the AI — nothing
else lands in the context window.

## Supported stacks

Start narrow. Detection is by project signal:

| Signal | Rules injected |
|---|---|
| `package.json` + `tsconfig.json` | TypeScript + React / Node |
| `Cargo.toml` | Rust |
| `pyproject.toml` | Python (FastAPI variant if `fastapi` in deps) |
| `pnpm-workspace.yaml` / `nx.json` | Monorepo routing |
| `.zerocontext.yaml` | Manual override (pointers only, never rules) |

More stacks land as PRs come in — they aren't curated up front.

## Launch rule sets

Five hand-crafted sets ship at launch:

1. React + TypeScript
2. Next.js
3. FastAPI
4. Rust
5. Node + Postgres + Drizzle

## Monorepo override

When autodetection isn't enough, a single repo-root pointer file resolves rule sets.
It holds **pointers only, never inline rules** — the one allowed footprint in your repo:

```yaml
# .zerocontext.yaml
workspaces:
  frontend/: "@team/react-rules@v2"
  api/: "@team/fastapi-rules@v1.3"
```

## How is this different?

- **vs. `awesome-cursorrules`** — that's a rules *library*; this is a *runtime* that
  picks and injects them for you.
- **vs. native Cursor / Claude rules** — those are static and always-on; this is
  per-file dynamic.
- **Why not just use `CLAUDE.md`?** — the token-cost difference. See the table above.

## Status

Pre-launch, solo OSS. The current gate is the **Phase 0 prototype**: can an MCP server
detect a file-switch event in Cursor / Claude Code and refresh injected context
*without* an IDE extension?

- **Yes** → full per-file dynamic injection.
- **No** → v1 ships session-start injection, marketed honestly; file-switch is v2.
- **Partial** → explicit per-IDE behavior in the docs.

Nothing else gets built until that question is answered. See
[`ZeroContext_Plan_v3.md`](./ZeroContext_Plan_v3.md) for the full builder plan; earlier
enterprise-framed iterations live in [`Archive/`](./Archive).

## License

MIT (intended) — this is an open-source tool that scratches a real itch.
