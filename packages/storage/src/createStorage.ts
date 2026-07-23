import path from "node:path";
import { MemoryStorageAdapter } from "./memoryAdapter.js";
import { SqliteStorageAdapter } from "./sqliteAdapter.js";
import { createPostgresAdapter } from "./postgresAdapter.js";
import type { StorageAdapter, StorageConfig, StorageDriver } from "./types.js";

const DEFAULT_SQLITE_FILE = path.join("data", "thoth.sqlite3");

function resolveDriver(config: StorageConfig): StorageDriver {
  if (config.driver) {
    return config.driver;
  }
  const fromEnv = process.env.STORAGE_DRIVER;
  if (fromEnv === "sqlite" || fromEnv === "memory" || fromEnv === "postgres") {
    return fromEnv;
  }
  return "sqlite";
}

/**
 * Create the storage backend for this process. Everything the platform
 * persists — projects, checkpoints, review threads, and future collections —
 * should go through the `StorageAdapter` this returns, never through a
 * direct database driver call.
 *
 * Backend selection: `config.driver`, then the `STORAGE_DRIVER` env var,
 * defaulting to `"sqlite"` — a single local file, no server to run, the
 * right default for local dev and small deployments. Set
 * `STORAGE_DRIVER=postgres` (with `STORAGE_POSTGRES_URL` set, or
 * `config.postgres.connectionString`) to move to an enterprise backend
 * without touching call sites — see `postgresAdapter.ts`.
 */
export function createStorage(config: StorageConfig = {}): StorageAdapter {
  const driver = resolveDriver(config);
  switch (driver) {
    case "memory":
      return new MemoryStorageAdapter();
    case "postgres":
      return createPostgresAdapter(config);
    case "sqlite":
      return new SqliteStorageAdapter({
        file:
          config.sqlite?.file ??
          process.env.STORAGE_SQLITE_FILE ??
          DEFAULT_SQLITE_FILE,
      });
    default: {
      const exhaustive: never = driver;
      throw new Error(`Unknown storage driver: ${String(exhaustive)}`);
    }
  }
}
