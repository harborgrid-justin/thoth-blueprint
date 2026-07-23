//! Shared vocabulary for the storage seam: what a storable record is, which
//! backend is in use, and how a caller configures backend selection.
//!
//! Port of `packages/storage/src/types.ts`.

use serde::{de::DeserializeOwned, Serialize};

/// A value that can be persisted through a [`super::StorageAdapter`].
///
/// The TypeScript original expresses this structurally as
/// `interface StorageRecord { id: string }` — any object with a string `id`
/// satisfies it. Rust has no structural typing, so every record type
/// implements this trait explicitly, naming the field that identifies it.
///
/// `'static` bounds the type so it can cross an `async fn` boundary inside
/// the `#[async_trait]`-generated futures without borrowing from the caller.
pub trait StorageRecord: Serialize + DeserializeOwned + Send + Sync + Clone + 'static {
    /// The record's unique identifier within its collection.
    fn id(&self) -> &str;
}

/// Which storage backend is in use. Mirrors the TS `StorageDriver` union.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum StorageDriver {
    /// A local SQLite file — the default, zero-infrastructure backend.
    Sqlite,
    /// Non-persistent, in-process. Backs tests and is a dependency-free
    /// fallback.
    Memory,
    /// An enterprise Postgres backend, selected via `STORAGE_DRIVER=postgres`.
    Postgres,
}

impl StorageDriver {
    /// Parse a driver name as accepted by the `STORAGE_DRIVER` environment
    /// variable. Returns `None` for anything else, matching the TS
    /// `createStorage` fallback-to-default behavior for unrecognized values.
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "sqlite" => Some(Self::Sqlite),
            "memory" => Some(Self::Memory),
            "postgres" => Some(Self::Postgres),
            _ => None,
        }
    }
}

/// SQLite-specific configuration.
#[derive(Debug, Clone, Default)]
pub struct SqliteConfig {
    /// Path to the SQLite file, or `:memory:`. Defaults to
    /// `STORAGE_SQLITE_FILE` or `./data/thoth.sqlite3` when unset.
    pub file: Option<String>,
}

/// Postgres-specific configuration.
#[derive(Debug, Clone, Default)]
pub struct PostgresConfig {
    /// A `postgres://user:pass@host/db` connection string. Defaults to
    /// `STORAGE_POSTGRES_URL` when unset.
    pub connection_string: Option<String>,
}

/// Configuration passed to [`super::create_storage`]. Mirrors the TS
/// `StorageConfig` interface.
#[derive(Debug, Clone, Default)]
pub struct StorageConfig {
    /// Which backend to use. Falls back to the `STORAGE_DRIVER` environment
    /// variable, then to [`StorageDriver::Sqlite`].
    pub driver: Option<StorageDriver>,
    pub sqlite: SqliteConfig,
    pub postgres: PostgresConfig,
}

/// Collection names become SQL table identifiers (SQLite and Postgres both),
/// so they're restricted to a safe, unambiguous character set.
pub(crate) fn assert_valid_collection_name(collection: &str) -> Result<(), super::StorageError> {
    let mut chars = collection.chars();
    let first_ok = chars
        .next()
        .is_some_and(|c| c.is_ascii_alphabetic() || c == '_');
    let rest_ok = chars.all(|c| c.is_ascii_alphanumeric() || c == '_');
    if first_ok && rest_ok {
        Ok(())
    } else {
        Err(super::StorageError::InvalidCollectionName(
            collection.to_string(),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_identifiers_and_rejects_injection_attempts() {
        assert!(assert_valid_collection_name("widgets").is_ok());
        assert!(assert_valid_collection_name("_widgets_1").is_ok());
        assert!(assert_valid_collection_name("widgets\"; DROP TABLE widgets; --").is_err());
        assert!(assert_valid_collection_name("1widgets").is_err());
        assert!(assert_valid_collection_name("").is_err());
    }
}
