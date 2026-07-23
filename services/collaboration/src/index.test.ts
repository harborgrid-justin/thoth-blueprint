import { describe, expect, it } from "vitest";
import { CollaborationHub } from "./index.js";

/**
 * Exercises the real, compiled `thoth-napi` native addon (see
 * `crates/thoth-napi/src/collaboration.rs` and
 * `crates/thoth-services/src/collaboration/`) — not a mock. Run
 * `yarn build:napi` first if these fail with a "failed to load the native
 * thoth-napi addon" error.
 *
 * Each test constructs its own `CollaborationHub` (a fresh native handle),
 * so rooms never leak state between tests.
 */
describe("CollaborationHub (native thoth-napi binding)", () => {
  it("joins, moves a cursor, and leaves — reflected in the presence snapshot", async () => {
    const hub = new CollaborationHub();
    try {
      const presence = await hub.join("proj-1", "user-1", "Amaya", "#f59e0b");
      expect(presence.userId).toBe("user-1");
      expect(presence.displayName).toBe("Amaya");
      expect(presence.cursor).toBeUndefined();

      let snapshot = await hub.presenceSnapshot("proj-1");
      expect(snapshot).toHaveLength(1);
      expect(snapshot[0].userId).toBe("user-1");

      await hub.moveCursor("proj-1", "user-1", { x: 3, y: 4 });
      snapshot = await hub.presenceSnapshot("proj-1");
      expect(snapshot[0].cursor).toEqual({ x: 3, y: 4 });

      await hub.leave("proj-1", "user-1");
      snapshot = await hub.presenceSnapshot("proj-1");
      expect(snapshot).toHaveLength(0);
    } finally {
      hub.close();
    }
  });

  it("a second joiner is independent of the first in the same room", async () => {
    const hub = new CollaborationHub();
    try {
      await hub.join("proj-1", "user-1", "Amaya", "#f59e0b");
      await hub.join("proj-1", "user-2", "Liang", "#ec4899");
      const snapshot = await hub.presenceSnapshot("proj-1");
      expect(snapshot.map((p) => p.userId).sort()).toEqual(["user-1", "user-2"]);
    } finally {
      hub.close();
    }
  });

  it("rejects a stale element revision and accepts a rebase", async () => {
    const hub = new CollaborationHub();
    try {
      const rev1 = await hub.publishElementChange(
        "proj-1",
        "user-1",
        "el-1",
        0,
        "created",
        { a: 1 },
      );
      expect(rev1).toBe(1);

      await expect(
        hub.publishElementChange("proj-1", "user-2", "el-1", 0, "updated", { b: 2 }),
      ).rejects.toThrow();

      const rev2 = await hub.publishElementChange(
        "proj-1",
        "user-2",
        "el-1",
        1,
        "updated",
        { b: 2 },
      );
      expect(rev2).toBe(2);
    } finally {
      hub.close();
    }
  });

  it("an unconditional (no expected revision) edit always succeeds", async () => {
    const hub = new CollaborationHub();
    try {
      await hub.publishElementChange("proj-1", "user-1", "el-1", 0, "created", {});
      const revision = await hub.publishElementChange(
        "proj-1",
        "user-2",
        "el-1",
        undefined,
        "deleted",
      );
      expect(revision).toBe(2);
    } finally {
      hub.close();
    }
  });

  it("publishes comment and thread-resolution notifications without a joined listener", async () => {
    const hub = new CollaborationHub();
    try {
      await expect(
        hub.publishComment("proj-1", "thrd-1", "cmt-1"),
      ).resolves.toBeUndefined();
      await expect(hub.resolveThread("proj-1", "thrd-1")).resolves.toBeUndefined();
    } finally {
      hub.close();
    }
  });

  it("throws once closed, without crashing the process", async () => {
    const hub = new CollaborationHub();
    hub.close();
    await expect(
      hub.join("proj-1", "user-1", "Amaya", "#f59e0b"),
    ).rejects.toThrow(/already been closed/);
    expect(() => hub.close()).not.toThrow();
  });
});
