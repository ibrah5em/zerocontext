import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  serverEntry,
  mergeServer,
  claudeAddCommand,
  runInit,
} from "../src/init.mjs";

const BIN = resolve(fileURLToPath(import.meta.url), "../../bin/zerocontext.mjs");

test("serverEntry: a source checkout runs the local bin with node", () => {
  const bin = "/home/dev/zero-context/bin/zerocontext.mjs";
  const e = serverEntry({ root: "/proj", bin });
  assert.equal(e.command, "node");
  assert.deepEqual(e.args, [bin, "serve", "--root", "/proj"]);
});

test("serverEntry: an installed package resolves by name via npx", () => {
  const bin = `${sep}usr${sep}lib${sep}node_modules${sep}zerocontext${sep}bin${sep}zerocontext.mjs`;
  const e = serverEntry({ root: "/proj", bin });
  assert.equal(e.command, "npx");
  assert.deepEqual(e.args, ["-y", "zerocontext", "serve", "--root", "/proj"]);
});

test("mergeServer: adds our server and preserves the ones already there", () => {
  const existing = { mcpServers: { other: { command: "x", args: [] } } };
  const entry = { command: "node", args: ["b", "serve"] };
  const { config, status } = mergeServer(existing, "zerocontext", entry);
  assert.equal(status, "added");
  assert.deepEqual(config.mcpServers.other, { command: "x", args: [] });
  assert.deepEqual(config.mcpServers.zerocontext, entry);
});

test("mergeServer: re-running with the same entry is a no-op (unchanged)", () => {
  const entry = { command: "node", args: ["b", "serve", "--root", "/p"] };
  const { status } = mergeServer({ mcpServers: { zerocontext: entry } }, "zerocontext", entry);
  assert.equal(status, "unchanged");
});

test("mergeServer: a different entry reports updated", () => {
  const old = { command: "node", args: ["old"] };
  const fresh = { command: "node", args: ["new"] };
  const { status, config } = mergeServer({ mcpServers: { zerocontext: old } }, "zerocontext", fresh);
  assert.equal(status, "updated");
  assert.deepEqual(config.mcpServers.zerocontext, fresh);
});

test("claudeAddCommand: renders a copy-pasteable claude mcp add line", () => {
  const line = claudeAddCommand({ command: "node", args: ["/b", "serve", "--root", "/p"] });
  assert.equal(line, "claude mcp add zerocontext -- node /b serve --root /p");
});

test("runInit --print writes nothing and prints the merge snippet", () => {
  const root = mkdtempSync(join(tmpdir(), "zc-init-"));
  const out = [];
  const code = runInit({ root, print: true, log: (m) => out.push(m) });
  const text = out.join("\n");
  assert.equal(code, 0);
  assert.ok(!existsSync(join(root, ".mcp.json")), "--print must not write a file");
  assert.match(text, /"zerocontext"/);
  assert.match(text, /claude mcp add zerocontext/);
  rmSync(root, { recursive: true, force: true });
});

test("runInit writes .mcp.json, then is idempotent on re-run", () => {
  const root = mkdtempSync(join(tmpdir(), "zc-init-"));
  const target = join(root, ".mcp.json");

  const code1 = runInit({ root, log: () => {} });
  assert.equal(code1, 0);
  assert.ok(existsSync(target));
  const written = JSON.parse(readFileSync(target, "utf8"));
  assert.ok(written.mcpServers.zerocontext, "wrote the zerocontext server");
  assert.deepEqual(written.mcpServers.zerocontext.args.slice(-2), ["--root", resolve(root)]);

  const out2 = [];
  const code2 = runInit({ root, log: (m) => out2.push(m) });
  assert.equal(code2, 0);
  assert.match(out2.join("\n"), /already points at this server/i);
  rmSync(root, { recursive: true, force: true });
});

test("runInit merges into an existing .mcp.json without dropping other servers", () => {
  const root = mkdtempSync(join(tmpdir(), "zc-init-"));
  const target = join(root, ".mcp.json");
  writeFileSync(target, JSON.stringify({ mcpServers: { probe: { command: "node", args: ["p"] } } }));

  runInit({ root, log: () => {} });
  const written = JSON.parse(readFileSync(target, "utf8"));
  assert.deepEqual(written.mcpServers.probe, { command: "node", args: ["p"] });
  assert.ok(written.mcpServers.zerocontext, "added without clobbering probe");
  rmSync(root, { recursive: true, force: true });
});

test("runInit refuses to clobber a malformed .mcp.json", () => {
  const root = mkdtempSync(join(tmpdir(), "zc-init-"));
  const target = join(root, ".mcp.json");
  writeFileSync(target, "{ not valid json");

  const errs = [];
  const code = runInit({ root, log: () => {}, errLog: (m) => errs.push(m) });
  assert.equal(code, 1);
  assert.equal(readFileSync(target, "utf8"), "{ not valid json", "left the bad file untouched");
  assert.match(errs.join("\n"), /isn't valid JSON/i);
  rmSync(root, { recursive: true, force: true });
});

test("bare init advises --root when the stack is in a subdir, and writes nothing", () => {
  const root = mkdtempSync(join(tmpdir(), "zc-init-"));
  mkdirSync(join(root, "backend"));
  writeFileSync(join(root, "backend", "pyproject.toml"), 'dependencies = ["fastapi"]\n');

  const out = [];
  // No `root` => bare `init` from this cwd; the advisory should fire.
  const code = runInit({ cwd: root, log: (m) => out.push(m) });
  const text = out.join("\n");
  assert.equal(code, 0);
  assert.ok(!existsSync(join(root, ".mcp.json")), "must not wire a no-op root config");
  assert.match(text, /no rule set is active/i);
  assert.match(text, /--root backend/);
  rmSync(root, { recursive: true, force: true });
});

test("an explicit --root is honored even when a sibling subdir has a stack", () => {
  const root = mkdtempSync(join(tmpdir(), "zc-init-"));
  mkdirSync(join(root, "backend"));
  writeFileSync(join(root, "backend", "pyproject.toml"), 'dependencies = ["fastapi"]\n');

  // root is passed explicitly (== the parent), so init writes instead of advising.
  const code = runInit({ root, log: () => {} });
  assert.equal(code, 0);
  assert.ok(existsSync(join(root, ".mcp.json")), "explicit root writes the config");
  rmSync(root, { recursive: true, force: true });
});

// End-to-end through the real bin, exactly as a user runs it.
test("bin: zerocontext init --print --root <tmp> exits 0 and prints config", () => {
  const root = mkdtempSync(join(tmpdir(), "zc-init-"));
  const r = spawnSync("node", [BIN, "init", "--print", "--root", root], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /"zerocontext"/);
  assert.ok(!existsSync(join(root, ".mcp.json")), "--print must not write");
  rmSync(root, { recursive: true, force: true });
});
