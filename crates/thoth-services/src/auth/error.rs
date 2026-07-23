//! Error type for `@thoth/service-auth`.

use thiserror::Error;

use super::Action;
use crate::storage::StorageError;

/// Everything that can go wrong in identity, membership, and access-control
/// operations.
#[derive(Debug, Error)]
pub enum AuthError {
    /// Registration was attempted with an email already on file.
    #[error("an account with email \"{0}\" is already registered")]
    EmailAlreadyRegistered(String),

    /// Sign-in failed. Deliberately doesn't distinguish "no such user" from
    /// "wrong password" — that distinction is a user-enumeration
    /// vulnerability, not useful feedback.
    #[error("invalid email or password")]
    InvalidCredentials,

    /// A referenced user id doesn't exist.
    #[error("user not found: {0}")]
    UserNotFound(String),

    /// A referenced organization id doesn't exist.
    #[error("organization not found: {0}")]
    OrganizationNotFound(String),

    /// A referenced team id doesn't exist.
    #[error("team not found: {0}")]
    TeamNotFound(String),

    /// The caller's role in the organization doesn't permit the attempted
    /// action.
    #[error("user {user_id} is not authorized to perform {action:?} in organization {organization_id}")]
    Unauthorized {
        user_id: String,
        organization_id: String,
        action: Action,
    },

    /// The caller has no membership in the organization at all.
    #[error("user {user_id} is not a member of organization {organization_id}")]
    NotAMember {
        user_id: String,
        organization_id: String,
    },

    /// Argon2 password hashing or verification failed (malformed hash,
    /// unsupported parameters) — distinct from [`AuthError::InvalidCredentials`],
    /// which is a *correct* hash that simply didn't match.
    #[error("password hashing failed: {0}")]
    PasswordHash(String),

    /// A storage operation failed.
    #[error(transparent)]
    Storage(#[from] StorageError),
}
