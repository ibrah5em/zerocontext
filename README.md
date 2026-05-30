# ZeroContext

> **Your AI tools waste tokens on rules you don't need right now. ZeroContext serves only the rules that match the code you're working on.**

`CLAUDE.md` and `.cursorrules` load *everything you've ever written* into every
message — burning tokens on rules that have nothing to do with the code in front of
you. ZeroContext is a local MCP server that inspects your project and hands the agent
**only the rules it asks for, when it asks** — just-in-time, per file and stack. Less
context, lower cost, better-targeted answers, and zero config files cluttering your repo.

```bash
npx zerocontext init      # writes MCP config pointing at the local server
npx zerocontext serve     # stdio MCP server: inspects your project, serves matching rules on request
npx zerocontext analyze   # see what your CLAUDE.md / .cursorrules costs you per message
```

> 📉 **This repo's own `CLAUDE.md` costs 1,563 tokens on every message — a projected 78% fewer with just-in-time rules.**
> Measured by `analyze` (o200k estimate; run it yourself below). The live same-task A/B benchmark lands here before launch.

## See your own cost in 5 seconds

Before installing anything, run `analyze` on any repo with a `CLAUDE.md` or
`.cursorrules`:

```text
$ npx zerocontext analyze
ZeroContext analyze — token cost of your AI rules
Tokenizer: o200k_base (gpt-tokenizer) — proxy for Claude, ~±10–15% vs. Claude's exact count

CLAUDE.md
  1,563 tokens  ·  6,212 chars  ·  9 sections (avg 174 tok/section)
  → added to every message you send your AI tool.

  Projected with ZeroContext (just-in-time, 1 slice/task):
    fixed overhead     135 tok   (MCP instructions + get_rules schema, measured)
    + tool call(s)      40 tok   (assumption: agent writes 1 call)
    + rule slice(s)    174 tok   (your avg section size)
    = 349 tok/task   vs   1,563 tok/message preloaded

  Projected savings: 78%  (1,214 tok/message)
  Break-even: JIT wins once rules exceed ~349 tok. Yours: 1,563 ✓
```

That's a real run on this repo — your numbers will differ, and bigger or polyglot rule
files save more. The percentage is the headline (tokenizer-robust); the absolute count is
a labeled estimate. If your rules fall below the break-even, `analyze` says so instead of
inflating the number.

## `CLAUDE.md` vs. ZeroContext

| | `CLAUDE.md` / `.cursorrules` | ZeroContext |
|---|---|---|
| When rules load | Front-loaded into every message | Pulled by the agent, only when it needs them |
| What loads | Everything you've ever written | Only the slice matching the active file / stack |
| Tokens spent on irrelevant rules | ~2–8k per message | ~0 |
| Cost on the Claude API at scale | Real money | Less real money |
| Files in your repo | One per AI tool | Zero (or one pointer file for monorepos) |

## How it works (3 sentences)

ZeroContext runs as a local MCP server that your AI tool spawns per session. It inspects
the working directory, detects the stack from project signals, and exposes a `get_rules`
tool. When the agent starts working on a file or task it calls that tool and gets back
only the matching rule slice — nothing else lands in the context window.

**It's agent-pulled, not a reactive editor hook.** Claude Code is a terminal agent with
no "current file" event for a server to chase, so ZeroContext serves rules *just in
time* when the agent asks — the honest mechanism that actually works today, no IDE
extension required.

## Supported stacks

Start narrow. Detection is by project signal:

| Signal | Rules served |
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
  picks the right slice and serves it to the agent on demand.
- **vs. native Cursor / Claude rules** — those are static and front-loaded; ZeroContext
  is just-in-time, so the tokens only land when a rule is actually relevant.
- **Why not just use `CLAUDE.md`?** — the per-message token cost. Run `analyze` and see
  it for yourself.

## Status

Pre-launch, solo OSS. The current gate is the **Phase 0 prototype**: confirm
empirically that the agent calls the `get_rules` tool mid-task, and measure how many
tokens that saves vs. a preloaded `CLAUDE.md`. The mechanism we build and market is
**agent-pulled, just-in-time** injection (plus optional session-start) — reactive
file-switch is *not* promised, because it isn't available to a terminal agent without an
IDE extension.

Nothing user-facing claims behavior that isn't built. See
[`ZeroContext_Plan_v3.md`](./ZeroContext_Plan_v3.md) for the full builder plan; earlier
enterprise-framed iterations live in [`Archive/`](./Archive).

## License

MIT (intended) — this is an open-source tool that scratches a real itch.
