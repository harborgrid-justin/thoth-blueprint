import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { StorageAdapter, StorageRecord } from "./types.js";

const COLLECTION_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertValidCollectionName(collection: string): void {
  if (!COLLECTION_NAME_PATTERN.test(collection)) {
    throw new Error(
      `Invalid storage collection name "${collection}". Collection names must ` +
        "match /^[a-zA-Z_][a-zA-Z0-9_]*$/ (they become SQL table identifiers).",
    );
  }
}

export interface SqliteStorageAdapterOptions {
  /** Path to the SQLite file, or ":memory:". */
  file: string;
}

/**
 * Default storage backend: a single SQLite file, one table per collection.
 * Each collection is a simple `(id TEXT PRIMARY KEY, data TEXT, updatedAt TEXT)`
 * document table — no per-entity schema migrations required to add a new
 * collection. Requires no server process; `better-sqlite3` ships prebuilt
 * binaries for the common platforms.
 */
export class SqliteStorageAdapter implements StorageAdapter {
  readonly driver = "sqlite" as const;

  private db: Database.Database;
  private knownTables = new Set<string>();
  private lock: Promise<unknown> = Promise.resolve();

  constructor(options: SqliteStorageAdapterOptions) {
    if (options.file !== ":memory:") {
      const dir = path.dirname(options.file);
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(options.file);
    this.db.pragma("journal_mode = WAL");
  }

  private ensureTable(collection: string): void {
    assertValidCollectionName(collection);
    if (this.knownTables.has(collection)) {
      return;
    }
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS "${collection}" (
         id TEXT PRIMARY KEY,
         data TEXT NOT NULL,
         updatedAt TEXT NOT NULL
       )`,
    );
    this.knownTables.add(collection);
  }

  async list<T extends StorageRecord>(collection: string): Promise<T[]> {
    this.ensureTable(collection);
    const rows = this.db
      .prepare(`SELECT data FROM "${collection}"`)
      .all() as { data: string }[];
    return rows.map((row) => JSON.parse(row.data) as T);
  }

  async get<T extends StorageRecord>(
    collection: string,
    id: string,
  ): Promise<T | undefined> {
    this.ensureTable(collection);
    const row = this.db
      .prepare(`SELECT data FROM "${collection}" WHERE id = ?`)
      .get(id) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as T) : undefined;
  }

  async put<T extends StorageRecord>(collection: string, value: T): Promise<T> {
    this.ensureTable(collection);
    this.db
      .prepare(
        `INSERT INTO "${collection}" (id, data, updatedAt)
         VALUES (@id, @data, @updatedAt)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt`,
      )
      .run({
        id: value.id,
        data: JSON.stringify(value),
        updatedAt: new Date().toISOString(),
      });
    return value;
  }

  async delete(collection: string, id: string): Promise<boolean> {
    this.ensureTable(collection);
    const result = this.db
      .prepare(`DELETE FROM "${collection}" WHERE id = ?`)
      .run(id);
    return result.changes > 0;
  }

  async clear(collection: string): Promise<void> {
    this.ensureTable(collection);
    this.db.exec(`DELETE FROM "${collection}"`);
  }

  /**
   * Wraps `fn` in a real SQL transaction (BEGIN/COMMIT/ROLLBACK) and
   * serializes concurrent callers on this adapter instance, so an
   * `await`-ing `fn` never interleaves with another transaction's writes.
   * `fn` must only await this adapter's own methods — awaiting unrelated
   * I/O here would hold the transaction (and the lock) open.
   */
  async transaction<T>(fn: () => Promise<T> | T): Promise<T> {
    const run = async (): Promise<T> => {
      this.db.exec("BEGIN");
      try {
        const result = await fn();
        this.db.exec("COMMIT");
        return result;
      } catch (err) {
        this.db.exec("ROLLBACK");
        throw err;
      }
    };
    const result = this.lock.then(run, run);
    this.lock = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
