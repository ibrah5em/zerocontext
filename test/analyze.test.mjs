import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeText,
  splitSections,
  formatReport,
} from "../src/analyze.mjs";
import { overheadTokens, countTokens } from "../src/tokens.mjs";

// A small polyglot-ish fixture: several stacks, most irrelevant to any one task.
const FIXTURE = `# Project rules

General conventions for the whole repo.

## Python / FastAPI

Use dependency injection for route handlers. Pin versions in pyproject.toml.
Prefer async endpoints. Validate request bodies with Pydantic models.

## React / TypeScript

Function components only. Co-locate tests. No default exports for components.
Use the design-system Button, never a raw <button>.

## Rust

Avoid unwrap() outside tests. Prefer thiserror for error enums.

## Database

Use Drizzle migrations. Never write raw SQL in handlers.
`;

test("splitSections splits at headings and skips empties", () => {
  const sections = splitSections(FIXTURE);
  const titles = sections.map((s) => s.title);
  assert.ok(titles.includes("Python / FastAPI"));
  assert.ok(titles.includes("React / TypeScript"));
  assert.ok(titles.includes("Rust"));
  assert.ok(titles.includes("Database"));
  // every reported section carries a positive token count
  for (const s of sections) assert.ok(s.tokens > 0, `${s.title} has 0 tokens`);
});

test("analyzeText computes a real, non-trivial token count", () => {
  const r = analyzeText(FIXTURE, { slices: 1 });
  assert.equal(r.totalTokens, countTokens(FIXTURE));
  assert.ok(r.totalTokens > 0);
  assert.equal(r.chars, FIXTURE.length);
  assert.ok(r.sectionCount >= 4);
});

test("JIT cost = overhead + slices*(call + avgSection)", () => {
  const r = analyzeText(FIXTURE, { slices: 1 });
  assert.equal(r.overhead, overheadTokens());
  assert.equal(r.jit, r.overhead + r.slices * (r.call + r.avgSection));
});

test("savings is the baseline-vs-JIT ratio and matches the win flag", () => {
  const r = analyzeText(FIXTURE, { slices: 1 });
  const expected = (r.totalTokens - r.jit) / r.totalTokens;
  assert.ok(Math.abs(r.savings - expected) < 1e-9);
  assert.equal(r.wins, r.totalTokens > r.jit);
  assert.equal(r.breakEven, r.jit);
});

test("a tiny rule file falls below break-even (honest about losing)", () => {
  const tiny = "# Rules\n\nUse tabs.\n";
  const r = analyzeText(tiny, { slices: 1 });
  assert.equal(r.wins, false);
  assert.ok(r.savings < 0);
});

test("more slices pulled erodes the savings", () => {
  const one = analyzeText(FIXTURE, { slices: 1 });
  const many = analyzeText(FIXTURE, { slices: 4 });
  assert.ok(many.jit > one.jit);
  assert.ok(many.savings < one.savings);
});

test("formatReport renders without throwing and includes the headline number", () => {
  const r = analyzeText(FIXTURE, { slices: 1 });
  const out = formatReport("CLAUDE.md", r);
  assert.ok(out.includes("CLAUDE.md"));
  assert.ok(/tokens/.test(out));
});
