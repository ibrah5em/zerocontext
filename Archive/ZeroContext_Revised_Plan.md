# ZeroContext — Revised Plan
### Goal: No dotfiles. GitHub stars. In that order.
*v2.0 · May 2026*

---

## What Changed From v1

The original plan was a company plan. This is a **builder plan**. The enterprise security layer, KMS integrations, SOC2 audit logs, and Fortune 500 pitch are parked. They can come back later if this gets traction. Right now there are two goals:

1. Never manually manage `.cursorrules`, `CLAUDE.md`, or `.windsurfrules` again
2. Build something developers star on GitHub

These goals are sequenced — the dotfiles problem is solved for yourself first, then packaged in a way that earns stars.

---

## The Problem (Kept, Sharpened)

Every AI coding tool demands its own config file cluttering the project root:

| Tool | Config File |
|---|---|
| Cursor | `.cursor/rules/` or `.cursorrules` |
| Claude Code | `.claude/` + `CLAUDE.md` |
| Windsurf | `.windsurfrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |

5 tools × 15 repos = 75 rule sets to manage, sync, and commit. This is noise that should not exist.

**The fix:** A local MCP server that auto-detects your stack and injects the right rules into any IDE at runtime. Zero files added to the repo. Works across all MCP-compatible tools.

---

## Phase 0 — Solve It For Yourself (Week 1–2)

> Build the smallest thing that kills your own dotfile problem. Nothing else.

### What to Build

A CLI that:
1. Inspects the current working directory for stack signatures (`package.json`, `Cargo.toml`, `pyproject.toml`, etc.)
2. Pulls the matching rule set from a local or remote registry
3. Serves it as an MCP server that Cursor, Claude Code, or Windsurf can connect to

```bash
npx zerocontext init   # detects stack, writes MCP config pointing to the server
npx zerocontext start  # starts the local MCP server
```

That's it. No dashboard. No auth. No cloud. Just a working tool.

### Stack Detection (Start With These)

| File Detected | Rules Injected |
|---|---|
| `package.json` + `tsconfig.json` | TypeScript + React/Node rules |
| `Cargo.toml` | Rust-specific patterns |
| `pyproject.toml` + `main.py` | FastAPI structural patterns |
| `pnpm-workspace.yaml` / `nx.json` | Monorepo mode |
| `.zerocontext.yaml` | Manual override (escape hatch for weird repos) |

### The `.zerocontext.yaml` Escape Hatch

This is the **only** file that can optionally live in a repo, and it holds pointers only — not rules:

```yaml
# .zerocontext.yaml — pointers only, never rules
workspaces:
  frontend/: "@community/react-rules@v2"
  api/:       "@community/fastapi-rules@v1.3"
```

This preserves the zero-rules-in-repo principle while handling monorepos and non-standard layouts.

### Success Criteria for Phase 0

- [ ] You personally stop adding AI config files to your projects
- [ ] Works with at least one IDE (Claude Code or Cursor)
- [ ] Autodetects at least 3 stack types correctly

---

## Phase 1 — Package It For Stars (Week 3–6)

> Now make it something a stranger would star at 11pm on a Saturday.

### What Gets Stars in Dev Tools

Stars come from three things, in order:

1. **Instant satisfaction** — the tool works in under 60 seconds
2. **A great README** — before/after demo GIF, one-liner install, clear pitch
3. **Distribution** — posted to the right places at the right time

None of this is architecture. All of it is packaging.

### The README Structure That Works

```
# ZeroContext

Stop adding AI config files to your repos.

[GIF: before — repo root cluttered with .cursorrules, CLAUDE.md, .windsurfrules]
[GIF: after  — clean repo root, same AI context working in all IDEs]

## Install

npx zerocontext init

## How It Works
[3 sentences max]

## Supported Stacks
[table]

## Supported IDEs
[table]
```

The GIF is not optional. It is the most important element in the README. Record it after Phase 0 is working.

### The Curated Core Registry

Do not launch with a wild-west community registry. Launch with **20–30 hand-curated, high-quality rule sets** for the most popular stacks:

- React + TypeScript
- Next.js
- FastAPI
- Rust
- Go
- Postgres + Drizzle

Quality over quantity. Developers will trust a small curated set over a large unreviewed one.

### Where to Post (Do These In Order)

| Platform | Timing | Notes |
|---|---|---|
| **Hacker News — Show HN** | When the README + GIF are ready | Tuesday–Thursday, 9am ET. Title: "Show HN: ZeroContext – stop adding AI config files to your repos" |
| **r/ClaudeAI** + **r/cursor** | Same day as HN | Different audience, different post copy |
| **Twitter/X** | With the GIF | Tag relevant AI coding accounts |
| **Claude.ai Discord** | After first stars | Community already cares about context management |

### Success Criteria for Phase 1

- [ ] README has a working demo GIF
- [ ] `npx zerocontext init` works end-to-end in under 60 seconds
- [ ] At least 20 curated rule sets in the public registry
- [ ] Posted to HN, r/ClaudeAI, r/cursor
- [ ] First 100 stars

---

## What's Parked (Not Deleted)

The following from v1 are good ideas but belong in a future company plan, not this one:

- Enterprise KMS / HSM integration
- SOC2 audit log schema
- WebSocket token revocation
- Fundraising and burn modeling
- Enterprise co-founder search
- Lighthouse design partner program

When ZeroContext has organic daily active users inside multiple companies, those items become relevant again. Not before.

---

## Immediate Next Actions

| Priority | Action | Deadline |
|---|---|---|
| 🔴 CRITICAL | Build Phase 0 MVP — autodetect + MCP server | Week 2 |
| 🔴 CRITICAL | Get it working in your own projects | Week 2 |
| 🟡 HIGH | Record before/after demo GIF | Week 3 |
| 🟡 HIGH | Write the README | Week 3 |
| 🟡 HIGH | Seed 20 curated rule sets | Week 4 |
| 🟢 MEDIUM | Post to HN + Reddit | Week 5–6 |

---

*v2.0 — ZeroContext / May 2026 — focus on shipping*
