/**
 * @thoth/service-collaboration — real-time collaboration.
 *
 * Real implementation, backed by the `thoth-napi` native addon, which in
 * turn wraps the real `CollaborationHub` in
 * `crates/thoth-services/src/collaboration/` (presence tracking, an
 * optimistic-concurrency co-editing model, comment/thread-resolution
 * notifications — 9 passing Rust tests). This replaces the previous
 * scaffold (`export const __SCAFFOLD__ = true`) entirely — see
 * ./README.md for the architecture this fits into.
 *
 * ## Scope
 *
 * As documented in `crates/thoth-napi/src/collaboration.rs`, this pass
 * wires join/leave/cursor presence, element-change publication, and
 * comment/thread-resolution notifications — not the live event stream
 * `CollaborationHub::join` also produces. A future websocket/SSE transport
 * layer is the natural place to both hold that subscription open and push
 * events to connected clients; this module gives that future layer (or
 * anything else that needs to read/write room state) a typed surface to
 * call.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

/** A plan-space position (see `@thoth/domain`'s `Point`). */
export interface Point {
  x: number;
  y: number;
}

/**
 * A connected participant's live state within one project's editing
 * session.
 */
export interface Presence {
  userId: string;
  displayName: string;
  color: string;
  cursor?: Point;
  /** ISO 8601 / RFC 3339 timestamp. */
  joinedAt: string;
  /** ISO 8601 / RFC 3339 timestamp. */
  lastSeen: string;
}

/** What kind of change {@link CollaborationHub.publishElementChange} records. */
export type ElementOpType = "created" | "updated" | "deleted";

/**
 * The shape of the `thoth-napi` native addon's `collab*` exports this
 * module calls into. See `services/auth/src/index.ts`'s equivalent
 * interface for why this is hand-written rather than generated.
 */
interface NativeCollaborationAddon {
  collabCreateHub(): number;
  collabCloseHub(handle: number): void;
  collabJoin(
    handle: number,
    projectId: string,
    userId: string,
    displayName: string,
    color: string,
  ): Promise<Presence>;
  collabLeave(handle: number, projectId: string, userId: string): Promise<void>;
  collabMoveCursor(
    handle: number,
    projectId: string,
    userId: string,
    point: Point,
  ): Promise<void>;
  collabPresenceSnapshot(handle: number, projectId: string): Promise<Presence[]>;
  collabPublishElementChange(
    handle: number,
    projectId: string,
    authorId: string,
    elementId: string,
    expectedRevision: number | null | undefined,
    opType: ElementOpType,
    payload: unknown,
  ): Promise<number>;
  collabPublishComment(
    handle: number,
    projectId: string,
    threadId: string,
    commentId: string,
  ): Promise<void>;
  collabResolveThread(handle: number, projectId: string, threadId: string): Promise<void>;
}

/**
 * Walk upward from `startDir` to find the Thoth Blueprint repo root,
 * identified by a root `Cargo.toml` sitting next to a `crates/` directory.
 * Duplicated from `services/auth/src/index.ts` rather than factored into a
 * shared package — each service package here is meant to stay independently
 * buildable/publishable, per this monorepo's "each workspace owns its own
 * package.json and scripts" convention (see root `CLAUDE.md`).
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
        "@thoth/service-collaboration: could not locate the Thoth Blueprint repo " +
          "root (looked for a Cargo.toml next to a crates/ directory) while " +
          "loading the thoth-napi native addon.",
      );
    }
    dir = parent;
  }
}

function loadNativeAddon(): NativeCollaborationAddon {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = findRepoRoot(here);
  const addonPath = path.join(repoRoot, "target", "napi", "thoth_napi.node");
  const require = createRequire(import.meta.url);
  try {
    return require(addonPath) as NativeCollaborationAddon;
  } catch (err) {
    throw new Error(
      `@thoth/service-collaboration: failed to load the native thoth-napi addon at "${addonPath}". ` +
        'Build it first with "yarn build:napi" (see crates/README.md). ' +
        `Original error: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }
}

let cachedAddon: NativeCollaborationAddon | null = null;

function nativeAddon(): NativeCollaborationAddon {
  if (!cachedAddon) {
    cachedAddon = loadNativeAddon();
  }
  return cachedAddon;
}

/**
 * Presence and live co-editing state for every project's collaboration
 * room — a thin, ergonomic wrapper around the native `thoth-napi`
 * `collab*` exports. Every method is a real call across the FFI boundary
 * into `crates/thoth-services/src/collaboration/hub.rs`'s
 * `CollaborationHub`; nothing is reimplemented here.
 *
 * One `CollaborationHub` instance (native handle) is shared across all
 * concurrent editing sessions in a process — construct one at process
 * startup, not per request.
 *
 * @example
 * ```ts
 * const hub = new CollaborationHub();
 * const presence = await hub.join("proj-1", user.id, user.name, user.color);
 * const revision = await hub.publishElementChange("proj-1", user.id, "el-1", 0, "created", { ... });
 * await hub.leave("proj-1", user.id);
 * hub.close();
 * ```
 */
export class CollaborationHub {
  private readonly handle: number;
  private closed = false;

  constructor() {
    this.handle = nativeAddon().collabCreateHub();
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error(
        "@thoth/service-collaboration: this CollaborationHub instance has already been closed()",
      );
    }
  }

  /** Join `projectId`'s room, registering presence. */
  async join(
    projectId: string,
    userId: string,
    displayName: string,
    color: string,
  ): Promise<Presence> {
    this.assertOpen();
    return nativeAddon().collabJoin(this.handle, projectId, userId, displayName, color);
  }

  /** Leave a room, removing presence. */
  async leave(projectId: string, userId: string): Promise<void> {
    this.assertOpen();
    return nativeAddon().collabLeave(this.handle, projectId, userId);
  }

  /** Update a joined participant's cursor position. */
  async moveCursor(projectId: string, userId: string, point: Point): Promise<void> {
    this.assertOpen();
    return nativeAddon().collabMoveCursor(this.handle, projectId, userId, point);
  }

  /**
   * The current set of present participants in `projectId`'s room (empty
   * if the room doesn't exist or has no participants).
   */
  async presenceSnapshot(projectId: string): Promise<Presence[]> {
    this.assertOpen();
    return nativeAddon().collabPresenceSnapshot(this.handle, projectId);
  }

  /**
   * Publish a change to a plan element under optimistic concurrency
   * control: `expectedRevision` must match the element's current revision
   * (`undefined`/`null` only for an element never edited through this hub,
   * current revision `0`), or the call rejects — the caller should
   * re-fetch and retry with the current revision, the same way an HTTP
   * `If-Match`/412 flow works. `payload` is the new snapshot (for
   * `"created"`) or patch (for `"updated"`), ignored for `"deleted"`.
   * Returns the new revision on success.
   */
  async publishElementChange(
    projectId: string,
    authorId: string,
    elementId: string,
    expectedRevision: number | undefined,
    opType: ElementOpType,
    payload?: unknown,
  ): Promise<number> {
    this.assertOpen();
    return nativeAddon().collabPublishElementChange(
      this.handle,
      projectId,
      authorId,
      elementId,
      expectedRevision,
      opType,
      payload,
    );
  }

  /**
   * Notify a room's live viewers that a comment was posted. The comment
   * itself is persisted by `@thoth/service-projects`; this is purely a
   * live-refresh signal.
   */
  async publishComment(projectId: string, threadId: string, commentId: string): Promise<void> {
    this.assertOpen();
    return nativeAddon().collabPublishComment(this.handle, projectId, threadId, commentId);
  }

  /** Notify a room's live viewers that a review thread was resolved. */
  async resolveThread(projectId: string, threadId: string): Promise<void> {
    this.assertOpen();
    return nativeAddon().collabResolveThread(this.handle, projectId, threadId);
  }

  /**
   * Release this hub's native handle. Calls already in flight still
   * complete; any call made after `close()` throws.
   */
  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    nativeAddon().collabCloseHub(this.handle);
  }
}

/** Test-only hook — see `services/auth/src/index.ts`'s equivalent. */
export const __test__ = {
  resetNativeAddonCache(): void {
    cachedAddon = null;
  },
};
