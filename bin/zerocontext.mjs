#!/usr/bin/env node
// ZeroContext CLI. Only `analyze` is implemented; `init`/`serve` arrive in Phase 1.
import { runAnalyze } from "../src/analyze.mjs";

const USAGE = `zerocontext — serve only the AI rules that match the file you're working on.

Usage:
  zerocontext analyze [--file <path>] [--slices <n>]
                          Print what your CLAUDE.md/.cursorrules costs in tokens
                          per message, and the projected just-in-time cost.
  zerocontext init        (coming in Phase 1) write MCP config for the local server.
  zerocontext serve       (coming in Phase 1) run the stdio MCP server.

Options for analyze:
  --file <path>   Analyze a specific rule file instead of auto-discovering.
  --slices <n>    Rule slices a typical task pulls (default 1).
`;

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") flags.file = argv[++i];
    else if (a === "--slices") flags.slices = Number(argv[++i]);
    else if (a === "--exact") flags.exact = true;
    else if (a === "--help" || a === "-h") flags.help = true;
  }
  return flags;
}

const [, , cmd, ...rest] = process.argv;
const flags = parseFlags(rest);

if (!cmd || flags.help || cmd === "help" || cmd === "-h" || cmd === "--help") {
  console.log(USAGE);
  process.exit(0);
}

switch (cmd) {
  case "analyze": {
    if (flags.exact) {
      console.error(
        "--exact (Claude's count_tokens API) is not implemented yet. " +
          "Running with the local o200k estimate instead.\n",
      );
    }
    const slices =
      Number.isFinite(flags.slices) && flags.slices > 0 ? flags.slices : 1;
    process.exit(runAnalyze({ file: flags.file, slices }));
    break;
  }
  case "init":
  case "serve": {
    const willDo =
      cmd === "init"
        ? "write the MCP config that points your AI client at the local ZeroContext server"
        : "run the stdio MCP server that serves only the rules matching the file you're working on";
    // Lead with what the command delivers (CLAUDE.md: value first), stay honest
    // that it's unshipped, point at what works, and exit non-zero so nothing
    // mistakes a stub for a finished command.
    console.error(
      `zerocontext ${cmd} will ${willDo}.\n` +
        `Coming in Phase 1 — not built yet.\n` +
        `Available now:  zerocontext analyze   (see what your CLAUDE.md costs per message)`,
    );
    process.exit(1);
    break;
  }
  default:
    console.error(`Unknown command: ${cmd}\n`);
    console.log(USAGE);
    process.exit(1);
}
