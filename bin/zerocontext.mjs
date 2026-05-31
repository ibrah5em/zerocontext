#!/usr/bin/env node
// ZeroContext CLI. `analyze` and `serve` are implemented; `init` arrives next.
import { resolve } from "node:path";
import { runAnalyze } from "../src/analyze.mjs";

const USAGE = `zerocontext — serve only the AI rules that match the file you're working on.

Usage:
  zerocontext serve [--root <dir>]
                          Run the stdio MCP server. Inspects the project, detects the
                          stack, and serves only the rule slice matching the file the
                          agent is editing (via the get_rules tool).
  zerocontext analyze [--file <path>] [--slices <n>]
                          Print how many rule tokens your CLAUDE.md/.cursorrules keeps
                          resident in every message, vs. just-in-time slices.
  zerocontext init        (coming next) write MCP config pointing at the local server.

Options for serve:
  --root <dir>    Project directory to inspect (default: current directory).

Options for analyze:
  --file <path>   Analyze a specific rule file instead of auto-discovering.
  --slices <n>    Rule slices a typical task pulls (default 1).
`;

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") flags.file = argv[++i];
    else if (a === "--root") flags.root = argv[++i];
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
  case "serve": {
    // Defer importing the MCP SDK until we actually serve, so `analyze`/`init`
    // never pay for it. serve() writes only protocol frames to stdout.
    const { serve } = await import("../src/serve.mjs");
    await serve({ root: flags.root ? resolve(flags.root) : process.cwd() });
    // Resolves once connected; the stdin reader keeps the process alive until the
    // client disconnects. Do not exit here.
    break;
  }
  case "init": {
    // Lead with what the command delivers (CLAUDE.md: value first), stay honest
    // that it's unshipped, point at what works, and exit non-zero so nothing
    // mistakes a stub for a finished command.
    console.error(
      "zerocontext init will write the MCP config that points your AI client at the " +
        "local ZeroContext server.\n" +
        "Coming next — not built yet.\n" +
        "Available now:  zerocontext serve     (run the MCP server)\n" +
        "                zerocontext analyze   (see how many rule tokens your CLAUDE.md keeps in every message)",
    );
    process.exit(1);
    break;
  }
  default:
    console.error(`Unknown command: ${cmd}\n`);
    console.log(USAGE);
    process.exit(1);
}
