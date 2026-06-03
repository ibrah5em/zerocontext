#!/usr/bin/env bash
# Stage and record the live-agent demo (beat 3 of the hero GIF) in one command.
# See RUNBOOK.md for the full storyboard. You drive Claude Code; this just stages
# the fixture, sanity-checks the MCP wiring, and starts the recorder.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/.." && pwd)"
fixture="$here/fixture"

echo "→ Staging $fixture"
( cd "$fixture" && node "$repo/bin/zerocontext.mjs" init >/dev/null )   # writes gitignored .mcp.json
git -C "$repo" checkout -- demo/fixture/app/main.py 2>/dev/null || true  # reset the TODO marker

if command -v claude >/dev/null 2>&1; then
  echo "→ MCP servers Claude Code can see:"
  claude mcp list || true
else
  echo "⚠  'claude' CLI not found — install/login before recording (see RUNBOOK.md)."
fi

cat <<'PROMPT'

→ Ready. Start Claude Code in demo/fixture and paste exactly:

    Add the /users routes (list users and create a user) to app/main.py.

  Capture the moment the agent calls get_rules for app/main.py BEFORE editing,
  gets back only the FastAPI slice, and writes routes that follow it.
  Stop once the route is written (~20–30s of action is plenty).

PROMPT

if command -v asciinema >/dev/null 2>&1; then
  echo "→ Starting asciinema → $here/demo.cast  (Ctrl-D to stop)"
  exec asciinema rec "$here/demo.cast" --overwrite
else
  echo "⚠  asciinema not found — record with your screen recorder instead, then:"
  echo "     ffmpeg -i capture.mov -vf 'fps=12,scale=1000:-1:flags=lanczos' -loop 0 demo-live.gif"
fi
