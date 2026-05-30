import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseFrontmatter,
  globToRegExp,
  matchesGlob,
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
