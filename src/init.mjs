// `zerocontext init` — the one command between `npx zerocontext` and a live MCP
// connection. It writes (merges) the Claude Code MCP server config so the client spawns
// `zerocontext serve` per session. No daemon, no rules in your repo: the server ships
// its own MCP `instructions` telling the agent to fetch rules just-in-time.
//
// Default target is the project-scoped `.mcp.json` at the repo root — the documented,
// stable Claude Code MCP config. It's a *pointer* (command + args), never rules, and is
// gitignored by ZeroContext's own template, so it adds no committed footprint. We merge
// (never clobber): any servers already in `.mcp.json` are preserved.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { detectStacks, suggestNestedRoots } from "./detect.mjs";
import { loadRuleSets } from "./rules.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// When `root` has no active rule set but a subdirectory does, return [{ dir, sets }]
// so init can point the user at it (e.g. `backend/` on full-stack-fastapi-template)
// instead of wiring a config that serves nothing. Empty when the root is already
// servable — or when nothing nearby is either.
function nestedRootAdvice(root) {
  const shipped = new Set(loadRuleSets().map((s) => s.name));
  const rootActive = [...detectStacks(root)].some((s) => shipped.has(s));
  if (rootActive) return [];
  return suggestNestedRoots(root)
    .map((n) => ({ dir: n.dir, sets: n.stacks.filter((s) => shipped.has(s)) }))
    .filter((n) => n.sets.length > 0);
}

// Absolute path to the CLI that's running this. In a published install and in a source
// checkout the layout is the same (files: bin, src, rules), so this relative hop holds.
export function defaultBin() {
  return resolve(HERE, "../bin/zerocontext.mjs");
}

// Build the MCP server entry for `.mcp.json`. Two forms, auto-detected from where the
// CLI is installed:
//   • installed as a package (bin under node_modules / the npx cache) → `npx -y
//     zerocontext serve`, resolved by name so it survives the npx cache being cleared.
//   • source checkout (bin not under node_modules) → `node <abs-bin> serve`, so a
//     pre-publish dogfood actually runs.
// `--root <absRoot>` is always pinned: `.mcp.json` here is machine-specific (and
// gitignored), and an explicit root removes any ambiguity about the server's cwd.
export function serverEntry({ root, bin = defaultBin() } = {}) {
  const installed = bin.split(sep).includes("node_modules");
  return installed
    ? { command: "npx", args: ["-y", "zerocontext", "serve", "--root", root] }
    : { command: "node", args: [bin, "serve", "--root", root] };
}

function sameEntry(a, b) {
  if (!a || !b || a.command !== b.command) return false;
  const x = a.args ?? [];
  const y = b.args ?? [];
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

// Merge one server into a parsed `.mcp.json` object. Pure: preserves every other server
// and top-level key. Returns the new config and what happened, so the CLI can report it
// honestly (and stay idempotent on re-run).
export function mergeServer(existing, name, entry) {
  const config = { ...(existing ?? {}) };
  const servers = { ...(config.mcpServers ?? {}) };
  const prior = servers[name];
  const status = !prior ? "added" : sameEntry(prior, entry) ? "unchanged" : "updated";
  servers[name] = entry;
  config.mcpServers = servers;
  return { config, status };
}

// The `claude mcp add` line that does the same thing — handy as a copy/paste escape
// hatch (and the only path for non-Claude MCP clients).
export function claudeAddCommand(entry, name = "zerocontext") {
  return `claude mcp add ${name} -- ${entry.command} ${entry.args.join(" ")}`;
}

// IO entry point used by the CLI. Returns an exit code.
export function runInit({
  cwd = process.cwd(),
  root,
  bin = defaultBin(),
  print = false,
  log = console.log,
  errLog = (m) => process.stderr.write(m + "\n"),
} = {}) {
  const absRoot = resolve(cwd, root ?? ".");
  const target = resolve(absRoot, ".mcp.json");
  const entry = serverEntry({ root: absRoot, bin });

  if (print) {
    log("ZeroContext init --print (dry run — nothing written)\n");
    log(`Merge this into ${target} (under "mcpServers"):\n`);
    log(JSON.stringify({ mcpServers: { zerocontext: entry } }, null, 2));
    log("\nOr let the Claude CLI do it:");
    log(`  ${claudeAddCommand(entry)}`);
    return 0;
  }

  // Advisory (the common first-run miss): the user ran a bare `init` in a repo whose
  // ROOT has no servable stack, but a subdirectory does — the layout every popular
  // full-stack template uses. Point them at it instead of silently wiring a no-op
  // config. An explicit `--root` is always honored as intent (incl. `--root .`).
  if (root == null) {
    const advice = nestedRootAdvice(absRoot);
    if (advice.length > 0) {
      log("ZeroContext init — no rule set is active at this directory.\n");
      for (const a of advice) log(`  Found a ${a.sets.join(", ")} project in ./${a.dir}`);
      log("\nRe-run pointed at the subdirectory you work in:");
      log(`  npx zerocontext init --root ${advice[0].dir}`);
      log("\n(Or wire this directory anyway with `--root .` if that's intentional.)");
      return 0;
    }
  }

  // Never clobber a file we can't parse — a malformed `.mcp.json` is the user's, and may
  // hold servers we'd destroy. Bail loudly instead.
  let existing = {};
  const existed = existsSync(target);
  if (existed) {
    try {
      existing = JSON.parse(readFileSync(target, "utf8"));
    } catch (e) {
      errLog(`zerocontext init: ${target} exists but isn't valid JSON (${e.message}).`);
      errLog("Fix or remove it, then re-run. (Re-run with --print to see what to add.)");
      return 1;
    }
  }

  const { config, status } = mergeServer(existing, "zerocontext", entry);

  log("ZeroContext init — wiring the local MCP server into Claude Code\n");

  if (status === "unchanged") {
    log(`✓ ${target} already points at this server — nothing to change.`);
    log(`  zerocontext: ${entry.command} ${entry.args.join(" ")}`);
    return 0;
  }

  writeFileSync(target, JSON.stringify(config, null, 2) + "\n");

  const verb = !existed ? "Created" : status === "added" ? "Updated" : "Updated server in";
  log(`✓ ${verb} ${target}`);
  log(`  zerocontext: ${entry.command} ${entry.args.join(" ")}\n`);
  log("Next:");
  log("  1. Restart Claude Code in this project (or run /mcp to reconnect).");
  log("  2. The server advertises a get_rules tool and ships MCP instructions telling the");
  log("     agent to fetch rules just-in-time — no CLAUDE.md edit, no rules in your repo.\n");
  log(`Tip: .mcp.json holds machine-specific paths — gitignore it if your repo doesn't already.`);
  return 0;
}
