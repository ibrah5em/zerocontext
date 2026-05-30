---
name: rule-registry
description: Author, sign, and validate ZeroContext rule sets and the .zerocontext.yaml pointer file. Use when creating a new rule set, defining its signing/hash metadata, mapping stack signals to rules, or wiring a monorepo workspace pointer.
---

# Rule Registry

ZeroContext injects file-type-relevant rule sets into AI sessions. Rule sets are
versioned, cryptographically signed, and resolved from community / team / private tiers.

## When to use this skill
- Creating a new rule set for a stack (React, FastAPI, Rust, Drizzle, etc.).
- Adding or editing a `.zerocontext.yaml` monorepo pointer file.
- Reviewing whether a rule set is signing-ready before publication.

## Rule set anatomy
A rule set is a versioned, immutable bundle. Required metadata:

```yaml
name: "@team/react-rules"
version: "2.0.0"          # semver; a bump REQUIRES a new signature
stack_signals:            # what triggers this rule set
  - "package.json"
  - "*.tsx"
rule_hash: "sha256-..."   # computed over the rule body at publication
signed_by: "..."          # publisher key id
```

## Stack signal → rule mapping
Keep autodetection deterministic. One signal set maps to one rule set:

| Signal | Rule set |
|---|---|
| `package.json` + `*.tsx` | React / TypeScript component rules |
| `drizzle.config.ts` | Database constraint + ORM rules |
| `Cargo.toml` | Rust patterns and safety rules |
| `pyproject.toml` + `main.py` | FastAPI structural patterns |
| `pnpm-workspace.yaml` / `nx.json` | Monorepo workspace routing |

## Monorepo pointer (`.zerocontext.yaml`)
The one allowed repo footprint. It contains **pointers only, never inline rules**:

```yaml
# .zerocontext.yaml
workspaces:
  frontend/: "@team/react-rules@v2"
  api/: "@team/fastapi-rules@v1.3"
  infra/: "@team/terraform-rules@v1"
```

## Hard rules
1. **Never inline rule bodies into the pointer file** — it stays pointers-only.
2. **A version bump always requires re-signing.** Releases are immutable.
3. **The daemon verifies `rule_hash` before injection.** Author rule sets so the hash
   is computed over a stable, canonical serialization.
4. Keep rule sets small and targeted — the entire premise is *less* context, not more.
