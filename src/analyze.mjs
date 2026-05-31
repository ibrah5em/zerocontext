// `zerocontext analyze` — the shareable front door.
//
// Runs on anyone's repo and prints, with no API key required:
//   1. How many rule tokens your CLAUDE.md / .cursorrules keeps resident in the context
//      window on every message (a real count of your file — not a guess).
//   2. How many ZeroContext would keep resident instead (just-in-time: a small fixed
//      overhead + the one slice a task actually needs), and the break-even where it
//      keeps fewer. Slice size comes from your file's own sections, so it's grounded
//      in your data, not invented.
//
// This is a *scoping* number (rule tokens in the window), NOT a session-cost number:
// a preloaded CLAUDE.md is prompt-cached, so the win is relevance + a smaller window,
// not a lower bill. The Phase 0 A/B found just-in-time ran cost-neutral-to-higher end
// to end — never reframe this output as dollar/token savings. (See CLAUDE.md / memory.)
import { readFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import {
  countTokens,
  overheadTokens,
  CALL_TOKENS,
  TOKENIZER_LABEL,
} from "./tokens.mjs";

// Rule files we know how to read. Kept deliberately narrow.
export const KNOWN_RULE_FILES = ["CLAUDE.md", "AGENTS.md", ".cursorrules"];

const n = (x) => Math.round(x).toLocaleString("en-US");
const pct = (x) => `${Math.round(x * 100)}%`;

// Split a markdown rule file into sections at headings. Each section is a candidate
// "slice" — the unit ZeroContext would serve on demand. The text before the first
// heading is treated as its own (preamble) section. Empty sections are dropped.
export function splitSections(md) {
  const lines = md.split(/\r?\n/);
  const secs = [];
  let cur = { title: "(preamble)", lines: [] };
  for (const line of lines) {
    if (/^#{1,6}\s/.test(line)) {
      secs.push(cur);
      cur = { title: line.replace(/^#+\s*/, "").trim(), lines: [line] };
    } else {
      cur.lines.push(line);
    }
  }
  secs.push(cur);
  return secs
    .map((s) => ({ title: s.title, text: s.lines.join("\n") }))
    .filter((s) => s.text.trim().length > 0)
    .map((s) => ({
      title: s.title,
      tokens: countTokens(s.text),
      chars: s.text.length,
    }));
}

// Pure computation: given the rule text, return the numbers. No IO. Unit-testable.
export function analyzeText(text, { slices = 1 } = {}) {
  const totalTokens = countTokens(text);
  const sections = splitSections(text);
  const k = sections.length || 1;
  const avgSection = Math.round(totalTokens / k);
  const overhead = overheadTokens();
  // Rule tokens ZeroContext leaves resident in the window for a task that pulls
  // `slices` slices: the always-on MCP overhead + the call(s) + the slice text.
  const resident = overhead + slices * (CALL_TOKENS + avgSection);
  // Fewer rule tokens in the window vs. preloading the whole file. A *scoping*
  // ratio (tokens resident), NOT a cost ratio — see the caveat in formatReport.
  const reduction = totalTokens > 0 ? (totalTokens - resident) / totalTokens : 0;
  return {
    totalTokens,
    chars: text.length,
    sections,
    sectionCount: k,
    avgSection,
    overhead,
    call: CALL_TOKENS,
    slices,
    resident,
    reduction,
    breakEven: resident, // preloaded total must exceed this for ZeroContext to keep fewer resident
    wins: totalTokens > resident,
  };
}

// Render one file's result as a human-readable block.
export function formatReport(fileName, r) {
  const lines = [];
  lines.push(fileName);
  lines.push(
    `  ${n(r.totalTokens)} tokens  ·  ${n(r.chars)} chars  ·  ` +
      `${r.sectionCount} section${r.sectionCount === 1 ? "" : "s"} ` +
      `(avg ${n(r.avgSection)} tok/section)`,
  );
  lines.push("  → resident in your context window on every message, relevant or not.");
  lines.push("");
  lines.push(
    `  With ZeroContext (just-in-time, ${r.slices} slice${
      r.slices === 1 ? "" : "s"
    }/task) — rule tokens resident in the window:`,
  );
  lines.push(
    `    fixed overhead  ${n(r.overhead).padStart(6)} tok   (MCP instructions + get_rules schema, measured)`,
  );
  lines.push(
    `    + tool call(s)  ${n(r.call * r.slices).padStart(6)} tok   (assumption: agent writes ${r.slices} call${r.slices === 1 ? "" : "s"})`,
  );
  lines.push(
    `    + rule slice(s) ${n(r.avgSection * r.slices).padStart(6)} tok   (your avg section size)`,
  );
  lines.push(
    `    = ${n(r.resident)} tok resident   vs   ${n(r.totalTokens)} tok preloaded (every message)`,
  );
  lines.push("");
  if (r.wins) {
    lines.push(
      `  → ${pct(r.reduction)} fewer rule tokens in the window  (${n(r.totalTokens - r.resident)} tok)`,
    );
    lines.push(
      `  Break-even: ZeroContext keeps fewer resident once rules exceed ~${n(r.breakEven)} tok. Yours: ${n(r.totalTokens)} ✓`,
    );
    lines.push(
      "  Scope, not $: this is window-resident rule tokens, not session cost — a cached",
    );
    lines.push(
      "  CLAUDE.md is ~free to re-read, so the win is relevance, not a lower bill. [Phase 0 A/B]",
    );
  } else {
    lines.push(
      `  Verdict: your rules (${n(r.totalTokens)} tok) are below the ~${n(r.breakEven)} tok break-even.`,
    );
    lines.push(
      "  Preloading keeps fewer tokens resident here — ZeroContext's window win shows on larger / polyglot / monorepo rule files.",
    );
  }
  return lines.join("\n");
}

// Find known rule files in a directory.
export function discoverRuleFiles(cwd) {
  return KNOWN_RULE_FILES.map((f) => resolve(cwd, f)).filter((p) => existsSync(p));
}

// IO entry point used by the CLI. Returns an exit code.
export function runAnalyze({ cwd = process.cwd(), file, slices = 1, log = console.log } = {}) {
  const targets = file ? [resolve(cwd, file)] : discoverRuleFiles(cwd);

  log("ZeroContext analyze — rule tokens resident in every message");
  log(`Tokenizer: ${TOKENIZER_LABEL}`);
  log("");

  if (targets.length === 0) {
    log("No rule file found (looked for: " + KNOWN_RULE_FILES.join(", ") + ").");
    log("Pass one explicitly: zerocontext analyze --file path/to/rules.md");
    return 1;
  }

  for (const path of targets) {
    if (!existsSync(path)) {
      log(`Not found: ${path}`);
      continue;
    }
    const text = readFileSync(path, "utf8");
    const r = analyzeText(text, { slices });
    log(formatReport(basename(path), r));
    log("");
  }

  log("Notes:");
  log("  • Ratio is tokenizer-robust; absolute tokens are an o200k estimate, not Claude-exact.");
  log("  • This counts window-resident rule tokens, not session $. A preloaded CLAUDE.md is");
  log("    prompt-cached, and the Phase 0 A/B found JIT cost-neutral-to-higher — the win is relevance.");
  log("  • Slice size is your file's average section; pass --slices N to model multi-slice tasks.");
  return 0;
}
