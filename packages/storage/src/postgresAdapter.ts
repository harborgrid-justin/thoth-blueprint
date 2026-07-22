import type { StorageAdapter, StorageConfig } from "./types.js";

/**
 * The enterprise storage seam.
 *
 * SCAFFOLD — not implemented. This is the drop-in point for a larger backend
 * (Postgres, MySQL, a managed cloud database) when the default SQLite file
 * stops being enough: implement `StorageAdapter` against the driver of
 * choice in this file, then set `STORAGE_DRIVER=postgres` (or pass
 * `{ driver: "postgres" }` to `createStorage`). No call sites elsewhere in
 * the platform change — they only depend on `StorageAdapter`.
 *
 * See packages/storage/README.md for the migration notes (schema shape,
 * what `id`/`data`/`updatedAt` columns need to become in a relational
 * design, and how to backfill from the SQLite default).
 */
export function createPostgresAdapter(_config: StorageConfig): StorageAdapter {
  throw new Error(
    "STORAGE_DRIVER=postgres was requested, but the Postgres storage adapter " +
      "is not implemented yet. Implement StorageAdapter in " +
      "packages/storage/src/postgresAdapter.ts — see packages/storage/README.md.",
  );
}
