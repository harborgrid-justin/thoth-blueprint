//! Error type for `@thoth/service-projects`.

use thiserror::Error;

use crate::storage::StorageError;

/// Everything that can go wrong in project lifecycle, checkpoint, and
/// review-thread operations. Variant names correspond to the HTTP status a
/// future transport layer would map them to (`NotFound` -> 404,
/// `InvalidInput` -> 400).
#[derive(Debug, Error)]
pub enum ProjectsError {
    #[error("project not found: {0}")]
    ProjectNotFound(String),

    #[error("checkpoint not found: {0}")]
    CheckpointNotFound(String),

    #[error("review thread not found: {0}")]
    ThreadNotFound(String),

    #[error("missing required field: {0}")]
    MissingField(&'static str),

    #[error("invalid mode \"{0}\": must be \"samples\" or \"empty\"")]
    InvalidResetMode(String),

    #[error(transparent)]
    Storage(#[from] StorageError),
}
