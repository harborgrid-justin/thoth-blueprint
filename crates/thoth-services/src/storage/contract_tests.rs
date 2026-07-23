//! The behavioral contract every [`super::StorageAdapter`] implementation
//! must satisfy. Port of `packages/storage/src/storageAdapter.contract.test.ts`.
//!
//! Running the same test bodies once per adapter is what makes the backends
//! interchangeable in practice, not just on paper. A `macro_rules!` stands
//! in for the TS helper's higher-order `runContractTests(label, factory)`
//! function, since Rust `#[test]` functions can't be generated from a
//! runtime closure the way `describe`/`it` can.

use super::{StorageAdapter, StorageRecord};

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
struct Widget {
    id: String,
    name: String,
    count: i64,
}

impl StorageRecord for Widget {
    fn id(&self) -> &str {
        &self.id
    }
}

fn widget(id: &str, name: &str, count: i64) -> Widget {
    Widget {
        id: id.to_string(),
        name: name.to_string(),
        count,
    }
}

/// Generates one `#[tokio::test]` per contract case for the adapter produced
/// by `$make` (an async expression), inside a module named `$mod_name`.
macro_rules! storage_adapter_contract {
    ($mod_name:ident, $make:expr) => {
        mod $mod_name {
            use super::*;

            #[tokio::test]
            async fn returns_undefined_for_a_missing_record() {
                let storage = $make;
                let found: Option<Widget> = storage.get("widgets", "missing").await.unwrap();
                assert_eq!(found, None);
            }

            #[tokio::test]
            async fn returns_an_empty_list_for_an_unused_collection() {
                let storage = $make;
                let all: Vec<Widget> = storage.list("widgets").await.unwrap();
                assert_eq!(all, Vec::new());
            }

            #[tokio::test]
            async fn round_trips_a_record_through_put_get() {
                let storage = $make;
                let w = widget("w1", "Bolt", 3);
                storage.put("widgets", w.clone()).await.unwrap();
                let found: Option<Widget> = storage.get("widgets", "w1").await.unwrap();
                assert_eq!(found, Some(w));
            }

            #[tokio::test]
            async fn lists_every_record_in_a_collection() {
                let storage = $make;
                storage.put("widgets", widget("w1", "Bolt", 3)).await.unwrap();
                storage.put("widgets", widget("w2", "Nut", 5)).await.unwrap();
                let mut ids: Vec<String> = storage
                    .list::<Widget>("widgets")
                    .await
                    .unwrap()
                    .into_iter()
                    .map(|w| w.id)
                    .collect();
                ids.sort();
                assert_eq!(ids, vec!["w1".to_string(), "w2".to_string()]);
            }

            #[tokio::test]
            async fn put_replaces_an_existing_record_with_the_same_id() {
                let storage = $make;
                storage.put("widgets", widget("w1", "Bolt", 3)).await.unwrap();
                storage.put("widgets", widget("w1", "Bolt", 9)).await.unwrap();
                let all: Vec<Widget> = storage.list("widgets").await.unwrap();
                assert_eq!(all.len(), 1);
                assert_eq!(all[0].count, 9);
            }

            #[tokio::test]
            async fn delete_removes_a_record_and_reports_whether_it_existed() {
                let storage = $make;
                storage.put("widgets", widget("w1", "Bolt", 3)).await.unwrap();
                assert_eq!(storage.delete("widgets", "w1").await.unwrap(), true);
                assert_eq!(storage.delete("widgets", "w1").await.unwrap(), false);
                let found: Option<Widget> = storage.get("widgets", "w1").await.unwrap();
                assert_eq!(found, None);
            }

            #[tokio::test]
            async fn clear_empties_a_collection_without_touching_others() {
                let storage = $make;
                storage.put("widgets", widget("w1", "Bolt", 3)).await.unwrap();
                storage.put("gadgets", widget("g1", "Gizmo", 1)).await.unwrap();
                storage.clear("widgets").await.unwrap();
                let widgets: Vec<Widget> = storage.list("widgets").await.unwrap();
                let gadgets: Vec<Widget> = storage.list("gadgets").await.unwrap();
                assert_eq!(widgets, Vec::new());
                assert_eq!(gadgets.len(), 1);
            }

            #[tokio::test]
            async fn keeps_collections_isolated_from_each_other() {
                let storage = $make;
                storage
                    .put("widgets", widget("shared-id", "Bolt", 1))
                    .await
                    .unwrap();
                storage
                    .put("gadgets", widget("shared-id", "Gizmo", 2))
                    .await
                    .unwrap();
                let w: Option<Widget> = storage.get("widgets", "shared-id").await.unwrap();
                let g: Option<Widget> = storage.get("gadgets", "shared-id").await.unwrap();
                assert_eq!(w.unwrap().name, "Bolt");
                assert_eq!(g.unwrap().name, "Gizmo");
            }

            #[tokio::test]
            async fn commits_every_write_inside_a_successful_transaction() {
                let storage = $make;
                storage
                    .transaction(|| async {
                        storage.put("widgets", widget("w1", "Bolt", 1)).await?;
                        storage.put("widgets", widget("w2", "Nut", 2)).await?;
                        Ok(())
                    })
                    .await
                    .unwrap();
                let all: Vec<Widget> = storage.list("widgets").await.unwrap();
                assert_eq!(all.len(), 2);
            }

            #[tokio::test]
            async fn rolls_back_every_write_when_a_transaction_throws() {
                let storage = $make;
                storage.put("widgets", widget("w1", "Bolt", 1)).await.unwrap();
                let result: Result<(), super::super::StorageError> = storage
                    .transaction(|| async {
                        storage.put("widgets", widget("w2", "Nut", 2)).await?;
                        Err(super::super::StorageError::TransactionFailed("boom".into()))
                    })
                    .await;
                assert!(result.is_err());
                let all: Vec<Widget> = storage.list("widgets").await.unwrap();
                assert_eq!(all.into_iter().map(|w| w.id).collect::<Vec<_>>(), vec!["w1"]);
            }

            #[tokio::test]
            async fn returns_the_transactions_result() {
                let storage = $make;
                let result = storage.transaction(|| async { Ok(42) }).await.unwrap();
                assert_eq!(result, 42);
            }
        }
    };
}

storage_adapter_contract!(memory, super::MemoryStorageAdapter::new());

storage_adapter_contract!(sqlite, {
    let dir = tempfile::tempdir().unwrap();
    let file = dir.path().join("test.sqlite3").to_string_lossy().into_owned();
    std::mem::forget(dir); // keep the tempdir alive for the adapter's lifetime
    super::SqliteStorageAdapter::new(super::SqliteStorageAdapterOptions { file }).unwrap()
});

storage_adapter_contract!(sqlite_in_memory, {
    super::SqliteStorageAdapter::new(super::SqliteStorageAdapterOptions {
        file: ":memory:".to_string(),
    })
    .unwrap()
});
