import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildResponse } from "../src/serve.mjs";

const BIN = resolve(fileURLToPath(import.meta.url), "../../bin/zerocontext.mjs");

const FASTAPI = { name: "fastapi", version: "1.0.0", globs: ["**/*.py"], body: "FASTAPI BODY" };
const REACT = { name: "react", version: "1.0.0", globs: ["**/*.tsx"], body: "REACT BODY" };

test("buildResponse: no active sets => honest 'nothing to inject'", () => {
  const out = buildResponse({ path: "app/main.py", active: [] });
  assert.match(out, /no rule sets are active/i);
});

test("buildResponse: a matching path returns only that set's body", () => {
  const out = buildResponse({ path: "app/main.py", active: [FASTAPI, REACT] });
  assert.match(out, /FASTAPI BODY/);
  assert.ok(!out.includes("REACT BODY"), "must not leak the non-matching slice");
  assert.match(out, /fastapi v1\.0\.0/);
});

test("buildResponse: a path with no matching set says so, names active sets", () => {
  const out = buildResponse({ path: "README.md", active: [FASTAPI] });
  assert.match(out, /no rule set matches/i);
  assert.match(out, /fastapi/);
});

test("buildResponse: no path returns all active sets and asks for a path", () => {
  const out = buildResponse({ path: undefined, active: [FASTAPI, REACT] });
  assert.match(out, /no file path/i);
  assert.match(out, /FASTAPI BODY/);
  assert.match(out, /REACT BODY/);
});

// Drive the real server over stdio exactly as a client would: a handshake, then
// tools/list and a get_rules call. Confirms the SDK wiring, not just the pure logic.
test("serve over stdio: get_rules returns the fastapi slice for a .py file", async () => {
  const root = mkdtempSync(join(tmpdir(), "zc-serve-"));
  writeFileSync(join(root, "pyproject.toml"), '[project]\ndependencies = ["fastapi"]\n');

  const frames = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "0" } } },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_rules", arguments: { path: "app/main.py", task: "add a route" } } },
  ];

  const responses = await runServer(root, frames);
  rmSync(root, { recursive: true, force: true });

  const list = responses.get(2);
  assert.ok(list, "expected a tools/list response");
  assert.equal(list.result.tools[0].name, "get_rules");

  const call = responses.get(3);
  assert.ok(call, "expected a tools/call response");
  const text = call.result.content[0].text;
  assert.match(text, /FastAPI conventions/, "should serve the shipped fastapi body");
  assert.match(text, /app\/main\.py/);
});

// Spawn the bin, write all frames, close stdin, collect stdout, parse by id.
function runServer(root, frames) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("node", [BIN, "serve", "--root", root]);
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("error", reject);
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("server did not exit within timeout"));
    }, 10000);
    child.on("close", () => {
      clearTimeout(timer);
      const byId = new Map();
      for (const line of out.split("\n")) {
        const t = line.trim();
        if (!t) continue;
        const msg = JSON.parse(t);
        if (msg.id !== undefined) byId.set(msg.id, msg);
      }
      resolvePromise(byId);
    });
    for (const f of frames) child.stdin.write(JSON.stringify(f) + "\n");
    child.stdin.end();
  });
}
