import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectStacks } from "../src/detect.mjs";

// Build a throwaway project dir with the given files, run detect, clean up.
function detectWith(files) {
  const dir = mkdtempSync(join(tmpdir(), "zc-detect-"));
  try {
    for (const [name, body] of Object.entries(files)) {
      writeFileSync(join(dir, name), body);
    }
    return detectStacks(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("pyproject.toml with a fastapi dep => fastapi", () => {
  const s = detectWith({
    "pyproject.toml": '[project]\ndependencies = ["fastapi>=0.110", "uvicorn"]\n',
  });
  assert.ok(s.has("fastapi"));
  assert.ok(!s.has("python"));
});

test("pyproject.toml without fastapi => plain python", () => {
  const s = detectWith({ "pyproject.toml": '[project]\ndependencies = ["flask"]\n' });
  assert.ok(s.has("python"));
  assert.ok(!s.has("fastapi"));
});

test("package.json + tsconfig.json => react-typescript", () => {
  const s = detectWith({ "package.json": "{}", "tsconfig.json": "{}" });
  assert.ok(s.has("react-typescript"));
});

test("package.json alone (no tsconfig) is not react-typescript", () => {
  const s = detectWith({ "package.json": "{}" });
  assert.ok(!s.has("react-typescript"));
});

test("Cargo.toml => rust; nx.json => monorepo", () => {
  assert.ok(detectWith({ "Cargo.toml": "[package]\n" }).has("rust"));
  assert.ok(detectWith({ "nx.json": "{}" }).has("monorepo"));
  assert.ok(detectWith({ "pnpm-workspace.yaml": "packages:\n" }).has("monorepo"));
});

test("an empty project detects nothing", () => {
  assert.equal(detectWith({}).size, 0);
});
