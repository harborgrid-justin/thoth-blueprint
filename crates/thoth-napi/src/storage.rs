//! Native Node boundary over `thoth_services::storage`'s Postgres adapter —
//! the drop-in point `packages/storage/src/postgresAdapter.ts` delegates to
//! instead of throwing "not implemented yet".
//!
//! Wires the real [`PostgresStorageAdapter`] (`tokio-postgres`-backed; see
//! `crates/thoth-services/src/storage/postgres.rs`) to Node. That adapter
//! is honestly `ported+partial-tests` upstream — real code, but untestable
//! in `cargo test` without a live Postgres server (see
//! `crates/thoth-services/STATUS.md`). This binding doesn't change that
//! fact: it exposes the same real adapter, so `packages/storage`'s
//! `postgresAdapter.ts` becomes a real (if similarly untested-without-a-
//! server) delegation instead of a second, independent mock.
//!
//! # Wire shape: JSON documents keyed by `"id"`
//!
//! `StorageAdapter::{list,get,put}` are generic over `T: StorageRecord`; at
//! the FFI boundary the only record type a caller can hand across is a
//! plain JSON value (via napi's `serde-json` feature — see
//! `crates/thoth-napi/Cargo.toml`). [`JsonRecord`] is a thin,
//! `#[serde(transparent)]` wrapper implementing `StorageRecord` by reading
//! a string `"id"` field out of the JSON — the same document-per-row shape
//! `PostgresStorageAdapter`'s own schema already uses
//! (`id TEXT PRIMARY KEY, data JSONB NOT NULL, ...`). [`to_json_record`]
//! rejects a value with no string `"id"` field up front with a catchable
//! error, rather than silently keying a record on an empty string.
//!
//! # What's not exposed: `transaction`
//!
//! `StorageAdapter::transaction` takes a Rust closure
//! (`FnOnce() -> impl Future<Output = Result<T, StorageError>>`) that calls
//! back into the *same* adapter's own `list`/`get`/`put` while a
//! `BEGIN`/`COMMIT`/`ROLLBACK` is open on the underlying session. Accepting
//! an arbitrary JS callback in its place would need a `ThreadsafeFunction`
//! that itself re-enters these very exports while a transaction is open on
//! the other side of the boundary — a materially different, higher-risk FFI
//! shape than every other export in this crate, and out of scope for this
//! pass. `packages/storage/src/postgresAdapter.ts`'s `transaction` method
//! therefore runs its callback directly against the same real, per-call
//! Postgres operations below, without an explicit transaction wrapper — a
//! documented limitation (no cross-call atomicity yet), not a fabricated
//! success. See that file's TSDoc for the caller-facing version of this
//! note.
//!
//! # Design: handles, not classes; error handling
//!
//! See `crate::registry`'s module docs for the handle pattern and
//! [`crate::registry::to_napi_error`] for how every
//! `thoth_services::storage::StorageError` crosses as a catchable
//! `napi::Error`.

use std::sync::{Arc, OnceLock};

use napi::bindgen_prelude::{Error, Result, Status};
use napi_derive::napi;
use serde::{Deserialize, Serialize};

use thoth_services::storage::{PostgresStorageAdapter, StorageAdapter, StorageRecord};

use crate::registry::{handle_not_found, to_napi_error, Registry};

fn registry() -> &'static Registry<PostgresStorageAdapter> {
    static REGISTRY: OnceLock<Registry<PostgresStorageAdapter>> = OnceLock::new();
    REGISTRY.get_or_init(Registry::new)
}

fn adapter(handle: u32) -> Result<Arc<PostgresStorageAdapter>> {
    registry()
        .get(handle)
        .ok_or_else(|| handle_not_found("postgres storage adapter", handle))
}

/// A JSON document keyed by a string `"id"` field — see the module docs.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(transparent)]
struct JsonRecord(serde_json::Value);

impl StorageRecord for JsonRecord {
    fn id(&self) -> &str {
        // Only ever constructed via `to_json_record`, which already
        // validated the presence of a string "id" — or deserialized back
        // out of Postgres, where it was validated the same way on the way
        // in. `unwrap_or("")` is a defensive fallback, not the expected
        // path.
        self.0.get("id").and_then(|v| v.as_str()).unwrap_or("")
    }
}

fn to_json_record(value: serde_json::Value) -> Result<JsonRecord> {
    match value.get("id").and_then(|v| v.as_str()) {
        Some(_) => Ok(JsonRecord(value)),
        None => Err(Error::new(
            Status::InvalidArg,
            "record is missing a string \"id\" field, required by StorageAdapter's \
             StorageRecord contract",
        )),
    }
}

/// Connect to Postgres using `connection_string` (e.g.
/// `postgres://user:pass@host/db`). Returns an opaque handle every other
/// `postgresStorage*` export below takes as its first argument. See
/// `crates/thoth-services/src/storage/postgres.rs`'s module docs for the
/// adapter's documented single-session concurrency caveat, which applies
/// unchanged here — this binding adds no connection pooling of its own.
#[napi(js_name = "postgresStorageConnect")]
pub async fn connect(connection_string: String) -> Result<u32> {
    let adapter = PostgresStorageAdapter::connect(&connection_string)
        .await
        .map_err(to_napi_error)?;
    Ok(registry().insert(adapter))
}

/// Release a connection's handle. `PostgresStorageAdapter::close` is
/// currently a no-op beyond satisfying the trait shape (the underlying
/// `tokio_postgres::Client` ends its session on drop); removing the handle
/// here is what actually lets that drop happen, once any call already in
/// flight on it finishes.
#[napi(js_name = "postgresStorageClose")]
pub async fn close(handle: u32) -> Result<()> {
    let adapter = registry()
        .remove(handle)
        .ok_or_else(|| handle_not_found("postgres storage adapter", handle))?;
    adapter.close().await.map_err(to_napi_error)
}

/// All records in `collection`.
#[napi(js_name = "postgresStorageList")]
pub async fn list(handle: u32, collection: String) -> Result<Vec<serde_json::Value>> {
    let adapter = adapter(handle)?;
    let records: Vec<JsonRecord> = adapter.list(&collection).await.map_err(to_napi_error)?;
    Ok(records.into_iter().map(|r| r.0).collect())
}

/// A single record by id, or `null` if it doesn't exist.
#[napi(js_name = "postgresStorageGet")]
pub async fn get(handle: u32, collection: String, id: String) -> Result<Option<serde_json::Value>> {
    let adapter = adapter(handle)?;
    let record: Option<JsonRecord> = adapter.get(&collection, &id).await.map_err(to_napi_error)?;
    Ok(record.map(|r| r.0))
}

/// Insert or fully replace a record, keyed by its `"id"` field. Returns the
/// stored value. Rejects with [`Status::InvalidArg`] if `value` has no
/// string `"id"` field.
#[napi(js_name = "postgresStoragePut")]
pub async fn put(
    handle: u32,
    collection: String,
    value: serde_json::Value,
) -> Result<serde_json::Value> {
    let adapter = adapter(handle)?;
    let record = to_json_record(value)?;
    let stored = adapter
        .put(&collection, record)
        .await
        .map_err(to_napi_error)?;
    Ok(stored.0)
}

/// Remove a record. Returns whether a record was actually deleted.
#[napi(js_name = "postgresStorageDelete")]
pub async fn delete(handle: u32, collection: String, id: String) -> Result<bool> {
    let adapter = adapter(handle)?;
    adapter
        .delete(&collection, &id)
        .await
        .map_err(to_napi_error)
}

/// Remove every record in `collection`.
#[napi(js_name = "postgresStorageClear")]
pub async fn clear(handle: u32, collection: String) -> Result<()> {
    let adapter = adapter(handle)?;
    adapter.clear(&collection).await.map_err(to_napi_error)
}

#[cfg(test)]
mod tests {
    //! Unlike `auth`/`collaboration`, this module's stateful type
    //! (`PostgresStorageAdapter`) can only be constructed via `connect()`,
    //! which needs a real Postgres server — unavailable in this sandbox
    //! (see the module docs and `crates/thoth-services/STATUS.md`'s
    //! `ported+partial-tests` note for the same adapter one layer down).
    //! What *is* testable on the host target without a server: the pure
    //! JSON-record validation logic this module adds on top of the
    //! adapter, and that a real (non-panicking) connection failure crosses
    //! as a catchable error.
    use super::*;

    #[test]
    fn to_json_record_accepts_a_value_with_a_string_id() {
        let record = to_json_record(serde_json::json!({"id": "widget-1", "name": "Bolt"})).unwrap();
        assert_eq!(record.id(), "widget-1");
    }

    #[test]
    fn to_json_record_rejects_a_missing_id() {
        let err = to_json_record(serde_json::json!({"name": "Bolt"})).unwrap_err();
        assert_eq!(err.status, Status::InvalidArg);
    }

    #[test]
    fn to_json_record_rejects_a_non_string_id() {
        let err = to_json_record(serde_json::json!({"id": 123})).unwrap_err();
        assert_eq!(err.status, Status::InvalidArg);
    }

    #[tokio::test]
    async fn connecting_to_an_unreachable_server_is_a_catchable_error_not_a_panic() {
        // Port 1 on localhost: nothing listens there in any environment,
        // so this fails fast (connection refused) without needing network
        // egress or a real Postgres instance.
        let err = connect("postgres://user:pass@127.0.0.1:1/thoth".to_string())
            .await
            .unwrap_err();
        assert_eq!(err.status, Status::GenericFailure);
    }
}
