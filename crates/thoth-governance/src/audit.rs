//! Regulatory audit trail: a structured, queryable log of who changed what,
//! when, and under which review round — persisted through the same
//! [`StorageAdapter`] seam every other service in this codebase uses.
//!
//! This is deliberately a thin, generic append-and-query log rather than an
//! attempt to intercept every mutation across `thoth-planning`/
//! `thoth-services` automatically: this crate has no visibility into (and
//! must not reach into) call sites in sibling crates, so recording an entry
//! is the caller's responsibility (a service action, a rule-engine run, a
//! redline-thread transition) at the point it already has the "who/what/
//! when/under which round" context. [`crate::redline::RedlineService`] and
//! [`crate::will_serve::WillServeTracker`] are natural callers; a future
//! integration pass in `thoth-services` proper would call
//! [`AuditTrail::record`] from its own project/element mutation call sites.

use serde::{Deserialize, Serialize};

use chrono::{DateTime, Utc};
use thoth_services::storage::{StorageAdapter, StorageRecord};
use thoth_spatial::create_id;

use crate::error::GovernanceError;

const AUDIT_LOG: &str = "governance_audit_log";

/// One entry in the regulatory audit trail: who did what, to what, when, and
/// under which review round (if any).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AuditLogEntry {
    pub id: String,
    pub project_id: String,
    /// The user (or service principal) responsible for the change.
    pub actor_id: String,
    /// A short, dot-namespaced action code, e.g. `"element.modified"`,
    /// `"redline.resolved"`, `"will_serve.approved"`,
    /// `"share_token.revoked"` — the same convention
    /// [`thoth_spatial::ComplianceFinding::code`] uses, so log entries and
    /// compliance findings read consistently in a review UI.
    pub action: String,
    /// The entity the action concerns, if any: a plan element id, a redline
    /// thread id, a will-serve request id, a share-token id, ...
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subject_id: Option<String>,
    /// The review round/cycle this action was taken under, if applicable.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub review_round: Option<u32>,
    pub occurred_at: DateTime<Utc>,
    /// Arbitrary structured detail (e.g. a before/after value pair, a rule
    /// id) — opaque to the log itself, interpreted by whatever renders the
    /// trail for a reviewer.
    #[serde(default)]
    pub detail: serde_json::Value,
}

impl StorageRecord for AuditLogEntry {
    fn id(&self) -> &str {
        &self.id
    }
}

/// `StorageAdapter`-backed regulatory audit trail. Entries are
/// append-only from this API's perspective — there is no `update`/`delete`,
/// only [`Self::record`] and read-side queries — matching what an audit
/// trail is for.
pub struct AuditTrail<A: StorageAdapter> {
    storage: A,
}

impl<A: StorageAdapter> AuditTrail<A> {
    /// Wrap a storage backend as an audit trail.
    pub fn new(storage: A) -> Self {
        Self { storage }
    }

    /// Append one entry. [`GovernanceError::Storage`] wraps any underlying
    /// write failure (the "audit log write failure" case the audit trail
    /// itself needs to surface, not swallow).
    #[allow(clippy::too_many_arguments)]
    pub async fn record(
        &self,
        project_id: &str,
        actor_id: &str,
        action: impl Into<String>,
        subject_id: Option<String>,
        review_round: Option<u32>,
        detail: serde_json::Value,
    ) -> Result<AuditLogEntry, GovernanceError> {
        let entry = AuditLogEntry {
            id: create_id("audit"),
            project_id: project_id.to_string(),
            actor_id: actor_id.to_string(),
            action: action.into(),
            subject_id,
            review_round,
            occurred_at: Utc::now(),
            detail,
        };
        Ok(self.storage.put(AUDIT_LOG, entry).await?)
    }

    /// Every entry recorded for `project_id`, oldest first.
    pub async fn history_for_project(
        &self,
        project_id: &str,
    ) -> Result<Vec<AuditLogEntry>, GovernanceError> {
        let mut entries: Vec<AuditLogEntry> = self.storage.list(AUDIT_LOG).await?;
        entries.retain(|e| e.project_id == project_id);
        entries.sort_by_key(|e| e.occurred_at);
        Ok(entries)
    }

    /// Every entry recorded for `project_id` concerning `subject_id`, oldest
    /// first.
    pub async fn history_for_subject(
        &self,
        project_id: &str,
        subject_id: &str,
    ) -> Result<Vec<AuditLogEntry>, GovernanceError> {
        Ok(self
            .history_for_project(project_id)
            .await?
            .into_iter()
            .filter(|e| e.subject_id.as_deref() == Some(subject_id))
            .collect())
    }

    /// Every entry recorded for `project_id` under `review_round`, oldest
    /// first.
    pub async fn history_for_round(
        &self,
        project_id: &str,
        review_round: u32,
    ) -> Result<Vec<AuditLogEntry>, GovernanceError> {
        Ok(self
            .history_for_project(project_id)
            .await?
            .into_iter()
            .filter(|e| e.review_round == Some(review_round))
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_services::storage::MemoryStorageAdapter;

    fn trail() -> AuditTrail<MemoryStorageAdapter> {
        AuditTrail::new(MemoryStorageAdapter::new())
    }

    #[tokio::test]
    async fn records_and_lists_project_history() {
        let trail = trail();
        trail
            .record(
                "proj-1",
                "user-1",
                "element.modified",
                Some("lot-1".to_string()),
                Some(1),
                serde_json::json!({ "field": "setback", "before": 2.0, "after": 5.0 }),
            )
            .await
            .unwrap();
        trail
            .record(
                "proj-1",
                "user-2",
                "redline.resolved",
                Some("redline-1".to_string()),
                Some(1),
                serde_json::json!({}),
            )
            .await
            .unwrap();
        trail
            .record(
                "proj-2",
                "user-1",
                "element.modified",
                Some("lot-9".to_string()),
                None,
                serde_json::json!({}),
            )
            .await
            .unwrap();

        let history = trail.history_for_project("proj-1").await.unwrap();
        assert_eq!(history.len(), 2);
        assert_eq!(history[0].action, "element.modified");
        assert_eq!(history[1].action, "redline.resolved");
    }

    #[tokio::test]
    async fn filters_history_by_subject() {
        let trail = trail();
        trail
            .record(
                "proj-1",
                "user-1",
                "element.modified",
                Some("lot-1".to_string()),
                None,
                serde_json::json!({}),
            )
            .await
            .unwrap();
        trail
            .record(
                "proj-1",
                "user-1",
                "element.modified",
                Some("lot-2".to_string()),
                None,
                serde_json::json!({}),
            )
            .await
            .unwrap();

        let history = trail.history_for_subject("proj-1", "lot-1").await.unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].subject_id.as_deref(), Some("lot-1"));
    }

    #[tokio::test]
    async fn filters_history_by_review_round() {
        let trail = trail();
        trail
            .record(
                "proj-1",
                "user-1",
                "will_serve.approved",
                Some("ws-1".to_string()),
                Some(1),
                serde_json::json!({}),
            )
            .await
            .unwrap();
        trail
            .record(
                "proj-1",
                "user-1",
                "will_serve.approved",
                Some("ws-2".to_string()),
                Some(2),
                serde_json::json!({}),
            )
            .await
            .unwrap();

        let round_1 = trail.history_for_round("proj-1", 1).await.unwrap();
        assert_eq!(round_1.len(), 1);
        assert_eq!(round_1[0].subject_id.as_deref(), Some("ws-1"));
    }

    #[tokio::test]
    async fn history_is_chronologically_ordered() {
        let trail = trail();
        for i in 0..5 {
            trail
                .record(
                    "proj-1",
                    "user-1",
                    format!("action.{i}"),
                    None,
                    None,
                    serde_json::json!({}),
                )
                .await
                .unwrap();
        }
        let history = trail.history_for_project("proj-1").await.unwrap();
        for pair in history.windows(2) {
            assert!(pair[0].occurred_at <= pair[1].occurred_at);
        }
    }
}
