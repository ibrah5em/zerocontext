---
name: nextjs
version: 1.0.0
description: Next.js App Router conventions — server/client components, data, routing
stack_signals: [next.config.js, next.config.mjs, next.config.ts]
globs: ["app/**/*.tsx", "app/**/*.ts", "src/app/**/*.tsx", "src/app/**/*.ts"]
exclude: ["**/*.test.tsx", "**/*.test.ts", "**/*.spec.tsx", "**/*.spec.ts", "**/__tests__/**"]
---

# Next.js (App Router) conventions

- Components are Server Components by default. Add `"use client"` only when the file needs
  state, effects, or browser APIs — and push it to the leaf, not the route root.
- Fetch data in Server Components with `async`/`await` directly; don't add a client-side
  fetch effect for data the server can render.
- A Client Component must not import a Server Component; pass server-rendered UI down as
  `children`/props instead.
- Keep secrets server-only. Only `NEXT_PUBLIC_`-prefixed env vars reach the browser;
  anything else must stay in Server Components, route handlers, or server actions.
- Use the `app/` file conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
  (`error.tsx` must be a Client Component). Co-locate route-only helpers under the route.
- Mutations go through a server action (`"use server"`) or a route handler — never a
  client fetch that embeds a secret. Revalidate with `revalidatePath`/`revalidateTag`.
- Choose caching deliberately: set `fetch(..., { next: { revalidate } })` or
  `export const dynamic`. Don't leave freshness to chance on data that changes.
- Use `next/link` for navigation and `next/image` for images; don't hand-roll either.
