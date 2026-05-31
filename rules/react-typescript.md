---
name: react-typescript
version: 1.0.0
description: React + TypeScript component, hooks, and typing conventions
stack_signals: [package.json, tsconfig.json]
globs: ["**/*.tsx", "**/*.ts"]
---

# React + TypeScript conventions

- Function components only. Call hooks at the top level, unconditionally — never inside
  a condition, loop, or callback. Custom hooks start with `use`.
- Type props with an explicit `interface` or `type`; do not rely on inference for a
  component's public surface. Avoid `React.FC` — type the props argument directly.
- No `any`. Reach for `unknown` plus a narrow, or a precise generic. Treat a needed
  `any` as a bug to isolate and comment, not a default.
- Derive state; don't duplicate it. If a value can be computed from props or other
  state during render, compute it — don't mirror it into another `useState`.
- Every `useEffect` does one thing and lists every dependency it reads. If the effect
  only sets state from props, you probably don't need the effect.
- Key lists by a stable domain id, never the array index. Index keys corrupt state on
  reorder/insert.
- Co-locate component, styles, and test in one folder; name the test `*.test.tsx`.
- Keep components presentational; push data fetching and side effects to hooks or a
  data layer so the component stays a pure function of its props.
- Prefer discriminated unions over booleans for state that has modes
  (`{ status: "loading" | "error" | "ready" }`), so impossible states don't typecheck.
