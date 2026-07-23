//! `thoth-services` — the native backend services for Thoth Blueprint.
//!
//! Rust port of `services/{auth,projects,geospatial,collaboration}` and
//! `packages/storage`, per `docs/ARCHITECTURE.md`. Unlike `thoth-spatial`,
//! `thoth-planning`, `thoth-survey`, `thoth-civil`, and `thoth-drawing`
//! (framework-agnostic, WASM-targetable domain crates), this is a *native*
//! backend crate: it uses `tokio` for async I/O, `rusqlite`/`tokio-postgres`
//! for real database access, and `argon2` for password hashing. It is not
//! compiled to WASM and does not stand up an HTTP/gRPC server itself — see
//! each module's docs for the boundary between the service logic here and
//! a future transport layer.
//!
//! Depends on [`thoth_spatial`] for geometry/CRS/unit primitives — see that
//! crate's docs for why the richer planning-element hierarchy
//! (`thoth-planning`'s territory) isn't available here yet, and how
//! [`geospatial`] and [`projects`] work around that gap locally in the
//! meantime (see each module's docs).
//!
//! See `crates/thoth-services/STATUS.md` for what's ported, tested, or
//! still outstanding.
//!
//! # Modules
//!
//! - [`storage`] — the `StorageAdapter` seam every other module persists
//!   through (memory/SQLite/Postgres backends).
//! - [`auth`] — identity, organizations/teams, and role-based access
//!   control.
//! - [`projects`] — project lifecycle, persistence, versioning, and
//!   checkpoints.
//! - [`geospatial`] — coordinate-system transforms and GeoJSON interop.
//! - [`collaboration`] — presence and a real-time co-editing event model.

pub mod auth;
pub mod collaboration;
pub mod geospatial;
pub mod projects;
pub mod storage;
