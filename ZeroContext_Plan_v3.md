# ZeroContext — Plan v3 (Builder Edition, Final)

### Goal: Kill my own dotfile pain. Earn GitHub stars on the way out.

*v3.0 · May 2026 · supersedes v1 (startup plan) and v2 (revised plan)*

---

## TL;DR

The dotfile cleanup is the **demo**. Dynamic per-file-type context injection is the **pitch**. Build the smallest thing that makes your own daily AI workflow leaner, ship it with a magical 30-second demo, post it where the people who feel this pain actually live.

No enterprise. No SOC2. No co-founder hunt. No fundraising. Not yet — maybe never. Those are downstream of having something that works.

---

## Why The Earlier Plans Were Wrong For You

| Plan | What it assumed | Reality |
|---|---|---|
| v1 (Startup) | You can recruit an ex-Snyk co-founder | You are a student in Syria |
| v1 (Startup) | You can spend $80k on SOC2 + legal | You have a GitHub Student Pack |
| v5 (Final) | Enterprise CISOs will take warm intros from you | You don't have the warm network yet |
| v5 (Final) | "Shadow MCP Governance" is the wedge | That's a $1.5M raise problem, not a weekend project |
| v2 (Revised) | "No dotfiles" is the headline | That's a one-time setup win, not a daily-use hook |

The agents pushed you up-market because that's where the imaginary money is. They didn't price in *who you are right now*.

---

## The Real Pitch (Sharper Than v2)

> **Your AI tools waste tokens on rules you don't need right now. ZeroContext only injects what matches the file you're editing.**

Compare:

| | `CLAUDE.md` / `.cursorrules` | ZeroContext |
|---|---|---|
| Context loaded per session | Everything you've ever written | Only what matches active file type |
| Tokens spent on irrelevant rules | ~2–8k per session | ~0 |
| Cost on Claude API at scale | Real money | Less real money |
| Files in repo | One per AI tool | Zero (or one pointer file for monorepos) |

**Demo benchmark to capture for the README:** *"Saved 73% of system prompt tokens on a typical Cursor session. Same project. Same task. Better answers."*

Get a concrete number. That's what gets retweeted. "No dotfiles" gets a polite upvote.

---

## Phase 0 — The Prototype Gate (Days 1–2)

> Don't build anything else until this is resolved.

**The question:** Can an MCP server detect a file-switch event in Cursor / Claude Code and refresh injected context **without** an IDE extension?

| Outcome | What you ship |
|---|---|
| Yes — native MCP event or polling works | Full per-file dynamic injection (the magical version) |
| No — session-boundary only | v1 ships session-start injection; market that honestly; file-switch is v2 roadmap |
| Partial — depends on IDE | Cursor full, Claude Code partial (or vice versa). Be explicit in docs. |

This is 1–2 evenings of testing with mock MCP servers. Resolve before writing real code. The v5 plan got this right and v2 dropped it. Bring it back.

---

## Phase 1 — Ship It For Yourself (Week 1–2)

> Smallest thing that kills your own dotfile pain. Nothing else.

### What to build

```bash
npx zerocontext init    # writes MCP config pointing to the local daemon
npx zerocontext start   # daemon: inspects CWD, serves context via MCP
```

### Stack detection (start narrow)

| Signal | Rules injected |
|---|---|
| `package.json` + `tsconfig.json` | TypeScript + React/Node |
| `Cargo.toml` | Rust |
| `pyproject.toml` | Python (FastAPI variant if `fastapi` in deps) |
| `pnpm-workspace.yaml` / `nx.json` | Monorepo routing |
| `.zerocontext.yaml` | Manual override (pointers only, never rules) |

Skip everything else for Phase 1. No Go, no Elixir, no esoteric stacks. You can add them as you need them — or accept PRs.

### Acceptance criteria

- [ ] You stop adding AI config files to your own projects
- [ ] Works in Claude Code (your daily driver) at minimum
- [ ] Autodetects the 4 stacks above with no manual config
- [ ] Token-savings number measured on your own real projects

---

## Phase 2 — Package For Stars (Week 3–5)

> Stars come from packaging, not architecture.

### The README — what actually matters

In ranked order of impact on star conversion:

1. **A 30-second demo GIF or video at the top.** Side-by-side: bloated `CLAUDE.md` token count vs. ZeroContext's surgical injection on the same task. **The number on screen is the hook.** Not the clean repo root.
2. **One-line install.** `npx zerocontext init`. Show it in the first screen of the README.
3. **The honest positioning section.** Address competitors directly:
   - "vs. `awesome-cursorrules`" → that's a rules library; this is a runtime
   - "vs. native Cursor/Claude rules" → those are static; this is per-file dynamic
   - "Why not just use `CLAUDE.md`?" → token cost demo
4. **Supported IDEs / stacks tables.** Be honest about what works.
5. **A "How it works" section in 3 sentences.** Not 30.

### Curated rule sets — cut from 20–30 to 5

Hand-craft 5 high-quality sets for launch:

1. React + TypeScript
2. Next.js
3. FastAPI
4. Rust
5. Node + Postgres + Drizzle

That's what *you* will use. That's what you can keep current. More can come from PRs after launch. Don't burn a week curating rules for stacks you don't write.

### Distribution sequence

| Step | Platform | When | Notes |
|---|---|---|---|
| 1 | r/ClaudeAI, r/cursor | Soft launch, ~3 days before HN | Get early feedback, fix obvious bugs |
| 2 | Show HN | Tuesday–Thursday, 8–10am ET | Title: "Show HN: ZeroContext – per-file AI context injection over MCP" (lead with the value, not the negative) |
| 3 | Twitter/X with the GIF | Same day as HN | Tag a couple of the well-known Claude Code / Cursor accounts |
| 4 | Claude.ai Discord, Cursor forum | Day 2–3 after HN | Different tone — community member, not launch announcement |

**Be online for 6+ hours after the HN post.** Replying to top comments within 30 minutes is half the battle. If you can't be online, don't post yet.

---

## Realistic Star Math

| Outcome | Stars in 90 days | What it requires |
|---|---|---|
| Floor | 100–300 | One HN post, even a quiet one |
| Realistic if execution is solid | 500–1,500 | Magical demo + responsive HN thread + 1–2 reposts by recognizable accounts |
| Strong outcome | 2,000–5,000 | Picked up by Anthropic/Cursor official channels, or featured in a popular dev newsletter |
| Outlier | 10k+ | One of those + actually viral demo. Don't plan for this. |

**Your real bar for "this worked":** 500+ stars in 90 days, 50+ people using it weekly, 1–2 PRs from strangers. That's a respected niche OSS tool, which is the actual prize.

---

## What Stays Parked (And Why)

Everything from v1 and v5 that depends on enterprise distribution:

- KMS / HSM integration
- SOC2 audit log schema
- WebSocket token revocation
- Sigma/EDR signatures
- Enterprise co-founder search
- Burn modeling and seed raise

These re-enter the conversation **only if** two things happen:

1. ZeroContext has 1,000+ stars and weekly active users across multiple companies (you can see domains via opt-in telemetry)
2. Multiple unsolicited inbound requests from security teams asking about governance features

Until both, treat this as an open-source tool that scratches your itch. Not a startup.

---

## The Failure Modes To Watch

| Risk | Likelihood | What to do |
|---|---|---|
| MCP file-switch streaming requires IDE extension | High | Resolve via Phase 0 prototype; ship session-boundary version if needed |
| Anthropic ships native dynamic rules in a release | Medium-High | Your edge becomes cross-tool support (Cursor + Windsurf + Claude Code). Lean into that. |
| `awesome-cursorrules` users don't see why they need a daemon | Medium | The token-savings number is your only answer. Make it concrete. |
| You hit a wall on autodetection for weird repos | Medium | `.zerocontext.yaml` escape hatch — already in the design |
| You ship and HN ignores it | Medium | Post quality > timing. If the GIF isn't magical, don't post. Wait, iterate. |
| You burn out maintaining the registry solo | Low-Medium | Cut to 5 rule sets at launch. Accept PRs. Don't curate the world. |

---

## Execution Sequence

```
DAY 1–2     Phase 0 — MCP file-switch prototype gate
DAY 3–10    Phase 1 — Build local MVP, use it on your real projects
DAY 11–14   Measure token savings; record demo GIF
DAY 15–21   README + 5 curated rule sets + landing page
DAY 22      r/ClaudeAI + r/cursor soft launch
DAY 25–26   Show HN (Tuesday morning, you blocked off the day)
DAY 30+     Triage issues, accept PRs, write a follow-up post if traction is real
```

Total: ~5 weeks from now to launch. Compatible with your coursework if you give it 1–2 focused evenings + one weekend per week.

---

## Concrete Next Actions

| # | Action | Time |
|---|---|---|
| 1 | Spin up an MCP server stub, test if Cursor/Claude Code see file-switch events | 2 evenings |
| 2 | Decide: per-file dynamic vs. session-boundary v1 (based on #1 outcome) | 1 evening |
| 3 | Build `zerocontext init` + `start` for Claude Code first (your daily driver) | 4–5 evenings |
| 4 | Use it on Draw-to-Web and your Laravel Task Manager for one week | 1 week passive |
| 5 | Record token-savings benchmark from real usage | 1 evening |
| 6 | Write the README — get the GIF right | 1 weekend |
| 7 | Hand-craft the 5 launch rule sets | 1 weekend |
| 8 | Soft launch on Reddit | 1 evening |
| 9 | Show HN — block off the morning | 1 day |

---

## Mental Model

You are not building a startup. You are scratching your own itch and putting it on GitHub. If it gets stars, it goes on your CV next to SyNet and pdfpeek. If it gets users, you get PRs and learn how to maintain a real OSS project. If it gets inbound from security teams asking for governance — *then* you have a conversation about whether v1's vision was right, with data instead of LLM speculation.

Anything else is the agents speedrunning you into someone else's life.

---

*v3.0 — ZeroContext / May 2026 — ship something small, real, and yours*
