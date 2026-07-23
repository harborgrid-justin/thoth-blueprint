/**
 * @thoth/service-auth — identity & access.
 *
 * Real implementation, backed by the `thoth-napi` native addon, which in
 * turn wraps the real `AuthService` in `crates/thoth-services/src/auth/`
 * (Argon2id password hashing, organizations/teams, role-based
 * `authorize` checks — 19 passing Rust tests). This replaces the previous
 * scaffold (`export const __SCAFFOLD__ = true`) entirely — see
 * ./README.md for the architecture this fits into and
 * `docs/RUST_MIGRATION.md` for the wider migration this is part of.
 *
 * Every operation below is a real call into the native addon — there is no
 * TypeScript-side reimplementation of hashing, membership, or role logic
 * here. This module's only job is: load the addon, hold its opaque client
 * handle, and give callers a typed, ergonomic, object-oriented surface
 * instead of a bag of `(handle, ...) => Promise<...>` free functions.
 *
 * ## Backing store
 *
 * See `crates/thoth-napi/src/auth.rs`'s module docs for why the native
 * client is backed by SQLite (not an in-memory store): identity data must
 * survive process restarts. {@link AuthService}'s constructor defaults to
 * `AUTH_SQLITE_FILE` or `data/auth.sqlite3` (relative to the repo root),
 * matching `@thoth/storage`'s own SQLite-by-default convention; pass
 * `":memory:"` explicitly for a non-persistent instance (e.g. tests).
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

/**
 * A registered identity. Never carries a password or password hash — that
 * secret stays behind the native boundary (see
 * `crates/thoth-napi/src/auth.rs`'s `AuthUser`).
 */
export interface User {
  id: string;
  name: string;
  email: string;
  color: string;
}

/** An organization that owns projects. */
export interface Organization {
  id: string;
  name: string;
  ownerId: string;
}

/** A named sub-grouping of an organization's members. */
export interface Team {
  id: string;
  organizationId: string;
  name: string;
}

/** A role within an organization, from least to most privileged. */
export type Role = "viewer" | "commenter" | "editor" | "owner";

/** An action a caller might attempt within an organization/project. */
export type Action =
  | "view"
  | "comment"
  | "edit"
  | "manageMembers"
  | "deleteOrganization";

/** A user's role within an organization. */
export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
}

/**
 * The shape of the `thoth-napi` native addon's `auth*` exports this module
 * calls into. Hand-written (rather than generated) because
 * `scripts/build-napi.sh` copies the compiled addon directly without
 * running napi-rs' `.d.ts` typegen — see `crates/README.md`. Kept private:
 * callers use {@link AuthService}, never this interface, so a future
 * addition to the native surface doesn't need a matching TS change here
 * unless {@link AuthService} grows a method for it too.
 */
interface NativeAuthAddon {
  authCreateClient(sqliteFile: string): number;
  authCloseClient(handle: number): void;
  authRegister(
    handle: number,
    name: string,
    email: string,
    password: string,
  ): Promise<User>;
  authAuthenticate(handle: number, email: string, password: string): Promise<User>;
  authGetUser(handle: number, userId: string): Promise<User>;
  authCreateOrganization(
    handle: number,
    name: string,
    ownerId: string,
  ): Promise<Organization>;
  authGetOrganization(handle: number, organizationId: string): Promise<Organization>;
  authCreateTeam(handle: number, organizationId: string, name: string): Promise<Team>;
  authAddMember(
    handle: number,
    organizationId: string,
    userId: string,
    role: Role,
  ): Promise<Membership>;
  authRoleOf(
    handle: number,
    organizationId: string,
    userId: string,
  ): Promise<Role | null>;
  authAuthorize(
    handle: number,
    organizationId: string,
    userId: string,
    action: Action,
  ): Promise<void>;
}

/**
 * Walk upward from `startDir` to find the Thoth Blueprint repo root,
 * identified by a root `Cargo.toml` sitting next to a `crates/` directory.
 * Avoids hardcoding this package's depth below the repo root, so this
 * loader keeps working if `services/auth` ever moves.
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
        "@thoth/service-auth: could not locate the Thoth Blueprint repo root " +
          "(looked for a Cargo.toml next to a crates/ directory) while loading " +
          "the thoth-napi native addon.",
      );
    }
    dir = parent;
  }
}

function loadNativeAddon(): NativeAuthAddon {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = findRepoRoot(here);
  const addonPath = path.join(repoRoot, "target", "napi", "thoth_napi.node");
  const require = createRequire(import.meta.url);
  try {
    return require(addonPath) as NativeAuthAddon;
  } catch (err) {
    throw new Error(
      `@thoth/service-auth: failed to load the native thoth-napi addon at "${addonPath}". ` +
        'Build it first with "yarn build:napi" (see crates/README.md). ' +
        `Original error: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }
}

let cachedAddon: NativeAuthAddon | null = null;

/** Lazily load (and cache) the native addon — deferred so importing this
 * module never requires the addon to already be built (e.g. for a
 * type-check-only invocation); only constructing an {@link AuthService}
 * does. */
function nativeAddon(): NativeAuthAddon {
  if (!cachedAddon) {
    cachedAddon = loadNativeAddon();
  }
  return cachedAddon;
}

const DEFAULT_SQLITE_FILE = path.join("data", "auth.sqlite3");

/**
 * Identity, organizations/teams, and role-based access control for Thoth
 * Blueprint — a thin, ergonomic wrapper around the native `thoth-napi`
 * `auth*` exports. Every method is a real call across the FFI boundary into
 * `crates/thoth-services/src/auth/service.rs`'s `AuthService`; nothing is
 * reimplemented here.
 *
 * @example
 * ```ts
 * const auth = new AuthService(); // data/auth.sqlite3 by default
 * const user = await auth.register("Amaya Okonkwo", "amaya@city.gov", "correct horse battery");
 * const org = await auth.createOrganization("Riverside Studio", user.id);
 * await auth.authorize(org.id, user.id, "manageMembers"); // resolves: owner may
 * auth.close();
 * ```
 */
export class AuthService {
  private readonly handle: number;
  private closed = false;

  /**
   * @param sqliteFile Path to the SQLite file backing this client, or
   *   `":memory:"` for a non-persistent instance. Defaults to the
   *   `AUTH_SQLITE_FILE` environment variable, then `data/auth.sqlite3`.
   */
  constructor(sqliteFile?: string) {
    const file = sqliteFile ?? process.env.AUTH_SQLITE_FILE ?? DEFAULT_SQLITE_FILE;
    this.handle = nativeAddon().authCreateClient(file);
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error(
        "@thoth/service-auth: this AuthService instance has already been closed()",
      );
    }
  }

  /**
   * Register a new user. Rejects if `email` is already registered
   * (case-insensitively).
   */
  async register(name: string, email: string, password: string): Promise<User> {
    this.assertOpen();
    return nativeAddon().authRegister(this.handle, name, email, password);
  }

  /**
   * Verify credentials and return the matching user. Rejects uniformly
   * whether the email is unknown or the password is wrong — callers
   * shouldn't (and can't) distinguish the two from the rejection.
   */
  async authenticate(email: string, password: string): Promise<User> {
    this.assertOpen();
    return nativeAddon().authAuthenticate(this.handle, email, password);
  }

  /** Look up a user by id. */
  async getUser(userId: string): Promise<User> {
    this.assertOpen();
    return nativeAddon().authGetUser(this.handle, userId);
  }

  /**
   * Create an organization owned by `ownerId`, who is granted an implicit
   * `"owner"` membership.
   */
  async createOrganization(name: string, ownerId: string): Promise<Organization> {
    this.assertOpen();
    return nativeAddon().authCreateOrganization(this.handle, name, ownerId);
  }

  /** Look up an organization by id. */
  async getOrganization(organizationId: string): Promise<Organization> {
    this.assertOpen();
    return nativeAddon().authGetOrganization(this.handle, organizationId);
  }

  /** Create a team within an organization. */
  async createTeam(organizationId: string, name: string): Promise<Team> {
    this.assertOpen();
    return nativeAddon().authCreateTeam(this.handle, organizationId, name);
  }

  /**
   * Grant (or change) `userId`'s role within `organizationId`. Calling this
   * again for the same (organization, user) pair replaces the role rather
   * than creating a second membership.
   */
  async addMember(
    organizationId: string,
    userId: string,
    role: Role,
  ): Promise<Membership> {
    this.assertOpen();
    return nativeAddon().authAddMember(this.handle, organizationId, userId, role);
  }

  /** The role `userId` holds in `organizationId`, or `null` if not a member. */
  async roleOf(organizationId: string, userId: string): Promise<Role | null> {
    this.assertOpen();
    return nativeAddon().authRoleOf(this.handle, organizationId, userId);
  }

  /**
   * Check whether `userId` may perform `action` within `organizationId`.
   * Resolves if authorized; rejects with a descriptive error otherwise —
   * treat any rejection as "not authorized", the same way the native side
   * does (see `crates/thoth-napi/src/auth.rs`).
   */
  async authorize(organizationId: string, userId: string, action: Action): Promise<void> {
    this.assertOpen();
    return nativeAddon().authAuthorize(this.handle, organizationId, userId, action);
  }

  /**
   * Release this client's native handle. Calls already in flight still
   * complete; any call made after `close()` throws.
   */
  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    nativeAddon().authCloseClient(this.handle);
  }
}

/** Test-only hook: reset the cached addon so tests can re-load it after
 * mocking `node:module`'s `createRequire`. Not exported from the package's
 * public surface (not re-exported anywhere else); intended for this
 * package's own test suite only. */
export const __test__ = {
  resetNativeAddonCache(): void {
    cachedAddon = null;
  },
};
