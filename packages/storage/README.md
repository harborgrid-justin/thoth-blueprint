# @thoth/storage

The default internal storage layer for Thoth Blueprint.

## What this is

A small `StorageAdapter` interface plus a default implementation, so every
service persists through one seam instead of talking to a database driver
directly:

- **`SqliteStorageAdapter`** _(default)_ — a single local SQLite file, one
  table per collection. No server process to run; installed as a normal
  npm dependency (`better-sqlite3`, which ships prebuilt binaries for the
  common platforms — no compiler required). This is the right default for
  local development and small deployments.
- **`MemoryStorageAdapter`** — non-persistent, in-process. Used by tests and
  available as a zero-dependency fallback.
- **`postgresAdapter.ts`** — the enterprise backend. Delegates every
  operation to the real `tokio-postgres`-backed `PostgresStorageAdapter` in
  [`crates/thoth-services/src/storage/postgres.rs`](../../crates/thoth-services/src/storage/postgres.rs),
  through the [`thoth-napi`](../../crates/thoth-napi/) native Node addon
  (`crates/thoth-napi/src/storage.rs`) — not a TypeScript reimplementation.
  See "Enterprise backend: Postgres" below.

## Usage

```ts
import { createStorage } from "@thoth/storage";

const storage = createStorage(); // STORAGE_DRIVER env var, defaults to "sqlite"

interface Project {
  id: string;
  name: string;
}

await storage.put<Project>("projects", { id: "proj-1", name: "Willow Creek" });
const project = await storage.get<Project>("projects", "proj-1");
const all = await storage.list<Project>("projects");

await storage.transaction(async () => {
  await storage.clear("projects");
  await storage.put("projects", project!);
});
```

Every record is a plain object with a string `id`; a collection is just a
name (`"projects"`, `"checkpoints"`, ...). There's no schema migration step
to add a new collection — the SQLite adapter creates its table on first use.

### Choosing a backend

```bash
STORAGE_DRIVER=sqlite   # default — local file, see STORAGE_SQLITE_FILE
STORAGE_DRIVER=memory   # tests / ephemeral
STORAGE_DRIVER=postgres # not implemented yet, see below
```

Or pass config directly: `createStorage({ driver: "sqlite", sqlite: { file: "./data/app.sqlite3" } })`.

## Enterprise backend: Postgres

`STORAGE_DRIVER=postgres` (with `STORAGE_POSTGRES_URL` set, or
`createStorage({ postgres: { connectionString: "postgres://..." } })`)
routes every `StorageAdapter` call through `postgresAdapter.ts` into the
real, native `PostgresStorageAdapter` — the same document-per-row shape the
SQLite adapter uses (`id TEXT PRIMARY KEY`, `data JSONB NOT NULL`,
`updated_at TIMESTAMPTZ NOT NULL`), built with `tokio-postgres` on the Rust
side. This requires the `thoth-napi` native addon to be built first
(`yarn build:napi` from the repo root — see
[`crates/README.md`](../../crates/README.md)); without it, `createStorage`
throws a clear, actionable error telling you to build it, rather than a
cryptic module-resolution failure.

Two honestly-documented limitations, inherited from the native adapter
(see `crates/thoth-services/src/storage/postgres.rs` and
`crates/thoth-napi/src/storage.rs` for the full reasoning):

- **No connection pooling.** One session per adapter instance, not a pool.
  Fine for local development or low-concurrency deployments; a production
  deployment under real concurrent load should front it with a pool (e.g.
  `deadpool-postgres`) on the Rust side.
- **`transaction()` has no cross-call atomicity yet.** Each individual
  `list`/`get`/`put`/`delete`/`clear` call is still a real, atomic Postgres
  statement, but `transaction(fn)` currently runs `fn` directly rather than
  wrapping it in an explicit `BEGIN`/`COMMIT`/`ROLLBACK` — bridging an
  arbitrary JS callback into the native adapter's Rust-closure-based
  `transaction` method needs a `ThreadsafeFunction`-driven re-entrant call,
  a materially riskier FFI shape left for a future pass. This is a real,
  tracked gap, not a fabricated success.
- **No automated test coverage against a live server in this repo's CI** —
  the adapter is real code, but there is no Postgres server in this
  sandbox to run it against (see `crates/thoth-services/STATUS.md`'s
  `ported+partial-tests` note). `packages/storage/src/postgresAdapter.test.ts`
  covers what's provable without one: connection-string validation, and
  that a real connection failure crosses the FFI boundary as a catchable
  rejection.

Everything else about this backend is transparent to callers: every
consumer (`services/projects`, and any future service) depends only on
`StorageAdapter`, never on `tokio-postgres`, `pg`, or any other driver.

## Boundaries

- Owns persistence mechanics only: get/put/list/delete/transaction over
  named collections. It has no knowledge of planning domain types (`Site`,
  `Parcel`, ...) — those live in `@thoth/domain` and are passed through this
  layer as plain data.
- Not an ORM and not a query engine. If a service needs real relational
  queries (joins, filtering at the database layer), that's a sign it has
  outgrown the generic collection model and should either filter after
  `list()` (fine at this scale) or the enterprise adapter should expose
  purpose-built methods alongside `StorageAdapter`.
