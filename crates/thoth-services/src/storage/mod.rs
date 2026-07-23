//! The default internal storage layer. Port of `packages/storage`.
//!
//! Every service persists through a single [`StorageAdapter`] trait
//! (`list`/`get`/`put`/`delete`/`clear`/`transaction` over named
//! collections) instead of talking to a database driver directly. The
//! default implementation is a local SQLite file
//! ([`SqliteStorageAdapter`]) — no server process required. An in-memory
//! adapter ([`MemoryStorageAdapter`]) backs tests. A best-effort Postgres
//! adapter ([`PostgresStorageAdapter`]) is the seam for growing into a
//! larger enterprise backend later, selected with `STORAGE_DRIVER=postgres`
//! via [`create_storage`], with no changes at any call site.
//!
//! See `packages/storage/README.md` for the original design notes this
//! mirrors.

mod adapter;
mod create;
mod error;
mod memory;
mod postgres;
mod sqlite;
mod types;

pub use adapter::StorageAdapter;
pub use create::{create_storage, Storage};
pub use error::StorageError;
pub use memory::MemoryStorageAdapter;
pub use postgres::PostgresStorageAdapter;
pub use sqlite::{SqliteStorageAdapter, SqliteStorageAdapterOptions};
pub use types::{PostgresConfig, SqliteConfig, StorageConfig, StorageDriver, StorageRecord};

#[cfg(test)]
mod contract_tests;
