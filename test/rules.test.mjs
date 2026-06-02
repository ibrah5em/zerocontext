import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseFrontmatter,
  globToRegExp,
  matchesGlob,
  loadRuleSet,
  loadRuleSets,
  matchRuleSets,
} from "../src/rules.mjs";

test("parseFrontmatter reads scalars and inline arrays", () => {
  const src = `---
name: fastapi
version: 1.0.0
description: "FastAPI: routing, deps"
stack_signals: [pyproject.toml]
globs: ["**/*.py", "**/*.pyi"]
exclude: ["**/tests/**", "**/conftest.py"]
---
body line one
body line two
`;
  const { meta, body } = parseFrontmatter(src);
  assert.equal(meta.name, "fastapi");
  assert.equal(meta.version, "1.0.0");
  assert.equal(meta.description, "FastAPI: routing, deps"); // colon inside value survives
  assert.deepEqual(meta.stack_signals, ["pyproject.toml"]);
  assert.deepEqual(meta.globs, ["**/*.py", "**/*.pyi"]);
  assert.deepEqual(meta.exclude, ["**/tests/**", "**/conftest.py"]);
  assert.equal(body.trim(), "body line one\nbody line two");
});

test("parseFrontmatter returns empty meta when there is no frontmatter", () => {
  const { meta, body } = parseFrontmatter("# just markdown\n");
  assert.deepEqual(meta, {});
  assert.equal(body, "# just markdown\n");
});

test("globToRegExp matches files at any depth, absolute or relative", () => {
  const re = globToRegExp("**/*.py");
  assert.ok(re.test("main.py"));
  assert.ok(re.test("app/main.py"));
  assert.ok(re.test("/home/u/proj/app/api/routes.py"));
  assert.ok(!re.test("app/main.ts"));
  assert.ok(!re.test("notes.py.txt"));
});

test("globToRegExp: single star stays within one path segment", () => {
  assert.ok(matchesGlob("src/a.ts", "src/*.ts"));
  assert.ok(!matchesGlob("src/nested/a.ts", "src/*.ts"));
});

test("loadRuleSets finds the shipped fastapi set", () => {
  const sets = loadRuleSets();
  const fastapi = sets.find((s) => s.name === "fastapi");
  assert.ok(fastapi, "fastapi rule set should ship in rules/");
  assert.deepEqual(fastapi.globs, ["**/*.py"]);
  assert.ok(fastapi.tokens > 0);
  assert.ok(fastapi.body.length > 0);
});

test("matchRuleSets returns only the slice whose globs match the path", () => {
  const sets = [
    { name: "fastapi", globs: ["**/*.py"] },
    { name: "react", globs: ["**/*.tsx", "**/*.ts"] },
  ];
  assert.deepEqual(
    matchRuleSets(sets, "app/main.py").map((s) => s.name),
    ["fastapi"],
  );
  assert.deepEqual(
    matchRuleSets(sets, "web/Button.tsx").map((s) => s.name),
    ["react"],
  );
  assert.deepEqual(matchRuleSets(sets, "README.md"), []);
  assert.deepEqual(matchRuleSets(sets, undefined), []);
});

test("loadRuleSet defaults exclude to [] when frontmatter omits it", () => {
  const dir = mkdtempSync(join(tmpdir(), "zc-rules-"));
  const file = join(dir, "minimal.md");
  writeFileSync(file, `---\nname: minimal\nglobs: ["**/*.py"]\n---\nbody\n`);
  const set = loadRuleSet(file);
  rmSync(dir, { recursive: true, force: true });
  assert.deepEqual(set.exclude, []);
});

test("matchRuleSets subtracts exclude: a glob hit that is also excluded does not match", () => {
  const sets = [
    { name: "fastapi", globs: ["**/*.py"], exclude: ["**/tests/**", "**/conftest.py"] },
  ];
  // app code matches; test code is carved back out by exclude.
  assert.deepEqual(
    matchRuleSets(sets, "app/api/routers/users.py").map((s) => s.name),
    ["fastapi"],
  );
  assert.deepEqual(matchRuleSets(sets, "tests/test_users.py"), []);
  assert.deepEqual(matchRuleSets(sets, "app/conftest.py"), []);
});

// Regression guard for the dogfooding fixes — assert the REAL shipped sets, so a future
// glob/exclude edit that re-breaks relevance fails here.
test("shipped sets serve the right slice for representative paths", () => {
  const sets = loadRuleSets();
  const served = (path) => new Set(matchRuleSets(sets, path).map((s) => s.name));

  // fastapi: app code in, tests + migrations out (the over-serve fix). Real paths from
  // the full-stack-fastapi-template, which is what these were dogfooded against.
  assert.ok(served("app/api/routes/items.py").has("fastapi"));
  assert.ok(served("app/core/config.py").has("fastapi")); // settings file still gets rules
  assert.ok(!served("tests/test_users.py").has("fastapi"));
  assert.ok(!served("alembic/versions/1a2b3c_create_users.py").has("fastapi"));
  // Empty package markers shouldn't pull the whole routing rule set (dogfood finding).
  assert.ok(!served("app/api/routes/__init__.py").has("fastapi"));

  // nextjs: the src/app layout now matches (the under-serve fix).
  assert.ok(served("src/app/page.tsx").has("nextjs"));

  // drizzle: a single-file schema.ts now matches (the under-serve fix).
  assert.ok(served("src/schema.ts").has("node-postgres-drizzle"));
  assert.ok(served("schema.ts").has("node-postgres-drizzle"));
  assert.ok(served("lib/db/queries.ts").has("node-postgres-drizzle"));

  // react-typescript: config + type-decl files no longer get component rules.
  assert.ok(served("src/Button.tsx").has("react-typescript"));
  assert.ok(!served("vite.config.ts").has("react-typescript"));
  assert.ok(!served("src/env.d.ts").has("react-typescript"));

  // Spec files and __tests__/ dirs are tests too — no component/ORM rules (dogfood fix).
  assert.ok(!served("src/Button.spec.tsx").has("react-typescript"));
  assert.ok(!served("src/__tests__/util.ts").has("react-typescript"));
  assert.ok(!served("lib/db/repo.spec.ts").has("node-postgres-drizzle"));
});
