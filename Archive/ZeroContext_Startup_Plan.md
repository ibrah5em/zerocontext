# ZeroContext MCP — Full Company Plan
### Internal Team Review Document · v1.0 · May 2026

---

> **Purpose of this document:** This is the complete strategic, architectural, and execution blueprint for ZeroContext. It synthesizes the full product design process — from initial concept through security architecture, business model, and go-to-market sequencing — for team alignment and review.

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [The Solution](#2-the-solution)
3. [Core Architecture](#3-core-architecture)
4. [Security Model](#4-security-model)
5. [Handling Complexity — Monorepos & Edge Cases](#5-handling-complexity)
6. [Business Model](#6-business-model)
7. [Competitive Landscape & Moat](#7-competitive-landscape--moat)
8. [Go-To-Market Strategy](#8-go-to-market-strategy)
9. [Survival Math & Fundraising](#9-survival-math--fundraising)
10. [Founding Team Requirements](#10-founding-team-requirements)
11. [Open Risks & Known Gaps](#11-open-risks--known-gaps)
12. [The Cold Email — First Market Validation Step](#12-the-cold-email)
13. [Version Scorecard](#13-version-scorecard)

---

## 1. The Problem

### Configuration Fragmentation

Every AI coding tool demands its own proprietary folder or file cluttering the project root:

| Tool | Required Config |
|---|---|
| Cursor | `.cursor/rules/` or `.cursorrules` |
| Claude Code | `.claude/` and `CLAUDE.md` |
| Windsurf | `.windsurfrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |

This creates a brutal **M × N matrix problem**: 5 tools × 15 repositories = **75 different rule sets** to manually manage, keep in sync, and commit into version control.

### The Deeper Problem: Shadow MCP

Developers are now plugging open-source Model Context Protocol (MCP) servers directly into their local IDEs, giving Cursor, Claude, and Copilot read/write access to codebases and internal APIs with **zero governance layer**.

There is nothing preventing a developer from running an unvetted MCP server that:
- Injects poisoned context into the AI's system prompt
- Exfiltrates environment variables or API keys
- Instructs the AI to write code violating internal security policies

Enterprise security teams are starting to panic. They have no visibility, no audit trail, and no revocation mechanism.

### The Core Insight

> **Context should adapt to the codebase, not live inside it.**
> **Security should govern the AI, not trust it.**

---

## 2. The Solution

**ZeroContext** is a centralized, zero-trust MCP server that gives engineering teams absolute control over what their AI agents know, what they can do, and how they write code — across any IDE.

It flips the architecture entirely: instead of configuring rules *inside* repositories, context is handled at the **transport layer** via a local or remote MCP server.

### What Changes

| Attribute | Old Way (`.cursorrules`, `.claude`) | ZeroContext Way |
|---|---|---|
| Repo footprint | Bloated with dot-files and markdown | Zero files added |
| Tool portability | Lock-in (Cursor rules don't work in Claude) | Universal (any MCP-compatible IDE/CLI) |
| Team updates | Manual git pulls, out-of-sync configs | Instant via cloud token |
| Context bloat | Dumps all rules at once | Dynamic — only streams what matches active file types |
| Security posture | None | Zero-trust gateway with audit logs |
| Offline behavior | Always available | Configurable per tier |

---

## 3. Core Architecture

### System Overview

```
┌────────────────────────────────────────────────────────┐
│                   Developer's Machine                  │
│                                                        │
│  ┌─────────────┐   ┌─────────────┐   ┌──────────────┐ │
│  │ Claude Code │   │ Cursor IDE  │   │   Windsurf   │ │
│  └──────┬──────┘   └──────┬──────┘   └──────┬───────┘ │
│         └────────────────►▼◄─────────────────┘        │
│                  ┌────────────────────┐               │
│                  │  ZeroContext MCP   │  ← Gateway    │
│                  └────────┬───────────┘               │
└───────────────────────────┼───────────────────────────┘
                            ▼
               [ Workspace Inspection ]
                            │
     ┌──────────────────────┼─────────────────────┐
     ▼                      ▼                     ▼
┌──────────────┐     ┌───────────┐        ┌──────────────┐
│ package.json │     │ Cargo.toml│        │ Team Token   │
│ (React/TS)   │     │  (Rust)   │        │ (Remote Sync)│
└──────────────┘     └───────────┘        └──────────────┘
```

### Protocol Flow

| Phase | Action | Security Mechanism |
|---|---|---|
| **1. Handshake** | IDE requests context via MCP | Authenticates via short-lived OAuth 2.1 token |
| **2. Inspection** | ZeroContext scans workspace | Read-only local scan of manifest files |
| **3. Resolution** | Maps stack to remote rules | Validates payload against cryptographic hash (Rule Pinning) |
| **4. Injection** | Streams instructions to AI | Enforces data egress policies, logs transaction |

### Stack Autodetection

The MCP server inspects structural file signatures to dynamically assemble rules:

- Detects `package.json` → Injects strict TypeScript & component rules
- Detects `drizzle.config.ts` → Injects database constraint rules
- Detects `Cargo.toml` → Injects Rust-specific patterns
- Detects `main.py` + `pyproject.toml` → Injects FastAPI structural patterns
- Detects `pnpm-workspace.yaml` / `nx.json` → Activates monorepo mode

---

## 4. Security Model

### 4.1 Zero-Trust Prompt Injection Defense

ZeroContext borrows the model from `package-lock.json` and `go.sum`:

**Cryptographic Rule Pinning**
- Rule sets are not just downloaded — they are cryptographically signed by the security team
- The local ZeroContext client verifies the SHA-256 hash before injecting into the AI's prompt
- If an attacker compromises the remote registry and alters a rule set, the local client **rejects the payload** because the signature fails

**Immutable Releases**
- Once a rule version is signed and pinned, it cannot be silently altered
- Rule updates require explicit version bumps with new signatures

**Audit Logging**
- Every context injection is logged as a structured JSON payload to your central SIEM (Datadog, Splunk, etc.)

### 4.2 Audit Log Schema (SOC2-Ready)

Every context injection generates a structured event:

| Field | Purpose | Example Value |
|---|---|---|
| `timestamp` | Chronological trace | `2026-05-19T21:01:49Z` |
| `actor_identity` | OAuth 2.1 bound user | `user_id: 8f92a...` |
| `trigger_event` | What caused the pull | `file_open: src/app.tsx` |
| `target_rule_hash` | Cryptographic pin | `sha256-8a9d...` |
| `action_status` | Outcome | `BLOCKED_INVALID_SIGNATURE` |

### 4.3 Token Lifecycle & Revocation

**Revocation Flow (instantaneous):**

1. Admin revokes token in ZeroContext cloud dashboard, or automated SIEM alert triggers API revocation
2. Cloud pushes invalidation event via WebSocket to all active local MCP gateways
3. Local MCP server immediately flushes cached rules and terminates the session
4. Any active AI agent request is intercepted and returned a `401 Unauthorized` via MCP JSON-RPC, breaking the context injection mid-stream

### 4.4 Enterprise Key Management (No Startup Key Custody)

For Fortune 500 deployments, ZeroContext does **not** hold the root signing keys.

- ZeroContext acts as the **routing and verification protocol only**
- Cryptographic signing integrates directly into the customer's existing HSMs or KMS (AWS KMS, HashiCorp Vault)
- The enterprise's internal security team uses their own air-gapped root CA to sign rules
- The local developer client trusts **only** signatures tracing back to the company's internal PKI

> **"If we die, they don't."** If ZeroContext the company disappears tomorrow, the enterprise's internal context gateway continues functioning securely. This is how you pass a FinTech procurement review.

### 4.5 Offline Fallback Behavior

Connectivity loss must be handled deliberately. Developer incentives (velocity) oppose CISO incentives (security):

| Tier | Offline Behavior | Rationale |
|---|---|---|
| OSS / Free | **Fail-Open** — uses last verified local cache | A developer on a plane will uninstall a tool that breaks their IDE |
| Enterprise | **Fail-Closed** — returns `403`, halts context injection | In zero-trust, disruption is a feature, not a bug |

### 4.6 The Confused Deputy Prevention

The gateway solves a critical AI security problem: the **Confused Deputy attack**.

An AI agent might request access to a sensitive file it shouldn't see. In standard setups, nothing stops this. ZeroContext's gateway **evaluates the request against pinned rules before the AI is allowed to process it** — and drops unauthorized requests before execution.

---

## 5. Handling Complexity

### Monorepos & Chaotic Codebases

Stack autodetection works for standard apps but fails in massive monorepos with non-standard layouts. The escape hatch: a single `.zerocontext.yaml` pointer file at the repo root.

**Key distinction:** This file does NOT hold rules. It holds only **pointers**:

```yaml
# .zerocontext.yaml — pointers only, not rules
workspaces:
  frontend/: "@team/react-rules@v2"
  api/: "@team/fastapi-rules@v1.3"
  infra/: "@team/terraform-rules@v1"
```

This gives deterministic control when autodetection fails, while preserving the zero-rules-in-repo principle.

### The Registry Trust & Cold-Start Problem

**We do not launch with a wild-west community registry.**

Phase 1 launches with a **Curated Core**: 50 heavily vetted, cryptographically signed rule sets for the most popular frameworks (React, Postgres, FastAPI, Rust, etc.), signed by ZeroContext's root keys.

Community contributions are PR-gated — reviewed, merged, and signed by the ZeroContext team before publication.

**Scaling the editorial function — Delegated Authority:**

We partner with framework maintainers directly. Proposition to Vercel: *"Thousands of developers use ZeroContext to govern AI agents. We want the official Next.js rule set to be signed and maintained by your DevRel team."*

This shifts the maintenance burden to the ecosystem by making ZeroContext a **distribution channel** for framework creators to ensure AI agents write their code correctly.

---

## 6. Business Model

### Open Core Strategy

Developer convenience is free. Enterprise governance is paid.

| Tier | Price | Target | Core Value |
|---|---|---|---|
| **ZeroContext CLI** | Free / Open Source | Individual developers | Eliminates dot-files. Pulls from public community registry. Solves M×N fragmentation. |
| **ZeroContext Teams** | $15/user/month | Startups, mid-market teams | Private registries. Team lead writes standards, all developers instantly sync via Team Token. |
| **ZeroContext Enterprise** | Custom (annual) | FinTech, Healthcare, regulated industries | On-premise hosting, SSO/SAML, KMS integration, cryptographic rule signing, SOC2 audit logs |

### On-Premise Enterprise Delivery

For air-gapped deployments:

- ZeroContext registry and signing authority packaged as a single **Docker image**
- Enterprise deploys in their own VPC
- Developer clients pointed to internal URL (`https://mcp.internal.acme.com`)
- Annual licensing fee for the enterprise binary; customer handles infrastructure costs

---

## 7. Competitive Landscape & Moat

### Why Cursor and Anthropic Won't Eat Us

Anthropic and Cursor are building IDEs and models. They do not want to become enterprise SIEM dashboards or deal with granular role-based access control. That is not their product motion.

### The Real Competitive Threat

**Snyk, Wiz, Palo Alto Prisma Cloud.** They have existing enterprise security distribution and are actively looking for AI security surface area to own. They could ship "MCP governance" as a feature of an existing platform.

**Our window: 6 to 9 months.** That is the head start before a well-funded incumbent notices the thesis.

### The Moat: Owning the Trust Standard

Our defensibility comes from **becoming the de facto AI Security Gateway** before incumbents prioritize it.

Concretely:
- Define the standard for how AI rules are signed and verified (the `.zerocontext.lock` format)
- Get one major IDE or framework to adopt it
- Get enough enterprise procurement requirements to reference it

Once ZeroContext is embedded in a customer's SIEM workflow and their developers' daily tools, switching cost is high. The registry network effect (more frameworks → more rule sets → more developer adoption → more enterprise signal) compounds over time.

**We are not competing with Cursor. We are the security checkpoint Cursor has to pass through.**

---

## 8. Go-To-Market Strategy

### The Trojan Horse Motion (Bottom-Up → Top-Down)

A top-down mandate for a clunky developer tool always fails. We execute a classic bottom-up motion:

```
Developers love it individually
        ↓
Organic spread inside a company
        ↓
Security team notices and asks questions
        ↓
We already have the enterprise answer ready
        ↓
Top-down contract
```

### Phase 1: Developer Ergonomics Play (Months 1–6)

**Goal:** Organic developer adoption. Prove the tool is indispensable in daily workflow.

**Pitch:** *"Stop writing `.cursorrules`. Run one command and get the best community rules injected into your IDE via MCP."*

**True success metric (not vanity):**
- Number of developers with ZeroContext active for 30+ consecutive days
- Number of companies with 3+ developers using it organically ← This is the lighthouse signal

**Cost:** Free to use. We eat registry hosting costs.

### Phase 2: Lighthouse Design Partner (Months 6–9)

**Goal:** Co-build and validate the enterprise security layer with one real customer.

**Target profile:** Hyper-growth infrastructure company (Plaid, Scale AI, similar). Their security engineers are already worried about AI context leakage. Their developers demand AI velocity. They are motivated to co-design a secure gateway.

**The ask:** *"Your devs are already using this locally. Let us co-build the enterprise audit schema and KMS integration with you. You get a 12-month free enterprise license and your name on the case study. We get a battle-tested schema and a reference customer."*

**Important:** The lighthouse partner gets **early access**, not bespoke features. Everything we build with them becomes the standard enterprise tier. This prevents commoditizing implementation services before we charge for them.

### Phase 3: Enterprise Rollout (Months 10–18)

**Goal:** Open paid Enterprise tier with validated architecture and a named case study.

**Shift the pitch:** From *"developer convenience"* to *"AI supply-chain security and governance."*

**Target buyers:** VP of Security Engineering, CISO at mid-market and enterprise tech companies.

**Sales collateral:**
- Lighthouse partner case study
- SOC2-ready audit schema documentation
- KMS integration reference architecture

---

## 9. Survival Math & Fundraising

### The Hard Numbers to Answer Before Raising

| Question | Status |
|---|---|
| Monthly burn at founding team + infra? | **To be modeled** |
| Months of runway needed to reach Phase 3? | Minimum 12–15 months |
| Revenue start date? | Month 10 at earliest |
| Required raise size? | **To be modeled against burn** |
| What closes the seed round? | Signed LOI from lighthouse partner OR named enterprise waitlist |

### What Investors Will Probe

- "You have GitHub stars. Where's the signed LOI?"
- "What happens when Snyk ships this as a feature in Q3?"
- "Walk me through the KMS integration — what's the engineering lift?"
- "Who's running the enterprise sales cycle while the technical founder is building?"

### Fundraising Readiness Checklist

- [ ] Monthly burn modeled with founding team salaries + infra
- [ ] Lighthouse design partner identified (named company, named contact)
- [ ] Signed LOI or formal letter of intent from at least one enterprise prospect
- [ ] Co-founder with enterprise security sales experience identified or in conversation

---

## 10. Founding Team Requirements

The architecture is sound. Execution depends entirely on having the right people.

| Role | Required Background | Why It's Non-Negotiable |
|---|---|---|
| **Technical Co-Founder** | MCP server infrastructure, distributed systems, PKI/signing | Owns the codebase and security architecture |
| **Enterprise Co-Founder** | Ex-Datadog, ex-Snyk, ex-HashiCorp | Navigates procurement, runs the 6-month sales cycle, closes the Vercel DevRel conversation |

You cannot build the codebase and run enterprise sales simultaneously. The first hire or co-founder search is more important than the next architecture revision.

---

## 11. Open Risks & Known Gaps

### Critical Risks (Resolve Before Raising)

| Risk | Description | Mitigation |
|---|---|---|
| **Single Point of Failure** | Compromised ZeroContext gateway = prompt injection across every enterprise customer simultaneously | Customer-held root keys via HSM/KMS. If ZeroContext dies, they survive. |
| **Incumbent Speed** | Snyk/Wiz ship "MCP governance" as a feature | 6–9 month window. Move fast. Get lighthouse partner locked in. |
| **Chicken-and-Egg Registry** | Enterprise won't trust us without community adoption; community needs a populated registry | Curated Core seeds 50 rule sets. Developer ergonomics play builds adoption first. |

### Significant Risks (Resolve During Build)

| Risk | Description | Mitigation |
|---|---|---|
| **Air-Gap PKI Complexity** | True air-gapped operation requires more than a Docker image | Explicit documentation: key rotation, update propagation, root CA lifecycle |
| **WebSocket Connectivity** | Push invalidation fails on planes, restrictive VPNs | Explicit fallback behavior: fail-open (OSS), fail-closed (Enterprise) |
| **Curation Staleness** | Framework updates make curated rules confidently wrong | Delegated authority to framework maintainers; automated freshness monitoring |
| **Autodetection Accuracy** | Polyglot and non-standard repos fail autodetection | `.zerocontext.yaml` pointer file as deterministic escape hatch |

### Known Unknowns (Monitor)

- Will MCP become the universal standard, or will tooling fragment further?
- How fast will Anthropic/Cursor ship native governance features?
- What is the true CAC for enterprise security tooling without a known brand?

---

## 12. The Cold Email

**Use this to get the first market validation call. Do not attach the architecture doc. Let the problem statement do the work.**

---

**Subject:** AI agents in your codebase — who's governing what they can see?

Hi [Name],

Your developers are likely starting to plug open-source Model Context Protocol (MCP) servers into their local IDEs to give Cursor and Claude access to your codebase and internal APIs.

It's a massive velocity boost for them, but a significant supply-chain risk for you. Right now, there's no governance layer preventing a developer from running an unvetted MCP server that injects poisoned context or exfiltrates environment variables.

We're building the zero-trust security gateway for AI agents — it intercepts, cryptographically verifies, and logs every rule and context injection before the AI processes it, so devs can move fast without bypassing your SIEM.

Are you actively looking at the MCP security surface area yet? I'd love 15 minutes to understand your threat model and have you poke holes in our architecture.

Best,
Ibrahem

---

**Who to send it to:** 3 security leaders at hyper-growth companies where you have a second-degree connection. A warm intro converts at 5–10× a cold email at this level. Spend 30 minutes finding the connection before hitting send.

**What a "yes" means:** Your lighthouse thesis is valid. Build toward Phase 2.

**What "not a priority" means:** Revisit the enterprise angle and timing. May need to strengthen the developer-only play first.

---

## 13. Version Scorecard

*Tracking how the pitch evolved across four major iterations:*

| Dimension | V1 | V2 | V3 | V4 (Current) |
|---|---|---|---|---|
| Problem clarity | 9/10 | 9/10 | 9/10 | 9/10 |
| Solution elegance | 8/10 | 8.5/10 | 9/10 | 9/10 |
| Security thinking | 4/10 | 7/10 | 8.5/10 | 9/10 |
| Defensibility | 5/10 | 6.5/10 | 7.5/10 | 7.5/10 |
| Business model clarity | 5/10 | 7.5/10 | 8/10 | 8/10 |
| Execution risk acknowledged | 3/10 | 5/10 | 6/10 | 7/10 |
| GTM clarity | —/10 | —/10 | 4/10 | 7/10 |
| Survival math | —/10 | —/10 | —/10 | 4/10 |
| **Overall** | **7.5** | **8.0** | **8.5** | **8.7** |

---

## Next Actions

| Priority | Action | Owner | Deadline |
|---|---|---|---|
| 🔴 CRITICAL | Model monthly burn + fundraising math | Ibrahem | This week |
| 🔴 CRITICAL | Send cold email to 3 named contacts | Ibrahem | Today |
| 🔴 CRITICAL | Identify enterprise co-founder candidates | Ibrahem | 2 weeks |
| 🟡 HIGH | Draft `.zerocontext.lock` spec v0.1 | Technical | 2 weeks |
| 🟡 HIGH | Build CLI MVP (autodetection + public registry) | Technical | Month 1–2 |
| 🟡 HIGH | Identify 3 lighthouse partner candidates by name | Both | 2 weeks |
| 🟢 MEDIUM | Seed Curated Core with 10 initial rule sets | Technical | Month 1 |
| 🟢 MEDIUM | Reach out to one framework DevRel team (start with Vercel) | Both | Month 2 |

---

*Document version 1.0 — Internal use only — ZeroContext / May 2026*
