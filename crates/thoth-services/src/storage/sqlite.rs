//! The default storage backend: a single SQLite file, one table per
//! collection. Port of `packages/storage/src/sqliteAdapter.ts`.

use std::collections::HashSet;
use std::path::Path;
use std::sync::Mutex as StdMutex;

use async_trait::async_trait;
use rusqlite::{params, Connection};
use tokio::sync::Mutex as AsyncMutex;

use super::types::assert_valid_collection_name;
use super::{StorageAdapter, StorageDriver, StorageError, StorageRecord};

/// Options for [`SqliteStorageAdapter::new`].
pub struct SqliteStorageAdapterOptions {
    /// Path to the SQLite file, or `:memory:`.
    pub file: String,
}

/// Default storage backend: a single SQLite file, one table per collection.
/// Each collection is a simple `(id TEXT PRIMARY KEY, data TEXT, updated_at
/// TEXT)` document table — no per-entity schema migrations required to add a
/// new collection. Uses `rusqlite`'s bundled SQLite, so no system library or
/// server process is required.
///
/// All I/O is synchronous under the hood (as it is in the TS original, which
/// uses the synchronous `better-sqlite3` bindings) but held behind a
/// [`std::sync::Mutex`] so the adapter is `Send + Sync` and safe to share
/// across async tasks; `async fn` signatures keep the shape identical to the
/// other adapters and to the trait every backend implements.
pub struct SqliteStorageAdapter {
    conn: StdMutex<Connection>,
    known_tables: StdMutex<HashSet<String>>,
    /// Serializes concurrent `transaction` calls with each other, mirroring
    /// the TS adapter's `this.lock` promise chain. Released between
    /// `BEGIN` and `COMMIT`/`ROLLBACK` so the closure passed to
    /// `transaction` can call back into this adapter's own methods without
    /// deadlocking.
    txn_lock: AsyncMutex<()>,
}

impl SqliteStorageAdapter {
    /// Open (creating if necessary) a SQLite-backed adapter. Creates the
    /// containing directory for `options.file` if it doesn't already exist
    /// (skipped for the special `:memory:` path).
    pub fn new(options: SqliteStorageAdapterOptions) -> Result<Self, StorageError> {
        if options.file != ":memory:" {
            if let Some(dir) = Path::new(&options.file).parent() {
                if !dir.as_os_str().is_empty() {
                    std::fs::create_dir_all(dir)?;
                }
            }
        }
        let conn = Connection::open(&options.file)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        Ok(Self {
            conn: StdMutex::new(conn),
            known_tables: StdMutex::new(HashSet::new()),
            txn_lock: AsyncMutex::new(()),
        })
    }

    fn ensure_table(&self, collection: &str) -> Result<(), StorageError> {
        assert_valid_collection_name(collection)?;
        let mut known = self.known_tables.lock().expect("known_tables mutex poisoned");
        if known.contains(collection) {
            return Ok(());
        }
        let conn = self.conn.lock().expect("sqlite connection mutex poisoned");
        conn.execute_batch(&format!(
            "CREATE TABLE IF NOT EXISTS \"{collection}\" (
                 id TEXT PRIMARY KEY,
                 data TEXT NOT NULL,
                 updated_at TEXT NOT NULL
             )"
        ))?;
        known.insert(collection.to_string());
        Ok(())
    }
}

#[async_trait]
impl StorageAdapter for SqliteStorageAdapter {
    fn driver(&self) -> StorageDriver {
        StorageDriver::Sqlite
    }

    async fn list<T: StorageRecord>(&self, collection: &str) -> Result<Vec<T>, StorageError> {
        self.ensure_table(collection)?;
        let conn = self.conn.lock().expect("sqlite connection mutex poisoned");
        let mut stmt = conn.prepare(&format!("SELECT data FROM \"{collection}\""))?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
        let mut out = Vec::new();
        for row in rows {
            let data = row?;
            out.push(serde_json::from_str(&data)?);
        }
        Ok(out)
    }

    async fn get<T: StorageRecord>(
        &self,
        collection: &str,
        id: &str,
    ) -> Result<Option<T>, StorageError> {
        self.ensure_table(collection)?;
        let conn = self.conn.lock().expect("sqlite connection mutex poisoned");
        let mut stmt = conn.prepare(&format!("SELECT data FROM \"{collection}\" WHERE id = ?1"))?;
        let mut rows = stmt.query(params![id])?;
        match rows.next()? {
            Some(row) => {
                let data: String = row.get(0)?;
                Ok(Some(serde_json::from_str(&data)?))
            }
            None => Ok(None),
        }
    }

    async fn put<T: StorageRecord>(&self, collection: &str, value: T) -> Result<T, StorageError> {
        self.ensure_table(collection)?;
        let data = serde_json::to_string(&value)?;
        let id = value.id().to_string();
        let updated_at = chrono::Utc::now().to_rfc3339();
        let conn = self.conn.lock().expect("sqlite connection mutex poisoned");
        conn.execute(
            &format!(
                "INSERT INTO \"{collection}\" (id, data, updated_at) VALUES (?1, ?2, ?3)
                 ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
            ),
            params![id, data, updated_at],
        )?;
        Ok(value)
    }

    async fn delete(&self, collection: &str, id: &str) -> Result<bool, StorageError> {
        self.ensure_table(collection)?;
        let conn = self.conn.lock().expect("sqlite connection mutex poisoned");
        let changed = conn.execute(
            &format!("DELETE FROM \"{collection}\" WHERE id = ?1"),
            params![id],
        )?;
        Ok(changed > 0)
    }

    async fn clear(&self, collection: &str) -> Result<(), StorageError> {
        self.ensure_table(collection)?;
        let conn = self.conn.lock().expect("sqlite connection mutex poisoned");
        conn.execute_batch(&format!("DELETE FROM \"{collection}\""))?;
        Ok(())
    }

    async fn transaction<F, Fut, T>(&self, f: F) -> Result<T, StorageError>
    where
        F: FnOnce() -> Fut + Send + 'async_trait,
        Fut: std::future::Future<Output = Result<T, StorageError>> + Send,
        T: Send + 'async_trait,
    {
        let _serialize = self.txn_lock.lock().await;
        {
            let conn = self.conn.lock().expect("sqlite connection mutex poisoned");
            conn.execute_batch("BEGIN")?;
        }
        match f().await {
            Ok(value) => {
                let conn = self.conn.lock().expect("sqlite connection mutex poisoned");
                conn.execute_batch("COMMIT")?;
                Ok(value)
            }
            Err(err) => {
                let conn = self.conn.lock().expect("sqlite connection mutex poisoned");
                conn.execute_batch("ROLLBACK")?;
                Err(err)
            }
        }
    }

    async fn close(&self) -> Result<(), StorageError> {
        // rusqlite::Connection closes on drop; nothing to do explicitly, but
        // the method exists so callers can release resources deterministically
        // at a known point, matching the TS adapter's `close()`.
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp_file() -> (tempfile::TempDir, String) {
        let dir = tempfile::tempdir().expect("tempdir");
        let file = dir.path().join("nested").join("test.sqlite3");
        (dir, file.to_string_lossy().into_owned())
    }

    #[tokio::test]
    async fn creates_the_containing_directory_for_the_database_file() {
        let (_dir, file) = temp_file();
        assert!(!Path::new(&file).parent().unwrap().exists());
        let storage = SqliteStorageAdapter::new(SqliteStorageAdapterOptions { file }).unwrap();
        storage.close().await.unwrap();
    }

    #[tokio::test]
    async fn persists_data_across_adapter_instances_on_the_same_file() {
        let (_dir, file) = temp_file();
        fs::create_dir_all(Path::new(&file).parent().unwrap()).unwrap();

        #[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
        struct Widget {
            id: String,
            name: String,
        }
        impl StorageRecord for Widget {
            fn id(&self) -> &str {
                &self.id
            }
        }

        {
            let first = SqliteStorageAdapter::new(SqliteStorageAdapterOptions { file: file.clone() })
                .unwrap();
            first
                .put(
                    "widgets",
                    Widget {
                        id: "w1".into(),
                        name: "Bolt".into(),
                    },
                )
                .await
                .unwrap();
            first.close().await.unwrap();
        }

        let second = SqliteStorageAdapter::new(SqliteStorageAdapterOptions { file }).unwrap();
        let loaded: Option<Widget> = second.get("widgets", "w1").await.unwrap();
        assert_eq!(
            loaded,
            Some(Widget {
                id: "w1".into(),
                name: "Bolt".into()
            })
        );
        second.close().await.unwrap();
    }

    #[tokio::test]
    async fn rejects_collection_names_that_arent_safe_sql_identifiers() {
        let storage =
            SqliteStorageAdapter::new(SqliteStorageAdapterOptions { file: ":memory:".into() })
                .unwrap();
        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
        struct Widget {
            id: String,
        }
        impl StorageRecord for Widget {
            fn id(&self) -> &str {
                &self.id
            }
        }
        let err = storage
            .list::<Widget>("widgets\"; DROP TABLE widgets; --")
            .await
            .unwrap_err();
        assert!(matches!(err, StorageError::InvalidCollectionName(_)));
        storage.close().await.unwrap();
    }

    #[tokio::test]
    async fn reports_its_driver_as_sqlite() {
        let storage =
            SqliteStorageAdapter::new(SqliteStorageAdapterOptions { file: ":memory:".into() })
                .unwrap();
        assert_eq!(storage.driver(), StorageDriver::Sqlite);
        storage.close().await.unwrap();
    }
}
