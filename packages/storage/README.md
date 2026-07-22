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
- **`postgresAdapter.ts`** _(scaffold, not implemented)_ — the seam for
  swapping in a larger enterprise backend later. See below.

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

## Swapping in an enterprise backend later

This package exists so that swap is cheap. To move off SQLite:

1. Implement `StorageAdapter` (`list`, `get`, `put`, `delete`, `clear`,
   `transaction`, `close`) against the new driver — e.g. `pg` for Postgres —
   in `src/postgresAdapter.ts`, replacing the stub that currently throws.
2. A natural relational shape for each collection is a table with
   `id TEXT PRIMARY KEY`, `data JSONB NOT NULL`, `updated_at TIMESTAMPTZ NOT NULL`
   — the same document-per-row model the SQLite adapter uses, so the port is
   mechanical. Normalize into real columns later, per collection, if and when
   query needs justify it; nothing above this interface depends on the
   storage shape.
3. Wire it into `createStorage`'s `"postgres"` case (already switched on
   `STORAGE_DRIVER`/`config.driver`).
4. Nothing else changes. Every caller — `services/projects`, and any future
   service — depends only on `StorageAdapter`, never on `better-sqlite3` or
   a specific driver.

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
