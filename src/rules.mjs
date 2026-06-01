// Rule registry: load the ZeroContext rule sets and match them to a file path.
//
// A rule set is one Markdown file in `rules/` with YAML frontmatter, so adding a
// stack is a one-file PR (see .claude/skills/rule-registry). The frontmatter we
// consume is small and constrained — name/version/description plus two arrays
// (stack_signals, globs) — so we parse it with a tiny purpose-built reader rather
// than taking on a YAML dependency. `globs` is what lets get_rules(path) return only
// the slice that matches the file the agent is touching.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { countTokens } from "./tokens.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
// Rule sets ship inside the package, so resolve them relative to this module —
// never relative to the cwd the server happens to be spawned in.
export const RULES_DIR = resolve(HERE, "../rules");

// Parse the leading `---`-fenced frontmatter block. Returns { meta, body }.
// Supports `key: scalar` and inline flow arrays `key: [a, b, "c"]` — exactly the
// shapes the rule-set format uses. A file with no frontmatter yields empty meta.
export function parseFrontmatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    meta[key] = parseValue(val);
  }
  return { meta, body: src.slice(m[0].length) };
}

function parseValue(val) {
  if (val.startsWith("[") && val.endsWith("]")) {
    const inner = val.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((s) => unquote(s.trim())).filter(Boolean);
  }
  return unquote(val);
}

function unquote(s) {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

// Translate a glob to an anchored RegExp. Supports `**` (any depth, incl. none),
// `*` (one path segment), and `?` (one non-separator char). Patterns that lead with
// `**/` therefore match a path whether it arrives absolute or repo-relative.
export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        i++;
        if (glob[i + 1] === "/") {
          i++;
          re += "(?:.*/)?"; // `**/` => zero or more leading path segments
        } else {
          re += ".*";
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if ("\\^$.|+()[]{}".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$");
}

export function matchesGlob(path, glob) {
  return globToRegExp(glob).test(path);
}

// Read and validate one rule-set file. Returns null (and logs to stderr) for a
// malformed set rather than throwing — one bad file must not sink the server.
export function loadRuleSet(file, log = (m) => process.stderr.write(m + "\n")) {
  let src;
  try {
    src = readFileSync(file, "utf8");
  } catch (e) {
    log(`zerocontext: cannot read rule set ${file}: ${e.message}`);
    return null;
  }
  const { meta, body } = parseFrontmatter(src);
  if (!meta.name) {
    log(`zerocontext: rule set ${file} has no \`name\` in frontmatter — skipped`);
    return null;
  }
  const globs = Array.isArray(meta.globs) ? meta.globs : [];
  if (globs.length === 0) {
    log(`zerocontext: rule set "${meta.name}" has no \`globs\` — it can never match a file`);
  }
  // Optional `exclude` globs carve files back OUT of the `globs` match — so a broad
  // `**/*.py` can still skip tests, migrations, and config, where the stack's rules
  // don't apply. Empty when absent.
  const exclude = Array.isArray(meta.exclude) ? meta.exclude : [];
  const text = body.trim();
  return {
    name: meta.name,
    version: meta.version || "0.0.0",
    description: meta.description || "",
    stackSignals: Array.isArray(meta.stack_signals) ? meta.stack_signals : [],
    globs,
    exclude,
    body: text,
    tokens: countTokens(text),
  };
}

// Load every rule set in `dir`. Order is stable (sorted by filename).
export function loadRuleSets(dir = RULES_DIR, log) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("."))
    .sort()
    .map((f) => loadRuleSet(join(dir, f), log))
    .filter(Boolean);
}

// Return the rule sets that apply to `path`, preserving input order. A set applies
// when one of its `globs` matches AND none of its `exclude` globs match — so a set can
// claim a broad surface (`**/*.py`) yet still opt specific files (tests, migrations,
// config) back out. `exclude` is optional; treat its absence as "exclude nothing".
export function matchRuleSets(sets, path) {
  if (!path) return [];
  return sets.filter((s) => {
    const exclude = s.exclude || [];
    return (
      s.globs.some((g) => matchesGlob(path, g)) &&
      !exclude.some((g) => matchesGlob(path, g))
    );
  });
}
