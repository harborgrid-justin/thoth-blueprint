import type { StorageAdapter, StorageRecord } from "./types.js";

/**
 * In-process, non-persistent adapter. Used for tests and as a dependency-free
 * fallback; data is lost when the process exits.
 */
export class MemoryStorageAdapter implements StorageAdapter {
  readonly driver = "memory" as const;

  private collections = new Map<string, Map<string, StorageRecord>>();
  private lock: Promise<unknown> = Promise.resolve();

  private collectionFor(name: string): Map<string, StorageRecord> {
    let collection = this.collections.get(name);
    if (!collection) {
      collection = new Map();
      this.collections.set(name, collection);
    }
    return collection;
  }

  async list<T extends StorageRecord>(collection: string): Promise<T[]> {
    return Array.from(this.collectionFor(collection).values()).map(
      (record) => structuredClone(record) as T,
    );
  }

  async get<T extends StorageRecord>(
    collection: string,
    id: string,
  ): Promise<T | undefined> {
    const record = this.collectionFor(collection).get(id);
    return record ? (structuredClone(record) as T) : undefined;
  }

  async put<T extends StorageRecord>(collection: string, value: T): Promise<T> {
    // Store a clone, matching the SQLite adapter's JSON round-trip: mutating
    // the caller's object (or a value handed back by get/list) after put()
    // must not silently mutate what's stored.
    this.collectionFor(collection).set(value.id, structuredClone(value));
    return value;
  }

  async delete(collection: string, id: string): Promise<boolean> {
    return this.collectionFor(collection).delete(id);
  }

  async clear(collection: string): Promise<void> {
    this.collectionFor(collection).clear();
  }

  async transaction<T>(fn: () => Promise<T> | T): Promise<T> {
    const run = async (): Promise<T> => {
      const snapshot = new Map(
        Array.from(this.collections.entries()).map(([name, records]) => [
          name,
          new Map(records),
        ]),
      );
      try {
        return await fn();
      } catch (err) {
        this.collections = snapshot;
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
    this.collections.clear();
  }
}
