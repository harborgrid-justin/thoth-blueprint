/**
 * The storage seam: every backend (the default SQLite adapter, the in-memory
 * test adapter, and any future enterprise adapter) implements this interface.
 * Call sites depend only on `StorageAdapter` — swapping the backend never
 * touches them.
 */

export interface StorageRecord {
  id: string;
}

export type StorageDriver = "sqlite" | "memory" | "postgres";

export interface StorageAdapter {
  /** Name of the backend actually in use, e.g. "sqlite". Useful for logging. */
  readonly driver: StorageDriver;

  /** All records in a collection. */
  list<T extends StorageRecord>(collection: string): Promise<T[]>;

  /** A single record by id, or undefined if it doesn't exist. */
  get<T extends StorageRecord>(
    collection: string,
    id: string,
  ): Promise<T | undefined>;

  /** Insert or fully replace a record, keyed by its `id`. Returns the stored value. */
  put<T extends StorageRecord>(collection: string, value: T): Promise<T>;

  /** Remove a record. Returns whether a record was actually deleted. */
  delete(collection: string, id: string): Promise<boolean>;

  /** Remove every record in a collection. */
  clear(collection: string): Promise<void>;

  /**
   * Run `fn` as a single atomic unit of work: either every read/write inside
   * it commits, or none of it does. Calls to `transaction` on one adapter
   * instance are serialized, so it's safe to call from concurrent request
   * handlers.
   *
   * Constraint: only await other calls on *this same adapter instance*
   * inside `fn` — don't await unrelated I/O (network calls, timers) in the
   * middle of a transaction, since that would hold the lock open.
   */
  transaction<T>(fn: () => Promise<T> | T): Promise<T>;

  /** Release underlying resources (file handles, connections). */
  close(): Promise<void>;
}

export interface StorageConfig {
  /**
   * Which backend to use. Defaults to the `STORAGE_DRIVER` environment
   * variable, falling back to "sqlite" — the default, zero-infrastructure
   * backend for local development and small deployments.
   */
  driver?: StorageDriver;
  sqlite?: {
    /** Path to the SQLite file, or ":memory:". Defaults to `STORAGE_SQLITE_FILE` or "./data/thoth.sqlite3". */
    file?: string;
  };
}
