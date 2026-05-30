---
name: audit-event
description: Emit and validate ZeroContext structured audit events and SIEM/Sigma detection signatures. Use when adding telemetry to an injection path, defining an audit event, or writing a Sigma-compatible detection signature for a customer's SIEM.
---

# Audit Event & SIEM Telemetry

Every context injection in ZeroContext emits a structured audit event. This telemetry
is the enterprise product — there are no silent injection paths.

## When to use this skill
- Adding telemetry to any code path that injects (or blocks) context.
- Defining or extending the audit event schema.
- Authoring a Sigma-compatible detection signature for a customer's SIEM.

## Audit event schema
Emit one event per injection attempt — success and failure both:

```json
{
  "timestamp": "2026-05-19T21:01:49Z",
  "actor_identity": "user_id: 8f92a...",
  "trigger_event": "session_open: button.tsx",
  "rule_hash": "sha256-8a9d...",
  "action_status": "INJECTED"
}
```

`action_status` is one of: `INJECTED`, `BLOCKED_INVALID_SIGNATURE`,
`BLOCKED_UNSIGNED`, `RESOLUTION_FAILED`.

## Rules
1. **No silent injection.** If context reaches the AI, an event was emitted.
2. **Log blocks too.** A rejected signature is the most security-relevant event there is.
3. **No secrets in events.** Signing keys and OAuth tokens never appear in the log.
4. **Minimize PII.** Use a stable but privacy-aware `actor_identity`.

## Sigma signatures
ZeroContext ships detection signatures for the customer's SIEM — it does not write
native EDR rules. A signature targets behaviors the gateway can observe or that
indicate gateway bypass (e.g. a local MCP process talking directly to an IDE socket
instead of through the daemon). Deliver behavioral heuristics in plain language plus
a Sigma rule the customer maps into CQL (CrowdStrike) / KQL (Defender) / STAR (S1).

## Honest framing
This telemetry provides **observability, not enforcement**. Never imply an audit event
blocked an unauthorized MCP server at the OS level — it records and detects, the
customer's stack acts.
