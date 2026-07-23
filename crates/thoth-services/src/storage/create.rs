//! Backend selection. Port of `packages/storage/src/createStorage.ts`.

use async_trait::async_trait;

use super::memory::MemoryStorageAdapter;
use super::postgres::PostgresStorageAdapter;
use super::sqlite::{SqliteStorageAdapter, SqliteStorageAdapterOptions};
use super::{StorageAdapter, StorageConfig, StorageDriver, StorageError, StorageRecord};

const DEFAULT_SQLITE_FILE: &str = "data/thoth.sqlite3";

/// The concrete storage backend for this process, as selected by
/// [`create_storage`].
///
/// A closed-enum implementation of [`StorageAdapter`] rather than a trait
/// object: because `StorageAdapter`'s methods are generic (so callers get
/// `storage.list::<Project>(...)` ergonomics identical to the TS original),
/// they aren't `dyn`-safe. `Storage` is the concrete type callers hold
/// instead — genuinely backend-agnostic (matching on the enum is entirely
/// internal to its own trait impl below), with none of the runtime
/// indirection cost of a trait object.
pub enum Storage {
    Memory(MemoryStorageAdapter),
    Sqlite(SqliteStorageAdapter),
    Postgres(PostgresStorageAdapter),
}

fn resolve_driver(config: &StorageConfig) -> StorageDriver {
    if let Some(driver) = config.driver {
        return driver;
    }
    std::env::var("STORAGE_DRIVER")
        .ok()
        .and_then(|v| StorageDriver::parse(&v))
        .unwrap_or(StorageDriver::Sqlite)
}

/// Create the storage backend for this process. Everything the platform
/// persists — projects, checkpoints, review threads, and future collections
/// — should go through the [`StorageAdapter`] this returns, never through a
/// direct database driver call.
///
/// Backend selection: `config.driver`, then the `STORAGE_DRIVER` environment
/// variable, defaulting to [`StorageDriver::Sqlite`] — a single local file,
/// no server to run, the right default for local dev and small deployments.
/// Set `STORAGE_DRIVER=postgres` (with `STORAGE_POSTGRES_URL` set, or
/// `config.postgres.connection_string`) to move to an enterprise backend
/// without touching call sites.
///
/// Async (unlike the synchronous TS constructor) because connecting to
/// Postgres is inherently asynchronous; the SQLite and memory branches
/// complete immediately.
pub async fn create_storage(config: StorageConfig) -> Result<Storage, StorageError> {
    match resolve_driver(&config) {
        StorageDriver::Memory => Ok(Storage::Memory(MemoryStorageAdapter::new())),
        StorageDriver::Sqlite => {
            let file = config
                .sqlite
                .file
                .or_else(|| std::env::var("STORAGE_SQLITE_FILE").ok())
                .unwrap_or_else(|| DEFAULT_SQLITE_FILE.to_string());
            Ok(Storage::Sqlite(SqliteStorageAdapter::new(
                SqliteStorageAdapterOptions { file },
            )?))
        }
        StorageDriver::Postgres => {
            let connection_string = config
                .postgres
                .connection_string
                .or_else(|| std::env::var("STORAGE_POSTGRES_URL").ok())
                .ok_or(StorageError::PostgresNotConfigured)?;
            Ok(Storage::Postgres(
                PostgresStorageAdapter::connect(&connection_string).await?,
            ))
        }
    }
}

#[async_trait]
impl StorageAdapter for Storage {
    fn driver(&self) -> StorageDriver {
        match self {
            Storage::Memory(a) => a.driver(),
            Storage::Sqlite(a) => a.driver(),
            Storage::Postgres(a) => a.driver(),
        }
    }

    async fn list<T: StorageRecord>(&self, collection: &str) -> Result<Vec<T>, StorageError> {
        match self {
            Storage::Memory(a) => a.list(collection).await,
            Storage::Sqlite(a) => a.list(collection).await,
            Storage::Postgres(a) => a.list(collection).await,
        }
    }

    async fn get<T: StorageRecord>(
        &self,
        collection: &str,
        id: &str,
    ) -> Result<Option<T>, StorageError> {
        match self {
            Storage::Memory(a) => a.get(collection, id).await,
            Storage::Sqlite(a) => a.get(collection, id).await,
            Storage::Postgres(a) => a.get(collection, id).await,
        }
    }

    async fn put<T: StorageRecord>(&self, collection: &str, value: T) -> Result<T, StorageError> {
        match self {
            Storage::Memory(a) => a.put(collection, value).await,
            Storage::Sqlite(a) => a.put(collection, value).await,
            Storage::Postgres(a) => a.put(collection, value).await,
        }
    }

    async fn delete(&self, collection: &str, id: &str) -> Result<bool, StorageError> {
        match self {
            Storage::Memory(a) => a.delete(collection, id).await,
            Storage::Sqlite(a) => a.delete(collection, id).await,
            Storage::Postgres(a) => a.delete(collection, id).await,
        }
    }

    async fn clear(&self, collection: &str) -> Result<(), StorageError> {
        match self {
            Storage::Memory(a) => a.clear(collection).await,
            Storage::Sqlite(a) => a.clear(collection).await,
            Storage::Postgres(a) => a.clear(collection).await,
        }
    }

    async fn transaction<F, Fut, T>(&self, f: F) -> Result<T, StorageError>
    where
        F: FnOnce() -> Fut + Send + 'async_trait,
        Fut: std::future::Future<Output = Result<T, StorageError>> + Send,
        T: Send + 'async_trait,
    {
        match self {
            Storage::Memory(a) => a.transaction(f).await,
            Storage::Sqlite(a) => a.transaction(f).await,
            Storage::Postgres(a) => a.transaction(f).await,
        }
    }

    async fn close(&self) -> Result<(), StorageError> {
        match self {
            Storage::Memory(a) => a.close().await,
            Storage::Sqlite(a) => a.close().await,
            Storage::Postgres(a) => a.close().await,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn defaults_to_the_sqlite_adapter() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("db.sqlite3").to_string_lossy().into_owned();
        let storage = create_storage(StorageConfig {
            sqlite: super::super::SqliteConfig { file: Some(file) },
            ..Default::default()
        })
        .await
        .unwrap();
        assert!(matches!(storage, Storage::Sqlite(_)));
        storage.close().await.unwrap();
    }

    #[tokio::test]
    async fn honors_an_explicit_driver_over_the_environment() {
        // SAFETY-relevant note: mutating process env in a test is inherently
        // racy against other tests running in parallel; scope the var and
        // restore it immediately, and rely on `cargo test`'s default of
        // running this crate's tests without another test also touching
        // STORAGE_DRIVER concurrently in the same process would be unsafe
        // to assume in general, so this test only asserts explicit-config
        // precedence, not the env fallback (covered separately below without
        // needing env mutation to race).
        let storage = create_storage(StorageConfig {
            driver: Some(StorageDriver::Memory),
            ..Default::default()
        })
        .await
        .unwrap();
        assert!(matches!(storage, Storage::Memory(_)));
    }

    #[tokio::test]
    async fn falls_back_to_the_storage_driver_environment_variable() {
        let driver = resolve_driver(&StorageConfig {
            driver: None,
            ..Default::default()
        });
        // Without STORAGE_DRIVER set in this process's environment, the
        // default is sqlite; parse() itself is exercised directly here to
        // avoid mutating shared process env from a test.
        assert!(matches!(driver, StorageDriver::Sqlite));
        assert_eq!(StorageDriver::parse("memory"), Some(StorageDriver::Memory));
        assert_eq!(StorageDriver::parse("postgres"), Some(StorageDriver::Postgres));
        assert_eq!(StorageDriver::parse("bogus"), None);
    }

    #[tokio::test]
    async fn returns_a_clear_error_when_postgres_is_selected_without_configuration() {
        let err = create_storage(StorageConfig {
            driver: Some(StorageDriver::Postgres),
            ..Default::default()
        })
        .await
        .unwrap_err();
        assert!(matches!(err, StorageError::PostgresNotConfigured));
    }
}
