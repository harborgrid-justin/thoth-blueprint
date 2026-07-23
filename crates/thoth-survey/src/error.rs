//! Typed errors for the survey domain.
//!
//! Every fallible operation in this crate returns `Result<T, SurveyError>` —
//! never a bare `panic!`/`unwrap()` on data that can come from a caller
//! (malformed bearing text, an out-of-range PLSS designation, an
//! under-specified transparent command). This is the Rust replacement for
//! the ad hoc `throw new Error(...)` calls and the unused
//! `common/result.ts` `Result<T, E>` wrapper in the TypeScript original —
//! `std::result::Result` plus a real error enum is the idiomatic form, so
//! `common/result.ts` itself has no direct port (see `../STATUS.md`).

use thiserror::Error;

use crate::transparent_commands::TransparentCommandType;

/// Every way a survey-domain computation can fail on caller-supplied data.
#[derive(Debug, Clone, PartialEq, Error)]
pub enum SurveyError {
    /// A quadrant bearing string didn't match any recognized format
    /// (cardinal word, or `N##°##'##"E`-style pattern). Mirrors
    /// `parseBearing`'s `Invalid quadrant bearing format: ${text}`.
    #[error("invalid quadrant bearing format: {0}")]
    InvalidBearingFormat(String),

    /// A quadrant bearing's angle magnitude was outside `[0, 90]` degrees.
    /// Mirrors `parseBearing`'s `Angle value must be between 0 and 90
    /// degrees: ${text}`.
    #[error("angle value must be between 0 and 90 degrees: {0}")]
    BearingAngleOutOfRange(String),

    /// A PLSS township number outside the valid `>= 1` range.
    #[error("township must be 1 or greater, got {0}")]
    InvalidTownship(i32),

    /// A PLSS range number outside the valid `>= 1` range.
    #[error("range must be 1 or greater, got {0}")]
    InvalidRange(i32),

    /// A PLSS section number outside the valid `1..=36` range (sections are
    /// numbered 1 through 36 within a township; 0 and 37 are impossible
    /// targets).
    #[error("section must be between 1 and 36, got {0}")]
    InvalidSection(i32),

    /// A transparent command input didn't specify which command to run.
    #[error("transparent command input must specify a command")]
    MissingCommand,

    /// A transparent command was missing one of the fields it requires.
    #[error("{command:?} requires {requirement}")]
    MissingTransparentCommandInput {
        command: TransparentCommandType,
        requirement: &'static str,
    },

    /// A `PN`/`PNAME`/`PO`/`ZE` transparent command referenced a point
    /// number absent from the supplied point map.
    #[error("point {0} not found")]
    PointNotFound(i64),
}
