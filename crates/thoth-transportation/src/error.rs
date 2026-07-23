//! The typed error surface for every transportation/traffic-engineering
//! computation in this crate.
//!
//! Follows the same philosophy as `thoth_civil::error::CivilError`: a
//! **valid empty/no-result** case (an interpolation that legitimately has
//! nothing to return) stays `Option`; caller-supplied input that is
//! physically or procedurally invalid for the AASHTO/MUTCD/ITE method being
//! applied becomes an `Err(TransportationError)` — never a bare
//! `panic!`/`unwrap()`.

use thiserror::Error;

/// Every way a transportation-engineering computation in this crate can fail
/// on caller-supplied input.
#[derive(Debug, Clone, PartialEq, Error)]
pub enum TransportationError {
    /// A design speed fell outside the range the invoked AASHTO table or
    /// formula is tabulated/validated for.
    #[error("design speed {speed} mph is outside the tabulated AASHTO range [{min}, {max}] mph")]
    DesignSpeedOutOfRange { speed: f64, min: f64, max: f64 },

    /// A quantity that must be strictly positive (a sight distance, a
    /// radius, a curve length, a wheelbase, a step count, a unit count …)
    /// was zero or negative.
    #[error("{field} must be positive, got {value}")]
    NonPositiveValue { field: &'static str, value: f64 },

    /// A traffic volume input was negative.
    #[error("volume '{field}' cannot be negative, got {value}")]
    NegativeVolume { field: &'static str, value: f64 },

    /// A horizontal curve's radius is below the absolute physical minimum
    /// radius derivable from `e_max` and the maximum tabulated side-friction
    /// factor at its design speed — no superelevation/friction combination
    /// makes this curve safe at this speed.
    #[error(
        "curve radius {radius} ft is below the AASHTO absolute minimum {absolute_minimum} ft for this design speed and e_max"
    )]
    RadiusBelowAbsoluteMinimum { radius: f64, absolute_minimum: f64 },

    /// A required superelevation rate exceeds the policy's `e_max`: the
    /// curve cannot be made compliant by superelevation alone at this
    /// design speed without increasing the radius.
    #[error(
        "required superelevation {required:.4} exceeds policy e_max {e_max:.4} for radius {radius} ft at {design_speed} mph"
    )]
    ExceedsMaximumSuperelevation {
        required: f64,
        e_max: f64,
        radius: f64,
        design_speed: f64,
    },

    /// A vehicle swept-path simulation was asked to follow a path curve
    /// tighter than the design vehicle's own minimum turning radius — no
    /// physically realizable steering path exists.
    #[error(
        "path radius {path_radius} ft is tighter than {vehicle}'s minimum turning radius {vehicle_min_radius} ft"
    )]
    CurveTighterThanVehicleMinimum {
        path_radius: f64,
        vehicle_min_radius: f64,
        vehicle: String,
    },

    /// A path supplied to a simulation or sampling routine doesn't have
    /// enough distinct points to define a direction of travel.
    #[error("path needs at least 2 points to define a direction of travel, got {count}")]
    DegeneratePath { count: usize },

    /// A tractrix-chain link length (an axle-to-hitch wheelbase segment)
    /// must be positive; zero or negative collapses the model.
    #[error("tractrix link length must be positive, got {value}")]
    NonPositiveLinkLength { value: f64 },

    /// An intersection/roundabout approach count is outside the range the
    /// invoked design guidance covers.
    #[error("approach count {count} is outside the supported range [{min}, {max}]")]
    ApproachCountOutOfRange { count: u8, min: u8, max: u8 },

    /// An iterative solver (fixed-point side-friction convergence, an
    /// AASHTO 1993 structural-number bisection, …) failed to converge
    /// within its iteration budget.
    #[error("{solver} did not converge within {iterations} iterations")]
    ConvergenceFailure {
        solver: &'static str,
        iterations: u32,
    },

    /// Reliability (as a probability in (0, 1)) supplied to the AASHTO 1993
    /// pavement design equation was outside the valid open interval.
    #[error("reliability must be strictly between 0 and 1, got {value}")]
    InvalidReliability { value: f64 },

    /// Resolving the underlying `thoth_civil` alignment failed; wrapped so
    /// callers of this crate's convenience wrappers (that accept an
    /// unresolved `HorizontalAlignment`) get a single error type.
    #[error("underlying alignment could not be resolved: {0}")]
    AlignmentResolutionFailed(#[from] thoth_civil::CivilError),
}

/// Convenience alias used throughout this crate.
pub type TransportationResult<T> = Result<T, TransportationError>;
