//! Plat-set helpers that aggregate across a whole `Site`: the consolidated
//! curve-data table a recorded plat carries (every circular curve — boundary
//! arcs and alignment curves — labeled C1...Cn), independent of which
//! element or baseline they came from.
//!
//! Port of `packages/domain/src/drawing/platset.ts`.
//!
//! ## Scope note
//!
//! Only the [`SiteCurve`] data type is ported here. The aggregation function
//! itself (`collectSiteCurves` in the TS source) walks a `Site`'s elements
//! and alignments — types owned by `thoth-planning`, `thoth-survey`, and
//! `thoth-civil`, none of which `thoth-drawing` depends on — calling
//! `surveyReport`, `resolveAlignment`, `azimuthToBearing`, and
//! `formatBearing` along the way. That aggregation is `not-yet-ported`; see
//! `STATUS.md`. Once those crates are wired in as dependencies, port
//! `collect_site_curves` here, unchanged in shape from the TS original.

/// One row of the consolidated curve-data table.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct SiteCurve {
    pub label: String,
    /// The element or alignment the curve belongs to.
    pub source: String,
    pub radius: f64,
    pub arc_length: f64,
    /// Central (delta) angle, decimal degrees.
    pub delta_deg: f64,
    pub chord: f64,
    /// Long-chord bearing, quadrant text.
    pub chord_bearing: String,
    pub tangent: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub direction: Option<CurveDirection>,
}

/// The turning direction of a circular curve.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CurveDirection {
    Left,
    Right,
}
