//! Redline-comment resolution workflow: a comment thread anchored to a plan
//! element or a plan coordinate, carrying an explicit review-workflow
//! status and grouped by review round/cycle.
//!
//! `thoth_services::collaboration::hub::CollaborationHub` already has the
//! pub/sub half of review commenting: [`CollaborationHub::publish_comment`]
//! and [`CollaborationHub::resolve_thread`] notify a project's live viewers
//! that *something* happened to a thread, and
//! `thoth_services::projects::ReviewThread` persists a flat
//! open/resolved boolean. Neither models the fuller workflow a municipal
//! plan-review cycle needs: a comment can be *addressed* (the drafter
//! claims to have fixed it) before a reviewer actually *resolves* it (or
//! *rejects* the fix and reopens it), and threads need to be grouped by
//! which review round they were raised in.
//!
//! [`RedlineThread`] is that fuller model, and [`RedlineService`] is the
//! `StorageAdapter`-backed persistence + transition logic for it. It does
//! not replace `CollaborationHub` or `ReviewThread` — it composes with the
//! hub (see [`RedlineService::add_comment_notifying`]/
//! [`RedlineService::transition_notifying`]) to notify live viewers through
//! the *existing* pub/sub bus rather than standing up a second one.

use serde::{Deserialize, Serialize};

use chrono::{DateTime, Utc};
use thoth_services::collaboration::CollaborationHub;
use thoth_services::storage::{StorageAdapter, StorageRecord};
use thoth_spatial::{create_id, Point};

use crate::error::GovernanceError;

const THREADS: &str = "governance_redline_threads";

/// What a [`RedlineThread`] is anchored to: a specific plan element, a bare
/// coordinate (e.g. a redline mark with no single element it's "about"), or
/// nothing spatial at all (a general project-level comment).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum RedlineAnchor {
    Element { element_id: String },
    Coordinate { point: Point },
    General,
}

/// The review-workflow state of a [`RedlineThread`].
///
/// ```text
///        ┌────────────────────────────────────────────┐
///        │                                              │
///        ▼                                              │
///      Open ───addressed───► Addressed ───resolved───► Resolved
///        │                      │  ▲                       │
///        │                      │  └───reopen───────────────┘
///        └──────reject────► Rejected ◄──────reject───────────┘
///                              │
///                              └───reopen───► Open
/// ```
///
/// See [`RedlineThread::transition`] for the exact allowed-transition table.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ThreadStatus {
    /// Raised, awaiting a response.
    Open,
    /// The drafter believes they've addressed the comment; awaiting
    /// reviewer confirmation.
    Addressed,
    /// A reviewer confirmed the fix. Terminal in the sense that reaching it
    /// again from itself is an error (see
    /// [`GovernanceError::ThreadAlreadyResolved`]), but it can still be
    /// reopened if review continues into a later round.
    Resolved,
    /// A reviewer dismissed the comment as not applicable/not required.
    Rejected,
}

/// A single message within a [`RedlineThread`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RedlineComment {
    pub id: String,
    pub author_id: String,
    pub body: String,
    pub created_at: DateTime<Utc>,
}

/// A redline comment thread: an anchored conversation carrying an explicit
/// review-workflow status, grouped into a review round/cycle.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RedlineThread {
    pub id: String,
    pub project_id: String,
    /// Which review round/cycle this thread was raised in (e.g. round 1 of
    /// a municipal plan-review submittal, round 2 after resubmission, ...).
    pub review_round: u32,
    pub anchor: RedlineAnchor,
    pub status: ThreadStatus,
    pub comments: Vec<RedlineComment>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl StorageRecord for RedlineThread {
    fn id(&self) -> &str {
        &self.id
    }
}

/// Whether `from -> to` is a legal transition. See [`ThreadStatus`]'s docs
/// for the diagram this encodes.
fn transition_allowed(from: ThreadStatus, to: ThreadStatus) -> bool {
    use ThreadStatus::*;
    matches!(
        (from, to),
        (Open, Addressed)
            | (Open, Rejected)
            | (Addressed, Resolved)
            | (Addressed, Open)
            | (Addressed, Rejected)
            | (Resolved, Open)
            | (Rejected, Open)
    )
}

impl RedlineThread {
    /// Move this thread to `to`.
    /// [`GovernanceError::ThreadAlreadyResolved`] specifically when
    /// re-resolving an already-[`ThreadStatus::Resolved`] thread (a common
    /// double-submit, worth its own message);
    /// [`GovernanceError::InvalidThreadTransition`] for every other illegal
    /// transition (e.g. `Open -> Resolved` directly, skipping `Addressed`).
    pub fn transition(&mut self, to: ThreadStatus) -> Result<(), GovernanceError> {
        if self.status == ThreadStatus::Resolved && to == ThreadStatus::Resolved {
            return Err(GovernanceError::ThreadAlreadyResolved(self.id.clone()));
        }
        if !transition_allowed(self.status, to) {
            return Err(GovernanceError::InvalidThreadTransition {
                thread_id: self.id.clone(),
                from: self.status,
                to,
            });
        }
        self.status = to;
        self.updated_at = Utc::now();
        Ok(())
    }
}

/// `StorageAdapter`-backed persistence and workflow transitions for redline
/// threads. Any [`StorageAdapter`] works — memory for tests, SQLite/Postgres
/// for a real deployment, matching every other service in this codebase.
pub struct RedlineService<A: StorageAdapter> {
    storage: A,
}

impl<A: StorageAdapter> RedlineService<A> {
    /// Wrap a storage backend as a redline-thread service.
    pub fn new(storage: A) -> Self {
        Self { storage }
    }

    /// Open a new thread, anchored to `anchor`, in `review_round`, with an
    /// initial comment. [`GovernanceError::EmptyCommentBody`] if `body` is
    /// empty or all whitespace.
    pub async fn open_thread(
        &self,
        project_id: &str,
        review_round: u32,
        anchor: RedlineAnchor,
        author_id: &str,
        body: &str,
    ) -> Result<RedlineThread, GovernanceError> {
        if body.trim().is_empty() {
            return Err(GovernanceError::EmptyCommentBody);
        }
        let now = Utc::now();
        let thread = RedlineThread {
            id: create_id("redline"),
            project_id: project_id.to_string(),
            review_round,
            anchor,
            status: ThreadStatus::Open,
            comments: vec![RedlineComment {
                id: create_id("comment"),
                author_id: author_id.to_string(),
                body: body.to_string(),
                created_at: now,
            }],
            created_at: now,
            updated_at: now,
        };
        Ok(self.storage.put(THREADS, thread).await?)
    }

    /// Look up a thread by id.
    pub async fn get(&self, thread_id: &str) -> Result<RedlineThread, GovernanceError> {
        self.storage
            .get(THREADS, thread_id)
            .await?
            .ok_or_else(|| GovernanceError::ThreadNotFound(thread_id.to_string()))
    }

    /// Append a reply to an existing thread.
    /// [`GovernanceError::EmptyCommentBody`] if `body` is empty/whitespace.
    pub async fn add_comment(
        &self,
        thread_id: &str,
        author_id: &str,
        body: &str,
    ) -> Result<RedlineThread, GovernanceError> {
        if body.trim().is_empty() {
            return Err(GovernanceError::EmptyCommentBody);
        }
        let mut thread = self.get(thread_id).await?;
        thread.comments.push(RedlineComment {
            id: create_id("comment"),
            author_id: author_id.to_string(),
            body: body.to_string(),
            created_at: Utc::now(),
        });
        thread.updated_at = Utc::now();
        Ok(self.storage.put(THREADS, thread).await?)
    }

    /// Same as [`Self::add_comment`], but also calls
    /// [`CollaborationHub::publish_comment`] to notify the project's live
    /// viewers — the composition point with
    /// `thoth_services::collaboration` rather than a second event bus.
    pub async fn add_comment_notifying(
        &self,
        thread_id: &str,
        author_id: &str,
        body: &str,
        hub: &CollaborationHub,
    ) -> Result<RedlineThread, GovernanceError> {
        let thread = self.add_comment(thread_id, author_id, body).await?;
        let comment_id = thread
            .comments
            .last()
            .expect("add_comment always appends at least one comment")
            .id
            .clone();
        hub.publish_comment(&thread.project_id, &thread.id, &comment_id)
            .await;
        Ok(thread)
    }

    /// Move a thread to a new [`ThreadStatus`]. See
    /// [`RedlineThread::transition`] for the allowed-transition table and
    /// error cases.
    pub async fn transition(
        &self,
        thread_id: &str,
        to: ThreadStatus,
    ) -> Result<RedlineThread, GovernanceError> {
        let mut thread = self.get(thread_id).await?;
        thread.transition(to)?;
        Ok(self.storage.put(THREADS, thread).await?)
    }

    /// Same as [`Self::transition`], but also calls
    /// [`CollaborationHub::resolve_thread`] to notify live viewers when the
    /// new status is [`ThreadStatus::Resolved`] (the hub's existing
    /// resolution-notification event; other status changes don't yet have a
    /// dedicated `CollabEvent` variant, so they aren't broadcast — see
    /// `STATUS.md`).
    pub async fn transition_notifying(
        &self,
        thread_id: &str,
        to: ThreadStatus,
        hub: &CollaborationHub,
    ) -> Result<RedlineThread, GovernanceError> {
        let thread = self.transition(thread_id, to).await?;
        if thread.status == ThreadStatus::Resolved {
            hub.resolve_thread(&thread.project_id, &thread.id).await;
        }
        Ok(thread)
    }

    /// Every thread on `project_id`.
    pub async fn list_by_project(
        &self,
        project_id: &str,
    ) -> Result<Vec<RedlineThread>, GovernanceError> {
        let all: Vec<RedlineThread> = self.storage.list(THREADS).await?;
        Ok(all
            .into_iter()
            .filter(|t| t.project_id == project_id)
            .collect())
    }

    /// Every thread on `project_id` raised in `review_round`.
    pub async fn list_by_round(
        &self,
        project_id: &str,
        review_round: u32,
    ) -> Result<Vec<RedlineThread>, GovernanceError> {
        Ok(self
            .list_by_project(project_id)
            .await?
            .into_iter()
            .filter(|t| t.review_round == review_round)
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_services::storage::MemoryStorageAdapter;

    fn service() -> RedlineService<MemoryStorageAdapter> {
        RedlineService::new(MemoryStorageAdapter::new())
    }

    #[tokio::test]
    async fn opens_a_thread_anchored_to_an_element() {
        let svc = service();
        let thread = svc
            .open_thread(
                "proj-1",
                1,
                RedlineAnchor::Element {
                    element_id: "lot-1".to_string(),
                },
                "user-1",
                "This lot's setback looks wrong.",
            )
            .await
            .unwrap();
        assert_eq!(thread.status, ThreadStatus::Open);
        assert_eq!(thread.comments.len(), 1);
        assert_eq!(thread.review_round, 1);
    }

    #[tokio::test]
    async fn rejects_an_empty_comment_body() {
        let svc = service();
        let err = svc
            .open_thread("proj-1", 1, RedlineAnchor::General, "user-1", "   ")
            .await
            .unwrap_err();
        assert!(matches!(err, GovernanceError::EmptyCommentBody));
    }

    #[tokio::test]
    async fn full_lifecycle_open_addressed_resolved() {
        let svc = service();
        let thread = svc
            .open_thread(
                "proj-1",
                2,
                RedlineAnchor::Coordinate {
                    point: Point::new(10.0, 20.0),
                },
                "reviewer-1",
                "Move this easement 5' east.",
            )
            .await
            .unwrap();

        let thread = svc
            .add_comment(&thread.id, "drafter-1", "Done — moved it.")
            .await
            .unwrap();
        assert_eq!(thread.comments.len(), 2);

        let thread = svc
            .transition(&thread.id, ThreadStatus::Addressed)
            .await
            .unwrap();
        assert_eq!(thread.status, ThreadStatus::Addressed);

        let thread = svc
            .transition(&thread.id, ThreadStatus::Resolved)
            .await
            .unwrap();
        assert_eq!(thread.status, ThreadStatus::Resolved);
    }

    #[tokio::test]
    async fn resolving_twice_is_a_distinct_error() {
        let svc = service();
        let thread = svc
            .open_thread("proj-1", 1, RedlineAnchor::General, "user-1", "Comment")
            .await
            .unwrap();
        svc.transition(&thread.id, ThreadStatus::Addressed)
            .await
            .unwrap();
        svc.transition(&thread.id, ThreadStatus::Resolved)
            .await
            .unwrap();

        let err = svc
            .transition(&thread.id, ThreadStatus::Resolved)
            .await
            .unwrap_err();
        assert!(matches!(err, GovernanceError::ThreadAlreadyResolved(_)));
    }

    #[tokio::test]
    async fn illegal_transitions_are_rejected() {
        let svc = service();
        let thread = svc
            .open_thread("proj-1", 1, RedlineAnchor::General, "user-1", "Comment")
            .await
            .unwrap();

        // Open -> Resolved is not a legal direct transition (must go
        // through Addressed first).
        let err = svc
            .transition(&thread.id, ThreadStatus::Resolved)
            .await
            .unwrap_err();
        assert!(matches!(
            err,
            GovernanceError::InvalidThreadTransition { .. }
        ));
    }

    #[tokio::test]
    async fn a_rejected_thread_can_be_reopened() {
        let svc = service();
        let thread = svc
            .open_thread("proj-1", 1, RedlineAnchor::General, "user-1", "Comment")
            .await
            .unwrap();
        let thread = svc
            .transition(&thread.id, ThreadStatus::Rejected)
            .await
            .unwrap();
        assert_eq!(thread.status, ThreadStatus::Rejected);

        let thread = svc
            .transition(&thread.id, ThreadStatus::Open)
            .await
            .unwrap();
        assert_eq!(thread.status, ThreadStatus::Open);
    }

    #[tokio::test]
    async fn lists_threads_by_project_and_review_round() {
        let svc = service();
        svc.open_thread("proj-1", 1, RedlineAnchor::General, "u1", "round 1 a")
            .await
            .unwrap();
        svc.open_thread("proj-1", 1, RedlineAnchor::General, "u1", "round 1 b")
            .await
            .unwrap();
        svc.open_thread("proj-1", 2, RedlineAnchor::General, "u1", "round 2")
            .await
            .unwrap();
        svc.open_thread("proj-2", 1, RedlineAnchor::General, "u1", "other project")
            .await
            .unwrap();

        assert_eq!(svc.list_by_project("proj-1").await.unwrap().len(), 3);
        assert_eq!(svc.list_by_round("proj-1", 1).await.unwrap().len(), 2);
        assert_eq!(svc.list_by_round("proj-1", 2).await.unwrap().len(), 1);
    }

    #[tokio::test]
    async fn add_comment_notifying_publishes_to_the_collaboration_hub() {
        let svc = service();
        let hub = CollaborationHub::new();
        let (_presence, mut rx) = hub.join("proj-1", "viewer-1", "Viewer", "#000000").await;
        let _ = rx.recv().await.unwrap(); // drain the join event

        let thread = svc
            .open_thread("proj-1", 1, RedlineAnchor::General, "u1", "Initial")
            .await
            .unwrap();
        svc.add_comment_notifying(&thread.id, "u2", "A reply", &hub)
            .await
            .unwrap();

        let event = rx.recv().await.unwrap();
        assert!(matches!(
            event,
            thoth_services::collaboration::CollabEvent::CommentPosted { .. }
        ));
    }

    #[tokio::test]
    async fn transition_notifying_resolves_on_the_collaboration_hub() {
        let svc = service();
        let hub = CollaborationHub::new();
        let (_presence, mut rx) = hub.join("proj-1", "viewer-1", "Viewer", "#000000").await;
        let _ = rx.recv().await.unwrap();

        let thread = svc
            .open_thread("proj-1", 1, RedlineAnchor::General, "u1", "Initial")
            .await
            .unwrap();
        svc.transition(&thread.id, ThreadStatus::Addressed)
            .await
            .unwrap();
        svc.transition_notifying(&thread.id, ThreadStatus::Resolved, &hub)
            .await
            .unwrap();

        let event = rx.recv().await.unwrap();
        assert!(matches!(
            event,
            thoth_services::collaboration::CollabEvent::ThreadResolved { .. }
        ));
    }

    #[tokio::test]
    async fn thread_not_found_is_reported() {
        let svc = service();
        let err = svc.get("does-not-exist").await.unwrap_err();
        assert!(matches!(err, GovernanceError::ThreadNotFound(_)));
    }
}
