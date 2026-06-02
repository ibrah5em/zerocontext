---
name: fastapi
version: 1.0.0
description: FastAPI service conventions — routing, Pydantic, async, dependencies, errors
stack_signals: [pyproject.toml]
globs: ["**/*.py"]
exclude: ["**/tests/**", "**/test_*.py", "**/*_test.py", "**/conftest.py", "**/alembic/**", "**/migrations/**", "**/__init__.py"]
---

# FastAPI conventions

- One `APIRouter` per resource in its own module, then include them on the app — often
  via a single aggregate `APIRouter` that `main.py` mounts under a version prefix. Keep
  route functions thin — parse, delegate to a service/function, return.
- Declare request and response bodies as Pydantic models. Set `response_model` on the
  route so output is validated and the schema is documented. Never return raw dicts for
  anything non-trivial.
- Validate inputs at the edge with Pydantic/`Field` constraints and typed path/query
  params — don't hand-roll validation inside the handler.
- Choose `def` vs `async def` by your I/O, not by reflex. FastAPI runs a plain `def`
  handler in a threadpool, so a sync handler over a sync driver (SQLModel/SQLAlchemy
  `Session`) is correct — not a bug to "fix" by adding `async`. The inverse is the bug:
  never make a blocking call inside `async def`. Go async only when the whole call chain
  awaits a non-blocking client, and offload CPU-bound work with `run_in_threadpool`.
- Inject shared resources (DB session, settings, current user) via `Depends`, not module
  globals. Acquire-and-release resources with a dependency that `yield`s.
- Raise `HTTPException` with an explicit `status_code` for expected failures. Don't return
  error dicts with a 200. Use the right code: 404 missing, 409 conflict, 422 is handled by
  validation already.
- Load configuration through a `pydantic-settings` `BaseSettings` object read from the
  environment — no hardcoded secrets, hosts, or DSNs.
- Use `status.HTTP_*` constants and an explicit `status_code` on routes that create
  (`201`) or return no body (`204`).
- Type every signature. Prefer `Annotated[...]` for dependency and parameter metadata.
