# ACME API — agent guidance

Conventions for AI agents working in this repository. Keep this current.

## Routes & request handling

- Every route declares an explicit `response_model`; never return ORM objects or raw
  dicts from a handler. Shape the response through a Pydantic model so the schema stays
  accurate and secrets never leak into a payload by accident.
- Handlers are `async def`. Do blocking work (CPU, sync drivers) in a thread via
  `run_in_threadpool` so the event loop is never stalled.
- Inject dependencies (DB session, current user, settings) with `Depends`. Do not reach
  for module-level globals or construct a session inside the handler body.
- Raise `HTTPException` with a precise status code for client errors; let unexpected
  errors bubble to the global handler. Never return a 200 with an error envelope.
- Validate and coerce all input through Pydantic models or typed path/query params —
  never read `request.json()` by hand.

## Pydantic models

- Separate `*In` (request) and `*Out` (response) models; do not reuse one model for both
  directions. Response models must not expose internal-only fields (`password_hash`,
  soft-delete flags, internal ids).
- Use `model_config = ConfigDict(from_attributes=True)` for ORM serialization rather than
  hand-copying fields.
- Prefer `Annotated[...]` with `Field` constraints over bare types so validation rules
  live on the model.

## Database & migrations

- All access goes through SQLAlchemy 2.0 style (`select()`, `session.scalars()`); no
  legacy `Query` API, no raw SQL strings except in vetted migration scripts.
- Every schema change ships an Alembic migration in the same PR. Never edit a migration
  that has already been merged — add a new one.
- Sessions are request-scoped and provided by the `get_session` dependency; never open a
  session at import time or share one across requests.
- Index foreign keys and any column used in a `WHERE`/`ORDER BY` on a hot path.

## Testing

- Tests use `pytest` and `httpx.AsyncClient` against the ASGI app; do not spin up a real
  server. Fixtures live in `conftest.py`.
- Each test runs in a transaction that rolls back; tests must not depend on data left by
  another test or on execution order.
- Cover the unhappy paths: auth failures, validation errors, and not-found cases, not
  just the 200.
- Mock outbound HTTP at the boundary with `respx`; never hit a third-party API in a test.

## Auth & security

- Endpoints are authenticated by default via the `current_user` dependency; public routes
  opt out explicitly and are reviewed.
- Tokens are verified, not trusted — check signature, expiry, and audience on every
  request. Never log a token, password, or full PII record.
- Authorize at the resource level: a valid token is not authorization to touch another
  tenant's data.

## Deployment & ops

- The service is containerized; the image runs `uvicorn` behind the platform's TLS
  terminator. Do not bind to `0.0.0.0` in code — the platform handles networking.
- Config comes from environment variables through a single `Settings` object; no
  hardcoded URLs, hosts, or secrets, and no reading `os.environ` scattered across modules.
- Health is reported at `/health`; readiness must reflect DB connectivity.
- Structured JSON logs only; one event per line, no print statements.

## Error handling & responses

- Map domain errors to status codes in one place (an exception handler), not ad hoc in
  every route. A `NotFound` raised deep in a service becomes a 404 without the handler
  knowing about HTTP.
- Error bodies use a single envelope shape (`{ "detail": ... }`) so clients parse one
  format. Do not invent a new error shape per endpoint.
- Never leak stack traces, SQL, or internal identifiers in a 4xx/5xx body. Log the detail
  server-side; return something safe to the client.
- A validation error is a 422 with field-level detail (FastAPI does this for you) — do not
  catch and flatten it into a generic 400.

## Background tasks & jobs

- Short fire-and-forget work uses `BackgroundTasks`; anything that must survive a restart
  or retry goes to the job queue, not an in-process task.
- Jobs are idempotent — they may run more than once. Key on a stable id and no-op on a
  repeat rather than double-charging or double-sending.
- Never block a request on a slow third party; enqueue and return. The client polls or
  gets a webhook.

## Observability

- Every request carries a correlation id (incoming header or generated); thread it through
  logs and outbound calls so a trace is reconstructable.
- Emit metrics at the boundary: request count, latency histogram, error rate by route.
  Business events (signup, payment) get their own counters.
- Logs are structured JSON, one event per line, with the correlation id. No `print`, no
  multi-line tracebacks as separate log lines.

## Rate limiting & quotas

- Public and auth endpoints are rate-limited at the edge; per-tenant quotas are enforced
  in the app. A 429 includes `Retry-After`.
- Expensive endpoints (search, export, report) have tighter limits than cheap reads. Do
  not put an unbounded query behind an unauthenticated route.

## Caching

- Cache read-heavy, slow-changing data with an explicit TTL and an explicit invalidation
  path. A cache with no invalidation story is a bug waiting to happen.
- Never cache per-user or tenant-scoped data under a shared key. Include the tenant/user
  in the cache key or do not cache it.
- `Cache-Control` headers are set deliberately, not copied from another route.

## Pagination & filtering

- List endpoints are paginated by default (cursor preferred over offset for large sets);
  an unpaginated list endpoint is a denial-of-service risk.
- Filtering and sorting use an allowlist of fields — never interpolate a client-supplied
  column name into a query.
- Return enough metadata (next cursor, total when cheap) for the client to page without
  guessing.

## API versioning & compatibility

- Breaking changes ship under a new version prefix; do not silently change a field's type
  or remove a field on an existing version.
- Additive changes (new optional field, new endpoint) are fine on the current version.
- Deprecate with a header and a sunset date before removing; the OpenAPI schema documents
  the deprecation.

## Frontend notes (separate app, for context)

- The web client is a separate Next.js repo; this API is consumed over typed fetch
  clients generated from the OpenAPI schema. Keep the schema accurate — it is the
  contract.
- CORS is configured centrally; do not add per-route CORS headers.

## Git & PR hygiene

- Small, focused PRs. One migration per PR. Conventional-commit style messages.
- CI must be green (lint, types, tests) before merge; do not skip the type checker for
  expedience.
