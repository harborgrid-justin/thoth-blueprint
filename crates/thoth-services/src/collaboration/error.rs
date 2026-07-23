//! Error type for `@thoth/service-collaboration`.

use thiserror::Error;

/// Everything that can go wrong in presence tracking and live co-editing.
#[derive(Debug, Error, Clone, PartialEq)]
pub enum CollaborationError {
    /// An edit was published against a stale revision — someone else's
    /// change landed first. The caller should re-fetch the current state
    /// and rebase before retrying, the same way an optimistic-concurrency
    /// HTTP `If-Match`/412 flow works.
    #[error(
        "stale edit on element {element_id}: expected revision {expected}, current revision is {current}"
    )]
    StaleEdit {
        element_id: String,
        expected: u64,
        current: u64,
    },

    /// A presence/cursor update was received for a user who hasn't joined
    /// the room.
    #[error("user {user_id} has not joined project {project_id}'s collaboration room")]
    NotJoined { project_id: String, user_id: String },
}
