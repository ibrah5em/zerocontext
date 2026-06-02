// Render the ZeroContext hero GIF from real command output.
//
// Deterministic, dependency-light: needs only ImageMagick (`convert`, with Pango) —
// no headless browser, no ttyd, no network. Each frame is a terminal "screen" drawn
// with Pango markup onto a dark canvas; frames are assembled into a looping GIF.
//
// The numbers below are CAPTURED FROM REAL RUNS against ./fixture, not invented.
// Refresh them after a rule/fixture change:
//   (cd demo/fixture && node ../../bin/zerocontext.mjs analyze)   # beat 1 numbers
//   node ../../bin/zerocontext.mjs serve --root demo/fixture      # beat 3 get_rules log
// Then regenerate:  node demo/render.mjs
//
// Honesty guardrails (see CLAUDE.md): show agent-PULLED just-in-time fetch, never
// reactive file-switch; the metric is rule tokens resident in the window, not $.

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "zerocontext.gif");
const W = 1000;
const H = 520;
const BG = "#0d1117";
const FONT = "DejaVu-Sans-Mono";
const SIZE = 18;

// palette
const C = {
  prompt: "#3fb950", // green $
  cmd: "#e6edf3", // command text / bright
  dim: "#7d8590", // comments, secondary
  num: "#e6edf3", // the heavy number
  win: "#3fb950", // the win line
  blue: "#58a6ff", // slice header
  amber: "#d29922", // the served-slice token count
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const span = (color, text) => `<span foreground="${color}">${esc(text)}</span>`;
// A line is an array of [color, text] segments. A bare string is dim text.
const line = (segs) =>
  typeof segs === "string"
    ? span(C.dim, segs)
    : segs.map(([c, t]) => span(c, t)).join("");

// The full terminal session, top to bottom. Reveal frames show prefixes of this.
const SESSION = [
  [[C.prompt, "$ "], [C.cmd, "npx zerocontext analyze"]], // 0
  [], // 1
  [[C.dim, "CLAUDE.md   "], [C.num, "1,568 tokens"], [C.dim, " · 16 sections"]], // 2
  [[C.dim, "→ all of it resident in your context window on "], [C.cmd, "every message"]], // 3
  [], // 4
  [[C.cmd, "with ZeroContext"], [C.dim, " — just the slice the task needs:   "], [C.num, "273 tokens"]], // 5
  [[C.win, "→ 83% fewer rule tokens in the window"], [C.dim, "   (1,295 tok kept out)"]], // 6
  [], // 7
  [[C.prompt, "$ "], [C.cmd, "npx zerocontext init"]], // 8
  [[C.win, "✓ "], [C.dim, "wrote .mcp.json — one gitignored pointer. zero rules in your repo."]], // 9
  [], // 10
  [[C.dim, "# the agent opens "], [C.cmd, "app/main.py"], [C.dim, " and pulls only what matches:"]], // 11
  [[C.blue, "get_rules"], [C.dim, "  path="], [C.cmd, "app/main.py"], [C.dim, "  →  "], [C.cmd, "fastapi slice"], [C.dim, " · "], [C.amber, "447 tok"]], // 12
  [], // 13
  [[C.blue, "# FastAPI conventions"], [C.dim, "          ← the only rules that land in the window"]], // 14
  [[C.dim, "- One APIRouter per resource; keep route functions thin."]], // 15
  [[C.dim, "- Set response_model so output is validated and documented."]], // 16
];

// Reveal schedule: [linesShown, delay-centiseconds]. Holds linger on the payoffs.
const REVEALS = [
  [1, 70],
  [4, 95],
  [7, 330], // the 83% lands — hold
  [10, 120],
  [13, 150], // the pull
  [17, 430], // the slice — the payoff, hold longest
];

function markupFor(lineCount) {
  const body = SESSION.slice(0, lineCount).map(line).join("\n");
  return `<span font="${FONT} ${SIZE}">${body}</span>`;
}

function renderFrame(markup, file) {
  execFileSync("convert", [
    "-background", BG,
    "-font", FONT,
    "-pointsize", String(SIZE),
    `pango:${markup}`,
    "-bordercolor", BG,
    "-border", "32x26",
    "-background", BG,
    "-gravity", "NorthWest",
    "-extent", `${W}x${H}`,
    file,
  ]);
}

function renderCard(file) {
  const markup =
    `<span font="${FONT}">` +
    `<span foreground="${C.win}" size="32000"><b>ZeroContext</b></span>\n\n` +
    `<span foreground="${C.cmd}" size="17000">Only the rules that match the file you're working on.</span>\n` +
    `<span foreground="${C.cmd}" size="17000">Just in time, over MCP. Zero config files in your repo.</span>\n\n` +
    `<span foreground="${C.prompt}" size="16000">$ npx zerocontext analyze</span>\n` +
    `<span foreground="${C.dim}" size="15000">github.com/ibrah5em/zerocontext</span>` +
    `</span>`;
  execFileSync("convert", [
    "-background", "none",
    "-font", FONT,
    `pango:${markup}`,
    "-background", BG,
    "-gravity", "Center",
    "-extent", `${W}x${H}`,
    file,
  ]);
}

function main() {
  const dir = mkdtempSync(join(tmpdir(), "zc-demo-"));
  try {
    const frames = [];
    REVEALS.forEach(([lines, delay], i) => {
      const f = join(dir, `f${i}.png`);
      renderFrame(markupFor(lines), f);
      frames.push([f, delay]);
    });
    const card = join(dir, "card.png");
    renderCard(card);
    frames.push([card, 380]);

    const args = ["-loop", "0"];
    for (const [f, d] of frames) args.push("-delay", String(d), f);
    args.push("-layers", "Optimize", "-colors", "128", OUT);
    execFileSync("convert", args);

    const size = execFileSync("identify", ["-format", "%wx%h, %n frames", OUT]).toString();
    const bytes = execFileSync("bash", ["-c", `wc -c < "${OUT}"`]).toString().trim();
    console.log(`wrote ${OUT}`);
    console.log(`  ${size}, ${(Number(bytes) / 1024).toFixed(0)} KB`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main();
