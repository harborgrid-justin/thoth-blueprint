//! `@thoth/service-collaboration` — real-time multi-user editing, presence,
//! and comment/review-thread notifications.
//!
//! First real implementation, replacing the TypeScript scaffold at
//! `services/collaboration/src/index.ts` (which only exported
//! `__SCAFFOLD__ = true`). Per `docs/ROADMAP.md`, this is Phase 4 —
//! deliberately not fully built out yet. This module implements the parts
//! that are well-specified today:
//!
//! - **Presence** — who is viewing/editing a project, and where their
//!   cursor is ([`Presence`], [`CollaborationHub::join`]/[`CollaborationHub::leave`]/
//!   [`CollaborationHub::move_cursor`]).
//! - **A real-time co-editing event model** — [`CollabEvent`], broadcast
//!   per-project, with an optimistic-concurrency conflict-resolution
//!   strategy for element edits (see
//!   [`CollaborationHub::publish_element_change`]'s docs for why this, not
//!   a full CRDT/OT, is the appropriate first version).
//! - **Review-thread notifications** — [`CollabEvent::CommentPosted`]/
//!   [`CollabEvent::ThreadResolved`] so live viewers refresh; the threads
//!   and comments themselves are persisted by `@thoth/service-projects`
//!   ([`crate::projects`]), not duplicated here.
//!
//! # Boundary
//!
//! This module coordinates concurrent edits to *in-flight* session state;
//! persistence and versioning belong to `@thoth/service-projects`,
//! identity/permissions to `@thoth/service-auth`. It does not open network
//! sockets — [`CollaborationHub`] is the transport-agnostic core a future
//! websocket/SSE layer would sit on top of.

mod error;
mod hub;
mod types;

pub use error::CollaborationError;
pub use hub::CollaborationHub;
pub use types::{CollabEvent, ElementOp, Presence};
