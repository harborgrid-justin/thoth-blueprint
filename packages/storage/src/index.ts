/**
 * @thoth/storage — the default internal storage layer for Thoth Blueprint.
 *
 * Services depend only on `StorageAdapter` and `createStorage`. The default
 * backend is a local SQLite file (`SqliteStorageAdapter`); an in-memory
 * adapter is available for tests. A larger enterprise backend (Postgres,
 * MySQL, ...) plugs in by implementing `StorageAdapter` and is selected with
 * no call-site changes — see `postgresAdapter.ts` and the README.
 */

export type {
  StorageAdapter,
  StorageRecord,
  StorageConfig,
  StorageDriver,
} from "./types.js";
export { createStorage } from "./createStorage.js";
export { MemoryStorageAdapter } from "./memoryAdapter.js";
export { SqliteStorageAdapter } from "./sqliteAdapter.js";
export { createPostgresAdapter } from "./postgresAdapter.js";
