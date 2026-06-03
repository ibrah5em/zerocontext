# Recording the live-agent demo

The committed `zerocontext.gif` tells beat 3 from the **server's** side (the `get_rules`
log). This runbook captures the *magical* version: the agent pulling rules **live inside
the Claude Code UI**, then writing code that follows the slice it just fetched. Phase 0
already proved the agent calls `get_rules` on its own — this just records it.

It uses the committed [`fixture/`](fixture), so the take is reproducible and short
(~2 min of doing, ~10 min total with trimming).

## Prerequisites

- Claude Code CLI installed and logged in.
- This repo checked out (the fixture's `init` wires the server straight to `bin/`, so you
  don't need a published package).
- A terminal recorder. Either works:
  - **asciinema** (`asciinema rec`) → crisp, small, text-perfect; render to GIF with `agg`.
  - **A screen recorder** (OBS, macOS `⇧⌘5`, etc.) → captures the Claude Code TUI exactly.

## Stage the take (once)

**One-command path:** `bash demo/record.sh` stages the fixture, sanity-checks the MCP
wiring, prints the prompt to paste, and starts `asciinema` (or tells you the screen-capture
fallback). The manual steps below are what it does, if you'd rather run them yourself.

```bash
cd demo/fixture
node ../../bin/zerocontext.mjs init      # writes .mcp.json → spawns the local server
```

`.mcp.json` is gitignored, so it won't get committed. Confirm Claude Code sees the server:

```bash
claude mcp list        # expect: zerocontext
```

Reset `app/main.py` between takes (it ships with a `# TODO: add the /users routes` marker
that gives the agent something to do):

```bash
git checkout demo/fixture/app/main.py
```

## The take

1. Size the terminal to **~100×30**, large font, dark theme. Clear scrollback so the
   recording starts clean.
2. Start recording.
3. Launch Claude Code in `demo/fixture` and give it exactly this:

   > Add the `/users` routes (list users and create a user) to `app/main.py`.

4. **The moment to capture:** the agent calls `get_rules` for `app/main.py` *before*
   editing (the server's MCP instructions tell it to fetch rules just-in-time). It gets
   back only the **FastAPI slice** — not the fixture's 1,568-token `CLAUDE.md` — then
   writes routes with an explicit `response_model`, an `APIRouter`, and `async def`,
   exactly as the slice prescribes.
5. Stop once the route is written. ~20–30 seconds of action is plenty.

> Do not stage or fake the tool call. If the agent skips it, the honest fix is the prompt
> ("fetch the rules for this file first"), not a doctored recording — the MCP instructions
> make the unprompted pull the normal path.

## Render & swap in

Target the hero's shape so it drops in cleanly: **~1000px wide, < ~3 MB, looping**.

```bash
# asciinema → GIF
agg --cols 100 --rows 30 demo.cast demo-live.gif

# or trim/scale a screen capture
ffmpeg -i capture.mov -vf "fps=12,scale=1000:-1:flags=lanczos" -loop 0 demo-live.gif
```

Then either overwrite `demo/zerocontext.gif`, or commit `demo-live.gif` and point the
README `<img src>` at it. Keep the deterministic `render.mjs` GIF around as the
always-reproducible fallback.
