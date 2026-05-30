# Phase 0 probe (throwaway)

A logging MCP server that answers the Phase 0 gate with data. **Delete `probe/` once
the outcome is recorded in the repo's `CLAUDE.md` / `README.md`.** It is not the product.

## Run it

```bash
npm install --prefix probe          # one-time: pull @modelcontextprotocol/sdk
```

Then point Claude Code at it. A repo-root `.mcp.json` is already written:

```json
{
  "mcpServers": {
    "zerocontext-probe": {
      "command": "node",
      "args": ["/home/ibrah5em/projects/zero-context/probe/server.mjs"]
    }
  }
}
```

Restart Claude Code in this directory and approve the `zerocontext-probe` server. Then
drive a realistic task that edits files across two stacks (e.g. a `.py` and a `.tsx`).

Watch the log live in another terminal:

```bash
npm run log --prefix probe          # tail -f probe.log
```

## What to look for (maps to the four Phase 0 questions)

Every inbound JSON-RPC message is logged as a line in `probe.log` with `"dir":"recv"`;
our own responses are `"dir":"send"`; tool handlers log `"dir":"handle"`.

1. **Does the agent call `get_rules` on its own?** Grep for `tools/call`. Did it fire
   without you telling it to? With what `path` argument? Compare a run where `CLAUDE.md`
   says "call get_rules before editing" vs. a run where it doesn't.
2. **Any unprompted file-level signal?** Scan every `recv` line. Is there *anything*
   that names the file you're working on, outside of arguments the model itself chose to
   send? (Expected: no — confirm it.)
3. **Does `instructions` land in context?** The boot line logs its char count and a
   rough token estimate. Check whether the model behaves as if it saw the instructions
   (e.g. calls `get_rules` unprompted). Cross-check token cost with `token-benchmark`.
4. **Token cost of a slice vs. a full `CLAUDE.md`.** The `get_rules` response is a marker
   now; once you know it's being called, swap in a real FastAPI slice and measure with
   the `token-benchmark` skill.

## Smoke test (no Claude Code needed)

Pipe a newline-delimited MCP handshake straight into the server and confirm it answers
on stdout and logs to `probe.log`:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_rules","arguments":{"path":"app/main.py"}}}' \
  | node probe/server.mjs
```

Expect 3 JSON-RPC responses on stdout (initialize / tools/list / tools/call) and, in
`probe.log`: one `boot` line, 4 `recv` lines, 3 `send` lines — each message logged
exactly once. (Verified on `@modelcontextprotocol/sdk` 1.29.0, Node 24.)
