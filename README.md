# ZeroContext

> A local MCP gateway daemon for **Shadow MCP Governance** and context-aware rule injection.

ZeroContext sits between a developer's IDE (Claude Code, Cursor, Windsurf) and all
Model Context Protocol (MCP) context sources. It intercepts, validates, logs, and
streams context to the AI — giving developers faster, more relevant sessions and
giving enterprise security teams the audit trail they currently lack.

## The Problem

Developers plug open-source MCP servers directly into their local IDEs, granting
read/write access to corporate codebases and internal APIs with **zero visibility**
for the security team. There is no audit trail, no SIEM telemetry, and no revocation
mechanism for unvetted MCP servers that can inject poisoned context, exfiltrate
secrets, or steer the AI toward policy-violating code.

**ZeroContext solves this one problem: the ingress threat.**

## What It Is

- An **ingress firewall** for AI context injection
- A **context-aware rule router** that makes AI responses more relevant per file type
- A **SIEM telemetry source** for shadow MCP traffic
- A **cryptographically signed rule registry** for teams

## What It Is Not

- An egress DLP — it cannot stop a developer from telling the AI to read and leak a file
- A hard enforcement boundary — it does not block unauthorized MCP servers at the OS level
- An MDM deployment — no system daemon forced via Jamf or Intune

## Core Feature: Context-Aware Rule Injection

Instead of dumping everything into `CLAUDE.md` and blowing up the context window,
ZeroContext injects only the rules relevant to the active file at session start:

| Signal | Rules Injected |
|---|---|
| `package.json` + `.tsx` | React / TypeScript component rules |
| `drizzle.config.ts` | Database constraint and ORM rules |
| `Cargo.toml` | Rust patterns and safety rules |
| `pyproject.toml` + `main.py` | FastAPI structural patterns |
| `pnpm-workspace.yaml` / `nx.json` | Monorepo workspace routing |

When autodetection fails, a single pointer file at the repo root resolves rule sets:

```yaml
# .zerocontext.yaml — pointers only, not rules
workspaces:
  frontend/: "@team/react-rules@v2"
  api/: "@team/fastapi-rules@v1.3"
```

## Architecture

```
Developer's Machine
┌────────────────────────────────────────┐
│  Claude Code │  Cursor  │  Windsurf     │
└──────────────┴────┬─────┴──────────────┘
                    ▼
         ┌─────────────────────┐
         │  ZeroContext Daemon  │  ← Local MCP Gateway
         └──────────┬──────────┘
                    ▼
        ┌───────────────────────┐
        │   Session Inspector   │  (active file type)
        └───────────┬───────────┘
                    ▼
     ┌──────────────────────────────┐
     │      Rule Registry           │
     │  Community / Team / Private  │
     └──────────────────────────────┘
```

## Security Model

- Rule sets are **cryptographically signed** at publication
- The local daemon verifies the **SHA-256 hash** before injecting into an AI session
- Tampered or unsigned rule sets are rejected before reaching the AI
- Every injection emits a **structured audit event** for the customer's SIEM
- Enterprise tier ships **Sigma-compatible detection signatures** and behavioral
  heuristics (CQL / KQL / STAR) for the customer's EDR

## Status

Pre-MVP. The current focus is the **Prototype Gate**: a 48-hour spike to determine
whether the MCP protocol can be made file-context-aware with target IDEs without a
separate IDE extension. Do not build the full product until this question is answered.

See [`ZeroContext_Final_Plan.md`](./ZeroContext_Final_Plan.md) for the full hardened
execution plan, and [`Archive/`](./Archive) for prior iterations.

## License

TBD — open core. CLI is intended to be OSS; Teams and Enterprise tiers are commercial.
