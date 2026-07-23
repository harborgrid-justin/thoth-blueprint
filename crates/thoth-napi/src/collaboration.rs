//! Native Node boundary over `thoth_services::collaboration` — presence and
//! comment/thread-resolution notifications for one project's live editing
//! room.
//!
//! Wires the real [`CollaborationHub`] (see
//! `crates/thoth-services/src/collaboration/`, 9 passing tests) to Node,
//! replacing the TypeScript scaffold that used to live at
//! `services/collaboration/src/index.ts`
//! (`export const __SCAFFOLD__ = true`).
//!
//! # Scope of this pass
//!
//! Exposed here: joining/leaving a room, cursor moves, a presence snapshot,
//! element-change publication under optimistic concurrency control, and
//! comment/thread-resolution notifications — the pieces
//! `docs/RUST_MIGRATION.md`'s brief for this pass calls out ("join/presence,
//! comment publish/resolve"). **Not** exposed: the live
//! [`tokio::sync::broadcast::Receiver`] `CollaborationHub::join` also
//! returns. Streaming that stream of [`CollabEvent`]s out to a JS listener
//! needs a `ThreadsafeFunction`-driven push channel (or an async iterator) —
//! real, buildable work, but a distinct FFI shape from everything else in
//! this crate and out of scope for this pass; a future websocket/SSE
//! transport layer is the natural place to both drive that subscription and
//! bridge it to connected clients. Every `#[napi]` export below therefore
//! joins/reads/publishes state on the hub and returns, without holding a
//! subscription open.
//!
//! # Design: handles, not classes
//!
//! See `crate::registry`'s module docs. [`create_hub`] mints a `u32` handle
//! for a fresh, empty [`CollaborationHub`]; every other export takes that
//! handle as its first argument.
//!
//! # Error handling
//!
//! Every `thoth_services::collaboration::CollaborationError` crosses as a
//! catchable `napi::Error` via [`crate::registry::to_napi_error`]. No
//! `unwrap()`/`expect()` on caller-controlled input.

use std::sync::{Arc, OnceLock};

use napi::bindgen_prelude::{Error, Result, Status};
use napi_derive::napi;

use thoth_services::collaboration::{CollaborationHub, ElementOp, Presence};
use thoth_spatial::geometry::Point as SpatialPoint;

use crate::registry::{handle_not_found, to_napi_error, Registry};
use crate::Point;

fn registry() -> &'static Registry<CollaborationHub> {
    static REGISTRY: OnceLock<Registry<CollaborationHub>> = OnceLock::new();
    REGISTRY.get_or_init(Registry::new)
}

fn hub(handle: u32) -> Result<Arc<CollaborationHub>> {
    registry()
        .get(handle)
        .ok_or_else(|| handle_not_found("collaboration hub", handle))
}

/// A connected participant's live state, as returned across the FFI
/// boundary. Mirrors [`Presence`] field-for-field; timestamps cross as
/// RFC 3339 strings (`Date`-parseable on the JS side without an extra
/// dependency for this pass).
#[napi(object)]
#[derive(Debug)]
pub struct CollabPresence {
    pub user_id: String,
    pub display_name: String,
    pub color: String,
    pub cursor: Option<Point>,
    pub joined_at: String,
    pub last_seen: String,
}

impl From<Presence> for CollabPresence {
    fn from(p: Presence) -> Self {
        Self {
            user_id: p.user_id,
            display_name: p.display_name,
            color: p.color,
            cursor: p.cursor.map(Point::from),
            joined_at: p.joined_at.to_rfc3339(),
            last_seen: p.last_seen.to_rfc3339(),
        }
    }
}

fn element_op_from_wire(op_type: &str, payload: Option<serde_json::Value>) -> Result<ElementOp> {
    match op_type {
        "created" => Ok(ElementOp::Created {
            snapshot: payload.unwrap_or(serde_json::Value::Null),
        }),
        "updated" => Ok(ElementOp::Updated {
            patch: payload.unwrap_or(serde_json::Value::Null),
        }),
        "deleted" => Ok(ElementOp::Deleted),
        other => Err(Error::new(
            Status::InvalidArg,
            format!(
                "unknown element op \"{other}\"; expected one of \"created\", \"updated\", \"deleted\""
            ),
        )),
    }
}

/// Create a new, empty collaboration hub (no rooms yet). Returns an opaque
/// handle every other `collab*` export below takes as its first argument.
/// Call [`close_hub`] to release it.
#[napi(js_name = "collabCreateHub")]
pub fn create_hub() -> u32 {
    registry().insert(CollaborationHub::new())
}

/// Release a hub's handle.
#[napi(js_name = "collabCloseHub")]
pub fn close_hub(handle: u32) -> Result<()> {
    registry()
        .remove(handle)
        .map(|_| ())
        .ok_or_else(|| handle_not_found("collaboration hub", handle))
}

/// Join `project_id`'s room, registering presence. See the module docs for
/// why the live event receiver `CollaborationHub::join` also returns is not
/// part of this binding's surface.
#[napi(js_name = "collabJoin")]
pub async fn join(
    handle: u32,
    project_id: String,
    user_id: String,
    display_name: String,
    color: String,
) -> Result<CollabPresence> {
    let hub = hub(handle)?;
    let (presence, _receiver) = hub.join(&project_id, &user_id, &display_name, &color).await;
    Ok(presence.into())
}

/// Leave a room, removing presence.
#[napi(js_name = "collabLeave")]
pub async fn leave(handle: u32, project_id: String, user_id: String) -> Result<()> {
    let hub = hub(handle)?;
    hub.leave(&project_id, &user_id)
        .await
        .map_err(to_napi_error)
}

/// Update a joined participant's cursor position.
#[napi(js_name = "collabMoveCursor")]
pub async fn move_cursor(
    handle: u32,
    project_id: String,
    user_id: String,
    point: Point,
) -> Result<()> {
    let hub = hub(handle)?;
    let point: SpatialPoint = point.into();
    hub.move_cursor(&project_id, &user_id, point)
        .await
        .map_err(to_napi_error)
}

/// The current set of present participants in `project_id`'s room (empty if
/// the room doesn't exist or has no participants).
#[napi(js_name = "collabPresenceSnapshot")]
pub async fn presence_snapshot(handle: u32, project_id: String) -> Result<Vec<CollabPresence>> {
    let hub = hub(handle)?;
    Ok(hub
        .presence_snapshot(&project_id)
        .await
        .into_iter()
        .map(CollabPresence::from)
        .collect())
}

/// Publish a change to a plan element under optimistic concurrency control:
/// `expected_revision` must match the element's current revision (`null`/
/// absent only for an element never edited through this hub, current
/// revision `0`), or the call rejects with a catchable error — the caller
/// should re-fetch and retry with the current revision, the same way an
/// HTTP `If-Match`/412 flow works. `op_type` is one of `"created"`,
/// `"updated"`, `"deleted"`; `payload` is the new snapshot (for `"created"`)
/// or patch (for `"updated"`), ignored for `"deleted"`. Returns the new
/// revision on success.
#[napi(js_name = "collabPublishElementChange")]
#[allow(clippy::too_many_arguments)]
pub async fn publish_element_change(
    handle: u32,
    project_id: String,
    author_id: String,
    element_id: String,
    expected_revision: Option<u32>,
    op_type: String,
    payload: Option<serde_json::Value>,
) -> Result<u32> {
    let hub = hub(handle)?;
    let op = element_op_from_wire(&op_type, payload)?;
    let revision = hub
        .publish_element_change(
            &project_id,
            &author_id,
            &element_id,
            expected_revision.map(u64::from),
            op,
        )
        .await
        .map_err(to_napi_error)?;
    // Revisions are a per-element monotonic counter incremented one at a
    // time; reaching u32::MAX (four billion edits to one element) is not a
    // realistic concern for this platform.
    Ok(revision as u32)
}

/// Notify a room's live viewers that a comment was posted. The comment
/// itself is persisted by `@thoth/service-projects`; this is purely a
/// live-refresh signal.
#[napi(js_name = "collabPublishComment")]
pub async fn publish_comment(
    handle: u32,
    project_id: String,
    thread_id: String,
    comment_id: String,
) -> Result<()> {
    let hub = hub(handle)?;
    hub.publish_comment(&project_id, &thread_id, &comment_id)
        .await;
    Ok(())
}

/// Notify a room's live viewers that a review thread was resolved.
#[napi(js_name = "collabResolveThread")]
pub async fn resolve_thread(handle: u32, project_id: String, thread_id: String) -> Result<()> {
    let hub = hub(handle)?;
    hub.resolve_thread(&project_id, &thread_id).await;
    Ok(())
}

#[cfg(test)]
mod tests {
    //! See `crate::auth`'s test module docs for why these tests call the
    //! `#[napi]` exports' underlying logic directly under `#[tokio::test]`
    //! rather than through a real N-API environment.
    use super::*;

    #[test]
    fn element_op_from_wire_accepts_every_documented_kind() {
        assert!(matches!(
            element_op_from_wire("created", Some(serde_json::json!({"a": 1}))).unwrap(),
            ElementOp::Created { snapshot } if snapshot == serde_json::json!({"a": 1})
        ));
        assert!(matches!(
            element_op_from_wire("updated", None).unwrap(),
            ElementOp::Updated { patch } if patch == serde_json::Value::Null
        ));
        assert!(matches!(
            element_op_from_wire("deleted", None).unwrap(),
            ElementOp::Deleted
        ));
    }

    #[test]
    fn element_op_from_wire_rejects_an_unknown_kind() {
        let err = element_op_from_wire("moved", None).unwrap_err();
        assert_eq!(err.status, Status::InvalidArg);
    }

    #[tokio::test]
    async fn join_leave_and_presence_snapshot_round_trip_through_a_handle() {
        let handle = registry().insert(CollaborationHub::new());

        let presence = join(
            handle,
            "proj-1".to_string(),
            "user-1".to_string(),
            "Amaya".to_string(),
            "#f59e0b".to_string(),
        )
        .await
        .unwrap();
        assert_eq!(presence.user_id, "user-1");
        assert!(presence.cursor.is_none());

        let snapshot = presence_snapshot(handle, "proj-1".to_string())
            .await
            .unwrap();
        assert_eq!(snapshot.len(), 1);

        move_cursor(
            handle,
            "proj-1".to_string(),
            "user-1".to_string(),
            Point { x: 3.0, y: 4.0 },
        )
        .await
        .unwrap();
        let snapshot = presence_snapshot(handle, "proj-1".to_string())
            .await
            .unwrap();
        let cursor = snapshot[0].cursor.as_ref().expect("cursor set");
        assert_eq!((cursor.x, cursor.y), (3.0, 4.0));

        leave(handle, "proj-1".to_string(), "user-1".to_string())
            .await
            .unwrap();
        assert_eq!(
            presence_snapshot(handle, "proj-1".to_string())
                .await
                .unwrap()
                .len(),
            0
        );

        close_hub(handle).unwrap();
    }

    #[tokio::test]
    async fn publish_element_change_rejects_a_stale_revision_and_accepts_a_rebase() {
        let handle = registry().insert(CollaborationHub::new());

        let revision = publish_element_change(
            handle,
            "proj-1".to_string(),
            "user-1".to_string(),
            "el-1".to_string(),
            Some(0),
            "created".to_string(),
            Some(serde_json::json!({})),
        )
        .await
        .unwrap();
        assert_eq!(revision, 1);

        let err = publish_element_change(
            handle,
            "proj-1".to_string(),
            "user-2".to_string(),
            "el-1".to_string(),
            Some(0),
            "updated".to_string(),
            Some(serde_json::json!({})),
        )
        .await
        .unwrap_err();
        assert_eq!(err.status, Status::GenericFailure);

        let revision = publish_element_change(
            handle,
            "proj-1".to_string(),
            "user-2".to_string(),
            "el-1".to_string(),
            Some(1),
            "updated".to_string(),
            Some(serde_json::json!({})),
        )
        .await
        .unwrap();
        assert_eq!(revision, 2);

        close_hub(handle).unwrap();
    }

    #[tokio::test]
    async fn comment_and_resolution_calls_succeed_without_a_joined_listener() {
        let handle = registry().insert(CollaborationHub::new());
        // No one has joined "proj-1" — publishing must not require a live
        // subscriber, mirroring `CollaborationHub`'s own `send` semantics
        // (a channel with zero receivers is a normal, non-error state).
        publish_comment(
            handle,
            "proj-1".to_string(),
            "thrd-1".to_string(),
            "cmt-1".to_string(),
        )
        .await
        .unwrap();
        resolve_thread(handle, "proj-1".to_string(), "thrd-1".to_string())
            .await
            .unwrap();
        close_hub(handle).unwrap();
    }

    #[tokio::test]
    async fn a_stale_hub_handle_after_close_reports_a_clear_error() {
        let handle = registry().insert(CollaborationHub::new());
        close_hub(handle).unwrap();
        let err = presence_snapshot(handle, "proj-1".to_string())
            .await
            .unwrap_err();
        assert_eq!(err.status, Status::InvalidArg);
    }
}
