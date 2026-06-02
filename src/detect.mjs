// Stack autodetection — narrow on purpose (see CLAUDE.md's signal table).
//
// We map project signals to rule-set NAMES, not to rule content. The registry then
// activates only the named sets that actually ship a file. So detecting a stack we
// haven't authored a set for yet (plain Python, monorepo, …) costs nothing and confuses
// nothing: it simply has no active set until someone drops the one-file PR in `rules/`.
//
// Multiple stacks can be active at once: a Next.js app is also React + TypeScript, so
// both names are emitted and the per-file globs decide which slice a given file gets.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

function reader(root) {
  return {
    has: (f) => existsSync(join(root, f)),
    read: (f) => {
      try {
        return readFileSync(join(root, f), "utf8");
      } catch {
        return "";
      }
    },
  };
}

function readPkg(read) {
  try {
    return JSON.parse(read("package.json") || "{}");
  } catch {
    return {};
  }
}

// Returns a Set of rule-set names the project's signals call for.
export function detectStacks(root) {
  const { has, read } = reader(root);
  const stacks = new Set();

  // Python / FastAPI
  if (has("pyproject.toml")) {
    // FastAPI variant when the dep is present; otherwise plain Python (no set yet).
    if (/fastapi/i.test(read("pyproject.toml"))) stacks.add("fastapi");
    else stacks.add("python");
  }

  // Node ecosystem — read deps once so we can tell the JS stacks apart.
  const pkg = has("package.json") ? readPkg(read) : null;
  const dep = (name) =>
    !!pkg &&
    !!(
      (pkg.dependencies && pkg.dependencies[name]) ||
      (pkg.devDependencies && pkg.devDependencies[name]) ||
      (pkg.peerDependencies && pkg.peerDependencies[name])
    );

  // Next.js — a next.config.* file or the `next` dependency.
  if (
    has("next.config.js") ||
    has("next.config.mjs") ||
    has("next.config.ts") ||
    has("next.config.cjs") ||
    dep("next")
  ) {
    stacks.add("nextjs");
  }

  // React + TypeScript — needs an actual react dep alongside tsconfig, so a
  // TypeScript-only backend (e.g. a Drizzle service) isn't mislabeled as React.
  if (has("tsconfig.json") && (dep("react") || dep("react-dom"))) {
    stacks.add("react-typescript");
  }

  // Node + Postgres + Drizzle — a drizzle.config.* file, or drizzle-orm paired
  // with a Postgres driver (`pg` or `postgres`).
  if (
    has("drizzle.config.ts") ||
    has("drizzle.config.js") ||
    (dep("drizzle-orm") && (dep("pg") || dep("postgres")))
  ) {
    stacks.add("node-postgres-drizzle");
  }

  // Rust
  if (has("Cargo.toml")) stacks.add("rust");

  // Monorepo routing signal (no set ships for it yet)
  if (has("pnpm-workspace.yaml") || has("nx.json")) stacks.add("monorepo");

  return stacks;
}

// Directories never worth descending into when looking for a nested project root.
const SKIP_DIRS = new Set([
  "node_modules", "dist", "build", "target", "__pycache__",
  ".venv", "venv", ".next", "coverage", ".git",
]);

// When the root itself detects nothing, look ONE level down. Many of the most
// popular templates a new user reaches for put the real project in a subdir —
// full-stack-fastapi-template is `backend/pyproject.toml` + `frontend/`, not a
// root signal. Without this, `serve`/`init` silently no-op on those repos and
// the tool looks broken on first run.
//
// Deliberately shallow (immediate children only) and advisory: we don't pick a
// root, we surface what we found so the CLI can suggest `--root <dir>`. Returns
// [{ dir, stacks: string[] }] for each child that detects at least one stack.
export function suggestNestedRoots(root) {
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith(".") || SKIP_DIRS.has(e.name)) continue;
    const stacks = detectStacks(join(root, e.name));
    if (stacks.size > 0) found.push({ dir: e.name, stacks: [...stacks] });
  }
  return found;
}
