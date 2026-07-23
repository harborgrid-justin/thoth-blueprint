//! `GovernanceError` — the single error type every fallible operation in this
//! crate returns. No module panics or unwraps on caller-supplied data; every
//! invalid rule parameter, illegal workflow transition, expired/revoked
//! share token, or storage failure surfaces here as a typed, matchable
//! variant.

use thiserror::Error;

use crate::redline::ThreadStatus;
use crate::sharing::ShareAccessLevel;
use crate::will_serve::WillServeStatus;

/// Everything that can go wrong in `thoth-governance`.
#[derive(Debug, Error)]
pub enum GovernanceError {
    /// A rule (or rule set) was constructed with a parameter that can never
    /// evaluate sensibly (e.g. a negative minimum lot area, a coverage ratio
    /// above 1.0).
    #[error("invalid rule parameter for rule \"{rule}\": {reason}")]
    InvalidRuleParameter { rule: String, reason: String },

    /// A [`crate::rules::RuleSet`] was registered whose `jurisdiction_id`
    /// collides with one already present in the
    /// [`crate::rules::JurisdictionRuleRegistry`].
    #[error("a rule set is already registered for jurisdiction \"{0}\"")]
    DuplicateJurisdiction(String),

    /// A [`thoth_planning::Site`] was evaluated for compliance but carries no
    /// `jurisdiction_id`, so no rule set can be selected for it.
    #[error("site \"{0}\" has no jurisdiction_id assigned; cannot select a rule set")]
    NoJurisdictionAssigned(String),

    /// A site's `jurisdiction_id` doesn't match any registered rule set.
    #[error("no rule set is registered for jurisdiction \"{0}\"")]
    UnknownJurisdiction(String),

    /// A redline thread id did not resolve to a stored thread.
    #[error("redline thread \"{0}\" not found")]
    ThreadNotFound(String),

    /// A comment body was empty (or all whitespace).
    #[error("a redline comment body cannot be empty")]
    EmptyCommentBody,

    /// A redline thread state transition isn't reachable from its current
    /// state (see [`crate::redline::RedlineThread::transition`]'s docs for
    /// the full transition table).
    #[error("redline thread \"{thread_id}\" cannot move from {from:?} to {to:?}")]
    InvalidThreadTransition {
        thread_id: String,
        from: ThreadStatus,
        to: ThreadStatus,
    },

    /// A caller attempted to resolve a thread that is already resolved.
    /// Split out from [`GovernanceError::InvalidThreadTransition`] because
    /// "resolved twice" is a distinct, common caller mistake worth its own
    /// message (a double-click on a "Resolve" button, not a genuinely
    /// illegal workflow state).
    #[error("redline thread \"{0}\" is already resolved")]
    ThreadAlreadyResolved(String),

    /// A will-serve/utility-capacity request id did not resolve to a stored
    /// request.
    #[error("will-serve request \"{0}\" not found")]
    WillServeRequestNotFound(String),

    /// A requested utility capacity was zero, negative, or otherwise
    /// non-physical.
    #[error("invalid requested capacity {requested}: {reason}")]
    InvalidCapacity { requested: f64, reason: String },

    /// A will-serve request status transition isn't reachable from its
    /// current state.
    #[error("will-serve request \"{request_id}\" cannot move from {from:?} to {to:?}")]
    InvalidWillServeTransition {
        request_id: String,
        from: WillServeStatus,
        to: WillServeStatus,
    },

    /// A share token string did not resolve to a stored token.
    #[error("share token \"{0}\" not found")]
    ShareTokenNotFound(String),

    /// A share token was presented after its `expires_at` had passed.
    #[error("share token \"{0}\" expired")]
    ShareTokenExpired(String),

    /// A share token was presented after having been explicitly revoked.
    #[error("share token \"{0}\" was revoked")]
    ShareTokenRevoked(String),

    /// An access level below what an action requires was used against a
    /// share token (e.g. attempting to comment through a view-only link).
    #[error("share token \"{token}\" ({access:?}) does not permit {action:?}")]
    InsufficientShareAccess {
        token: String,
        access: ShareAccessLevel,
        action: thoth_services::auth::Action,
    },

    /// A read/write against the shared [`thoth_services::storage::StorageAdapter`]
    /// seam failed — every persisted concept in this crate (audit log
    /// entries, redline threads, will-serve requests, share tokens) goes
    /// through that trait, so this variant is how any of those surfaces a
    /// backend failure (e.g. an audit-log write failure).
    #[error("storage operation failed: {0}")]
    Storage(#[from] thoth_services::storage::StorageError),
}
