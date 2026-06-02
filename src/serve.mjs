// `zerocontext serve` — the stdio MCP server.
//
// Spawned per session by the AI client (no long-running daemon). On startup it
// inspects the working directory, detects the stack, and activates the matching rule
// sets. It advertises a `get_rules` tool; when the agent calls it with the file it's
// about to edit, the server returns ONLY the rule slice whose globs match that file —
// not the whole rule corpus. That scoping is the token win. (See CLAUDE.md.)
//
// stdout is the MCP transport. NEVER write anything but protocol frames to it — every
// human-readable line goes to stderr, where the client surfaces it in its MCP logs.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { MCP_INSTRUCTIONS, GET_RULES_TOOL, countTokens } from "./tokens.mjs";
import { loadRuleSets, matchRuleSets } from "./rules.mjs";
import { detectStacks, suggestNestedRoots } from "./detect.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

function version() {
  try {
    return JSON.parse(readFileSync(resolve(HERE, "../package.json"), "utf8")).version;
  } catch {
    return "0.0.0";
  }
}

// Build the text returned for one get_rules call. Pure — no IO, no transport — so the
// response shape is unit-testable without standing up the server.
export function buildResponse({ path, task, active }) {
  if (active.length === 0) {
    return "ZeroContext: no rule sets are active for this project. Nothing to inject — proceed.";
  }
  // No path given: hand back everything active, and ask for a path so next time the
  // agent gets a narrower (leaner-window) slice.
  if (!path) {
    const body = active.map((s) => sectionFor(s, null)).join("\n\n---\n\n");
    return (
      "ZeroContext: no file path was given, so all active rule sets are returned. " +
      "Pass the `path` you're editing for a narrower slice.\n\n" +
      body
    );
  }
  const matches = matchRuleSets(active, path);
  if (matches.length === 0) {
    const summary = active
      .map((s) => `${s.name} (${s.globs.join(", ")})`)
      .join("; ");
    return (
      `ZeroContext: no rule set matches \`${path}\`. ` +
      `Active sets — ${summary}. No rules apply to this file; proceed.`
    );
  }
  return matches.map((s) => sectionFor(s, path)).join("\n\n---\n\n");
}

function sectionFor(set, path) {
  const scope = path ? ` for \`${path}\`` : "";
  return `<!-- ZeroContext: ${set.name} v${set.version}${scope} -->\n${set.body}`;
}

// Connect the MCP server over stdio. `root` is the project dir to inspect; `log`
// defaults to stderr. Resolves once the transport is connected (the process then
// stays alive on the stdin reader until the client disconnects).
export async function serve({
  root = process.cwd(),
  rulesDir,
  log = (m) => process.stderr.write(m + "\n"),
} = {}) {
  const allSets = loadRuleSets(rulesDir, log);
  const detected = detectStacks(root);
  const active = allSets.filter((s) => detected.has(s.name));

  log(`ZeroContext ${version()} — serving from ${root}`);
  log(`  detected: ${[...detected].join(", ") || "none"}`);
  log(
    `  active rule sets: ${
      active.map((s) => `${s.name} (${s.tokens} tok)`).join(", ") || "none"
    }`,
  );
  if (active.length === 0) {
    const shipped = new Set(allSets.map((s) => s.name));
    const nested = suggestNestedRoots(root)
      .map((n) => ({ dir: n.dir, sets: n.stacks.filter((s) => shipped.has(s)) }))
      .filter((n) => n.sets.length > 0);
    if (nested.length > 0) {
      log("  no rule set is active at this root, but a subdirectory has one:");
      for (const n of nested) {
        log(`    ./${n.dir} (${n.sets.join(", ")}) — restart with --root ${n.dir}`);
      }
    } else if (detected.size > 0) {
      log("  (stacks detected but no rule set ships for them yet — nothing to serve)");
    }
  }

  const server = new Server(
    { name: "zerocontext", version: version() },
    { capabilities: { tools: {} }, instructions: MCP_INSTRUCTIONS },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [GET_RULES_TOOL],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    if (req.params.name !== "get_rules") {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }],
      };
    }
    const { path, task } = req.params.arguments ?? {};
    const text = buildResponse({ path, task, active });
    // Log what was served and its token cost — the seed for the live token benchmark.
    const matched = path ? matchRuleSets(active, path).map((s) => s.name) : ["(all)"];
    log(
      `get_rules path=${path ?? "(none)"} task=${task ?? "(none)"} → ` +
        `${matched.join("+") || "no match"} (${countTokens(text)} tok)`,
    );
    return { content: [{ type: "text", text }] };
  });

  await server.connect(new StdioServerTransport());
  return server;
}
