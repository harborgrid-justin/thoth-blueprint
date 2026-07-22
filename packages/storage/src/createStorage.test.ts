import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStorage } from "./createStorage.js";
import { MemoryStorageAdapter } from "./memoryAdapter.js";
import { SqliteStorageAdapter } from "./sqliteAdapter.js";

describe("createStorage", () => {
  const originalDriver = process.env.STORAGE_DRIVER;
  const originalFile = process.env.STORAGE_SQLITE_FILE;

  beforeEach(() => {
    delete process.env.STORAGE_DRIVER;
    delete process.env.STORAGE_SQLITE_FILE;
  });

  afterEach(() => {
    if (originalDriver === undefined) {
      delete process.env.STORAGE_DRIVER;
    } else {
      process.env.STORAGE_DRIVER = originalDriver;
    }
    if (originalFile === undefined) {
      delete process.env.STORAGE_SQLITE_FILE;
    } else {
      process.env.STORAGE_SQLITE_FILE = originalFile;
    }
  });

  it("defaults to the sqlite adapter", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "thoth-storage-"));
    const storage = createStorage({ sqlite: { file: path.join(dir, "db.sqlite3") } });
    expect(storage).toBeInstanceOf(SqliteStorageAdapter);
    await storage.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("honors an explicit driver over the environment", () => {
    process.env.STORAGE_DRIVER = "sqlite";
    const storage = createStorage({ driver: "memory" });
    expect(storage).toBeInstanceOf(MemoryStorageAdapter);
  });

  it("falls back to the STORAGE_DRIVER environment variable", () => {
    process.env.STORAGE_DRIVER = "memory";
    const storage = createStorage();
    expect(storage).toBeInstanceOf(MemoryStorageAdapter);
  });

  it("throws a clear error for the unimplemented postgres driver", () => {
    expect(() => createStorage({ driver: "postgres" })).toThrow(
      /Postgres storage adapter is not implemented/,
    );
  });
});
