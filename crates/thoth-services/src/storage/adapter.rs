//! The `StorageAdapter` trait — the seam every service persists through.
//!
//! Port of `packages/storage/src/types.ts`'s `StorageAdapter` interface.

use std::future::Future;

use async_trait::async_trait;

use super::{StorageDriver, StorageError, StorageRecord};

/// Every backend (SQLite, in-memory, Postgres) implements this trait. Call
/// sites depend only on `StorageAdapter` — swapping the backend never
/// touches them.
///
/// Unlike the TypeScript interface, this trait is not meant to be used as a
/// trait object (`dyn StorageAdapter`): `list`/`get`/`put`/`transaction` are
/// generic over the stored record type, and generic methods aren't
/// object-safe. Call sites are generic over `A: StorageAdapter` (or hold the
/// concrete [`super::Storage`] enum returned by [`super::create_storage`])
/// instead, which is the idiomatic Rust analogue of the TS runtime
/// polymorphism and costs nothing at the call site — the backend is still
/// selected once, by `create_storage`, with no further branching anywhere
/// else in the codebase.
#[async_trait]
pub trait StorageAdapter: Send + Sync {
    /// Name of the backend actually in use. Useful for logging.
    fn driver(&self) -> StorageDriver;

    /// All records in a collection.
    async fn list<T: StorageRecord>(&self, collection: &str) -> Result<Vec<T>, StorageError>;

    /// A single record by id, or `None` if it doesn't exist.
    async fn get<T: StorageRecord>(
        &self,
        collection: &str,
        id: &str,
    ) -> Result<Option<T>, StorageError>;

    /// Insert or fully replace a record, keyed by its `id`. Returns the
    /// stored value.
    async fn put<T: StorageRecord>(&self, collection: &str, value: T) -> Result<T, StorageError>;

    /// Remove a record. Returns whether a record was actually deleted.
    async fn delete(&self, collection: &str, id: &str) -> Result<bool, StorageError>;

    /// Remove every record in a collection.
    async fn clear(&self, collection: &str) -> Result<(), StorageError>;

    /// Run `f` as a single atomic unit of work: either every read/write
    /// inside it commits, or none of it does. Calls to `transaction` on one
    /// adapter instance are serialized, so it's safe to call from concurrent
    /// request handlers.
    ///
    /// Constraint: only await other calls on *this same adapter instance*
    /// inside `f` — don't await unrelated I/O (network calls, timers) in the
    /// middle of a transaction, since that would hold the transaction open
    /// longer than necessary.
    async fn transaction<F, Fut, T>(&self, f: F) -> Result<T, StorageError>
    where
        F: FnOnce() -> Fut + Send + 'async_trait,
        Fut: Future<Output = Result<T, StorageError>> + Send,
        T: Send + 'async_trait;

    /// Release underlying resources (file handles, connections).
    async fn close(&self) -> Result<(), StorageError>;
}
