//! The enterprise storage backend. Port of `packages/storage/src/postgresAdapter.ts`,
//! upgraded from a scaffold to a real (best-effort) implementation.
//!
//! # Scope and a documented limitation
//!
//! This adapter uses a single `tokio_postgres::Client` (one server session)
//! rather than a connection pool. Plain operations (`list`/`get`/`put`/
//! `delete`/`clear`) use the client directly — `tokio_postgres::Client`'s
//! query methods take `&self` and pipeline safely under concurrent callers.
//!
//! `transaction` issues `BEGIN`/`COMMIT`/`ROLLBACK` as statements on that same
//! session (rather than through `tokio_postgres::Client::transaction`, which
//! needs `&mut Client` and can't be reconciled with the `&self`-based nested
//! calls the closure makes back into `list`/`get`/`put`). A dedicated
//! `txn_lock` ensures only one `transaction` runs at a time, but — unlike the
//! SQLite adapter, where the connection is exclusively behind a mutex for the
//! whole process — a plain top-level call from a *different* concurrent task
//! could still interleave a statement onto the same session while a
//! transaction is open, since the lock is released between `BEGIN` and
//! `COMMIT`/`ROLLBACK` so the transaction's own closure can call back in.
//!
//! For the current best-effort scope (single-writer local development or
//! low-concurrency deployments) this is acceptable; a production deployment
//! should check out a dedicated connection per transaction from a pool (e.g.
//! `deadpool-postgres`) to fully isolate concurrent transactions. Tracked as
//! a follow-up in `STATUS.md`, not silently swept under the rug.

use std::collections::HashSet;

use async_trait::async_trait;
use tokio::sync::Mutex;
use tokio_postgres::NoTls;

use super::types::assert_valid_collection_name;
use super::{StorageAdapter, StorageDriver, StorageError, StorageRecord};

/// A real (best-effort) Postgres-backed [`StorageAdapter`]. See the module
/// docs for the concurrency caveat around `transaction`.
pub struct PostgresStorageAdapter {
    client: tokio_postgres::Client,
    known_tables: Mutex<HashSet<String>>,
    txn_lock: Mutex<()>,
}

impl PostgresStorageAdapter {
    /// Connect to Postgres using `connection_string` (e.g.
    /// `postgres://user:pass@host/db`). The connection's background I/O
    /// driver is spawned onto the current Tokio runtime.
    pub async fn connect(connection_string: &str) -> Result<Self, StorageError> {
        let (client, connection) = tokio_postgres::connect(connection_string, NoTls).await?;
        tokio::spawn(async move {
            if let Err(err) = connection.await {
                // The background connection task has nowhere better to
                // report to; a future transport layer would wire this into
                // structured logging.
                eprintln!("thoth-services: postgres connection error: {err}");
            }
        });
        Ok(Self {
            client,
            known_tables: Mutex::new(HashSet::new()),
            txn_lock: Mutex::new(()),
        })
    }

    async fn ensure_table(&self, collection: &str) -> Result<(), StorageError> {
        assert_valid_collection_name(collection)?;
        let mut known = self.known_tables.lock().await;
        if known.contains(collection) {
            return Ok(());
        }
        self.client
            .batch_execute(&format!(
                "CREATE TABLE IF NOT EXISTS \"{collection}\" (
                     id TEXT PRIMARY KEY,
                     data JSONB NOT NULL,
                     updated_at TIMESTAMPTZ NOT NULL
                 )"
            ))
            .await?;
        known.insert(collection.to_string());
        Ok(())
    }
}

#[async_trait]
impl StorageAdapter for PostgresStorageAdapter {
    fn driver(&self) -> StorageDriver {
        StorageDriver::Postgres
    }

    async fn list<T: StorageRecord>(&self, collection: &str) -> Result<Vec<T>, StorageError> {
        self.ensure_table(collection).await?;
        let rows = self
            .client
            .query(&format!("SELECT data FROM \"{collection}\""), &[])
            .await?;
        rows.iter()
            .map(|row| {
                let data: serde_json::Value = row.get(0);
                serde_json::from_value(data).map_err(StorageError::from)
            })
            .collect()
    }

    async fn get<T: StorageRecord>(
        &self,
        collection: &str,
        id: &str,
    ) -> Result<Option<T>, StorageError> {
        self.ensure_table(collection).await?;
        let row = self
            .client
            .query_opt(
                &format!("SELECT data FROM \"{collection}\" WHERE id = $1"),
                &[&id],
            )
            .await?;
        match row {
            Some(row) => {
                let data: serde_json::Value = row.get(0);
                Ok(Some(serde_json::from_value(data)?))
            }
            None => Ok(None),
        }
    }

    async fn put<T: StorageRecord>(&self, collection: &str, value: T) -> Result<T, StorageError> {
        self.ensure_table(collection).await?;
        let data = serde_json::to_value(&value)?;
        let id = value.id().to_string();
        self.client
            .execute(
                &format!(
                    "INSERT INTO \"{collection}\" (id, data, updated_at) VALUES ($1, $2, now())
                     ON CONFLICT (id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
                ),
                &[&id, &data],
            )
            .await?;
        Ok(value)
    }

    async fn delete(&self, collection: &str, id: &str) -> Result<bool, StorageError> {
        self.ensure_table(collection).await?;
        let changed = self
            .client
            .execute(
                &format!("DELETE FROM \"{collection}\" WHERE id = $1"),
                &[&id],
            )
            .await?;
        Ok(changed > 0)
    }

    async fn clear(&self, collection: &str) -> Result<(), StorageError> {
        self.ensure_table(collection).await?;
        self.client
            .batch_execute(&format!("DELETE FROM \"{collection}\""))
            .await?;
        Ok(())
    }

    async fn transaction<F, Fut, T>(&self, f: F) -> Result<T, StorageError>
    where
        F: FnOnce() -> Fut + Send + 'async_trait,
        Fut: std::future::Future<Output = Result<T, StorageError>> + Send,
        T: Send + 'async_trait,
    {
        let _serialize = self.txn_lock.lock().await;
        self.client.batch_execute("BEGIN").await?;
        match f().await {
            Ok(value) => {
                self.client.batch_execute("COMMIT").await?;
                Ok(value)
            }
            Err(err) => {
                // Best-effort rollback: if the connection itself died, the
                // session (and its transaction) is already gone.
                let _ = self.client.batch_execute("ROLLBACK").await;
                Err(err)
            }
        }
    }

    async fn close(&self) -> Result<(), StorageError> {
        // `tokio_postgres::Client` has no explicit close; dropping it (and
        // the connection task noticing the sender side is gone) ends the
        // session. Nothing to do here beyond satisfying the trait shape.
        Ok(())
    }
}
