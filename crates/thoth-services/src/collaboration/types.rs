//! Message/event vocabulary for real-time collaboration.
//!
//! There is no TypeScript original beyond the scaffold in
//! `services/collaboration/src/index.ts` — this is a first, appropriately
//! scoped implementation of the responsibilities `docs/ROADMAP.md` marks as
//! Phase 4 and `docs/ARCHITECTURE.md` describes: "real-time multi-user
//! editing, presence, and comments/review threads".

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thoth_spatial::Point;

/// A connected participant's live state within one project's editing
/// session.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Presence {
    pub user_id: String,
    pub display_name: String,
    /// A stable per-user display color (see [`crate::auth::User::color`]),
    /// so a cursor/avatar is recognizable across canvas, presence list, and
    /// review-thread attribution.
    pub color: String,
    /// The user's last-known cursor position in plan coordinates, if
    /// they've moved it since joining.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<Point>,
    pub joined_at: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
}

/// What changed about a plan element in an [`CollabEvent::ElementChanged`]
/// event.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ElementOp {
    Created { snapshot: serde_json::Value },
    Updated { patch: serde_json::Value },
    Deleted,
}

/// A message broadcast to every participant in a project's collaboration
/// room. This is the wire vocabulary a future websocket/SSE transport would
/// serialize; the hub in [`super::hub`] is transport-agnostic.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CollabEvent {
    /// A participant joined the room.
    PresenceJoined { presence: Presence },
    /// A participant left the room.
    PresenceLeft { user_id: String },
    /// A participant moved their cursor.
    CursorMoved { user_id: String, point: Point },
    /// A plan element changed, carrying the new revision number for
    /// optimistic-concurrency conflict detection (see
    /// [`super::hub::CollaborationHub::publish_element_change`]).
    ElementChanged {
        element_id: String,
        op: ElementOp,
        revision: u64,
        author_id: String,
    },
    /// A review comment was posted (the comment itself is persisted by
    /// `@thoth/service-projects`; this event just notifies live viewers to
    /// refresh).
    CommentPosted {
        thread_id: String,
        comment_id: String,
    },
    /// A review thread was marked resolved.
    ThreadResolved { thread_id: String },
}
