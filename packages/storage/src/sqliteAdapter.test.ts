import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SqliteStorageAdapter } from "./sqliteAdapter.js";

describe("SqliteStorageAdapter", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop()!;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function tempFile(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "thoth-storage-"));
    tempDirs.push(dir);
    return path.join(dir, "nested", "test.sqlite3");
  }

  it("creates the containing directory for the database file", async () => {
    const file = tempFile();
    expect(fs.existsSync(path.dirname(file))).toBe(false);
    const storage = new SqliteStorageAdapter({ file });
    expect(fs.existsSync(path.dirname(file))).toBe(true);
    await storage.close();
  });

  it("persists data across adapter instances on the same file", async () => {
    const file = tempFile();
    const first = new SqliteStorageAdapter({ file });
    await first.put("widgets", { id: "w1", name: "Bolt" });
    await first.close();

    const second = new SqliteStorageAdapter({ file });
    await expect(second.get("widgets", "w1")).resolves.toEqual({
      id: "w1",
      name: "Bolt",
    });
    await second.close();
  });

  it("rejects collection names that aren't safe SQL identifiers", async () => {
    const storage = new SqliteStorageAdapter({ file: ":memory:" });
    await expect(storage.list('widgets"; DROP TABLE widgets; --')).rejects.toThrow(
      /Invalid storage collection name/,
    );
    await storage.close();
  });

  it("reports its driver as sqlite", async () => {
    const storage = new SqliteStorageAdapter({ file: ":memory:" });
    expect(storage.driver).toBe("sqlite");
    await storage.close();
  });
});
