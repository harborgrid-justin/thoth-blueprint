import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPostgresAdapter } from "./postgresAdapter.js";

/**
 * `PostgresStorageAdapter` needs a live Postgres server to do anything
 * useful — unavailable in this sandbox (see
 * `crates/thoth-services/STATUS.md`'s `ported+partial-tests` note and
 * `crates/thoth-napi/src/storage.rs`'s module docs). What's provable
 * without one: connection-string validation, and that a real connection
 * failure crosses the FFI boundary as a catchable rejection — not a hang,
 * not a silently-swallowed success — proving this delegates to the real
 * native adapter rather than being a second, independent mock.
 */
describe("createPostgresAdapter (native thoth-napi binding)", () => {
  const originalUrl = process.env.STORAGE_POSTGRES_URL;

  beforeEach(() => {
    delete process.env.STORAGE_POSTGRES_URL;
  });

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.STORAGE_POSTGRES_URL;
    } else {
      process.env.STORAGE_POSTGRES_URL = originalUrl;
    }
  });

  it("throws synchronously when no connection string is configured", () => {
    expect(() => createPostgresAdapter({})).toThrow(/no connection string was supplied/);
  });

  it("falls back to STORAGE_POSTGRES_URL when config.postgres is omitted", () => {
    process.env.STORAGE_POSTGRES_URL = "postgres://user:pass@127.0.0.1:1/thoth";
    expect(() => createPostgresAdapter({})).not.toThrow();
  });

  it("reports its driver as postgres", () => {
    const adapter = createPostgresAdapter({
      postgres: { connectionString: "postgres://user:pass@127.0.0.1:1/thoth" },
    });
    expect(adapter.driver).toBe("postgres");
  });

  it("surfaces a real connection failure from list(), not a hang or a fabricated success", async () => {
    const adapter = createPostgresAdapter({
      // Port 1 on localhost: nothing listens there, so this fails fast.
      postgres: { connectionString: "postgres://user:pass@127.0.0.1:1/thoth" },
    });
    await expect(adapter.list("widgets")).rejects.toThrow();
  });

  it("close() tolerates a connection that never succeeded", async () => {
    const adapter = createPostgresAdapter({
      postgres: { connectionString: "postgres://user:pass@127.0.0.1:1/thoth" },
    });
    await expect(adapter.close()).resolves.toBeUndefined();
  });

  it("transaction() surfaces the same connection failure before running its callback", async () => {
    const adapter = createPostgresAdapter({
      postgres: { connectionString: "postgres://user:pass@127.0.0.1:1/thoth" },
    });
    let callbackRan = false;
    await expect(
      adapter.transaction(() => {
        callbackRan = true;
        return Promise.resolve(undefined);
      }),
    ).rejects.toThrow();
    expect(callbackRan).toBe(false);
  });
});
