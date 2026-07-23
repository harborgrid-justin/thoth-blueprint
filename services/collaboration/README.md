# @thoth/service-collaboration

Real-time collaboration for Thoth Blueprint.

> **Status: implemented (Phase 4 scope).** Backed by the real
> `CollaborationHub` in
> [`crates/thoth-services/src/collaboration/`](../../crates/thoth-services/src/collaboration/)
> (9 passing Rust tests), exposed to this package through the
> [`thoth-napi`](../../crates/thoth-napi/) native Node addon
> (`crates/thoth-napi/src/collaboration.rs`). See
> [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) and
> [`docs/ROADMAP.md`](../../docs/ROADMAP.md) (Phase 4) for how this fits the
> wider platform.

## What this is

A thin, typed TypeScript wrapper (`src/index.ts`) around the native
`thoth-napi` addon's `collab*` exports. Presence tracking and the
optimistic-concurrency conflict-resolution strategy for element edits are
real logic running in Rust; this package holds no business logic of its
own, only the FFI ergonomics (an opaque native handle wrapped in a
`CollaborationHub` class) and TypeScript types.

## Responsibilities

- **Presence** — who is viewing/editing a project, and where their cursor
  is (`join` / `leave` / `moveCursor` / `presenceSnapshot`).
- **Co-editing conflict resolution** — `publishElementChange` under
  **optimistic concurrency control**: every element has a monotonically
  increasing revision; a caller states the revision it expected, and a
  stale write is rejected rather than silently merged (the caller re-fetches
  and rebases). See `crates/thoth-services/src/collaboration/hub.rs`'s
  module docs for why this — not a CRDT/OT — is the appropriate first
  version.
- **Review-thread notifications** — `publishComment` / `resolveThread`
  notify live viewers to refresh; the comments/threads themselves are
  persisted by `@thoth/service-projects`, not duplicated here.

## Usage

```ts
import { CollaborationHub } from "@thoth/service-collaboration";

const hub = new CollaborationHub(); // one per process; share across sessions
const presence = await hub.join("proj-1", user.id, user.name, user.color);

const revision = await hub.publishElementChange(
  "proj-1",
  user.id,
  "el-1",
  0, // expected revision (0 = never edited through this hub)
  "created",
  { /* element snapshot */ },
);

await hub.leave("proj-1", user.id);
hub.close();
```

## Scope of this pass

`CollaborationHub::join` (Rust) also returns a live event receiver for
every subsequent presence/edit/comment broadcast in a room. That receiver
is **not** exposed to TypeScript here — streaming it out needs a
callback/async-iterator bridge across the FFI boundary, a materially
different shape from everything else this package wires, and is left for a
future websocket/SSE transport layer to build (the natural place to also
hold that subscription open per connected client). Every method here
reads/writes room state and returns, without holding a subscription open —
see `crates/thoth-napi/src/collaboration.rs`'s module docs.

## Boundaries

- Coordinates concurrent edits to *in-flight* session state; persistence
  and versioning belong to `@thoth/service-projects`, identity/permissions
  to `@thoth/service-auth`.
- Opens no network sockets itself — `CollaborationHub` is the
  transport-agnostic core a future websocket/SSE layer sits on top of.

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
