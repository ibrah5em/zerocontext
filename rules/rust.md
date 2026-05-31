---
name: rust
version: 1.0.0
description: Rust conventions — error handling, ownership, async, and API design
stack_signals: [Cargo.toml]
globs: ["**/*.rs"]
---

# Rust conventions

- Return `Result<T, E>` for fallible work; reserve `panic!`/`unwrap`/`expect` for
  invariants that truly cannot fail. In libraries, never `unwrap` on external input.
- Define a crate error type with `thiserror`; use `anyhow` only at application
  boundaries (`main`, top-level handlers), not in library APIs.
- Propagate with `?`. Don't `match` solely to re-wrap and return an error the `?`
  operator would carry for you.
- Borrow in function signatures: take `&str` over `&String`, `&[T]` over `&Vec<T>`.
  Take ownership only when the function must store or consume the value.
- Avoid `.clone()` to silence the borrow checker — restructure the borrow. A clone in a
  hot path is a deliberate, commented decision.
- In async code, never block: no `std::thread::sleep`, no blocking IO inside a task.
  Use the runtime's async equivalents; offload CPU-bound work to `spawn_blocking`.
- Make illegal states unrepresentable with enums; prefer exhaustive `match` over
  catch-all `_` arms so new variants surface as compile errors.
- Derive `Debug` on public types. Implement `Display` for errors and anything a user
  sees. Keep `unsafe` rare, localized, and justified with a `// SAFETY:` comment.
