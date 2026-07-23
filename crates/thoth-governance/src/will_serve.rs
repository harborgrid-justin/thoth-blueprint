//! "Will-serve"/utility-capacity request tracking: a structured record of a
//! project's request for utility capacity (water, sewer, stormwater,
//! electric, gas, telecom), its requested amount, and its review status.
//!
//! Modeled after the real-world "will-serve letter" workflow: a developer
//! requests confirmation that a utility provider can and will serve a
//! project at a stated capacity; the provider reviews the request against
//! their system capacity and returns approved/denied (sometimes with
//! revised terms, tracked here as reviewer notes rather than a separate
//! field, since the domain doesn't yet model counter-offers).

use serde::{Deserialize, Serialize};

use chrono::{DateTime, Utc};
use thoth_services::storage::{StorageAdapter, StorageRecord};
use thoth_spatial::create_id;

use crate::error::GovernanceError;

const WILL_SERVE_REQUESTS: &str = "governance_will_serve_requests";

/// Which utility a [`WillServeRequest`] concerns.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UtilityType {
    Water,
    Sewer,
    Stormwater,
    Electric,
    Gas,
    Telecom,
}

/// The review status of a [`WillServeRequest`].
///
/// ```text
/// Requested ──► Reviewed ──► Approved
///     ▲             │
///     │             └──────► Denied
///     └─────────────┘  (needs more information)
/// ```
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WillServeStatus {
    /// Submitted, awaiting provider review.
    Requested,
    /// Under active review by the utility provider.
    Reviewed,
    /// The provider confirmed they can serve the requested capacity.
    Approved,
    /// The provider cannot serve the requested capacity as requested.
    Denied,
}

/// A structured utility-capacity ("will-serve") request tied to a project.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WillServeRequest {
    pub id: String,
    pub project_id: String,
    pub utility: UtilityType,
    /// The requested capacity, in `capacity_unit`'s terms (e.g. gallons per
    /// day for water/sewer, kVA for electric). Always positive — validated
    /// at creation time.
    pub requested_capacity: f64,
    /// Free-form unit label for `requested_capacity` (e.g. `"gpd"`,
    /// `"EDU"`, `"kVA"`, `"therms/day"`) — utilities disagree on units by
    /// type and jurisdiction, so this isn't a closed enum.
    pub capacity_unit: String,
    pub requested_by: String,
    pub status: WillServeStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reviewer_notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl StorageRecord for WillServeRequest {
    fn id(&self) -> &str {
        &self.id
    }
}

/// Whether `from -> to` is a legal [`WillServeStatus`] transition.
fn transition_allowed(from: WillServeStatus, to: WillServeStatus) -> bool {
    use WillServeStatus::*;
    matches!(
        (from, to),
        (Requested, Reviewed)
            | (Requested, Denied)
            | (Reviewed, Approved)
            | (Reviewed, Denied)
            | (Reviewed, Requested)
    )
}

impl WillServeRequest {
    /// Move this request to `to`, optionally attaching reviewer notes (e.g.
    /// the reason for a denial, or conditions on an approval).
    /// [`GovernanceError::InvalidWillServeTransition`] if `to` isn't
    /// reachable from the current status.
    pub fn transition(
        &mut self,
        to: WillServeStatus,
        notes: Option<String>,
    ) -> Result<(), GovernanceError> {
        if !transition_allowed(self.status, to) {
            return Err(GovernanceError::InvalidWillServeTransition {
                request_id: self.id.clone(),
                from: self.status,
                to,
            });
        }
        self.status = to;
        if notes.is_some() {
            self.reviewer_notes = notes;
        }
        self.updated_at = Utc::now();
        Ok(())
    }
}

/// `StorageAdapter`-backed persistence and workflow transitions for
/// will-serve/utility-capacity requests.
pub struct WillServeTracker<A: StorageAdapter> {
    storage: A,
}

impl<A: StorageAdapter> WillServeTracker<A> {
    /// Wrap a storage backend as a will-serve tracker.
    pub fn new(storage: A) -> Self {
        Self { storage }
    }

    /// Submit a new request. [`GovernanceError::InvalidCapacity`] if
    /// `requested_capacity` is zero, negative, or non-finite.
    pub async fn request(
        &self,
        project_id: &str,
        utility: UtilityType,
        requested_capacity: f64,
        capacity_unit: impl Into<String>,
        requested_by: &str,
    ) -> Result<WillServeRequest, GovernanceError> {
        if !requested_capacity.is_finite() || requested_capacity <= 0.0 {
            return Err(GovernanceError::InvalidCapacity {
                requested: requested_capacity,
                reason: "requested capacity must be a positive, finite number".to_string(),
            });
        }
        let now = Utc::now();
        let request = WillServeRequest {
            id: create_id("willserve"),
            project_id: project_id.to_string(),
            utility,
            requested_capacity,
            capacity_unit: capacity_unit.into(),
            requested_by: requested_by.to_string(),
            status: WillServeStatus::Requested,
            reviewer_notes: None,
            created_at: now,
            updated_at: now,
        };
        Ok(self.storage.put(WILL_SERVE_REQUESTS, request).await?)
    }

    /// Look up a request by id.
    pub async fn get(&self, request_id: &str) -> Result<WillServeRequest, GovernanceError> {
        self.storage
            .get(WILL_SERVE_REQUESTS, request_id)
            .await?
            .ok_or_else(|| GovernanceError::WillServeRequestNotFound(request_id.to_string()))
    }

    /// Move a request to a new [`WillServeStatus`], optionally attaching
    /// reviewer notes.
    pub async fn transition(
        &self,
        request_id: &str,
        to: WillServeStatus,
        notes: Option<String>,
    ) -> Result<WillServeRequest, GovernanceError> {
        let mut request = self.get(request_id).await?;
        request.transition(to, notes)?;
        Ok(self.storage.put(WILL_SERVE_REQUESTS, request).await?)
    }

    /// Every will-serve request tied to `project_id`.
    pub async fn list_by_project(
        &self,
        project_id: &str,
    ) -> Result<Vec<WillServeRequest>, GovernanceError> {
        let all: Vec<WillServeRequest> = self.storage.list(WILL_SERVE_REQUESTS).await?;
        Ok(all
            .into_iter()
            .filter(|r| r.project_id == project_id)
            .collect())
    }

    /// Every will-serve request tied to `project_id` currently in `status`.
    pub async fn list_by_status(
        &self,
        project_id: &str,
        status: WillServeStatus,
    ) -> Result<Vec<WillServeRequest>, GovernanceError> {
        Ok(self
            .list_by_project(project_id)
            .await?
            .into_iter()
            .filter(|r| r.status == status)
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_services::storage::MemoryStorageAdapter;

    fn tracker() -> WillServeTracker<MemoryStorageAdapter> {
        WillServeTracker::new(MemoryStorageAdapter::new())
    }

    #[tokio::test]
    async fn submits_a_request_in_the_requested_state() {
        let tracker = tracker();
        let request = tracker
            .request("proj-1", UtilityType::Water, 5000.0, "gpd", "developer-1")
            .await
            .unwrap();
        assert_eq!(request.status, WillServeStatus::Requested);
        assert_eq!(request.capacity_unit, "gpd");
    }

    #[tokio::test]
    async fn rejects_non_positive_capacity() {
        let tracker = tracker();
        let err = tracker
            .request("proj-1", UtilityType::Sewer, 0.0, "gpd", "developer-1")
            .await
            .unwrap_err();
        assert!(matches!(err, GovernanceError::InvalidCapacity { .. }));

        let err = tracker
            .request("proj-1", UtilityType::Sewer, -100.0, "gpd", "developer-1")
            .await
            .unwrap_err();
        assert!(matches!(err, GovernanceError::InvalidCapacity { .. }));
    }

    #[tokio::test]
    async fn full_lifecycle_requested_to_approved() {
        let tracker = tracker();
        let request = tracker
            .request("proj-1", UtilityType::Electric, 500.0, "kVA", "developer-1")
            .await
            .unwrap();

        let request = tracker
            .transition(&request.id, WillServeStatus::Reviewed, None)
            .await
            .unwrap();
        assert_eq!(request.status, WillServeStatus::Reviewed);

        let request = tracker
            .transition(
                &request.id,
                WillServeStatus::Approved,
                Some("Approved at requested capacity.".to_string()),
            )
            .await
            .unwrap();
        assert_eq!(request.status, WillServeStatus::Approved);
        assert_eq!(
            request.reviewer_notes.as_deref(),
            Some("Approved at requested capacity.")
        );
    }

    #[tokio::test]
    async fn a_request_can_be_denied_after_review() {
        let tracker = tracker();
        let request = tracker
            .request(
                "proj-1",
                UtilityType::Stormwater,
                10.0,
                "cfs",
                "developer-1",
            )
            .await
            .unwrap();
        let request = tracker
            .transition(&request.id, WillServeStatus::Reviewed, None)
            .await
            .unwrap();
        let request = tracker
            .transition(
                &request.id,
                WillServeStatus::Denied,
                Some("Exceeds outfall capacity.".to_string()),
            )
            .await
            .unwrap();
        assert_eq!(request.status, WillServeStatus::Denied);
    }

    #[tokio::test]
    async fn illegal_transitions_are_rejected() {
        let tracker = tracker();
        let request = tracker
            .request(
                "proj-1",
                UtilityType::Gas,
                200.0,
                "therms/day",
                "developer-1",
            )
            .await
            .unwrap();

        // Requested -> Approved is not legal; must pass through Reviewed.
        let err = tracker
            .transition(&request.id, WillServeStatus::Approved, None)
            .await
            .unwrap_err();
        assert!(matches!(
            err,
            GovernanceError::InvalidWillServeTransition { .. }
        ));
    }

    #[tokio::test]
    async fn lists_requests_by_project_and_status() {
        let tracker = tracker();
        let a = tracker
            .request("proj-1", UtilityType::Water, 100.0, "gpd", "u1")
            .await
            .unwrap();
        tracker
            .request("proj-1", UtilityType::Sewer, 100.0, "gpd", "u1")
            .await
            .unwrap();
        tracker
            .request("proj-2", UtilityType::Water, 100.0, "gpd", "u1")
            .await
            .unwrap();
        tracker
            .transition(&a.id, WillServeStatus::Reviewed, None)
            .await
            .unwrap();

        assert_eq!(tracker.list_by_project("proj-1").await.unwrap().len(), 2);
        assert_eq!(
            tracker
                .list_by_status("proj-1", WillServeStatus::Reviewed)
                .await
                .unwrap()
                .len(),
            1
        );
        assert_eq!(
            tracker
                .list_by_status("proj-1", WillServeStatus::Requested)
                .await
                .unwrap()
                .len(),
            1
        );
    }

    #[tokio::test]
    async fn request_not_found_is_reported() {
        let tracker = tracker();
        let err = tracker.get("does-not-exist").await.unwrap_err();
        assert!(matches!(err, GovernanceError::WillServeRequestNotFound(_)));
    }
}
