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

test("resident tokens = overhead + slices*(call + avgSection)", () => {
  const r = analyzeText(FIXTURE, { slices: 1 });
  assert.equal(r.overhead, overheadTokens());
  assert.equal(r.resident, r.overhead + r.slices * (r.call + r.avgSection));
});

test("reduction is the resident-token ratio and matches the win flag", () => {
  const r = analyzeText(FIXTURE, { slices: 1 });
  const expected = (r.totalTokens - r.resident) / r.totalTokens;
  assert.ok(Math.abs(r.reduction - expected) < 1e-9);
  assert.equal(r.wins, r.totalTokens > r.resident);
  assert.equal(r.breakEven, r.resident);
});

test("a tiny rule file falls below break-even (honest about losing)", () => {
  const tiny = "# Rules\n\nUse tabs.\n";
  const r = analyzeText(tiny, { slices: 1 });
  assert.equal(r.wins, false);
  assert.ok(r.reduction < 0);
});

test("more slices pulled erodes the reduction", () => {
  const one = analyzeText(FIXTURE, { slices: 1 });
  const many = analyzeText(FIXTURE, { slices: 4 });
  assert.ok(many.resident > one.resident);
  assert.ok(many.reduction < one.reduction);
});

test("formatReport renders without throwing and includes the headline number", () => {
  const r = analyzeText(FIXTURE, { slices: 1 });
  const out = formatReport("CLAUDE.md", r);
  assert.ok(out.includes("CLAUDE.md"));
  assert.ok(/tokens/.test(out));
});

test("formatReport frames the win as window-scoping, not cost savings", () => {
  // A doc large enough to clear break-even, so we hit the "win" branch.
  const big =
    "# Rules\n\n" +
    Array.from(
      { length: 12 },
      (_, i) =>
        `## Section ${i}\n\n` +
        "Use dependency injection and validate inputs carefully. ".repeat(8),
    ).join("\n\n");
  const r = analyzeText(big, { slices: 1 });
  assert.ok(r.wins, "fixture must clear break-even to exercise the win branch");
  const out = formatReport("CLAUDE.md", r);
  // The headline is fewer resident tokens, not "savings" — the A/B showed JIT
  // doesn't win on cost, so the word must not reappear in the user-facing report.
  assert.ok(/fewer rule tokens in the window/.test(out));
  assert.ok(/Scope, not \$/.test(out));
  assert.ok(!/saving/i.test(out), "report must not claim 'savings'");
});
