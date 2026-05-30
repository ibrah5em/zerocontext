---
name: fastapi
version: 1.0.0
description: FastAPI service conventions — routing, Pydantic, async, dependencies, errors
stack_signals: [pyproject.toml]
globs: ["**/*.py"]
---

# FastAPI conventions

- One `APIRouter` per resource in its own module; mount them on the app in `main.py`.
  Keep route functions thin — parse, delegate to a service/function, return.
- Declare request and response bodies as Pydantic models. Set `response_model` on the
  route so output is validated and the schema is documented. Never return raw dicts for
  anything non-trivial.
- Validate inputs at the edge with Pydantic/`Field` constraints and typed path/query
  params — don't hand-roll validation inside the handler.
- Endpoints that do I/O are `async def` and must `await` non-blocking clients. Never call
  a blocking library inside `async def`; run it in a threadpool or use an async client.
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
