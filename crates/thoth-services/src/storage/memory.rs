//! In-process, non-persistent [`StorageAdapter`]. Port of
//! `packages/storage/src/memoryAdapter.ts`.

use std::collections::HashMap;

use async_trait::async_trait;
use serde_json::Value;
use tokio::sync::Mutex;

use super::{StorageAdapter, StorageDriver, StorageError, StorageRecord};

type Collection = HashMap<String, Value>;
type State = HashMap<String, Collection>;

/// In-process, non-persistent adapter. Used for tests and as a
/// dependency-free fallback; data is lost when the process exits.
///
/// Every record is stored and returned as a `serde_json::Value`, deep-cloned
/// on the way in and out — the same "structured clone" isolation the TS
/// original provides, so mutating a value handed back by `get`/`list` never
/// silently mutates what's stored.
pub struct MemoryStorageAdapter {
    /// Collections keyed by name, each a map of record id -> JSON value.
    state: Mutex<State>,
    /// Serializes concurrent `transaction` calls with each other (mirrors
    /// the TS adapter's `this.lock` promise chain). Plain operations don't
    /// take this lock, matching the original's behavior of only chaining
    /// `transaction` calls.
    txn_lock: Mutex<()>,
}

impl Default for MemoryStorageAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl MemoryStorageAdapter {
    /// Create an empty adapter.
    pub fn new() -> Self {
        Self {
            state: Mutex::new(HashMap::new()),
            txn_lock: Mutex::new(()),
        }
    }
}

#[async_trait]
impl StorageAdapter for MemoryStorageAdapter {
    fn driver(&self) -> StorageDriver {
        StorageDriver::Memory
    }

    async fn list<T: StorageRecord>(&self, collection: &str) -> Result<Vec<T>, StorageError> {
        let state = self.state.lock().await;
        let Some(records) = state.get(collection) else {
            return Ok(Vec::new());
        };
        records
            .values()
            .cloned()
            .map(|v| serde_json::from_value(v).map_err(StorageError::from))
            .collect()
    }

    async fn get<T: StorageRecord>(
        &self,
        collection: &str,
        id: &str,
    ) -> Result<Option<T>, StorageError> {
        let state = self.state.lock().await;
        match state.get(collection).and_then(|c| c.get(id)) {
            Some(v) => Ok(Some(serde_json::from_value(v.clone())?)),
            None => Ok(None),
        }
    }

    async fn put<T: StorageRecord>(&self, collection: &str, value: T) -> Result<T, StorageError> {
        let json = serde_json::to_value(&value)?;
        let id = value.id().to_string();
        let mut state = self.state.lock().await;
        state
            .entry(collection.to_string())
            .or_default()
            .insert(id, json);
        Ok(value)
    }

    async fn delete(&self, collection: &str, id: &str) -> Result<bool, StorageError> {
        let mut state = self.state.lock().await;
        Ok(state
            .get_mut(collection)
            .map(|c| c.remove(id).is_some())
            .unwrap_or(false))
    }

    async fn clear(&self, collection: &str) -> Result<(), StorageError> {
        let mut state = self.state.lock().await;
        if let Some(c) = state.get_mut(collection) {
            c.clear();
        }
        Ok(())
    }

    async fn transaction<F, Fut, T>(&self, f: F) -> Result<T, StorageError>
    where
        F: FnOnce() -> Fut + Send + 'async_trait,
        Fut: std::future::Future<Output = Result<T, StorageError>> + Send,
        T: Send + 'async_trait,
    {
        let _serialize = self.txn_lock.lock().await;
        let snapshot = self.state.lock().await.clone();
        match f().await {
            Ok(value) => Ok(value),
            Err(err) => {
                *self.state.lock().await = snapshot;
                Err(err)
            }
        }
    }

    async fn close(&self) -> Result<(), StorageError> {
        self.state.lock().await.clear();
        Ok(())
    }
}
