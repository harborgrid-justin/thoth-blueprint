//! Identity, organization, team, and role vocabulary for `@thoth/service-auth`.
//!
//! There is no TypeScript original beyond the scaffold in
//! `services/auth/src/index.ts` — this is a first real implementation of the
//! responsibilities documented in `docs/ARCHITECTURE.md`: "identity,
//! organizations/teams, and access control".

use serde::{Deserialize, Serialize};

use crate::storage::StorageRecord;

/// A registered identity. Passwords are never stored in plaintext — only
/// [`crate::auth::hash_password`]'s Argon2 output.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
    /// Argon2id password hash (PHC string format), never the raw password.
    pub password_hash: String,
    /// A stable per-user display color, used consistently across canvas
    /// presence and review-thread attribution.
    pub color: String,
}

impl StorageRecord for User {
    fn id(&self) -> &str {
        &self.id
    }
}

/// An organization/team that owns projects. Every project belongs to
/// exactly one organization; membership in the organization is what grants
/// (or withholds) access to the projects it owns.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Organization {
    pub id: String,
    pub name: String,
    /// The user who created the organization. Always holds [`Role::Owner`]
    /// via an implicit membership created alongside the organization.
    pub owner_id: String,
}

impl StorageRecord for Organization {
    fn id(&self) -> &str {
        &self.id
    }
}

/// A named sub-grouping of an organization's members (e.g. "Civil", "Review
/// Board"). Teams don't currently carry their own permissions — they exist
/// for organizing members; access control is evaluated at the organization
/// level via [`Membership`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Team {
    pub id: String,
    pub organization_id: String,
    pub name: String,
}

impl StorageRecord for Team {
    fn id(&self) -> &str {
        &self.id
    }
}

/// A user's role within an organization — the unit access control is
/// actually checked against. One [`Membership`] per (organization, user)
/// pair; a later `put` with the same id replaces the role.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Membership {
    pub id: String,
    pub organization_id: String,
    pub user_id: String,
    pub role: Role,
}

impl StorageRecord for Membership {
    fn id(&self) -> &str {
        &self.id
    }
}

/// Deterministically derive a membership's storage id from the (org, user)
/// pair it represents, so `put`-ing a membership for the same pair replaces
/// rather than duplicates it.
pub fn membership_id(organization_id: &str, user_id: &str) -> String {
    format!("mem_{organization_id}_{user_id}")
}

/// A role within an organization, ordered from least to most privileged.
/// Derived `Ord` relies on declaration order — do not reorder these variants.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    /// May view a project's plans and metrics.
    Viewer,
    /// May additionally post review comments.
    Commenter,
    /// May additionally edit plan geometry and metadata.
    Editor,
    /// Full control, including membership management.
    Owner,
}

impl Role {
    /// `true` if this role permits `action`.
    pub const fn permits(self, action: Action) -> bool {
        match action {
            Action::View => true, // every role can at least view
            Action::Comment => matches!(self, Role::Commenter | Role::Editor | Role::Owner),
            Action::Edit => matches!(self, Role::Editor | Role::Owner),
            Action::ManageMembers | Action::DeleteOrganization => matches!(self, Role::Owner),
        }
    }
}

/// An action a caller might attempt within an organization/project,
/// evaluated against a [`Role`] via [`Role::permits`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    View,
    Comment,
    Edit,
    ManageMembers,
    DeleteOrganization,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roles_are_ordered_least_to_most_privileged() {
        assert!(Role::Viewer < Role::Commenter);
        assert!(Role::Commenter < Role::Editor);
        assert!(Role::Editor < Role::Owner);
    }

    #[test]
    fn viewer_may_only_view() {
        assert!(Role::Viewer.permits(Action::View));
        assert!(!Role::Viewer.permits(Action::Comment));
        assert!(!Role::Viewer.permits(Action::Edit));
        assert!(!Role::Viewer.permits(Action::ManageMembers));
    }

    #[test]
    fn commenter_may_view_and_comment_but_not_edit() {
        assert!(Role::Commenter.permits(Action::View));
        assert!(Role::Commenter.permits(Action::Comment));
        assert!(!Role::Commenter.permits(Action::Edit));
    }

    #[test]
    fn editor_may_view_comment_and_edit_but_not_manage_members() {
        assert!(Role::Editor.permits(Action::Edit));
        assert!(!Role::Editor.permits(Action::ManageMembers));
    }

    #[test]
    fn owner_may_do_everything() {
        for action in [
            Action::View,
            Action::Comment,
            Action::Edit,
            Action::ManageMembers,
            Action::DeleteOrganization,
        ] {
            assert!(Role::Owner.permits(action));
        }
    }
}
