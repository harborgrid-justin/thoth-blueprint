import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { StorageAdapter, StorageRecord } from "./types.js";
import { MemoryStorageAdapter } from "./memoryAdapter.js";
import { SqliteStorageAdapter } from "./sqliteAdapter.js";

interface Widget extends StorageRecord {
  id: string;
  name: string;
  count: number;
}

/**
 * Every adapter must satisfy the same behavioral contract. Running these
 * once per adapter is what makes the backends interchangeable in practice,
 * not just on paper.
 */
function runContractTests(
  label: string,
  createAdapter: () => StorageAdapter | Promise<StorageAdapter>,
) {
  describe(`StorageAdapter contract: ${label}`, () => {
    let adapter: StorageAdapter;
    const cleanups: Array<() => Promise<void>> = [];

    afterEach(async () => {
      while (cleanups.length > 0) {
        await cleanups.pop()!();
      }
    });

    async function getAdapter(): Promise<StorageAdapter> {
      adapter = await createAdapter();
      cleanups.push(() => adapter.close());
      return adapter;
    }

    it("returns undefined for a missing record", async () => {
      const storage = await getAdapter();
      await expect(storage.get<Widget>("widgets", "missing")).resolves.toBeUndefined();
    });

    it("returns an empty list for an unused collection", async () => {
      const storage = await getAdapter();
      await expect(storage.list<Widget>("widgets")).resolves.toEqual([]);
    });

    it("round-trips a record through put/get", async () => {
      const storage = await getAdapter();
      const widget: Widget = { id: "w1", name: "Bolt", count: 3 };
      await storage.put("widgets", widget);
      await expect(storage.get<Widget>("widgets", "w1")).resolves.toEqual(widget);
    });

    it("lists every record in a collection", async () => {
      const storage = await getAdapter();
      await storage.put<Widget>("widgets", { id: "w1", name: "Bolt", count: 3 });
      await storage.put<Widget>("widgets", { id: "w2", name: "Nut", count: 5 });
      const all = await storage.list<Widget>("widgets");
      expect(all.map((w) => w.id).sort()).toEqual(["w1", "w2"]);
    });

    it("put replaces an existing record with the same id", async () => {
      const storage = await getAdapter();
      await storage.put<Widget>("widgets", { id: "w1", name: "Bolt", count: 3 });
      await storage.put<Widget>("widgets", { id: "w1", name: "Bolt", count: 9 });
      const all = await storage.list<Widget>("widgets");
      expect(all).toHaveLength(1);
      expect(all[0].count).toBe(9);
    });

    it("delete removes a record and reports whether it existed", async () => {
      const storage = await getAdapter();
      await storage.put<Widget>("widgets", { id: "w1", name: "Bolt", count: 3 });
      await expect(storage.delete("widgets", "w1")).resolves.toBe(true);
      await expect(storage.delete("widgets", "w1")).resolves.toBe(false);
      await expect(storage.get("widgets", "w1")).resolves.toBeUndefined();
    });

    it("clear empties a collection without touching others", async () => {
      const storage = await getAdapter();
      await storage.put<Widget>("widgets", { id: "w1", name: "Bolt", count: 3 });
      await storage.put<Widget>("gadgets", { id: "g1", name: "Gizmo", count: 1 });
      await storage.clear("widgets");
      await expect(storage.list("widgets")).resolves.toEqual([]);
      await expect(storage.list("gadgets")).resolves.toHaveLength(1);
    });

    it("keeps collections isolated from each other", async () => {
      const storage = await getAdapter();
      await storage.put<Widget>("widgets", { id: "shared-id", name: "Bolt", count: 1 });
      await storage.put<Widget>("gadgets", { id: "shared-id", name: "Gizmo", count: 2 });
      await expect(storage.get<Widget>("widgets", "shared-id")).resolves.toMatchObject({
        name: "Bolt",
      });
      await expect(storage.get<Widget>("gadgets", "shared-id")).resolves.toMatchObject({
        name: "Gizmo",
      });
    });

    it("commits every write inside a successful transaction", async () => {
      const storage = await getAdapter();
      await storage.transaction(async () => {
        await storage.put<Widget>("widgets", { id: "w1", name: "Bolt", count: 1 });
        await storage.put<Widget>("widgets", { id: "w2", name: "Nut", count: 2 });
      });
      await expect(storage.list("widgets")).resolves.toHaveLength(2);
    });

    it("rolls back every write when a transaction throws", async () => {
      const storage = await getAdapter();
      await storage.put<Widget>("widgets", { id: "w1", name: "Bolt", count: 1 });
      await expect(
        storage.transaction(async () => {
          await storage.put<Widget>("widgets", { id: "w2", name: "Nut", count: 2 });
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
      const all = await storage.list<Widget>("widgets");
      expect(all.map((w) => w.id)).toEqual(["w1"]);
    });

    it("returns the transaction's result", async () => {
      const storage = await getAdapter();
      const result = await storage.transaction(() => 42);
      expect(result).toBe(42);
    });
  });
}

runContractTests("memory", () => new MemoryStorageAdapter());

runContractTests("sqlite", () => {
  const file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "thoth-storage-")),
    "test.sqlite3",
  );
  return new SqliteStorageAdapter({ file });
});

runContractTests("sqlite (:memory:)", () => new SqliteStorageAdapter({ file: ":memory:" }));
