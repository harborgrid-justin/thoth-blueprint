//! Public read-only engagement sharing: scoped, revocable share tokens over
//! a project's site, with a view-only vs. comment-allowed access-level
//! model — the capability behind "share this plan with the neighborhood for
//! comment" (Esri ArcGIS Hub-style public engagement), without standing up
//! a second authentication/authorization system.
//!
//! Reuses `thoth_services::auth`'s [`Action`] vocabulary directly
//! ([`ShareAccessLevel::permits`] mirrors [`Role::permits`]'s shape) rather
//! than inventing a parallel permission model, and composes with
//! `thoth_services::collaboration::CollaborationHub` ([`SharingService::join_collaboration`])
//! so a public viewer sees the same live presence/edit stream an
//! authenticated participant does, gated only by whether their token is
//! still valid.

use serde::{Deserialize, Serialize};

use chrono::{DateTime, Utc};
use thoth_services::auth::Action;
use thoth_services::collaboration::{CollabEvent, CollaborationHub, Presence};
use thoth_services::storage::{StorageAdapter, StorageRecord};
use thoth_spatial::create_id;
use tokio::sync::broadcast;

use crate::error::GovernanceError;

const SHARE_TOKENS: &str = "governance_share_tokens";

/// What a public viewer holding a [`ShareToken`] may do.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ShareAccessLevel {
    /// May view the site read-only.
    View,
    /// May additionally post review comments (redline threads) —
    /// public-engagement commenting, not plan editing.
    Comment,
}

impl ShareAccessLevel {
    /// `true` if this access level permits `action`, reusing
    /// `thoth_services::auth`'s [`Action`] vocabulary so a share token's
    /// permission check reads exactly like an [`thoth_services::auth::Role`]'s
    /// ([`thoth_services::auth::Role::permits`]). A share token can never
    /// permit [`Action::Edit`], [`Action::ManageMembers`], or
    /// [`Action::DeleteOrganization`] — those require real membership, not a
    /// public link, regardless of access level.
    pub const fn permits(self, action: Action) -> bool {
        match action {
            Action::View => true,
            Action::Comment => matches!(self, ShareAccessLevel::Comment),
            Action::Edit | Action::ManageMembers | Action::DeleteOrganization => false,
        }
    }
}

/// A scoped, revocable public share link over a project's site. The token
/// value itself is `id` (an unguessable, `thoth_spatial::create_id`-derived
/// string) — the same string a caller embeds in a public URL and later
/// presents to [`SharingService::resolve`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ShareToken {
    pub id: String,
    pub project_id: String,
    pub access_level: ShareAccessLevel,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    /// Optional expiry. `None` means the link doesn't expire on its own
    /// (it can still be [`SharingService::revoke`]d at any time).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<DateTime<Utc>>,
    pub revoked: bool,
}

impl StorageRecord for ShareToken {
    fn id(&self) -> &str {
        &self.id
    }
}

/// `StorageAdapter`-backed persistence and validation for public
/// engagement-sharing tokens.
pub struct SharingService<A: StorageAdapter> {
    storage: A,
}

impl<A: StorageAdapter> SharingService<A> {
    /// Wrap a storage backend as a sharing service.
    pub fn new(storage: A) -> Self {
        Self { storage }
    }

    /// Create a new share token for `project_id`.
    pub async fn create_share(
        &self,
        project_id: &str,
        created_by: &str,
        access_level: ShareAccessLevel,
        expires_at: Option<DateTime<Utc>>,
    ) -> Result<ShareToken, GovernanceError> {
        let token = ShareToken {
            id: create_id("share"),
            project_id: project_id.to_string(),
            access_level,
            created_by: created_by.to_string(),
            created_at: Utc::now(),
            expires_at,
            revoked: false,
        };
        Ok(self.storage.put(SHARE_TOKENS, token).await?)
    }

    /// Resolve a token string, validating it is neither revoked nor
    /// expired. [`GovernanceError::ShareTokenNotFound`],
    /// [`GovernanceError::ShareTokenRevoked`], or
    /// [`GovernanceError::ShareTokenExpired`] otherwise.
    pub async fn resolve(&self, token: &str) -> Result<ShareToken, GovernanceError> {
        let share: ShareToken = self
            .storage
            .get(SHARE_TOKENS, token)
            .await?
            .ok_or_else(|| GovernanceError::ShareTokenNotFound(token.to_string()))?;
        if share.revoked {
            return Err(GovernanceError::ShareTokenRevoked(token.to_string()));
        }
        if let Some(expires_at) = share.expires_at {
            if Utc::now() > expires_at {
                return Err(GovernanceError::ShareTokenExpired(token.to_string()));
            }
        }
        Ok(share)
    }

    /// Resolve a token and additionally check it permits `action` (see
    /// [`ShareAccessLevel::permits`]). [`GovernanceError::InsufficientShareAccess`]
    /// if the token is valid but doesn't grant `action` (e.g. attempting to
    /// comment through a view-only link).
    pub async fn authorize(
        &self,
        token: &str,
        action: Action,
    ) -> Result<ShareToken, GovernanceError> {
        let share = self.resolve(token).await?;
        if !share.access_level.permits(action) {
            return Err(GovernanceError::InsufficientShareAccess {
                token: token.to_string(),
                access: share.access_level,
                action,
            });
        }
        Ok(share)
    }

    /// Revoke a token immediately (idempotent — revoking an already-revoked
    /// token succeeds without error). [`GovernanceError::ShareTokenNotFound`]
    /// if the token never existed.
    pub async fn revoke(&self, token: &str) -> Result<(), GovernanceError> {
        let mut share: ShareToken = self
            .storage
            .get(SHARE_TOKENS, token)
            .await?
            .ok_or_else(|| GovernanceError::ShareTokenNotFound(token.to_string()))?;
        share.revoked = true;
        self.storage.put(SHARE_TOKENS, share).await?;
        Ok(())
    }

    /// Every share token ever issued for `project_id` (including revoked/
    /// expired ones — useful for an audit view of who has/had access).
    pub async fn list_by_project(
        &self,
        project_id: &str,
    ) -> Result<Vec<ShareToken>, GovernanceError> {
        let all: Vec<ShareToken> = self.storage.list(SHARE_TOKENS).await?;
        Ok(all
            .into_iter()
            .filter(|s| s.project_id == project_id)
            .collect())
    }

    /// Validate `token` and, if it's still good for at least
    /// [`ShareAccessLevel::View`], join its project's live collaboration
    /// room via [`CollaborationHub::join`] — the composition point with
    /// `thoth_services::collaboration` this module is built on, rather than
    /// a parallel public-viewer transport. The public viewer's presence id
    /// is derived from the share token id so it's distinguishable from
    /// authenticated participants without exposing the raw token in
    /// broadcast presence data beyond what any other participant already
    /// sees for each other.
    pub async fn join_collaboration(
        &self,
        token: &str,
        hub: &CollaborationHub,
        display_name: &str,
    ) -> Result<(Presence, broadcast::Receiver<CollabEvent>), GovernanceError> {
        let share = self.authorize(token, Action::View).await?;
        let public_viewer_id = format!("public:{}", share.id);
        Ok(hub
            .join(
                &share.project_id,
                &public_viewer_id,
                display_name,
                "#94a3b8",
            )
            .await)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;
    use thoth_services::storage::MemoryStorageAdapter;

    fn service() -> SharingService<MemoryStorageAdapter> {
        SharingService::new(MemoryStorageAdapter::new())
    }

    #[tokio::test]
    async fn creates_and_resolves_a_view_only_token() {
        let svc = service();
        let share = svc
            .create_share("proj-1", "owner-1", ShareAccessLevel::View, None)
            .await
            .unwrap();
        let resolved = svc.resolve(&share.id).await.unwrap();
        assert_eq!(resolved.project_id, "proj-1");
        assert_eq!(resolved.access_level, ShareAccessLevel::View);
    }

    #[tokio::test]
    async fn view_only_tokens_do_not_permit_commenting() {
        let svc = service();
        let share = svc
            .create_share("proj-1", "owner-1", ShareAccessLevel::View, None)
            .await
            .unwrap();
        let err = svc.authorize(&share.id, Action::Comment).await.unwrap_err();
        assert!(matches!(
            err,
            GovernanceError::InsufficientShareAccess { .. }
        ));
    }

    #[tokio::test]
    async fn comment_tokens_permit_viewing_and_commenting_but_never_editing() {
        let svc = service();
        let share = svc
            .create_share("proj-1", "owner-1", ShareAccessLevel::Comment, None)
            .await
            .unwrap();
        svc.authorize(&share.id, Action::View).await.unwrap();
        svc.authorize(&share.id, Action::Comment).await.unwrap();
        let err = svc.authorize(&share.id, Action::Edit).await.unwrap_err();
        assert!(matches!(
            err,
            GovernanceError::InsufficientShareAccess { .. }
        ));
    }

    #[tokio::test]
    async fn revoking_a_token_invalidates_it() {
        let svc = service();
        let share = svc
            .create_share("proj-1", "owner-1", ShareAccessLevel::View, None)
            .await
            .unwrap();
        svc.resolve(&share.id).await.unwrap();

        svc.revoke(&share.id).await.unwrap();
        let err = svc.resolve(&share.id).await.unwrap_err();
        assert!(matches!(err, GovernanceError::ShareTokenRevoked(_)));

        // Idempotent: revoking again doesn't error.
        svc.revoke(&share.id).await.unwrap();
    }

    #[tokio::test]
    async fn expired_tokens_are_rejected() {
        let svc = service();
        let share = svc
            .create_share(
                "proj-1",
                "owner-1",
                ShareAccessLevel::View,
                Some(Utc::now() - Duration::minutes(1)),
            )
            .await
            .unwrap();
        let err = svc.resolve(&share.id).await.unwrap_err();
        assert!(matches!(err, GovernanceError::ShareTokenExpired(_)));
    }

    #[tokio::test]
    async fn unexpired_tokens_resolve_normally() {
        let svc = service();
        let share = svc
            .create_share(
                "proj-1",
                "owner-1",
                ShareAccessLevel::View,
                Some(Utc::now() + Duration::hours(1)),
            )
            .await
            .unwrap();
        svc.resolve(&share.id).await.unwrap();
    }

    #[tokio::test]
    async fn unknown_token_is_reported() {
        let svc = service();
        let err = svc.resolve("does-not-exist").await.unwrap_err();
        assert!(matches!(err, GovernanceError::ShareTokenNotFound(_)));
    }

    #[tokio::test]
    async fn joining_collaboration_through_a_valid_token_registers_public_presence() {
        let svc = service();
        let hub = CollaborationHub::new();
        let share = svc
            .create_share("proj-1", "owner-1", ShareAccessLevel::View, None)
            .await
            .unwrap();

        let (presence, mut rx) = svc
            .join_collaboration(&share.id, &hub, "Public Viewer")
            .await
            .unwrap();
        assert!(presence.user_id.starts_with("public:"));
        let event = rx.recv().await.unwrap();
        assert!(matches!(event, CollabEvent::PresenceJoined { .. }));

        let snapshot = hub.presence_snapshot("proj-1").await;
        assert_eq!(snapshot.len(), 1);
    }

    #[tokio::test]
    async fn joining_collaboration_with_a_revoked_token_fails() {
        let svc = service();
        let hub = CollaborationHub::new();
        let share = svc
            .create_share("proj-1", "owner-1", ShareAccessLevel::View, None)
            .await
            .unwrap();
        svc.revoke(&share.id).await.unwrap();

        let err = svc
            .join_collaboration(&share.id, &hub, "Public Viewer")
            .await
            .unwrap_err();
        assert!(matches!(err, GovernanceError::ShareTokenRevoked(_)));
    }

    #[tokio::test]
    async fn lists_tokens_by_project_including_revoked() {
        let svc = service();
        let a = svc
            .create_share("proj-1", "owner-1", ShareAccessLevel::View, None)
            .await
            .unwrap();
        svc.create_share("proj-1", "owner-1", ShareAccessLevel::Comment, None)
            .await
            .unwrap();
        svc.create_share("proj-2", "owner-1", ShareAccessLevel::View, None)
            .await
            .unwrap();
        svc.revoke(&a.id).await.unwrap();

        let tokens = svc.list_by_project("proj-1").await.unwrap();
        assert_eq!(tokens.len(), 2);
    }
}
