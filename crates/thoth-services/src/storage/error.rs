//! Error type for the storage seam.

use thiserror::Error;

/// Everything that can go wrong talking to a [`super::StorageAdapter`].
///
/// Every fallible storage operation returns this type rather than panicking:
/// callers (services built on top of storage) are expected to translate these
/// into their own domain errors (e.g. a 404 vs. a 500 at a future transport
/// layer) rather than letting an `unwrap()` bring down the process.
#[derive(Debug, Error)]
pub enum StorageError {
    /// A collection name failed the `/^[a-zA-Z_][a-zA-Z0-9_]*$/` check used to
    /// keep collection names safe as SQL identifiers.
    #[error(
        "invalid storage collection name \"{0}\": collection names must match \
         /^[a-zA-Z_][a-zA-Z0-9_]*$/ (they become SQL table identifiers)"
    )]
    InvalidCollectionName(String),

    /// A record failed to (de)serialize to/from the adapter's storage
    /// representation (JSON text in SQLite, JSONB in Postgres, structured
    /// clone in memory).
    #[error("storage record serialization failed: {0}")]
    Serialization(#[from] serde_json::Error),

    /// The SQLite backend reported an error.
    #[error("sqlite storage error: {0}")]
    Sqlite(#[from] rusqlite::Error),

    /// A filesystem operation (creating the containing directory for a
    /// SQLite file) failed.
    #[error("storage filesystem error: {0}")]
    Io(#[from] std::io::Error),

    /// The Postgres backend reported an error.
    #[error("postgres storage error: {0}")]
    Postgres(#[from] tokio_postgres::Error),

    /// `STORAGE_DRIVER=postgres` (or `{ driver: "postgres" }`) was requested
    /// but no connection string was supplied.
    #[error(
        "STORAGE_DRIVER=postgres was requested, but no connection string was \
         supplied — set STORAGE_POSTGRES_URL or pass config.postgres.connection_string"
    )]
    PostgresNotConfigured,

    /// A caller-supplied driver name did not match any known backend.
    #[error("unknown storage driver: {0}")]
    UnknownDriver(String),

    /// A `transaction` closure returned an application error; carried through
    /// unchanged after the adapter rolls back.
    #[error("transaction failed: {0}")]
    TransactionFailed(String),
}
