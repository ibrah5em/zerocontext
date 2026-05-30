// Stack autodetection — narrow on purpose (see CLAUDE.md's signal table).
//
// We map project signals to rule-set NAMES, not to rule content. The registry then
// activates only the named sets that actually ship a file. So detecting a stack we
// haven't authored a set for yet (React, Rust, …) costs nothing and confuses nothing:
// it simply has no active set until someone drops the one-file PR in `rules/`.
import { readFileSync, existsSync } from "node:fs";
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

// Returns a Set of rule-set names the project's signals call for.
export function detectStacks(root) {
  const { has, read } = reader(root);
  const stacks = new Set();

  if (has("pyproject.toml")) {
    // FastAPI variant when the dep is present; otherwise plain Python (no set yet).
    if (/fastapi/i.test(read("pyproject.toml"))) stacks.add("fastapi");
    else stacks.add("python");
  }
  if (has("package.json") && has("tsconfig.json")) stacks.add("react-typescript");
  if (has("Cargo.toml")) stacks.add("rust");
  if (has("pnpm-workspace.yaml") || has("nx.json")) stacks.add("monorepo");

  return stacks;
}
