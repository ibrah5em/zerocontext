import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectStacks, suggestNestedRoots } from "../src/detect.mjs";

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

test("tsconfig + a react dep => react-typescript", () => {
  const s = detectWith({
    "package.json": JSON.stringify({ dependencies: { react: "^18" } }),
    "tsconfig.json": "{}",
  });
  assert.ok(s.has("react-typescript"));
});

test("tsconfig without a react dep is not react-typescript", () => {
  const s = detectWith({ "package.json": "{}", "tsconfig.json": "{}" });
  assert.ok(!s.has("react-typescript"));
});

test("package.json alone (no tsconfig) is not react-typescript", () => {
  const s = detectWith({ "package.json": "{}" });
  assert.ok(!s.has("react-typescript"));
});

test("a next dep => nextjs, and react-typescript too (Next is React+TS)", () => {
  const s = detectWith({
    "package.json": JSON.stringify({ dependencies: { next: "^14", react: "^18" } }),
    "tsconfig.json": "{}",
  });
  assert.ok(s.has("nextjs"));
  assert.ok(s.has("react-typescript"));
});

test("a next.config file => nextjs even without the dep", () => {
  const s = detectWith({
    "package.json": "{}",
    "next.config.mjs": "export default {};\n",
  });
  assert.ok(s.has("nextjs"));
});

test("drizzle-orm + pg => node-postgres-drizzle", () => {
  const s = detectWith({
    "package.json": JSON.stringify({
      dependencies: { "drizzle-orm": "^0.30", pg: "^8" },
    }),
  });
  assert.ok(s.has("node-postgres-drizzle"));
});

test("a drizzle.config file => node-postgres-drizzle", () => {
  const s = detectWith({
    "package.json": "{}",
    "drizzle.config.ts": "export default {};\n",
  });
  assert.ok(s.has("node-postgres-drizzle"));
});

test("drizzle-orm without a postgres driver => no drizzle set", () => {
  const s = detectWith({
    "package.json": JSON.stringify({ dependencies: { "drizzle-orm": "^0.30" } }),
  });
  assert.ok(!s.has("node-postgres-drizzle"));
});

test("a TypeScript Drizzle backend is not mislabeled react-typescript", () => {
  const s = detectWith({
    "package.json": JSON.stringify({
      dependencies: { "drizzle-orm": "^0.30", pg: "^8", express: "^4" },
    }),
    "tsconfig.json": "{}",
  });
  assert.ok(s.has("node-postgres-drizzle"));
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

// suggestNestedRoots: the full-stack-template layout (real project one level down).
test("suggestNestedRoots finds a stack in a child dir when the root has none", () => {
  const dir = mkdtempSync(join(tmpdir(), "zc-nested-"));
  try {
    mkdirSync(join(dir, "backend"));
    writeFileSync(join(dir, "backend", "pyproject.toml"), 'dependencies = ["fastapi"]\n');
    mkdirSync(join(dir, "frontend"));
    writeFileSync(
      join(dir, "frontend", "package.json"),
      JSON.stringify({ dependencies: { next: "^14", react: "^18" } }),
    );
    writeFileSync(join(dir, "frontend", "tsconfig.json"), "{}");

    assert.equal(detectStacks(dir).size, 0, "root itself has no signal");
    const found = suggestNestedRoots(dir);
    const byDir = Object.fromEntries(found.map((f) => [f.dir, f.stacks]));
    assert.ok(byDir.backend.includes("fastapi"));
    assert.ok(byDir.frontend.includes("nextjs"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("suggestNestedRoots skips node_modules and dot-dirs", () => {
  const dir = mkdtempSync(join(tmpdir(), "zc-nested-"));
  try {
    mkdirSync(join(dir, "node_modules"));
    writeFileSync(join(dir, "node_modules", "Cargo.toml"), "[package]\n");
    assert.equal(suggestNestedRoots(dir).length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
