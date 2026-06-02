# Demo

The README hero GIF (`zerocontext.gif`) and the assets that produce it.

## What the GIF shows

One real session, three beats:

1. **`analyze`** — the bundled [`fixture/`](fixture) project's `CLAUDE.md` keeps **1,568
   rule tokens** resident in *every* message. ZeroContext keeps only the slice the task
   needs (**273 tok**) → **83% fewer rule tokens in the window**.
2. **`init`** — writes one gitignored `.mcp.json` pointer. Zero rules land in your repo.
3. **the pull** — the agent opens `app/main.py` and calls `get_rules`; only the
   **447-token FastAPI slice** comes back, not the whole 1,568-token file.

Every number is captured from a real run against `fixture/`, not invented — consistent
with the project's honesty rules (the metric is *rule tokens resident in the window*, not
dollars; the mechanism is agent-**pulled** just-in-time, never reactive file-switch).

## Regenerate it

```bash
node demo/render.mjs        # → demo/zerocontext.gif
```

Needs only **ImageMagick** (`convert`, built with Pango) — no headless browser, no
`ttyd`, no network. Each frame is Pango markup drawn on a dark canvas; frames are
assembled into a looping GIF.

If you change a rule set or the fixture, refresh the captured numbers in `render.mjs`
first:

```bash
(cd demo/fixture && node ../../bin/zerocontext.mjs analyze)        # beat 1 numbers
node bin/zerocontext.mjs serve --root demo/fixture                 # beat 3 get_rules log
```

## The real-agent recording (upgrade)

The committed GIF is the deterministic, server-side telling of beat 3. For the *magical*
version — the agent pulling rules live inside the Claude Code UI — follow
[`RUNBOOK.md`](RUNBOOK.md). It uses this same `fixture/`, so it's a one-take recording you
can drop in over `zerocontext.gif` when ready.

## Files

- `render.mjs` — the GIF renderer (source of truth for the committed GIF).
- `zerocontext.gif` — the rendered hero asset the README embeds.
- `fixture/` — a realistic FastAPI project: detection signal (`pyproject.toml`), the file
  the agent edits (`app/main.py`), and a multi-section `CLAUDE.md`. Doubles as the staged
  repo for the real-agent recording.
- `RUNBOOK.md` — step-by-step to record the live Claude Code version.
