import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import type { StorageAdapter, StorageConfig, StorageRecord } from "./types.js";

/**
 * The enterprise storage seam.
 *
 * Real implementation, delegating to the `thoth-napi` native addon, which
 * wraps the real `tokio-postgres`-backed `PostgresStorageAdapter` in
 * `crates/thoth-services/src/storage/postgres.rs`. This replaces the
 * previous scaffold, which unconditionally threw "not implemented yet" —
 * every method below is a real call across the FFI boundary into that
 * adapter; nothing here is a second, independent mock. See
 * `crates/thoth-napi/src/storage.rs`'s module docs for the native side of
 * this boundary (wire shape, and the one real, documented gap: no
 * cross-call transaction atomicity yet — see {@link createPostgresAdapter}'s
 * `transaction` below).
 *
 * See packages/storage/README.md for how this fits into `createStorage`
 * and the schema shape (`id`/`data`/`updatedAt` per collection).
 */

/**
 * The shape of the `thoth-napi` native addon's `postgresStorage*` exports
 * this module calls into. Hand-written rather than generated — see
 * `services/auth/src/index.ts`'s equivalent interface for why.
 */
interface NativePostgresAddon {
  postgresStorageConnect(connectionString: string): Promise<number>;
  postgresStorageClose(handle: number): Promise<void>;
  postgresStorageList(handle: number, collection: string): Promise<unknown[]>;
  postgresStorageGet(
    handle: number,
    collection: string,
    id: string,
  ): Promise<unknown | null>;
  postgresStoragePut(handle: number, collection: string, value: unknown): Promise<unknown>;
  postgresStorageDelete(handle: number, collection: string, id: string): Promise<boolean>;
  postgresStorageClear(handle: number, collection: string): Promise<void>;
}

/**
 * Walk upward from `startDir` to find the Thoth Blueprint repo root,
 * identified by a root `Cargo.toml` sitting next to a `crates/` directory.
 * Duplicated from `services/auth`/`services/collaboration`'s equivalent
 * loaders rather than factored into a shared package — see those modules'
 * docs for why each package here stays independently self-contained.
 */
function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (;;) {
    if (
      fs.existsSync(path.join(dir, "Cargo.toml")) &&
      fs.existsSync(path.join(dir, "crates"))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        "@thoth/storage: could not locate the Thoth Blueprint repo root (looked " +
          "for a Cargo.toml next to a crates/ directory) while loading the " +
          "thoth-napi native addon.",
      );
    }
    dir = parent;
  }
}

function loadNativeAddon(): NativePostgresAddon {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = findRepoRoot(here);
  const addonPath = path.join(repoRoot, "target", "napi", "thoth_napi.node");
  const require = createRequire(import.meta.url);
  try {
    return require(addonPath) as NativePostgresAddon;
  } catch (err) {
    throw new Error(
      `@thoth/storage: failed to load the native thoth-napi addon at "${addonPath}". ` +
        'Build it first with "yarn build:napi" (see crates/README.md). ' +
        `Original error: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }
}

let cachedAddon: NativePostgresAddon | null = null;

function nativeAddon(): NativePostgresAddon {
  if (!cachedAddon) {
    cachedAddon = loadNativeAddon();
  }
  return cachedAddon;
}

function resolveConnectionString(config: StorageConfig): string {
  const connectionString = config.postgres?.connectionString ?? process.env.STORAGE_POSTGRES_URL;
  if (!connectionString) {
    throw new Error(
      "STORAGE_DRIVER=postgres was requested, but no connection string was " +
        "supplied — set STORAGE_POSTGRES_URL or pass " +
        "config.postgres.connectionString.",
    );
  }
  return connectionString;
}

/**
 * Create a Postgres-backed `StorageAdapter`, delegating every operation to
 * the native `thoth-napi` addon. Connects eagerly (unawaited) at
 * construction — the same "kick off now, await on first real use" pattern
 * `apps/web/src/lib/geometryWasm.ts`'s `initGeometryWasm()` uses — so a
 * connection failure surfaces as soon as the first method is actually
 * awaited, not buried behind an unrelated later error.
 *
 * `transaction()` does **not** wrap its callback in an explicit
 * `BEGIN`/`COMMIT`/`ROLLBACK` — see `crates/thoth-napi/src/storage.rs`'s
 * module docs for why (the native `transaction` method takes a Rust
 * closure that calls back into the same adapter; bridging an arbitrary JS
 * callback into that shape needs a `ThreadsafeFunction`-driven re-entrant
 * call, a materially riskier FFI shape out of scope for this pass). Every
 * individual `list`/`get`/`put`/`delete`/`clear` call below is still a
 * real, atomic Postgres statement — this is a documented gap in
 * cross-call atomicity, not a fabricated transaction.
 */
export function createPostgresAdapter(config: StorageConfig): StorageAdapter {
  const connectionString = resolveConnectionString(config);
  const addon = nativeAddon();

  let handlePromise: Promise<number> | null = addon.postgresStorageConnect(connectionString);
  // Attach a no-op rejection handler to this specific reference so Node's
  // unhandled-rejection detection doesn't fire (and, on modern Node,
  // terminate the process) if the adapter is constructed but never used
  // before the connection attempt settles. The real rejection is still
  // delivered to whichever caller first `await`s `handle()` below — this
  // dummy handler doesn't change what `handlePromise` resolves/rejects to.
  handlePromise.catch(() => {});

  async function handle(): Promise<number> {
    if (!handlePromise) {
      throw new Error(
        "@thoth/storage: this postgres adapter has already been closed()",
      );
    }
    return handlePromise;
  }

  return {
    driver: "postgres",

    async list<T extends StorageRecord>(collection: string): Promise<T[]> {
      const h = await handle();
      return (await addon.postgresStorageList(h, collection)) as T[];
    },

    async get<T extends StorageRecord>(
      collection: string,
      id: string,
    ): Promise<T | undefined> {
      const h = await handle();
      const record = await addon.postgresStorageGet(h, collection, id);
      return (record ?? undefined) as T | undefined;
    },

    async put<T extends StorageRecord>(collection: string, value: T): Promise<T> {
      const h = await handle();
      return (await addon.postgresStoragePut(h, collection, value)) as T;
    },

    async delete(collection: string, id: string): Promise<boolean> {
      const h = await handle();
      return addon.postgresStorageDelete(h, collection, id);
    },

    async clear(collection: string): Promise<void> {
      const h = await handle();
      return addon.postgresStorageClear(h, collection);
    },

    async transaction<T>(fn: () => Promise<T> | T): Promise<T> {
      await handle(); // surface a connection failure before running fn
      return fn();
    },

    async close(): Promise<void> {
      if (!handlePromise) {
        return;
      }
      const pending = handlePromise;
      handlePromise = null;
      let h: number;
      try {
        h = await pending;
      } catch {
        // The connection attempt itself never succeeded — nothing was ever
        // opened, so there is nothing to release. Swallowing this (rather
        // than rejecting close()) mirrors closing a file handle whose open()
        // already failed: a no-op, not a second error.
        return;
      }
      await addon.postgresStorageClose(h);
    },
  };
}
