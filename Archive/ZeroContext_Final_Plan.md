# ZeroContext — Final Hardened Execution Plan
### v5.0 · May 2026 · Post Red-Team

---

## What This Document Is

This is the plan that survived four rounds of adversarial review. Every section here has been stress-tested and either defended or replaced. Earlier versions are dead. This is the one you build from.

---

## 1. The Problem (One Problem Only)

**Shadow MCP Governance.**

Developers are plugging open-source Model Context Protocol (MCP) servers directly into their local IDEs — giving Cursor, Claude Code, and Copilot read/write access to corporate codebases and internal APIs with zero visibility for the security team.

There is currently nothing preventing a developer from running an unvetted MCP server that:
- Injects poisoned context into the AI's system prompt
- Exfiltrates environment variables or API keys
- Instructs the AI to produce code that violates internal security policy

Enterprise security teams have no audit trail, no SIEM telemetry, and no revocation mechanism.

**This is the only problem ZeroContext solves. We do not lead with dot-file cleanup. We do not lead with config management. We lead with the ingress threat.**

---

## 2. What ZeroContext Is (Honest Scope)

ZeroContext is a **local MCP gateway daemon** that sits between the developer's IDE and all MCP context sources. It intercepts, validates, logs, and streams context to the AI — and generates the telemetry enterprises currently lack.

### What It Is

- An ingress firewall for AI context injection
- A context-aware rule router that makes AI responses more relevant
- A SIEM telemetry source for shadow MCP traffic
- A cryptographically signed rule registry for teams

### What It Is Not

- An egress DLP (it cannot stop a developer from telling the AI to read and leak a file)
- A hard enforcement boundary (we do not block unauthorized MCP servers at the OS level)
- An MDM deployment (no system daemon forced via Jamf or Intune)

> **We tell CISOs this scope explicitly.** Narrowing the claim builds trust. Overstating it destroys it in the first technical evaluation.

---

## 3. The Product

### Core Feature: Context-Aware Rule Injection

The daily problem ZeroContext solves is **AI context rot** — developers dumping everything into `CLAUDE.md`, blowing up the AI's context window, wasting tokens, and diluting prompt quality.

ZeroContext replaces this with session-aware context injection:

- Developer opens a new AI chat session
- ZeroContext inspects the active file at session start
- Injects only the rules relevant to that file type
- Database work → database security rules + ORM standards
- React component → component architecture + Tailwind rules
- Rust file → Rust-specific patterns

**v1 behavior:** Context is injected at session start based on active file. This is fully achievable with today's MCP protocol and is honestly marketed.

**v2 roadmap:** Real-time file-switch context flushing (requires IDE extension or polling mechanic — validated in prototype before committing).

### Why Developers Keep the Daemon Running

The value is felt on every coding session, not just at setup:
- Faster, cheaper AI responses (smaller, targeted context = fewer tokens)
- Noticeably more relevant suggestions per file type
- Zero manual rule management

---

## 4. Architecture

### System Overview

```
Developer's Machine
┌────────────────────────────────────────┐
│  Claude Code │  Cursor  │  Windsurf    │
└──────────────┴────┬─────┴──────────────┘
                    ▼
         ┌─────────────────────┐
         │  ZeroContext Daemon  │  ← Local MCP Gateway
         └──────────┬──────────┘
                    ▼
        ┌───────────────────────┐
        │   Session Inspector   │
        │  (active file type)   │
        └───────────┬───────────┘
                    ▼
     ┌──────────────────────────────┐
     │      Rule Registry           │
     │  Community / Team / Private  │
     └──────────────────────────────┘
```

### Protocol Flow

| Phase | Action | Mechanism |
|---|---|---|
| **1. Handshake** | IDE requests context via MCP | OAuth 2.1 token authentication |
| **2. Inspection** | ZeroContext reads active file type | Read-only local inspection |
| **3. Resolution** | Maps file type to relevant rule set | Cryptographic hash validation |
| **4. Injection** | Streams targeted rules to AI session | Logs transaction to audit trail |

### Stack Autodetection

| Signal | Rules Injected |
|---|---|
| `package.json` + `.tsx` files | React / TypeScript component rules |
| `drizzle.config.ts` | Database constraint and ORM rules |
| `Cargo.toml` | Rust patterns and safety rules |
| `pyproject.toml` + `main.py` | FastAPI structural patterns |
| `pnpm-workspace.yaml` / `nx.json` | Monorepo workspace routing |

### Monorepo Escape Hatch

When autodetection fails, a single pointer file at the repo root:

```yaml
# .zerocontext.yaml — pointers only, not rules
workspaces:
  frontend/: "@team/react-rules@v2"
  api/: "@team/fastapi-rules@v1.3"
  infra/: "@team/terraform-rules@v1"
```

> **Note:** This file lives in the repo and is the one exception to "zero repo footprint." It is a pointer, not a rule set. Acknowledge this honestly rather than claiming absolute zero footprint.

---

## 5. Security Model

### Honest Scope

ZeroContext governs **what the AI sees via context injection.** It does not govern what the AI outputs or what tool calls the AI makes through other channels.

### Cryptographic Rule Pinning

- Rule sets are cryptographically signed at publication
- Local daemon verifies SHA-256 hash before injecting into AI session
- Tampered or unsigned rule sets are rejected before reaching the AI
- Immutable releases: version bumps require new signatures

### Audit Log Schema

Every context injection generates a structured event:

| Field | Example |
|---|---|
| `timestamp` | `2026-05-19T21:01:49Z` |
| `actor_identity` | `user_id: 8f92a...` |
| `trigger_event` | `session_open: button.tsx` |
| `rule_hash` | `sha256-8a9d...` |
| `action_status` | `INJECTED` / `BLOCKED_INVALID_SIGNATURE` |

### Enterprise EDR Integration

We do not write native EDR rules. We provide:

- **Sigma-compatible detection signatures** for the customer's SIEM
- **Behavioral heuristics** (CQL for CrowdStrike, KQL for Microsoft Defender, STAR for SentinelOne) in plain-language format for the customer's security team to implement in their native query language

> **Exact CISO pitch:** *"We are not an enforcement boundary. ZeroContext provides complete observability by generating Sigma-compatible detection signatures for your SIEM and behavioral heuristics for your EDR to detect unauthorized local MCP processes bypassing the gateway."*

---

## 6. Business Model

### Open Core

| Tier | Price | Customer | Value |
|---|---|---|---|
| **ZeroContext CLI** | Free / OSS | Individual developers | Context-aware injection, community rule registry |
| **ZeroContext Teams** | $15/user/month | Startups, mid-market | Private rule registry, team sync, domain dashboard |
| **ZeroContext Enterprise** | Custom annual | FinTech, Healthcare | SIEM audit logs, Sigma/EDR signatures, KMS integration, SOC2 documentation |

---

## 7. Go-To-Market

### The Motion: Bottom-Up → Enterprise Signal

```
Developer installs CLI (zero friction)
           ↓
Links corporate email for team multiplayer features
           ↓
Domain signal triggers enterprise outreach
           ↓
"Nine of your engineers are routing MCP traffic through us.
 Let's get you the audit logs."
           ↓
Enterprise co-founder closes the deal
```

### The Email Capture Mechanic (Workspace Trapdoor)

On `zerocontext init`, developers authenticate via GitHub (frictionless). The CLI surfaces a single prompt:

> *"Link your work email to automatically inherit your team's custom AI rules, or stay on personal account for community rules."*

- `@gmail.com` → single-player experience, community rules
- `@scale.com` → multiplayer mode, shared team rule sets

We don't force the corporate email. We make it the key to the multiplayer feature. That is how we capture the domain signal without killing developer conversion.

### Target Developer Communities (First 100 Users)

Not just university networks. Prioritize communities that skew toward professional developers with corporate email addresses:

1. Official Claude Code Discord
2. Cursor community forum
3. Hacker News — Show HN post
4. University engineering networks (secondary)

---

## 8. The 100/14 Milestone

**Everything depends on this.**

The co-founder recruitment is impossible without traction. The validation interviews are impossible without the co-founder. The seed round is impossible without validation. The 100/14 milestone unlocks the entire chain.

### The Target

- **100 active developers**
- **14-day retention**
- **Measured correctly:** Daemon running AND averaging at least **N MCP context injections per active coding day** over the 14-day window

> A daemon running silently in the background is not proof of value. Daily MCP requests intercepted is. Instrument both from day one.

---

## 9. The Prototype Gate (Do This Before Writing Anything Else)

The Dynamic Context Streaming feature is the reason developers keep the daemon running. Before building the full product, build a 48-hour prototype to answer one question:

**Can the MCP protocol be made file-context-aware with target IDEs (Cursor, Claude Code) without requiring a separate IDE extension?**

| Answer | Implication |
|---|---|
| Yes, via polling or native MCP event | Build as described. Market the file-switch behavior. |
| No, requires IDE extension | v1 ships session-boundary injection only. File-switch is v2 roadmap. Market honestly. |
| Partially (session-boundary works) | **Most likely outcome.** Ship Option 3. This is still genuinely better than CLAUDE.md. |

Do not build the full product until this prototype answers the question. Overpromising file-switch behavior and shipping session-boundary behavior generates bad reviews at the exact moment you need organic growth.

---

## 10. Founding Team

| Role | Required Background | Why Non-Negotiable |
|---|---|---|
| **Technical Co-Founder** | MCP infrastructure, distributed systems, PKI/signing | Owns architecture and ships the MVP |
| **Enterprise Co-Founder** | Ex-Snyk, ex-Wiz, ex-Datadog, existing CISO relationships | Runs the 9–18 month sales cycle, closes the lighthouse partner, provides warm network for validation interviews |

The enterprise co-founder is not a hire — they are a co-founder. Recruit them after hitting the 100/14 milestone using traction data as the proof point. You are not selling equity in an idea. You are selling equity in a product with real usage numbers.

---

## 11. Validation Framework

### The "Go" Condition

5 enterprise security leader interviews. Proceed only if **at least 3 of 5** explicitly confirm all three statements:

1. *"We currently have zero visibility into what local MCP servers our developers are running."*
2. *"This is a top-3 endpoint security concern for us in the next 12 months."*
3. *"We would pay for a tool that gives us SIEM logging and visibility today, even without hard enforcement."*

### The "Kill" Condition

Stop the enterprise angle and pivot if they say:

- *"We just block IDE AI features entirely at the proxy."*
- *"We'll wait for Anthropic to build an admin dashboard."*
- *"We need hard MDM enforcement to even consider a pilot."*

### How to Get the 5 Interviews

The enterprise co-founder brings the warm network. Validation interviews happen **after** co-founder recruitment, not before. The co-founder IS the access mechanism.

---

## 12. Survival Math

| Item | Number |
|---|---|
| Monthly burn | $50,000 |
| One-time CapEx (SOC2 + legal) | $80,000 |
| Seed raise target | $1,500,000 |
| Effective runway | ~28 months |
| First revenue target | Month 12–15 |
| Enterprise ACV target | $80,000–$150,000 |
| Customers needed for Series A signal | 3 signed enterprise contracts |

---

## 13. SOC2 — Start Immediately

SOC2 Type II requires a **minimum 6-month observation period** before the auditor issues the report.

- Start the readiness engagement in **Month 1**
- Observation period runs concurrently with product development
- Report available by **Month 7–8**
- Required before any FinTech or Healthcare enterprise procurement will proceed

If you wait until enterprise interest materializes at Month 10, you will not have SOC2 until Month 16. That is past the runway threshold.

**Engage a SOC2 readiness firm on Day 1. This is not optional.**

---

## 14. Competitive Threats

| Threat | Reality | Response |
|---|---|---|
| **Anthropic ships native rule governance** | Likely for developer convenience tier. Unlikely for enterprise IAM/KMS integration. | Go deep on enterprise identity infrastructure (AD, HSM) before they care. |
| **Snyk / Wiz ship "MCP governance" as a feature** | 9–12 month window before they prioritize this. They have the distribution to close deals faster. | Lock in lighthouse partner with contractual reference before they wake up. |
| **MCP doesn't become universal** | Real risk. Copilot/JetBrains may not adopt MCP natively. | Validate MCP adoption rates in target developer communities before building. |

---

## 15. Execution Sequence

```
NOW
 │
 ├─ 1. Build 48-hour MCP file-context prototype (resolve the streaming question)
 │
 ├─ 2. Start SOC2 readiness engagement (observation clock starts)
 │
 ├─ 3. Build MVP CLI with session-boundary context injection + GitHub auth + Workspace Trapdoor
 │
 ├─ 4. Distribute via Claude Code Discord, Cursor forum, Show HN
 │
 ├─ 5. Hit 100/14 milestone (100 devs, 14-day retention, daily injection metrics)
 │
 ├─ 6. Use traction data to recruit enterprise co-founder
 │
 ├─ 7. Co-founder runs 5 validation interviews against falsifiable threshold
 │
 ├─ 8. If "Go" — open seed round conversations with SOC2 Type II in progress
 │
 └─ 9. Close lighthouse partner → raise seed → hire → scale

TARGET: Month 28 runway. First enterprise revenue Month 12–15.
```

---

## 16. Known Risks (Honest)

| Risk | Severity | Status |
|---|---|---|
| MCP file-context streaming may require IDE extension | High | Resolve via prototype before building |
| Enterprise co-founder recruitment is pre-traction | High | Milestone-gated: recruit after 100/14 |
| Domain signal requires corporate email capture | Medium | Solved via Workspace Trapdoor mechanic |
| SOC2 6-month clock if started late | Medium | Solved by starting Month 1 |
| Anthropic ships developer-tier rule registry | Medium | Monitor; double down on enterprise identity moat |
| MCP not universally adopted | Medium | Validate in target communities before full build |
| First 100 users may be students, not professionals | Low-Medium | Target professional communities explicitly |

---

*ZeroContext — v5.0 Final Hardened Plan · May 2026*
*This document reflects adversarial review across four iterations. Do not revise further. Build.*
