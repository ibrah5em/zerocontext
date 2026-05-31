---
name: node-postgres-drizzle
version: 1.0.0
description: Node + Postgres + Drizzle ORM conventions — schema, queries, migrations
stack_signals: [drizzle.config.ts, drizzle.config.js]
globs: ["**/db/**/*.ts", "**/schema/**/*.ts", "**/drizzle/**/*.ts"]
---

# Node + Postgres + Drizzle conventions

- Define tables in a `schema.ts` with Drizzle's `pgTable`. Derive row types with
  `InferSelectModel`/`InferInsertModel` — never hand-write a type that mirrors a table.
- Generate migrations from the schema (`drizzle-kit generate`); commit the SQL. Never edit
  the database by hand or hand-write a migration that the schema doesn't reflect.
- Build queries with the typed query builder. Reach for raw `sql` only for what the builder
  can't express, and always parameterize — never string-concatenate user input.
- Run multi-statement writes inside `db.transaction(...)` so a partial failure rolls back.
- Use one pooled client (`pg.Pool` / the driver's pool) for the app; don't open a
  connection per request. Read connection config from the environment.
- Model every foreign key with `references()` and set `onDelete`/`onUpdate` explicitly so
  referential behavior is in the schema, not implied.
- Select only the columns you need; avoid `SELECT *` patterns for hot or wide tables.
  Add indexes in the schema for the columns you filter and join on.
- Keep DB access in a data/repository layer; don't scatter query builder calls through
  route handlers or React components.
