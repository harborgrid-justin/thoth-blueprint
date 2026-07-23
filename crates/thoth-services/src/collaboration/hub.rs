//! `CollaborationHub` — presence tracking and a real-time co-editing event
//! bus, one broadcast room per project.
//!
//! # Conflict-resolution strategy
//!
//! `docs/ARCHITECTURE.md` leaves the real-time conflict-resolution strategy
//! ("CRDT or OT") as a decision for this service to make. For this first,
//! appropriately-scoped version, the hub implements **optimistic
//! concurrency control**: every plan element has a monotonically
//! increasing revision counter; a client publishing a change states the
//! revision it *expected* to be current, and the hub rejects the edit
//! (["StaleEdit"](super::CollaborationError::StaleEdit)) if someone else's
//! change landed first, requiring the caller to re-fetch and rebase. This
//! is simpler than a CRDT and doesn't merge concurrent edits automatically,
//! but it is correct, well-understood, and easy to reason about — a solid
//! foundation a future revision can replace with an actual CRDT/OT merge
//! algorithm without changing the event shape clients already listen to.

use std::collections::HashMap;

use chrono::Utc;
use thoth_spatial::Point;
use tokio::sync::{broadcast, RwLock};

use super::types::{CollabEvent, ElementOp, Presence};
use super::CollaborationError;

/// Broadcast channel capacity: how many not-yet-received events a slow
/// subscriber can lag behind before older ones are dropped for it (they'd
/// then need to re-sync presence/state out of band — the same lagged-
/// receiver tradeoff `tokio::sync::broadcast` always makes).
const ROOM_CHANNEL_CAPACITY: usize = 256;

struct Room {
    sender: broadcast::Sender<CollabEvent>,
    presence: HashMap<String, Presence>,
    /// Last-published revision per element id. Absent means revision 0
    /// (never edited through this hub).
    revisions: HashMap<String, u64>,
}

impl Room {
    fn new() -> Self {
        let (sender, _receiver) = broadcast::channel(ROOM_CHANNEL_CAPACITY);
        Self {
            sender,
            presence: HashMap::new(),
            revisions: HashMap::new(),
        }
    }
}

fn not_joined(project_id: &str, user_id: &str) -> CollaborationError {
    CollaborationError::NotJoined {
        project_id: project_id.to_string(),
        user_id: user_id.to_string(),
    }
}

/// Presence and live co-editing events for every project's collaboration
/// room, keyed by project id. One process-wide hub is shared across all
/// concurrent editing sessions; rooms are created lazily on first join and
/// persist for the process's lifetime (a production deployment would add
/// idle-room eviction — tracked as a follow-up, not silently dropped).
pub struct CollaborationHub {
    rooms: RwLock<HashMap<String, Room>>,
}

impl Default for CollaborationHub {
    fn default() -> Self {
        Self::new()
    }
}

impl CollaborationHub {
    /// Create an empty hub (no rooms yet).
    pub fn new() -> Self {
        Self {
            rooms: RwLock::new(HashMap::new()),
        }
    }

    /// Join `project_id`'s room, registering presence and returning a
    /// receiver for every subsequent [`CollabEvent`] broadcast to the room
    /// (this join's own [`CollabEvent::PresenceJoined`] included, since the
    /// subscription is created before the event is sent).
    pub async fn join(
        &self,
        project_id: &str,
        user_id: &str,
        display_name: &str,
        color: &str,
    ) -> (Presence, broadcast::Receiver<CollabEvent>) {
        let mut rooms = self.rooms.write().await;
        let room = rooms.entry(project_id.to_string()).or_insert_with(Room::new);

        let now = Utc::now();
        let presence = Presence {
            user_id: user_id.to_string(),
            display_name: display_name.to_string(),
            color: color.to_string(),
            cursor: None,
            joined_at: now,
            last_seen: now,
        };
        room.presence.insert(user_id.to_string(), presence.clone());
        let receiver = room.sender.subscribe();
        let _ = room.sender.send(CollabEvent::PresenceJoined {
            presence: presence.clone(),
        });
        (presence, receiver)
    }

    /// Leave a room, removing presence and broadcasting
    /// [`CollabEvent::PresenceLeft`]. Errors with
    /// [`CollaborationError::NotJoined`] if the user wasn't present.
    pub async fn leave(&self, project_id: &str, user_id: &str) -> Result<(), CollaborationError> {
        let mut rooms = self.rooms.write().await;
        let room = rooms.get_mut(project_id).ok_or_else(|| not_joined(project_id, user_id))?;
        if room.presence.remove(user_id).is_none() {
            return Err(not_joined(project_id, user_id));
        }
        let _ = room.sender.send(CollabEvent::PresenceLeft {
            user_id: user_id.to_string(),
        });
        Ok(())
    }

    /// Update a joined participant's cursor position and broadcast
    /// [`CollabEvent::CursorMoved`].
    pub async fn move_cursor(
        &self,
        project_id: &str,
        user_id: &str,
        point: Point,
    ) -> Result<(), CollaborationError> {
        let mut rooms = self.rooms.write().await;
        let room = rooms.get_mut(project_id).ok_or_else(|| not_joined(project_id, user_id))?;
        let presence = room
            .presence
            .get_mut(user_id)
            .ok_or_else(|| not_joined(project_id, user_id))?;
        presence.cursor = Some(point);
        presence.last_seen = Utc::now();
        let _ = room.sender.send(CollabEvent::CursorMoved {
            user_id: user_id.to_string(),
            point,
        });
        Ok(())
    }

    /// Publish a change to a plan element under optimistic concurrency
    /// control (see the module docs): `expected_revision` must match the
    /// element's current revision (or be `None` for an element never
    /// edited through this hub, current revision `0`), or the edit is
    /// rejected with [`CollaborationError::StaleEdit`]. On success,
    /// broadcasts [`CollabEvent::ElementChanged`] and returns the new
    /// revision.
    pub async fn publish_element_change(
        &self,
        project_id: &str,
        author_id: &str,
        element_id: &str,
        expected_revision: Option<u64>,
        op: ElementOp,
    ) -> Result<u64, CollaborationError> {
        let mut rooms = self.rooms.write().await;
        let room = rooms.entry(project_id.to_string()).or_insert_with(Room::new);
        let current = room.revisions.get(element_id).copied().unwrap_or(0);

        if let Some(expected) = expected_revision {
            if expected != current {
                return Err(CollaborationError::StaleEdit {
                    element_id: element_id.to_string(),
                    expected,
                    current,
                });
            }
        }

        let next = current + 1;
        room.revisions.insert(element_id.to_string(), next);
        let _ = room.sender.send(CollabEvent::ElementChanged {
            element_id: element_id.to_string(),
            op,
            revision: next,
            author_id: author_id.to_string(),
        });
        Ok(next)
    }

    /// Notify a room's live viewers that a comment was posted (the comment
    /// itself is persisted by `@thoth/service-projects`; this is purely a
    /// live-refresh signal).
    pub async fn publish_comment(&self, project_id: &str, thread_id: &str, comment_id: &str) {
        let mut rooms = self.rooms.write().await;
        let room = rooms.entry(project_id.to_string()).or_insert_with(Room::new);
        let _ = room.sender.send(CollabEvent::CommentPosted {
            thread_id: thread_id.to_string(),
            comment_id: comment_id.to_string(),
        });
    }

    /// Notify a room's live viewers that a review thread was resolved.
    pub async fn resolve_thread(&self, project_id: &str, thread_id: &str) {
        let mut rooms = self.rooms.write().await;
        let room = rooms.entry(project_id.to_string()).or_insert_with(Room::new);
        let _ = room.sender.send(CollabEvent::ThreadResolved {
            thread_id: thread_id.to_string(),
        });
    }

    /// The current set of present participants in `project_id`'s room
    /// (empty if the room doesn't exist or has no participants).
    pub async fn presence_snapshot(&self, project_id: &str) -> Vec<Presence> {
        let rooms = self.rooms.read().await;
        rooms
            .get(project_id)
            .map(|room| room.presence.values().cloned().collect())
            .unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn joining_registers_presence_and_broadcasts_it() {
        let hub = CollaborationHub::new();
        let (presence, mut rx) = hub.join("proj-1", "user-1", "Amaya", "#f59e0b").await;
        assert_eq!(presence.user_id, "user-1");

        let event = rx.recv().await.unwrap();
        assert!(matches!(event, CollabEvent::PresenceJoined { .. }));

        let snapshot = hub.presence_snapshot("proj-1").await;
        assert_eq!(snapshot.len(), 1);
        assert_eq!(snapshot[0].user_id, "user-1");
    }

    #[tokio::test]
    async fn a_second_joiner_sees_the_first_joiners_events_too() {
        let hub = CollaborationHub::new();
        let (_p1, mut rx1) = hub.join("proj-1", "user-1", "Amaya", "#f59e0b").await;
        let _ = rx1.recv().await.unwrap(); // drain user-1's own join event

        let (_p2, _rx2) = hub.join("proj-1", "user-2", "Liang", "#ec4899").await;
        let event = rx1.recv().await.unwrap();
        match event {
            CollabEvent::PresenceJoined { presence } => assert_eq!(presence.user_id, "user-2"),
            other => panic!("expected PresenceJoined, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn leaving_removes_presence_and_broadcasts_it() {
        let hub = CollaborationHub::new();
        let (_p, mut rx) = hub.join("proj-1", "user-1", "Amaya", "#f59e0b").await;
        let _ = rx.recv().await.unwrap();

        hub.leave("proj-1", "user-1").await.unwrap();
        let event = rx.recv().await.unwrap();
        assert!(matches!(event, CollabEvent::PresenceLeft { user_id } if user_id == "user-1"));
        assert_eq!(hub.presence_snapshot("proj-1").await.len(), 0);
    }

    #[tokio::test]
    async fn leaving_twice_reports_not_joined() {
        let hub = CollaborationHub::new();
        hub.join("proj-1", "user-1", "Amaya", "#f59e0b").await;
        hub.leave("proj-1", "user-1").await.unwrap();
        let err = hub.leave("proj-1", "user-1").await.unwrap_err();
        assert!(matches!(err, CollaborationError::NotJoined { .. }));
    }

    #[tokio::test]
    async fn cursor_moves_update_presence_and_broadcast() {
        let hub = CollaborationHub::new();
        let (_p, mut rx) = hub.join("proj-1", "user-1", "Amaya", "#f59e0b").await;
        let _ = rx.recv().await.unwrap();

        hub.move_cursor("proj-1", "user-1", Point::new(10.0, 20.0))
            .await
            .unwrap();
        let event = rx.recv().await.unwrap();
        assert!(matches!(event, CollabEvent::CursorMoved { user_id, point }
            if user_id == "user-1" && point == Point::new(10.0, 20.0)));

        let snapshot = hub.presence_snapshot("proj-1").await;
        assert_eq!(snapshot[0].cursor, Some(Point::new(10.0, 20.0)));
    }

    #[tokio::test]
    async fn first_edit_to_an_element_accepts_revision_zero() {
        let hub = CollaborationHub::new();
        let revision = hub
            .publish_element_change(
                "proj-1",
                "user-1",
                "el-1",
                Some(0),
                ElementOp::Created {
                    snapshot: serde_json::json!({}),
                },
            )
            .await
            .unwrap();
        assert_eq!(revision, 1);
    }

    #[tokio::test]
    async fn concurrent_edits_reject_the_second_stale_writer() {
        let hub = CollaborationHub::new();
        hub.publish_element_change(
            "proj-1",
            "user-1",
            "el-1",
            Some(0),
            ElementOp::Created {
                snapshot: serde_json::json!({}),
            },
        )
        .await
        .unwrap();

        // user-2 read revision 0 before user-1's write landed; their write
        // is stale now that the current revision is 1.
        let err = hub
            .publish_element_change(
                "proj-1",
                "user-2",
                "el-1",
                Some(0),
                ElementOp::Updated {
                    patch: serde_json::json!({}),
                },
            )
            .await
            .unwrap_err();
        assert!(matches!(
            err,
            CollaborationError::StaleEdit { expected: 0, current: 1, .. }
        ));

        // Rebasing on the current revision succeeds.
        let revision = hub
            .publish_element_change(
                "proj-1",
                "user-2",
                "el-1",
                Some(1),
                ElementOp::Updated {
                    patch: serde_json::json!({}),
                },
            )
            .await
            .unwrap();
        assert_eq!(revision, 2);
    }

    #[tokio::test]
    async fn an_unconditional_edit_always_succeeds() {
        let hub = CollaborationHub::new();
        hub.publish_element_change(
            "proj-1",
            "user-1",
            "el-1",
            Some(0),
            ElementOp::Created {
                snapshot: serde_json::json!({}),
            },
        )
        .await
        .unwrap();
        let revision = hub
            .publish_element_change(
                "proj-1",
                "user-2",
                "el-1",
                None,
                ElementOp::Deleted,
            )
            .await
            .unwrap();
        assert_eq!(revision, 2);
    }

    #[tokio::test]
    async fn comment_and_resolution_events_broadcast_to_the_room() {
        let hub = CollaborationHub::new();
        let (_p, mut rx) = hub.join("proj-1", "user-1", "Amaya", "#f59e0b").await;
        let _ = rx.recv().await.unwrap();

        hub.publish_comment("proj-1", "thrd-1", "cmt-1").await;
        assert!(matches!(rx.recv().await.unwrap(), CollabEvent::CommentPosted { .. }));

        hub.resolve_thread("proj-1", "thrd-1").await;
        assert!(matches!(rx.recv().await.unwrap(), CollabEvent::ThreadResolved { .. }));
    }
}
