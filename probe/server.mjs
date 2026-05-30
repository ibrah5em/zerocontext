#!/usr/bin/env node
// ZeroContext — Phase 0 probe. THROWAWAY logging MCP server.
//
// Purpose: answer the Phase 0 questions with data, not guesses —
//   1. Does the client call `get_rules` on its own, or only when nudged?
//   2. Does the client send ANY file-level signal unprompted? (expected: no)
//   3. Does the server `instructions` string land in context at session start?
//   4. Token cost of a served slice vs. a preloaded CLAUDE.md (benchmark seed).
//
// It exposes one `get_rules` tool, advertises a non-empty `instructions`
// string, and logs EVERY inbound JSON-RPC message to probe.log.
//
// HARD RULE (see .claude/skills/mcp-probe): this is throwaway. Read the log,
// record the outcome in CLAUDE.md/README.md, then delete probe/.
//
// stdout is the MCP transport — NEVER write anything but protocol frames to it.
// All human-readable output goes to stderr and probe.log.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(HERE, "probe.log");

function log(dir, payload) {
  const line = JSON.stringify({ t: new Date().toISOString(), dir, ...payload });
  try {
    appendFileSync(LOG_PATH, line + "\n");
  } catch {
    /* never let logging crash the server */
  }
  process.stderr.write(line + "\n");
}

// A non-empty instructions string. If question 3 is "yes", this text (and its
// token cost) shows up in the session. Keep it a recognizable marker.
const INSTRUCTIONS = [
  "ZeroContext probe is active. Before editing any file, call the `get_rules`",
  "tool with the file's path to fetch the rules that apply to it. Do not rely on",
  "preloaded rules — fetch them just in time, per file.",
].join(" ");

const server = new Server(
  { name: "zerocontext-probe", version: "0.0.0" },
  { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  log("handle", { method: "tools/list" });
  return {
    tools: [
      {
        name: "get_rules",
        description:
          "Fetch the ZeroContext rule slice that applies to a file or task. " +
          "Call this before editing a file.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path of the file being edited" },
            task: { type: "string", description: "Optional task description" },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  log("handle", { method: "tools/call", params: req.params });
  const { path, task } = req.params.arguments ?? {};
  return {
    content: [
      {
        type: "text",
        text:
          `ZC-PROBE marker — rules for path=${path ?? "(none)"} ` +
          `task=${task ?? "(none)"} would be served here.`,
      },
    ],
  };
});

// Log every message without recursing. Wrap `send` before connect; wrap
// `onmessage` AFTER connect, capturing the concrete handler value (NOT via a
// getter — connect() composes onmessage with its previous value, so a getter
// that re-returns our wrapper recurses infinitely).
const transport = new StdioServerTransport();

const sendUpstream = transport.send.bind(transport);
transport.send = (message, options) => {
  log("send", { message });
  return sendUpstream(message, options);
};

const estTokens = Math.ceil(INSTRUCTIONS.length / 4);
log("boot", {
  pid: process.pid,
  logPath: LOG_PATH,
  instructionsChars: INSTRUCTIONS.length,
  instructionsEstTokens: estTokens,
});

await server.connect(transport);

const handleUpstream = transport.onmessage;
transport.onmessage = (message, extra) => {
  log("recv", { message });
  return handleUpstream ? handleUpstream(message, extra) : undefined;
};
