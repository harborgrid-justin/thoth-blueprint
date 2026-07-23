//! SCS/NRCS TR-55 curve-number runoff: CN lookup by land use + hydrologic
//! soil group, runoff depth, and the dimensionless unit hydrograph.
//!
//! Source: USDA NRCS *Urban Hydrology for Small Watersheds*, TR-55 (2nd ed.,
//! June 1986), Chapter 2 (runoff) and the underlying National Engineering
//! Handbook, Section 4 (NEH-4) dimensionless unit hydrograph.
//!
//! # Assumptions and valid range
//! - The curve-number method assumes `Ia = 0.2S` (the standard TR-55/NEH-4
//!   initial-abstraction ratio); the newer NEH-630 `Ia = 0.05S` variant is
//!   not implemented here.
//! - CN lookup values below are a representative subset of TR-55 Table
//!   2-2a ("Runoff curve numbers for urban areas") — common land uses and
//!   hydrologic soil groups, not the full table (agricultural/pasture CNs
//!   from Table 2-2b are out of scope for a site/community planning tool).
//! - The dimensionless unit hydrograph assumes a **single, homogeneous
//!   sub-basin** with one CN and one time of concentration; a composite
//!   watershed with materially different sub-area CNs should be modeled as
//!   separate sub-basins whose hydrographs are added (or routed) rather
//!   than folded into one area-weighted CN — TR-55 Ch. 2 recommends this
//!   when sub-area CNs vary by more than about 5.

use crate::error::{HydroResult, HydrologyError};

/// A hydrologic soil group (NRCS soil survey classification), driving how
/// readily a soil infiltrates rainfall. `A` drains best (low runoff
/// potential), `D` drains worst (high runoff potential).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum HydrologicSoilGroup {
    A,
    B,
    C,
    D,
}

/// Ground-cover condition for open space (TR-55 Table 2-2a distinguishes CN
/// by how much of the ground is covered in grass).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum CoverCondition {
    /// Grass cover on 50% or less of the area.
    Poor,
    /// Grass cover on 50% to 75% of the area.
    Fair,
    /// Grass cover on 75% or more of the area.
    Good,
}

/// A representative subset of TR-55 Table 2-2a's urban land uses.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum UrbanLandUse {
    /// Open space: lawns, parks, golf courses, cemeteries.
    OpenSpace(CoverCondition),
    /// Impervious surfaces: paved parking lots, roofs, driveways, and paved
    /// streets/roads with curbs and storm sewers.
    Impervious,
    /// Gravel streets/roads (including right-of-way).
    GravelRoad,
    /// Dirt streets/roads (including right-of-way).
    DirtRoad,
    /// Commercial and business districts (~85% impervious).
    CommercialAndBusiness,
    /// Industrial districts (~72% impervious).
    Industrial,
    /// Residential, 1/8-acre average lot (town houses, ~65% impervious).
    ResidentialEighthAcreLot,
    /// Residential, 1/4-acre average lot (~38% impervious).
    ResidentialQuarterAcreLot,
    /// Residential, 1/3-acre average lot (~30% impervious).
    ResidentialThirdAcreLot,
    /// Residential, 1/2-acre average lot (~25% impervious).
    ResidentialHalfAcreLot,
    /// Residential, 1-acre average lot (~20% impervious).
    ResidentialOneAcreLot,
    /// Residential, 2-acre average lot (~12% impervious).
    ResidentialTwoAcreLot,
    /// Newly graded pervious areas with no vegetation established yet.
    NewlyGradedPervious,
}

impl UrbanLandUse {
    /// TR-55 Table 2-2a curve number for this land use and hydrologic soil
    /// group.
    pub const fn curve_number(self, hsg: HydrologicSoilGroup) -> f64 {
        use HydrologicSoilGroup::*;
        use UrbanLandUse::*;
        match (self, hsg) {
            (OpenSpace(CoverCondition::Poor), A) => 68.0,
            (OpenSpace(CoverCondition::Poor), B) => 79.0,
            (OpenSpace(CoverCondition::Poor), C) => 86.0,
            (OpenSpace(CoverCondition::Poor), D) => 89.0,
            (OpenSpace(CoverCondition::Fair), A) => 49.0,
            (OpenSpace(CoverCondition::Fair), B) => 69.0,
            (OpenSpace(CoverCondition::Fair), C) => 79.0,
            (OpenSpace(CoverCondition::Fair), D) => 84.0,
            (OpenSpace(CoverCondition::Good), A) => 39.0,
            (OpenSpace(CoverCondition::Good), B) => 61.0,
            (OpenSpace(CoverCondition::Good), C) => 74.0,
            (OpenSpace(CoverCondition::Good), D) => 80.0,
            (Impervious, _) => 98.0,
            (GravelRoad, A) => 76.0,
            (GravelRoad, B) => 85.0,
            (GravelRoad, C) => 89.0,
            (GravelRoad, D) => 91.0,
            (DirtRoad, A) => 72.0,
            (DirtRoad, B) => 82.0,
            (DirtRoad, C) => 87.0,
            (DirtRoad, D) => 89.0,
            (CommercialAndBusiness, A) => 89.0,
            (CommercialAndBusiness, B) => 92.0,
            (CommercialAndBusiness, C) => 94.0,
            (CommercialAndBusiness, D) => 95.0,
            (Industrial, A) => 81.0,
            (Industrial, B) => 88.0,
            (Industrial, C) => 91.0,
            (Industrial, D) => 93.0,
            (ResidentialEighthAcreLot, A) => 77.0,
            (ResidentialEighthAcreLot, B) => 85.0,
            (ResidentialEighthAcreLot, C) => 90.0,
            (ResidentialEighthAcreLot, D) => 92.0,
            (ResidentialQuarterAcreLot, A) => 61.0,
            (ResidentialQuarterAcreLot, B) => 75.0,
            (ResidentialQuarterAcreLot, C) => 83.0,
            (ResidentialQuarterAcreLot, D) => 87.0,
            (ResidentialThirdAcreLot, A) => 57.0,
            (ResidentialThirdAcreLot, B) => 72.0,
            (ResidentialThirdAcreLot, C) => 81.0,
            (ResidentialThirdAcreLot, D) => 86.0,
            (ResidentialHalfAcreLot, A) => 54.0,
            (ResidentialHalfAcreLot, B) => 70.0,
            (ResidentialHalfAcreLot, C) => 80.0,
            (ResidentialHalfAcreLot, D) => 85.0,
            (ResidentialOneAcreLot, A) => 51.0,
            (ResidentialOneAcreLot, B) => 68.0,
            (ResidentialOneAcreLot, C) => 79.0,
            (ResidentialOneAcreLot, D) => 84.0,
            (ResidentialTwoAcreLot, A) => 46.0,
            (ResidentialTwoAcreLot, B) => 65.0,
            (ResidentialTwoAcreLot, C) => 77.0,
            (ResidentialTwoAcreLot, D) => 82.0,
            (NewlyGradedPervious, A) => 77.0,
            (NewlyGradedPervious, B) => 86.0,
            (NewlyGradedPervious, C) => 91.0,
            (NewlyGradedPervious, D) => 94.0,
        }
    }
}

/// Area-weighted composite curve number:
///
/// `CN_composite = Σ(CNᵢ·Aᵢ) / Σ(Aᵢ)`
///
/// Per TR-55 Ch. 2, this simple weighting is appropriate when sub-area CNs
/// are reasonably similar; when they diverge substantially (TR-55's rule of
/// thumb: more than about 5 CN points), model sub-basins separately and
/// combine their hydrographs instead of their curve numbers.
///
/// # Errors
/// - [`HydrologyError::NonPositiveArea`] if the total area, or any
///   sub-area, is not positive.
/// - [`HydrologyError::CurveNumberOutOfRange`] if any sub-area's CN falls
///   outside `[30, 100]`.
pub fn composite_curve_number(sub_areas: &[(f64, f64)]) -> HydroResult<f64> {
    let mut total_area = 0.0;
    let mut weighted = 0.0;
    for &(area, cn) in sub_areas {
        if area <= 0.0 {
            return Err(HydrologyError::NonPositiveArea { area });
        }
        if !(30.0..=100.0).contains(&cn) {
            return Err(HydrologyError::CurveNumberOutOfRange { cn });
        }
        total_area += area;
        weighted += cn * area;
    }
    if total_area <= 0.0 {
        return Err(HydrologyError::NonPositiveArea { area: total_area });
    }
    Ok(weighted / total_area)
}

/// Potential maximum retention `S` (in) from curve number `CN` (TR-55 Eq.
/// 2-4): `S = 1000/CN - 10`.
///
/// # Errors
/// [`HydrologyError::CurveNumberOutOfRange`] if `cn` is outside `[30, 100]`
/// (TR-55's empirical range).
pub fn potential_retention(cn: f64) -> HydroResult<f64> {
    if !(30.0..=100.0).contains(&cn) {
        return Err(HydrologyError::CurveNumberOutOfRange { cn });
    }
    Ok(1000.0 / cn - 10.0)
}

/// SCS/NRCS runoff depth `Q` (in) from storm rainfall depth `P` (in) and
/// curve number `CN` (TR-55 Eq. 2-3, with the standard `Ia = 0.2S`
/// assumption folded in):
///
/// `Q = (P - 0.2S)² / (P + 0.8S)`, where `S = 1000/CN - 10`.
///
/// Returns `Ok(0.0)` — not an error — when `P` does not exceed the initial
/// abstraction `0.2S`, matching TR-55's convention that a storm too small to
/// satisfy initial abstraction simply produces no runoff. Use
/// [`runoff_depth_checked`] if you'd rather treat that case as an error.
///
/// # Errors
/// - [`HydrologyError::CurveNumberOutOfRange`] if `cn` is outside
///   `[30, 100]`.
/// - [`HydrologyError::NegativeRainfallDepth`] if `p_in < 0`.
///
/// # Example
/// `CN = 80`, `P = 5` in:
/// ```
/// use thoth_hydrology::curve_number::runoff_depth;
///
/// let q = runoff_depth(80.0, 5.0).unwrap();
/// assert!((q - 2.892857142857143).abs() < 1e-9);
/// ```
pub fn runoff_depth(cn: f64, p_in: f64) -> HydroResult<f64> {
    if p_in < 0.0 {
        return Err(HydrologyError::NegativeRainfallDepth { depth: p_in });
    }
    let s = potential_retention(cn)?;
    let ia = 0.2 * s;
    if p_in <= ia {
        return Ok(0.0);
    }
    Ok((p_in - ia).powi(2) / (p_in + 0.8 * s))
}

/// Like [`runoff_depth`], but returns
/// [`HydrologyError::RainfallBelowInitialAbstraction`] instead of `Ok(0.0)`
/// when the storm does not exceed initial abstraction. Use this when the
/// caller needs to distinguish "no runoff, as expected" from "the storm
/// input was too small to be a meaningful design event".
pub fn runoff_depth_checked(cn: f64, p_in: f64) -> HydroResult<f64> {
    if p_in < 0.0 {
        return Err(HydrologyError::NegativeRainfallDepth { depth: p_in });
    }
    let s = potential_retention(cn)?;
    let ia = 0.2 * s;
    if p_in <= ia {
        return Err(HydrologyError::RainfallBelowInitialAbstraction {
            p: p_in,
            s,
            abstraction: ia,
        });
    }
    Ok((p_in - ia).powi(2) / (p_in + 0.8 * s))
}

/// The NRCS/NEH-4 dimensionless unit hydrograph: ordinates of `t/Tp` (time
/// ratio) vs `q/qp` (discharge ratio), tabulated from the standard curvilinear
/// dimensionless unit hydrograph (NEH-4, reproduced in TR-55 and virtually
/// every hydrology textbook covering the SCS method). The curve is defined
/// for `t/Tp` in `[0, 5]`; `q/qp` is ~0 beyond that.
pub const DIMENSIONLESS_UNIT_HYDROGRAPH: &[(f64, f64)] = &[
    (0.0, 0.000),
    (0.1, 0.030),
    (0.2, 0.100),
    (0.3, 0.190),
    (0.4, 0.310),
    (0.5, 0.470),
    (0.6, 0.660),
    (0.7, 0.820),
    (0.8, 0.930),
    (0.9, 0.990),
    (1.0, 1.000),
    (1.1, 0.990),
    (1.2, 0.930),
    (1.3, 0.860),
    (1.4, 0.780),
    (1.5, 0.680),
    (1.6, 0.560),
    (1.7, 0.460),
    (1.8, 0.390),
    (1.9, 0.330),
    (2.0, 0.280),
    (2.2, 0.207),
    (2.4, 0.147),
    (2.6, 0.107),
    (2.8, 0.077),
    (3.0, 0.055),
    (3.2, 0.040),
    (3.4, 0.029),
    (3.6, 0.021),
    (3.8, 0.015),
    (4.0, 0.011),
    (4.5, 0.005),
    (5.0, 0.000),
];

/// The NRCS peak-rate factor for the standard curvilinear dimensionless unit
/// hydrograph (NEH-4): `qp = 484·A·Q / Tp`, with `A` in mi², `Q` in inches
/// of runoff, `Tp` in hours, and `qp` in cfs. `484` is the constant
/// commonly used for average watershed slopes and NRCS's assumed
/// 37.5%/62.5% volume split between the rising and falling limbs (steeper,
/// flashier watersheds sometimes use 484's mountainous-terrain counterpart,
/// ~600; swampy/flat terrain uses ~300 — only the standard 484 is
/// implemented here).
pub const NRCS_PEAK_RATE_FACTOR: f64 = 484.0;

/// A discretized unit hydrograph: parallel `time_hours` / `flow_cfs`
/// ordinates for **1 inch** of direct runoff spread uniformly over the
/// drainage area.
#[derive(Debug, Clone, PartialEq)]
pub struct UnitHydrograph {
    pub time_hours: Vec<f64>,
    pub flow_cfs: Vec<f64>,
    /// Time to peak, hours (`Tp = D/2 + 0.6·Tc`).
    pub time_to_peak_hours: f64,
    /// Peak discharge, cfs, for 1 inch of runoff.
    pub peak_flow_cfs: f64,
}

/// Build the NRCS dimensionless unit hydrograph, scaled to a specific
/// drainage area and time of concentration, per TR-55/NEH-4:
///
/// - Unit-hydrograph duration `D = 0.133·Tc` (NRCS's recommended rule of
///   thumb keeping `D` a small fraction of `Tc` so the hydrograph shape is
///   not distorted).
/// - Time to peak `Tp = D/2 + 0.6·Tc`.
/// - Peak flow (for 1 inch of runoff) `qp = 484·A·1/Tp`.
/// - Each dimensionless ordinate `(t/Tp, q/qp)` is scaled to `(t, q)` by
///   `t = (t/Tp)·Tp`, `q = (q/qp)·qp`.
///
/// The returned hydrograph is normalized to 1 inch of runoff; scale
/// `flow_cfs` by the actual runoff depth (in) to get the design hydrograph,
/// or feed it directly into [`crate::hydrograph::convolve`] alongside an
/// incremental-rainfall-excess series.
///
/// # Errors
/// - [`HydrologyError::NonPositiveArea`] if `area_sq_mi <= 0`.
/// - [`HydrologyError::NonPositiveTimeOfConcentration`] if
///   `tc_hours <= 0`.
///
/// # Example
/// 1 mi² basin, `Tc = 1` hour:
/// ```
/// use thoth_hydrology::curve_number::unit_hydrograph;
///
/// let uh = unit_hydrograph(1.0, 1.0).unwrap();
/// assert!((uh.time_to_peak_hours - 0.6665).abs() < 1e-9);
/// assert!((uh.peak_flow_cfs - 726.1815453863466).abs() < 1e-6);
/// ```
pub fn unit_hydrograph(area_sq_mi: f64, tc_hours: f64) -> HydroResult<UnitHydrograph> {
    if area_sq_mi <= 0.0 {
        return Err(HydrologyError::NonPositiveArea {
            area: area_sq_mi,
        });
    }
    if tc_hours <= 0.0 {
        return Err(HydrologyError::NonPositiveTimeOfConcentration { tc: tc_hours });
    }
    let d = 0.133 * tc_hours;
    let tp = d / 2.0 + 0.6 * tc_hours;
    let qp = NRCS_PEAK_RATE_FACTOR * area_sq_mi / tp;

    let mut time_hours = Vec::with_capacity(DIMENSIONLESS_UNIT_HYDROGRAPH.len());
    let mut flow_cfs = Vec::with_capacity(DIMENSIONLESS_UNIT_HYDROGRAPH.len());
    for &(t_ratio, q_ratio) in DIMENSIONLESS_UNIT_HYDROGRAPH {
        time_hours.push(t_ratio * tp);
        flow_cfs.push(q_ratio * qp);
    }

    Ok(UnitHydrograph {
        time_hours,
        flow_cfs,
        time_to_peak_hours: tp,
        peak_flow_cfs: qp,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn potential_retention_matches_hand_calculation() {
        assert_relative_eq!(potential_retention(80.0).unwrap(), 2.5, epsilon = 1e-9);
        // CN=100 => S=0 (fully impervious, no retention).
        assert_relative_eq!(potential_retention(100.0).unwrap(), 0.0, epsilon = 1e-9);
    }

    #[test]
    fn potential_retention_rejects_out_of_range_cn() {
        assert!(matches!(
            potential_retention(29.0),
            Err(HydrologyError::CurveNumberOutOfRange { .. })
        ));
        assert!(matches!(
            potential_retention(101.0),
            Err(HydrologyError::CurveNumberOutOfRange { .. })
        ));
    }

    #[test]
    fn runoff_depth_matches_hand_calculation() {
        let q = runoff_depth(80.0, 5.0).unwrap();
        assert_relative_eq!(q, 2.892857142857143, epsilon = 1e-9);
    }

    #[test]
    fn runoff_depth_is_zero_below_initial_abstraction() {
        // S=2.5, Ia=0.5; P=0.3in < Ia => no runoff, not an error.
        let q = runoff_depth(80.0, 0.3).unwrap();
        assert_relative_eq!(q, 0.0, epsilon = 1e-12);
    }

    #[test]
    fn runoff_depth_checked_errors_below_initial_abstraction() {
        assert!(matches!(
            runoff_depth_checked(80.0, 0.3),
            Err(HydrologyError::RainfallBelowInitialAbstraction { .. })
        ));
    }

    #[test]
    fn runoff_depth_rejects_negative_rainfall() {
        assert!(matches!(
            runoff_depth(80.0, -1.0),
            Err(HydrologyError::NegativeRainfallDepth { .. })
        ));
    }

    #[test]
    fn cn_lookup_matches_tr55_table_2_2a() {
        assert_relative_eq!(
            UrbanLandUse::Impervious.curve_number(HydrologicSoilGroup::A),
            98.0
        );
        assert_relative_eq!(
            UrbanLandUse::ResidentialQuarterAcreLot.curve_number(HydrologicSoilGroup::C),
            83.0
        );
        assert_relative_eq!(
            UrbanLandUse::OpenSpace(CoverCondition::Good).curve_number(HydrologicSoilGroup::D),
            80.0
        );
    }

    #[test]
    fn composite_cn_is_area_weighted() {
        // 10 ac impervious (98) + 30 ac open space good/B (61): weighted avg.
        let cn = composite_curve_number(&[(10.0, 98.0), (30.0, 61.0)]).unwrap();
        let expected = (10.0 * 98.0 + 30.0 * 61.0) / 40.0;
        assert_relative_eq!(cn, expected, epsilon = 1e-9);
    }

    #[test]
    fn composite_cn_rejects_out_of_range_component() {
        assert!(matches!(
            composite_curve_number(&[(10.0, 20.0)]),
            Err(HydrologyError::CurveNumberOutOfRange { .. })
        ));
    }

    #[test]
    fn unit_hydrograph_matches_hand_calculation() {
        let uh = unit_hydrograph(1.0, 1.0).unwrap();
        assert_relative_eq!(uh.time_to_peak_hours, 0.6665, epsilon = 1e-9);
        assert_relative_eq!(uh.peak_flow_cfs, 726.1815453863466, epsilon = 1e-6);
        // Peak ordinate (t/Tp=1.0) should equal qp exactly.
        let peak_idx = DIMENSIONLESS_UNIT_HYDROGRAPH
            .iter()
            .position(|&(t, _)| t == 1.0)
            .unwrap();
        assert_relative_eq!(uh.flow_cfs[peak_idx], uh.peak_flow_cfs, epsilon = 1e-9);
    }

    #[test]
    fn unit_hydrograph_rejects_non_positive_inputs() {
        assert!(unit_hydrograph(0.0, 1.0).is_err());
        assert!(unit_hydrograph(1.0, 0.0).is_err());
        assert!(unit_hydrograph(-1.0, 1.0).is_err());
    }
}
