# @thoth/service-auth

Identity & access for Thoth Blueprint.

> **Status: implemented.** Backed by the real `AuthService` in
> [`crates/thoth-services/src/auth/`](../../crates/thoth-services/src/auth/)
> (19 passing Rust tests), exposed to this package through the
> [`thoth-napi`](../../crates/thoth-napi/) native Node addon
> (`crates/thoth-napi/src/auth.rs`). See
> [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) and
> [`docs/RUST_MIGRATION.md`](../../docs/RUST_MIGRATION.md) for how this fits
> the wider platform and migration.

## What this is

A thin, typed TypeScript wrapper (`src/index.ts`) around the native
`thoth-napi` addon's `auth*` exports. Every operation — password hashing
(Argon2id), registration/authentication, organizations/teams, and
role-based `authorize` checks — is real logic running in Rust; this
package holds no business logic of its own, only the FFI ergonomics (an
opaque native handle wrapped in an `AuthService` class) and TypeScript
types.

## Responsibilities

- Authentication (registration, credential verification). Passwords are
  hashed with Argon2id and never leave the native boundary as plaintext or
  a hash — `User` objects returned to TypeScript never carry a
  `password_hash` field.
- Organizations and teams that own projects.
- Roles and permissions (`viewer` / `commenter` / `editor` / `owner`) and
  the actions they permit (`view` / `comment` / `edit` / `manageMembers` /
  `deleteOrganization`), enforced via `authorize()`.

## Usage

```ts
import { AuthService } from "@thoth/service-auth";

const auth = new AuthService(); // data/auth.sqlite3 by default
const user = await auth.register("Amaya Okonkwo", "amaya@city.gov", "correct horse battery");
const org = await auth.createOrganization("Riverside Studio", user.id);

await auth.authorize(org.id, user.id, "manageMembers"); // resolves: the owner may
auth.close();
```

Pass `":memory:"` to the constructor for a non-persistent instance (what
this package's own test suite does), or set `AUTH_SQLITE_FILE` to point at
a specific file.

## Backing store

`AuthService<A: StorageAdapter>` on the Rust side is generic over its
backing store. This binding wires it to a SQLite file (via
`SqliteStorageAdapter`), not an in-memory store — identity data needs to
survive process restarts, unlike a presence cache. This reuses
`@thoth/storage`'s own SQLite-by-default convention rather than
introducing a third persistence path; see
`crates/thoth-napi/src/auth.rs`'s module docs for the full reasoning.

## Boundaries

- Owns identity and authorization; other services ask it "who is this and
  may they do X" via `authorize()` rather than re-implementing access
  control.
- No planning geometry here — that's `@thoth/domain`.
- Does not stand up a web server or issue sessions/tokens — those are a
  future HTTP/gRPC transport layer's concern, built on top of this
  service-logic layer (see `crates/thoth-services/STATUS.md`).

## Building and testing

The native addon must be built first:

```sh
yarn build:napi   # from the repo root; see crates/README.md
```

Then, from this package:

```sh
yarn type-check
yarn test         # loads the real compiled addon — not a mock
yarn lint
```
