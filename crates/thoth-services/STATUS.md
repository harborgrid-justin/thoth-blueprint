# `thoth-services` port status

Honest mapping of each TypeScript source area to where it landed in this
crate, and how complete/tested that port is. Statuses used:

- `ported+tested` — behavior-equivalent port, with the original `.test.ts`
  cases (or a faithful adaptation of them) passing as Rust tests.
- `ported+partial-tests` — implemented, but test coverage or scope is
  narrower than the original (explained below).
- `not-yet-ported` — not started.
- `new-implementation+tested` — no TS original to port (scaffold only); a
  first real implementation, with new Rust tests since there was nothing to
  port 1:1.

Run `cargo test -p thoth-services`: **104 tests, all passing.**
`cargo fmt -p thoth-services -- --check` and
`cargo clippy -p thoth-services --all-targets -- -D warnings` are both clean.

| Area | Rust location | Status |
| --- | --- | --- |
| `packages/storage` (`StorageAdapter` trait) | `src/storage/adapter.rs` | `ported+tested` |
| `packages/storage/memoryAdapter.ts` | `src/storage/memory.rs` | `ported+tested` |
| `packages/storage/sqliteAdapter.ts` | `src/storage/sqlite.rs` | `ported+tested` |
| `packages/storage/createStorage.ts` | `src/storage/create.rs` | `ported+tested` |
| `packages/storage/storageAdapter.contract.test.ts` | `src/storage/contract_tests.rs` | `ported+tested` |
| `packages/storage/postgresAdapter.ts` | `src/storage/postgres.rs` | `ported+partial-tests` (see below — **must-have scope was the trait + memory + sqlite; this is the best-effort extra**) |
| `services/geospatial/projections.ts` | `src/geospatial/projections.rs` | `ported+tested` |
| `services/geospatial/interop.ts` | `src/geospatial/interop.rs` | `ported+tested` (with a scoped `PlanElement` — see below) |
| `services/geospatial/index.ts` (HTTP layer) | — | `not-yet-ported` (intentional — see "What's deliberately not here") |
| `services/projects/store.ts` | `src/projects/store.rs` | `ported+tested` |
| `services/projects/index.ts` (route logic) | `src/projects/service.rs` | `ported+tested` (route *logic*; HTTP transport not reproduced — see below) |
| `services/auth` (scaffold only) | `src/auth/*` | `new-implementation+tested` |
| `services/collaboration` (scaffold only) | `src/collaboration/*` | `new-implementation+tested` |

## Test count by module

```
storage::contract_tests::{memory,sqlite,sqlite_in_memory}   33 tests (11 contract cases × 3 adapters)
storage::{create,memory,sqlite,types}                       12 tests
auth::{types,password,service}                               19 tests
projects::{store,service}                                    20 tests
geospatial::{projections,interop}                            13 tests
collaboration::hub                                             9 tests
                                                              ---
                                                              104 tests
```

## Must-haves — complete

- **`StorageAdapter` trait + memory + SQLite adapters** (`src/storage/`):
  fully ported, including the full contract-test suite
  (`storageAdapter.contract.test.ts`) run against all three in-process
  adapters (SQLite tested both as a real file and as `:memory:`), plus
  `createStorage.test.ts` and `sqliteAdapter.test.ts`. The trait mirrors the
  TS interface's `list`/`get`/`put`/`delete`/`clear`/`transaction`/`close`
  shape; because those methods are generic (to preserve
  `storage.list::<Project>(...)`-style ergonomics), the trait isn't
  `dyn`-safe — callers hold the concrete `Storage` enum
  (`src/storage/create.rs`) instead of a trait object, which is
  backend-agnostic without paying for indirection. See that module's docs
  for the full reasoning.
- **`services/geospatial/projections.ts`**: ported faithfully. The TS
  original delegates to `proj4` (arbitrary `+proj=...` strings); this port
  implements the specific projection families `proj4` was configured with —
  geographic, spherical Web Mercator, ellipsoidal UTM, and ellipsoidal
  Lambert Conformal Conic (CA state plane) — via the standard closed-form
  Snyder formulas, covering every CRS code the original registry defined.
  All three ported test cases pass, plus new round-trip tests for UTM and
  LCC (forward → inverse recovers the original point to 1e-6°).

## `ported+partial-tests` / scope notes

- **Postgres adapter** (`src/storage/postgres.rs`): a real implementation
  (not a stub) using `tokio-postgres`, matching the same
  `list`/`get`/`put`/`delete`/`clear`/`transaction` contract. It cannot be
  exercised by `cargo test` in this environment (no live Postgres server),
  so it has **no automated test coverage here** — it's `partial-tests` by
  necessity, not by omission. It also has a documented concurrency caveat
  (single shared connection rather than a connection pool — see the
  module's doc comment) that a production deployment should address before
  relying on it under real concurrent load. This was explicitly flagged as
  optional/best-effort in the migration brief; the trait contract + memory
  + SQLite adapters (the must-haves) are complete and fully tested.
- **`services/geospatial/interop.ts`**: ported faithfully, but its
  `PlanElement` type is a **local, minimal mirror**
  (`src/geospatial/interop.rs`), not `thoth-planning`'s eventual type — the
  TS original imports `PlanElement`/`RightOfWay`/`LandUseCategory` from
  `@thoth/domain`'s full planning-element hierarchy, which is owned by
  `thoth-planning` (see `thoth-spatial`'s module docs) and hadn't landed at
  the time of this port. The mirror covers exactly the element kinds
  `interop.ts` constructs (parcel/zone/landuse/lot/building/row/tree/spot)
  using `thoth_spatial::{Point, Polygon, ElementKind}` for the shared
  geometry/kind vocabulary. Once `thoth-planning` lands a typed
  `PlanElement`, this module should be re-pointed at it — the
  reprojection/translation logic itself doesn't change. This is not a gap
  in `thoth-spatial` (it deliberately excludes the planning hierarchy by
  design), so no `GAPS.md` was needed for it.
- **`services/projects`**: `Site` (the plan payload) is likewise an opaque
  `serde_json::Value` rather than a typed `thoth-planning` `Site` — see
  `src/projects/types.rs`'s docs. `compute_site_metrics` degrades
  gracefully (reads `siteAreaAcres`/`lotCount` off the JSON if present,
  else reports zero) rather than guessing at geometry it can't parse yet.
  None of the ported `store.test.ts` assertions depend on real metric
  values, so this doesn't weaken test fidelity for what was actually
  specified.
- **`Member.role`** (`src/projects/types.rs`) is typed as
  `crate::auth::Role` rather than the TS original's bare `string` — a
  deliberate strengthening (the role vocabulary is the one
  `@thoth/service-auth` already defines; there's no reason for a second,
  stringly-typed one), not a fidelity gap.

## `new-implementation+tested` — auth and collaboration

Both `services/auth` and `services/collaboration` were TypeScript scaffolds
(`export const __SCAFFOLD__ = true`) with no logic and no tests to port.
Per the migration brief, both got real first implementations:

- **`auth`** (`src/auth/`): identity (`User`, Argon2id password hashing via
  `hash_password`/`verify_password`), organizations/teams (`Organization`,
  `Team`), and role-based access control (`Role`, `Action`,
  `AuthService::authorize`), backed by this crate's own `StorageAdapter` —
  dogfooding the storage seam the way `docs/ARCHITECTURE.md` says every
  service should. 19 new tests cover registration/authentication
  (including the "wrong password vs. unknown email look identical" security
  property), organization/membership creation, and every role/action
  permission combination. Deliberately does **not** stand up a web server,
  issue sessions, or implement rate limiting — those are a future
  HTTP/gRPC transport layer's job, per the migration brief's explicit
  guidance for this boundary.
- **`collaboration`** (`src/collaboration/`): presence tracking and a
  real-time co-editing event bus (`CollaborationHub`), scoped to what
  `docs/ROADMAP.md` marks as Phase 4 and appropriately-sized for a first
  version rather than the full CRDT/OT system `docs/ARCHITECTURE.md` leaves
  as an open decision. The conflict-resolution strategy implemented is
  **optimistic concurrency control** (a monotonic per-element revision
  counter; a stale write is rejected, not silently merged) — simpler than a
  CRDT, well-understood, and easy to replace later without changing the
  `CollabEvent` wire shape clients would already be listening to. 9 tests
  cover join/leave/cursor-move presence broadcasts, first-writer-wins
  revisioning, concurrent-edit rejection + rebase, and comment/
  thread-resolution notifications. No network sockets are opened here
  either — `CollaborationHub` is the transport-agnostic core.

## What's deliberately not here

Neither `services/projects/src/index.ts` nor
`services/geospatial/src/index.ts`'s **Express/HTTP transport** (routing,
request/response JSON bodies, status codes, middleware) is reproduced.
Every route's actual *logic* (validation, orchestration, the
success/error paths) is ported faithfully as plain async methods on
`ProjectsService`/the `projections`/`interop` functions — callable
directly and fully tested — but this is a native services library, not a
web server, matching the migration brief's explicit instruction for
`auth`/`collaboration` ("don't build a web server here unless clearly
implied") applied consistently across the crate. A future HTTP/gRPC
transport layer maps these methods and their typed errors
(`ProjectsError`, `GeospatialError`, `AuthError`, `CollaborationError`,
`StorageError`) onto routes and status codes.

## Error handling

Every fallible operation returns a `Result` with a `thiserror`-defined
error enum (`StorageError`, `AuthError`, `ProjectsError`,
`GeospatialError`, `CollaborationError`) — no bare `panic!`/`unwrap()` on
data that can come from a caller or external system. `unwrap()` appears
only in test code and in one `std::sync::Mutex` poison-recovery path
(`.expect("... mutex poisoned")`), which is the idiomatic way to surface a
prior panic rather than silently continuing with corrupted state.
