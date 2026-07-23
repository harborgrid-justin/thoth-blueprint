//! The typed error surface for every stormwater hydrology/hydraulics
//! computation in this crate.
//!
//! Mirrors the philosophy of `thoth_civil::error::CivilError`: a **valid
//! empty result** (e.g. "this storm produces no runoff") is not an error and
//! is represented with `Option`/`0.0` in the relevant return type, but
//! degenerate or out-of-range caller input — a negative drainage area, a
//! curve number outside the empirical range the SCS method was fit to, a
//! rainfall depth that would drive potential retention negative, a
//! non-monotonic stage-storage curve — is a caller error and is always
//! returned as `Err(HydrologyError)`, never a silent `NaN`/panic.

use thiserror::Error;

/// Every way a stormwater hydrology/hydraulics computation in this crate can
/// fail on caller-supplied input.
#[derive(Debug, Clone, PartialEq, Error)]
pub enum HydrologyError {
    /// A drainage/catchment area must be a positive quantity to carry a peak
    /// flow computation (Rational Method, TR-55, WQv, ...).
    #[error("drainage area must be positive, got {area} acres")]
    NonPositiveArea { area: f64 },

    /// The Rational Method runoff coefficient `C` is dimensionless and must
    /// lie within `[0, 1]` (it is a fraction of rainfall that becomes runoff).
    #[error("runoff coefficient C must be within [0, 1], got {c}")]
    RunoffCoefficientOutOfRange { c: f64 },

    /// A rainfall intensity or depth cannot be negative.
    #[error("rainfall intensity must be non-negative, got {intensity} in/hr")]
    NegativeIntensity { intensity: f64 },

    /// A rainfall depth cannot be negative.
    #[error("rainfall depth must be non-negative, got {depth} in")]
    NegativeRainfallDepth { depth: f64 },

    /// TR-55's curve-number method (NEH Ch. 10 / TR-55 Ch. 2) was empirically
    /// fit to curve numbers between roughly 30 (undeveloped, high-infiltration
    /// soils) and 100 (fully impervious); outside that range `S = 1000/CN -
    /// 10` becomes physically meaningless.
    #[error("curve number must be within [30, 100], got {cn}")]
    CurveNumberOutOfRange { cn: f64 },

    /// The SCS runoff equation `Q = (P - 0.2S)^2 / (P + 0.8S)` requires
    /// `P > 0.2S` (the initial abstraction); below that, published runoff is
    /// zero, not negative, and callers should treat a `NonPositive` return
    /// as "no runoff" rather than force the equation to evaluate.
    #[error(
        "rainfall depth P={p} in does not exceed the initial abstraction \
         0.2S={abstraction} in (S={s} in derived from CN); runoff is zero, not negative"
    )]
    RainfallBelowInitialAbstraction { p: f64, s: f64, abstraction: f64 },

    /// A time of concentration, travel time, or routing period must be
    /// strictly positive.
    #[error("time of concentration must be positive, got {tc} hours")]
    NonPositiveTimeOfConcentration { tc: f64 },

    /// A flow-path length must be strictly positive.
    #[error("flow length must be positive, got {length} ft")]
    NonPositiveLength { length: f64 },

    /// A land-surface or channel slope must be strictly positive (TR-55's
    /// sheet-flow and shallow-concentrated-flow equations divide by a power
    /// of slope and are undefined at `s = 0`).
    #[error("slope must be positive, got {slope} ft/ft")]
    NonPositiveSlope { slope: f64 },

    /// TR-55 (Ch. 3) limits the sheet-flow segment to at most 100 ft before
    /// flow is assumed to have concentrated into rills/gullies; beyond that
    /// the kinematic-wave sheet-flow equation over-predicts travel time.
    #[error(
        "sheet flow length {length} ft exceeds the TR-55 maximum of {max} ft \
         (flow concentrates into rills beyond this distance)"
    )]
    SheetFlowLengthExceeded { length: f64, max: f64 },

    /// A Manning's roughness coefficient must be strictly positive.
    #[error("Manning's roughness coefficient n must be positive, got {n}")]
    NonPositiveManningN { n: f64 },

    /// A hydraulic radius must be strictly positive to evaluate Manning's
    /// equation.
    #[error("hydraulic radius must be positive, got {r} ft")]
    NonPositiveHydraulicRadius { r: f64 },

    /// A stage-storage or stage-discharge curve used for reservoir/pond
    /// routing (the Puls method) must have strictly increasing stage,
    /// storage, and discharge — routing solves for storage as a function of
    /// stage and requires the mapping to be invertible.
    #[error(
        "stage-storage/discharge curve must be strictly increasing in stage \
         and value; violation between index {index} and {index_next}"
    )]
    NonMonotonicStorageCurve { index: usize, index_next: usize },

    /// Puls routing needs at least two stage/storage/discharge points to
    /// define a curve segment.
    #[error("routing curve needs at least 2 points, got {count}")]
    InsufficientRoutingPoints { count: usize },

    /// An inflow hydrograph must have at least 2 ordinates (one interval) to
    /// route or convolve.
    #[error("hydrograph has {got} ordinate(s); at least 2 are required")]
    HydrographTooShort { got: usize },

    /// A hydrograph/routing time step must be strictly positive.
    #[error("time step must be positive, got {dt}")]
    NonPositiveTimeStep { dt: f64 },

    /// A stage/head/depth against a hydraulic structure cannot be negative.
    #[error("head/depth must be non-negative, got {head} ft")]
    NegativeHead { head: f64 },

    /// A discharge coefficient, weir coefficient, or similar empirical
    /// hydraulic coefficient must be strictly positive.
    #[error("hydraulic coefficient must be positive, got {value}")]
    NonPositiveCoefficient { value: f64 },

    /// A physical dimension (pipe diameter, weir length, orifice area, ...)
    /// must be strictly positive.
    #[error("dimension must be positive, got {value}")]
    NonPositiveDimension { value: f64 },

    /// An angle (e.g. a V-notch weir's notch angle) must lie within an open
    /// interval of `(0, pi)` radians.
    #[error("angle must be within (0, pi) radians, got {radians}")]
    AngleOutOfRange { radians: f64 },

    /// An iterative solver (e.g. normal/critical-depth or headwater search)
    /// failed to converge within its iteration budget.
    #[error("{solver} did not converge within {iterations} iterations")]
    ConvergenceFailure {
        solver: &'static str,
        iterations: u32,
    },

    /// A fraction (imperviousness, porosity, void ratio, ...) must lie
    /// within `[0, 1]`.
    #[error("fraction must be within [0, 1], got {value}")]
    FractionOutOfRange { value: f64 },

    /// Two grids/curves that must share a common shape (e.g. a
    /// stage-storage curve and a stage-discharge curve routed together)
    /// disagree.
    #[error("shape mismatch: {reason}")]
    ShapeMismatch { reason: String },

    /// The pipe network supplied to an HGL/EGL computation is missing
    /// information the computation needs (an outfall node, a flow rate for
    /// a pipe, ...).
    #[error("pipe network error: {reason}")]
    Network { reason: String },
}

/// Convenience alias used throughout this crate.
pub type HydroResult<T> = Result<T, HydrologyError>;
