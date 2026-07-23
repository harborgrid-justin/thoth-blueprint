import { describe, expect, it } from "vitest";
import { AuthService } from "./index.js";

/**
 * Exercises the real, compiled `thoth-napi` native addon (see
 * `crates/thoth-napi/src/auth.rs` and `crates/thoth-services/src/auth/`) —
 * not a mock. Run `yarn build:napi` first if these fail with a "failed to
 * load the native thoth-napi addon" error.
 *
 * Every test uses a `:memory:` SQLite backing store for isolation and
 * speed; production callers would omit the argument to get the default
 * `data/auth.sqlite3` file (see `AuthService`'s constructor docs).
 */
describe("AuthService (native thoth-napi binding)", () => {
  it("registers and authenticates a user, and never exposes a password hash", async () => {
    const auth = new AuthService(":memory:");
    try {
      const user = await auth.register(
        "Amaya Okonkwo",
        "amaya@city.gov",
        "correct horse battery",
      );
      expect(user.email).toBe("amaya@city.gov");
      expect(user.name).toBe("Amaya Okonkwo");
      expect(user.id).toMatch(/^user_/);
      expect(user).not.toHaveProperty("password_hash");
      expect(user).not.toHaveProperty("passwordHash");

      const authenticated = await auth.authenticate(
        "amaya@city.gov",
        "correct horse battery",
      );
      expect(authenticated.id).toBe(user.id);
    } finally {
      auth.close();
    }
  });

  it("rejects a wrong password and an unknown email identically", async () => {
    const auth = new AuthService(":memory:");
    try {
      await auth.register("Amaya", "amaya@city.gov", "pw12345678");
      await expect(auth.authenticate("amaya@city.gov", "nope")).rejects.toThrow();
      await expect(auth.authenticate("nobody@nowhere.dev", "nope")).rejects.toThrow();
    } finally {
      auth.close();
    }
  });

  it("rejects duplicate email registration case-insensitively", async () => {
    const auth = new AuthService(":memory:");
    try {
      await auth.register("Amaya", "dup@city.gov", "pw12345678");
      await expect(
        auth.register("Someone Else", "DUP@CITY.GOV", "different-pw"),
      ).rejects.toThrow();
    } finally {
      auth.close();
    }
  });

  it("creates an organization, grants the owner role, and enforces authorize", async () => {
    const auth = new AuthService(":memory:");
    try {
      const owner = await auth.register("Owner", "owner@thoth.dev", "pw12345678");
      const viewer = await auth.register("Viewer", "viewer@thoth.dev", "pw12345678");
      const org = await auth.createOrganization("Riverside Studio", owner.id);

      expect(await auth.roleOf(org.id, owner.id)).toBe("owner");
      await expect(
        auth.authorize(org.id, owner.id, "manageMembers"),
      ).resolves.toBeUndefined();

      await auth.addMember(org.id, viewer.id, "viewer");
      await expect(auth.authorize(org.id, viewer.id, "view")).resolves.toBeUndefined();
      await expect(auth.authorize(org.id, viewer.id, "edit")).rejects.toThrow();
    } finally {
      auth.close();
    }
  });

  it("creates a team within an organization", async () => {
    const auth = new AuthService(":memory:");
    try {
      const owner = await auth.register("Owner", "owner2@thoth.dev", "pw12345678");
      const org = await auth.createOrganization("Civil Studio", owner.id);
      const team = await auth.createTeam(org.id, "Civil");
      expect(team.organizationId).toBe(org.id);
      expect(team.name).toBe("Civil");
    } finally {
      auth.close();
    }
  });

  it("reports no membership for a stranger, and null for roleOf", async () => {
    const auth = new AuthService(":memory:");
    try {
      const owner = await auth.register("Owner", "owner3@thoth.dev", "pw12345678");
      const stranger = await auth.register("Stranger", "stranger@thoth.dev", "pw12345678");
      const org = await auth.createOrganization("Riverside Studio", owner.id);

      expect(await auth.roleOf(org.id, stranger.id)).toBeNull();
      await expect(auth.authorize(org.id, stranger.id, "view")).rejects.toThrow();
    } finally {
      auth.close();
    }
  });

  it("throws once closed, without crashing the process", async () => {
    const auth = new AuthService(":memory:");
    auth.close();
    await expect(
      auth.register("Ghost", "ghost@nowhere.dev", "pw12345678"),
    ).rejects.toThrow(/already been closed/);
    // Calling close() again is a safe no-op.
    expect(() => auth.close()).not.toThrow();
  });
});
