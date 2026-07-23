//! `AuthService` — identity, organizations/teams, and role-based access
//! control, backed by the platform's own [`crate::storage::StorageAdapter`]
//! (the same seam every other service persists through).

use thoth_spatial::create_id;

use super::password::{hash_password, verify_password};
use super::types::{membership_id, Action, Membership, Organization, Role, Team, User};
use super::AuthError;
use crate::storage::StorageAdapter;

const USERS: &str = "users";
const ORGANIZATIONS: &str = "organizations";
const TEAMS: &str = "teams";
const MEMBERSHIPS: &str = "memberships";

/// A stable, deterministic display color for a new user, cycling through a
/// small palette by a cheap hash of their email — avoids every user
/// defaulting to the same color while needing no extra configuration.
fn color_for(email: &str) -> String {
    const PALETTE: [&str; 6] = [
        "#0ea5e9", "#f59e0b", "#ec4899", "#22c55e", "#8b5cf6", "#ef4444",
    ];
    let hash: u32 = email.bytes().fold(0u32, |acc, b| acc.wrapping_mul(31).wrapping_add(b as u32));
    PALETTE[(hash as usize) % PALETTE.len()].to_string()
}

/// Identity, organizations/teams, and role-based access control for Thoth
/// Blueprint.
///
/// Owns *identity and authorization*: other services ask "who is this and
/// may they do X" rather than re-implementing access control themselves. It
/// has no knowledge of planning geometry — that boundary stays with
/// `thoth-planning`/`thoth-spatial`. It also doesn't stand up a web server:
/// this is the service-logic layer a future HTTP/gRPC transport would call
/// into (session/token issuance, request routing, and rate limiting belong
/// to that later layer, not here).
pub struct AuthService<A: StorageAdapter> {
    storage: A,
}

impl<A: StorageAdapter> AuthService<A> {
    /// Wrap a storage backend as an auth service. Any [`StorageAdapter`]
    /// works — memory for tests, SQLite for local/small deployments,
    /// Postgres for an enterprise backend.
    pub fn new(storage: A) -> Self {
        Self { storage }
    }

    /// Register a new user. Fails with
    /// [`AuthError::EmailAlreadyRegistered`] if the email is already on
    /// file (checked case-insensitively, since email addresses are
    /// conventionally case-insensitive for the local-part-independent
    /// domain match most providers use).
    pub async fn register(&self, name: &str, email: &str, password: &str) -> Result<User, AuthError> {
        let existing: Vec<User> = self.storage.list(USERS).await?;
        let normalized = email.to_lowercase();
        if existing.iter().any(|u| u.email.to_lowercase() == normalized) {
            return Err(AuthError::EmailAlreadyRegistered(email.to_string()));
        }

        let user = User {
            id: create_id("user"),
            name: name.to_string(),
            email: email.to_string(),
            password_hash: hash_password(password)?,
            color: color_for(email),
        };
        Ok(self.storage.put(USERS, user).await?)
    }

    /// Verify credentials and return the matching user.
    /// [`AuthError::InvalidCredentials`] is returned uniformly whether the
    /// email doesn't exist or the password is wrong, to avoid leaking which
    /// case occurred (a user-enumeration side channel).
    pub async fn authenticate(&self, email: &str, password: &str) -> Result<User, AuthError> {
        let users: Vec<User> = self.storage.list(USERS).await?;
        let normalized = email.to_lowercase();
        let user = users
            .into_iter()
            .find(|u| u.email.to_lowercase() == normalized)
            .ok_or(AuthError::InvalidCredentials)?;
        if verify_password(password, &user.password_hash)? {
            Ok(user)
        } else {
            Err(AuthError::InvalidCredentials)
        }
    }

    /// Look up a user by id.
    pub async fn get_user(&self, user_id: &str) -> Result<User, AuthError> {
        self.storage
            .get(USERS, user_id)
            .await?
            .ok_or_else(|| AuthError::UserNotFound(user_id.to_string()))
    }

    /// Create an organization owned by `owner_id`, who is granted an
    /// implicit [`Role::Owner`] membership.
    pub async fn create_organization(
        &self,
        name: &str,
        owner_id: &str,
    ) -> Result<Organization, AuthError> {
        self.get_user(owner_id).await?; // 404s early if the owner doesn't exist

        let organization = Organization {
            id: create_id("org"),
            name: name.to_string(),
            owner_id: owner_id.to_string(),
        };
        self.storage.put(ORGANIZATIONS, organization.clone()).await?;

        let membership = Membership {
            id: membership_id(&organization.id, owner_id),
            organization_id: organization.id.clone(),
            user_id: owner_id.to_string(),
            role: Role::Owner,
        };
        self.storage.put(MEMBERSHIPS, membership).await?;

        Ok(organization)
    }

    /// Look up an organization by id.
    pub async fn get_organization(&self, organization_id: &str) -> Result<Organization, AuthError> {
        self.storage
            .get(ORGANIZATIONS, organization_id)
            .await?
            .ok_or_else(|| AuthError::OrganizationNotFound(organization_id.to_string()))
    }

    /// Create a team within an organization.
    pub async fn create_team(&self, organization_id: &str, name: &str) -> Result<Team, AuthError> {
        self.get_organization(organization_id).await?;
        let team = Team {
            id: create_id("team"),
            organization_id: organization_id.to_string(),
            name: name.to_string(),
        };
        Ok(self.storage.put(TEAMS, team).await?)
    }

    /// Grant (or change) `user_id`'s role within `organization_id`. Calling
    /// this again for the same (organization, user) pair replaces the role
    /// rather than creating a second membership.
    pub async fn add_member(
        &self,
        organization_id: &str,
        user_id: &str,
        role: Role,
    ) -> Result<Membership, AuthError> {
        self.get_organization(organization_id).await?;
        self.get_user(user_id).await?;
        let membership = Membership {
            id: membership_id(organization_id, user_id),
            organization_id: organization_id.to_string(),
            user_id: user_id.to_string(),
            role,
        };
        Ok(self.storage.put(MEMBERSHIPS, membership).await?)
    }

    /// The role `user_id` holds in `organization_id`, if any.
    pub async fn role_of(
        &self,
        organization_id: &str,
        user_id: &str,
    ) -> Result<Option<Role>, AuthError> {
        let membership: Option<Membership> = self
            .storage
            .get(MEMBERSHIPS, &membership_id(organization_id, user_id))
            .await?;
        Ok(membership.map(|m| m.role))
    }

    /// Check whether `user_id` may perform `action` within
    /// `organization_id`. This is the primitive every other service should
    /// call — "who is this and may they do X" — rather than re-implementing
    /// role checks against [`Membership`] directly.
    pub async fn authorize(
        &self,
        organization_id: &str,
        user_id: &str,
        action: Action,
    ) -> Result<(), AuthError> {
        match self.role_of(organization_id, user_id).await? {
            None => Err(AuthError::NotAMember {
                user_id: user_id.to_string(),
                organization_id: organization_id.to_string(),
            }),
            Some(role) if role.permits(action) => Ok(()),
            Some(_) => Err(AuthError::Unauthorized {
                user_id: user_id.to_string(),
                organization_id: organization_id.to_string(),
                action,
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::MemoryStorageAdapter;

    fn service() -> AuthService<MemoryStorageAdapter> {
        AuthService::new(MemoryStorageAdapter::new())
    }

    #[tokio::test]
    async fn registers_and_authenticates_a_user() {
        let auth = service();
        let user = auth
            .register("Amaya Okonkwo", "amaya@city.gov", "correct horse battery")
            .await
            .unwrap();
        assert_eq!(user.email, "amaya@city.gov");
        assert_ne!(user.password_hash, "correct horse battery");

        let authenticated = auth
            .authenticate("amaya@city.gov", "correct horse battery")
            .await
            .unwrap();
        assert_eq!(authenticated.id, user.id);
    }

    #[tokio::test]
    async fn rejects_duplicate_email_registration() {
        let auth = service();
        auth.register("Amaya", "amaya@city.gov", "pw12345678").await.unwrap();
        let err = auth
            .register("Someone Else", "AMAYA@CITY.GOV", "different-pw")
            .await
            .unwrap_err();
        assert!(matches!(err, AuthError::EmailAlreadyRegistered(_)));
    }

    #[tokio::test]
    async fn rejects_wrong_password_and_unknown_email_identically() {
        let auth = service();
        auth.register("Amaya", "amaya@city.gov", "pw12345678").await.unwrap();

        let wrong_password = auth.authenticate("amaya@city.gov", "nope").await.unwrap_err();
        let unknown_email = auth
            .authenticate("nobody@nowhere.dev", "nope")
            .await
            .unwrap_err();
        assert!(matches!(wrong_password, AuthError::InvalidCredentials));
        assert!(matches!(unknown_email, AuthError::InvalidCredentials));
    }

    #[tokio::test]
    async fn creating_an_organization_grants_the_owner_role() {
        let auth = service();
        let owner = auth.register("Owner", "owner@thoth.dev", "pw12345678").await.unwrap();
        let org = auth.create_organization("Riverside Studio", &owner.id).await.unwrap();

        let role = auth.role_of(&org.id, &owner.id).await.unwrap();
        assert_eq!(role, Some(Role::Owner));
        auth.authorize(&org.id, &owner.id, Action::ManageMembers)
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn organization_creation_requires_an_existing_owner() {
        let auth = service();
        let err = auth
            .create_organization("Ghost Org", "user_does_not_exist")
            .await
            .unwrap_err();
        assert!(matches!(err, AuthError::UserNotFound(_)));
    }

    #[tokio::test]
    async fn non_members_are_unauthorized() {
        let auth = service();
        let owner = auth.register("Owner", "owner@thoth.dev", "pw12345678").await.unwrap();
        let stranger = auth
            .register("Stranger", "stranger@thoth.dev", "pw12345678")
            .await
            .unwrap();
        let org = auth.create_organization("Riverside Studio", &owner.id).await.unwrap();

        let err = auth.authorize(&org.id, &stranger.id, Action::View).await.unwrap_err();
        assert!(matches!(err, AuthError::NotAMember { .. }));
    }

    #[tokio::test]
    async fn viewers_cannot_edit() {
        let auth = service();
        let owner = auth.register("Owner", "owner@thoth.dev", "pw12345678").await.unwrap();
        let viewer = auth
            .register("Viewer", "viewer@thoth.dev", "pw12345678")
            .await
            .unwrap();
        let org = auth.create_organization("Riverside Studio", &owner.id).await.unwrap();
        auth.add_member(&org.id, &viewer.id, Role::Viewer).await.unwrap();

        auth.authorize(&org.id, &viewer.id, Action::View).await.unwrap();
        let err = auth.authorize(&org.id, &viewer.id, Action::Edit).await.unwrap_err();
        assert!(matches!(err, AuthError::Unauthorized { .. }));
    }

    #[tokio::test]
    async fn add_member_replaces_an_existing_role_rather_than_duplicating() {
        let auth = service();
        let owner = auth.register("Owner", "owner@thoth.dev", "pw12345678").await.unwrap();
        let member = auth
            .register("Member", "member@thoth.dev", "pw12345678")
            .await
            .unwrap();
        let org = auth.create_organization("Riverside Studio", &owner.id).await.unwrap();

        auth.add_member(&org.id, &member.id, Role::Viewer).await.unwrap();
        auth.add_member(&org.id, &member.id, Role::Editor).await.unwrap();

        assert_eq!(auth.role_of(&org.id, &member.id).await.unwrap(), Some(Role::Editor));
    }

    #[tokio::test]
    async fn creates_a_team_within_an_organization() {
        let auth = service();
        let owner = auth.register("Owner", "owner@thoth.dev", "pw12345678").await.unwrap();
        let org = auth.create_organization("Riverside Studio", &owner.id).await.unwrap();
        let team = auth.create_team(&org.id, "Civil").await.unwrap();
        assert_eq!(team.organization_id, org.id);
        assert_eq!(team.name, "Civil");
    }

    #[tokio::test]
    async fn team_creation_requires_an_existing_organization() {
        let auth = service();
        let err = auth.create_team("org_does_not_exist", "Civil").await.unwrap_err();
        assert!(matches!(err, AuthError::OrganizationNotFound(_)));
    }
}
