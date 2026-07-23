//! Native Node boundary over `thoth_services::auth` — identity,
//! organizations/teams, and role-based access control.
//!
//! Wires the real [`AuthService`] (see `crates/thoth-services/src/auth/`,
//! 19 passing tests) to Node for the first time, replacing the TypeScript
//! scaffold that used to live at `services/auth/src/index.ts`
//! (`export const __SCAFFOLD__ = true`).
//!
//! # Backing store: SQLite, not memory
//!
//! `AuthService<A: StorageAdapter>` is generic over its backing store.
//! `services/auth` is a long-lived Node process (or, at minimum, a module
//! whose registered users must survive individual requests) — an
//! in-memory backend would silently discard every registered user on
//! restart, which is a correctness footgun for identity data specifically
//! (unlike, say, a presence cache). [`SqliteStorageAdapter`] is therefore
//! the backing store wired here: zero extra infrastructure (matches
//! `@thoth/storage`'s own default), durable across restarts, and exactly
//! the backend `create_storage()`'s own default already picks for
//! unconfigured deployments — this doesn't introduce a third persistence
//! path, it reuses the platform's existing default one. A production
//! deployment that already runs Postgres can still point `@thoth/storage`
//! at it independently; nothing here forecloses that, it only fixes what
//! *this* binding surface's own auth store defaults to when a caller
//! doesn't hand it a path.
//!
//! # Design: handles, not classes
//!
//! See `crate::registry`'s module docs for why every stateful export here
//! takes an opaque `u32` handle (minted by [`create_client`]) rather than
//! a napi-rs class with `&self` async methods.
//!
//! # Wire types
//!
//! [`AuthUser`] deliberately omits `password_hash` — internal to the
//! service, and a secret with no reason to ever cross into JS. [`Role`] and
//! [`Action`] cross as their lowercase/camelCase string forms (matching
//! `#[serde(rename_all = ...)]` on the Rust types — see
//! `crates/thoth-services/src/auth/types.rs`), validated by
//! [`role_from_str`]/[`action_from_str`] with a descriptive
//! [`Status::InvalidArg`] error on an unrecognized value, never a panic.
//!
//! # Error handling
//!
//! Every `thoth_services::auth::AuthError` is converted to a catchable
//! `napi::Error` via [`crate::registry::to_napi_error`] (message-only — it
//! doesn't need a richer wire shape for this pass). No
//! `unwrap()`/`expect()` on caller-controlled input anywhere in this
//! module.

use std::sync::{Arc, OnceLock};

use napi::bindgen_prelude::{Error, Result, Status};
use napi_derive::napi;

use thoth_services::auth::{Action, AuthService, Membership, Organization, Role, Team, User};
use thoth_services::storage::{SqliteStorageAdapter, SqliteStorageAdapterOptions};

use crate::registry::{handle_not_found, to_napi_error, Registry};

type Client = AuthService<SqliteStorageAdapter>;

fn registry() -> &'static Registry<Client> {
    static REGISTRY: OnceLock<Registry<Client>> = OnceLock::new();
    REGISTRY.get_or_init(Registry::new)
}

fn client(handle: u32) -> Result<Arc<Client>> {
    registry()
        .get(handle)
        .ok_or_else(|| handle_not_found("auth client", handle))
}

fn role_from_str(role: &str) -> Result<Role> {
    match role {
        "viewer" => Ok(Role::Viewer),
        "commenter" => Ok(Role::Commenter),
        "editor" => Ok(Role::Editor),
        "owner" => Ok(Role::Owner),
        other => Err(Error::new(
            Status::InvalidArg,
            format!(
                "unknown role \"{other}\"; expected one of \"viewer\", \"commenter\", \
                 \"editor\", \"owner\""
            ),
        )),
    }
}

fn role_to_str(role: Role) -> String {
    match role {
        Role::Viewer => "viewer",
        Role::Commenter => "commenter",
        Role::Editor => "editor",
        Role::Owner => "owner",
    }
    .to_string()
}

fn action_from_str(action: &str) -> Result<Action> {
    match action {
        "view" => Ok(Action::View),
        "comment" => Ok(Action::Comment),
        "edit" => Ok(Action::Edit),
        "manageMembers" => Ok(Action::ManageMembers),
        "deleteOrganization" => Ok(Action::DeleteOrganization),
        other => Err(Error::new(
            Status::InvalidArg,
            format!(
                "unknown action \"{other}\"; expected one of \"view\", \"comment\", \"edit\", \
                 \"manageMembers\", \"deleteOrganization\""
            ),
        )),
    }
}

/// A registered identity, as returned across the FFI boundary. See the
/// module docs for why `password_hash` is never included here.
#[napi(object)]
#[derive(Debug)]
pub struct AuthUser {
    pub id: String,
    pub name: String,
    pub email: String,
    pub color: String,
}

impl From<User> for AuthUser {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            name: u.name,
            email: u.email,
            color: u.color,
        }
    }
}

/// An organization that owns projects. Mirrors
/// [`thoth_services::auth::Organization`] field-for-field.
#[napi(object)]
pub struct AuthOrganization {
    pub id: String,
    pub name: String,
    pub owner_id: String,
}

impl From<Organization> for AuthOrganization {
    fn from(o: Organization) -> Self {
        Self {
            id: o.id,
            name: o.name,
            owner_id: o.owner_id,
        }
    }
}

/// A named sub-grouping of an organization's members. Mirrors
/// [`thoth_services::auth::Team`] field-for-field.
#[napi(object)]
pub struct AuthTeam {
    pub id: String,
    pub organization_id: String,
    pub name: String,
}

impl From<Team> for AuthTeam {
    fn from(t: Team) -> Self {
        Self {
            id: t.id,
            organization_id: t.organization_id,
            name: t.name,
        }
    }
}

/// A user's role within an organization. `role` is one of `"viewer"`,
/// `"commenter"`, `"editor"`, `"owner"` (see [`role_to_str`]).
#[napi(object)]
pub struct AuthMembership {
    pub id: String,
    pub organization_id: String,
    pub user_id: String,
    pub role: String,
}

impl From<Membership> for AuthMembership {
    fn from(m: Membership) -> Self {
        Self {
            id: m.id,
            organization_id: m.organization_id,
            user_id: m.user_id,
            role: role_to_str(m.role),
        }
    }
}

/// Create a new auth client backed by a SQLite file at `sqlite_file` (use
/// `:memory:` for a non-persistent instance, e.g. in tests). Returns an
/// opaque handle every other `auth*` export below takes as its first
/// argument. Call [`close_client`] to release it.
#[napi(js_name = "authCreateClient")]
pub fn create_client(sqlite_file: String) -> Result<u32> {
    let adapter = SqliteStorageAdapter::new(SqliteStorageAdapterOptions { file: sqlite_file })
        .map_err(to_napi_error)?;
    Ok(registry().insert(AuthService::new(adapter)))
}

/// Release a client's handle. Any calls already in flight on this handle
/// still complete (see [`crate::registry::Registry::remove`]); only new
/// calls with this handle fail afterward.
#[napi(js_name = "authCloseClient")]
pub fn close_client(handle: u32) -> Result<()> {
    registry()
        .remove(handle)
        .map(|_| ())
        .ok_or_else(|| handle_not_found("auth client", handle))
}

/// Register a new user. Rejects with a catchable error if `email` is
/// already registered (case-insensitively) — see
/// [`thoth_services::auth::AuthError::EmailAlreadyRegistered`].
#[napi(js_name = "authRegister")]
pub async fn register(
    handle: u32,
    name: String,
    email: String,
    password: String,
) -> Result<AuthUser> {
    let service = client(handle)?;
    let user = service
        .register(&name, &email, &password)
        .await
        .map_err(to_napi_error)?;
    Ok(user.into())
}

/// Verify credentials and return the matching user. Fails uniformly
/// (see [`thoth_services::auth::AuthError::InvalidCredentials`]) whether the email is unknown or
/// the password is wrong.
#[napi(js_name = "authAuthenticate")]
pub async fn authenticate(handle: u32, email: String, password: String) -> Result<AuthUser> {
    let service = client(handle)?;
    let user = service
        .authenticate(&email, &password)
        .await
        .map_err(to_napi_error)?;
    Ok(user.into())
}

/// Look up a user by id.
#[napi(js_name = "authGetUser")]
pub async fn get_user(handle: u32, user_id: String) -> Result<AuthUser> {
    let service = client(handle)?;
    let user = service.get_user(&user_id).await.map_err(to_napi_error)?;
    Ok(user.into())
}

/// Create an organization owned by `owner_id`, who is granted an implicit
/// `"owner"` membership.
#[napi(js_name = "authCreateOrganization")]
pub async fn create_organization(
    handle: u32,
    name: String,
    owner_id: String,
) -> Result<AuthOrganization> {
    let service = client(handle)?;
    let organization = service
        .create_organization(&name, &owner_id)
        .await
        .map_err(to_napi_error)?;
    Ok(organization.into())
}

/// Look up an organization by id.
#[napi(js_name = "authGetOrganization")]
pub async fn get_organization(handle: u32, organization_id: String) -> Result<AuthOrganization> {
    let service = client(handle)?;
    let organization = service
        .get_organization(&organization_id)
        .await
        .map_err(to_napi_error)?;
    Ok(organization.into())
}

/// Create a team within an organization.
#[napi(js_name = "authCreateTeam")]
pub async fn create_team(handle: u32, organization_id: String, name: String) -> Result<AuthTeam> {
    let service = client(handle)?;
    let team = service
        .create_team(&organization_id, &name)
        .await
        .map_err(to_napi_error)?;
    Ok(team.into())
}

/// Grant (or change) `user_id`'s role within `organization_id`. `role` is
/// one of `"viewer"`, `"commenter"`, `"editor"`, `"owner"`.
#[napi(js_name = "authAddMember")]
pub async fn add_member(
    handle: u32,
    organization_id: String,
    user_id: String,
    role: String,
) -> Result<AuthMembership> {
    let service = client(handle)?;
    let role = role_from_str(&role)?;
    let membership = service
        .add_member(&organization_id, &user_id, role)
        .await
        .map_err(to_napi_error)?;
    Ok(membership.into())
}

/// The role `user_id` holds in `organization_id`, or `null` if they aren't a
/// member.
#[napi(js_name = "authRoleOf")]
pub async fn role_of(
    handle: u32,
    organization_id: String,
    user_id: String,
) -> Result<Option<String>> {
    let service = client(handle)?;
    let role = service
        .role_of(&organization_id, &user_id)
        .await
        .map_err(to_napi_error)?;
    Ok(role.map(role_to_str))
}

/// Check whether `user_id` may perform `action` (one of `"view"`,
/// `"comment"`, `"edit"`, `"manageMembers"`, `"deleteOrganization"`) within
/// `organization_id`. Resolves if authorized; rejects with a catchable
/// error otherwise — callers should treat *any* rejection as "not
/// authorized" and needn't branch on the error's shape.
#[napi(js_name = "authAuthorize")]
pub async fn authorize(
    handle: u32,
    organization_id: String,
    user_id: String,
    action: String,
) -> Result<()> {
    let service = client(handle)?;
    let action = action_from_str(&action)?;
    service
        .authorize(&organization_id, &user_id, action)
        .await
        .map_err(to_napi_error)
}

#[cfg(test)]
mod tests {
    //! `#[napi] async fn` exports above can't be called directly from a
    //! plain `#[tokio::test]` (napi's own "tokio_rt" runtime drives those),
    //! so these tests exercise the same registry + conversion logic they're
    //! built from directly against `thoth_services::auth`, the same
    //! division of labor `crates/thoth-napi/src/lib.rs`'s pre-existing
    //! geometry tests use (host-target-testable Rust logic vs. a real N-API
    //! environment, which needs Node — see `scripts/smoke-test-napi.mjs`
    //! and this crate's TS-level Vitest coverage for the latter).
    use super::*;

    fn service() -> Client {
        AuthService::new(
            SqliteStorageAdapter::new(SqliteStorageAdapterOptions {
                file: ":memory:".to_string(),
            })
            .unwrap(),
        )
    }

    #[test]
    fn role_round_trips_through_its_wire_string() {
        for role in [Role::Viewer, Role::Commenter, Role::Editor, Role::Owner] {
            assert_eq!(role_from_str(&role_to_str(role)).unwrap(), role);
        }
    }

    #[test]
    fn role_from_str_rejects_an_unknown_role() {
        let err = role_from_str("superuser").unwrap_err();
        assert_eq!(err.status, Status::InvalidArg);
    }

    #[test]
    fn action_from_str_accepts_every_documented_action_and_rejects_others() {
        for (wire, expected) in [
            ("view", Action::View),
            ("comment", Action::Comment),
            ("edit", Action::Edit),
            ("manageMembers", Action::ManageMembers),
            ("deleteOrganization", Action::DeleteOrganization),
        ] {
            assert_eq!(action_from_str(wire).unwrap(), expected);
        }
        assert_eq!(
            action_from_str("destroyEverything").unwrap_err().status,
            Status::InvalidArg
        );
    }

    #[tokio::test]
    async fn registers_authenticates_and_authorizes_through_a_registry_handle() {
        let handle = registry().insert(service());

        let owner = register(
            handle,
            "Amaya".to_string(),
            "amaya@city.gov".to_string(),
            "correct horse battery".to_string(),
        )
        .await
        .unwrap();
        assert_eq!(owner.email, "amaya@city.gov");

        let authenticated = authenticate(
            handle,
            "amaya@city.gov".to_string(),
            "correct horse battery".to_string(),
        )
        .await
        .unwrap();
        assert_eq!(authenticated.id, owner.id);

        let org = create_organization(handle, "Riverside Studio".to_string(), owner.id.clone())
            .await
            .unwrap();
        assert_eq!(
            role_of(handle, org.id.clone(), owner.id.clone())
                .await
                .unwrap(),
            Some("owner".to_string())
        );
        authorize(
            handle,
            org.id.clone(),
            owner.id.clone(),
            "manageMembers".to_string(),
        )
        .await
        .unwrap();

        let team = create_team(handle, org.id.clone(), "Civil".to_string())
            .await
            .unwrap();
        assert_eq!(team.organization_id, org.id);

        registry().remove(handle);
    }

    #[tokio::test]
    async fn a_stale_handle_after_close_reports_a_clear_error_not_a_panic() {
        let handle = registry().insert(service());
        close_client(handle).unwrap();

        let err = register(
            handle,
            "Ghost".to_string(),
            "ghost@nowhere.dev".to_string(),
            "pw12345678".to_string(),
        )
        .await
        .unwrap_err();
        assert_eq!(err.status, Status::InvalidArg);
    }

    #[tokio::test]
    async fn viewers_are_denied_edit_through_the_full_handle_based_flow() {
        let handle = registry().insert(service());
        let owner = register(
            handle,
            "Owner".to_string(),
            "owner@thoth.dev".to_string(),
            "pw12345678".to_string(),
        )
        .await
        .unwrap();
        let viewer = register(
            handle,
            "Viewer".to_string(),
            "viewer@thoth.dev".to_string(),
            "pw12345678".to_string(),
        )
        .await
        .unwrap();
        let org = create_organization(handle, "Riverside Studio".to_string(), owner.id.clone())
            .await
            .unwrap();
        add_member(
            handle,
            org.id.clone(),
            viewer.id.clone(),
            "viewer".to_string(),
        )
        .await
        .unwrap();

        authorize(
            handle,
            org.id.clone(),
            viewer.id.clone(),
            "view".to_string(),
        )
        .await
        .unwrap();
        let err = authorize(
            handle,
            org.id.clone(),
            viewer.id.clone(),
            "edit".to_string(),
        )
        .await
        .unwrap_err();
        assert_eq!(err.status, Status::GenericFailure);

        registry().remove(handle);
    }
}
