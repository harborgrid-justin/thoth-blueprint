//! Culvert hydraulic design: inlet-control and outlet-control headwater,
//! FHWA HDS-5-style.
//!
//! Source: FHWA *Hydraulic Design of Highway Culverts* (HDS-5), 2nd ed.
//! (2001 reprint), Appendix A — the design equations underlying the
//! HDS-5/HY-8 inlet-control nomographs (Table 8, Equations 26-28) and
//! outlet-control full-flow energy balance (reproduced with equation
//! numbers in Oklahoma DOT's *Roadway Drainage Manual* (2014) Ch. 9, itself
//! a verbatim restatement of HDS-5 §9.6). The governing headwater for a
//! culvert is the larger of the two:
//!
//! - **Inlet control**: the entrance itself is the constriction (a weir at
//!   low flow, an orifice once submerged); headwater depends only on the
//!   entrance geometry and discharge, not on the barrel or tailwater.
//! - **Outlet control**: the barrel or tailwater controls; headwater
//!   depends on barrel friction/entrance/exit losses and the tailwater
//!   elevation.
//!
//! # Assumptions and valid range
//! - **Circular concrete pipe only**, with the three standard entrance
//!   types HDS-5 Table 9 tabulates for "Chart 1" (square edge with
//!   headwall, groove end with headwall, groove end projecting). Other
//!   shapes/materials (box, CMP, pipe-arch, ...) use different tabulated
//!   constants not included here.
//! - Inlet control Form (1) is used (`HWi/D = Hc/D + K(Q/AD^0.5)^M - 0.5S`),
//!   which needs critical depth in a circular section — solved by bisection
//!   in [`critical_depth_circular`], not a closed form.
//! - The unsubmerged equation is valid for `Q/(A√D) ≤ 3.5` and the
//!   submerged equation for `Q/(A√D) ≥ 4.0` (HDS-5's own stated validity
//!   bounds, English units); the transition zone between them is
//!   **linearly interpolated** here rather than constructed as HDS-5's
//!   tangent curve between the two nomograph branches — a documented
//!   simplification, accurate to within a few percent in that narrow band
//!   per HDS-5's own discussion of the transition zone.
//! - Outlet control uses the "full flow" / "(dc+D)/2 approximation" method
//!   (HDS-5 §9.6.4.5, valid when the barrel flows full for at least part of
//!   its length or headwater ≥ 0.75D), not a full backwater profile.
//! - US customary units throughout (feet, cfs); the SI form of these
//!   equations uses a different leading constant (`Ku = 1.811`) not
//!   implemented here.

use crate::error::{HydroResult, HydrologyError};
use crate::outlet_hydraulics::GRAVITY_FT_S2;
use crate::time_of_concentration::ChannelCrossSection;

/// Circular concrete pipe entrance types tabulated in HDS-5 Table 9,
/// "Chart 1" (circular concrete).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConcreteEntranceType {
    /// Square edge with headwall (Scale 1).
    SquareEdgeWithHeadwall,
    /// Groove end with headwall (Scale 2).
    GrooveEndWithHeadwall,
    /// Groove end projecting (Scale 3).
    GrooveEndProjecting,
}

/// `K`, `M`, `c`, `Y` constants for HDS-5's inlet-control design equations
/// (Table 8, Eqs. 26-28), for one entrance configuration.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct InletControlCoefficients {
    pub k: f64,
    pub m: f64,
    pub c: f64,
    pub y: f64,
}

impl ConcreteEntranceType {
    /// HDS-5 Table 9 constants for this entrance type (circular concrete,
    /// Chart 1).
    pub const fn coefficients(self) -> InletControlCoefficients {
        match self {
            ConcreteEntranceType::SquareEdgeWithHeadwall => InletControlCoefficients {
                k: 0.0098,
                m: 2.0,
                c: 0.0398,
                y: 0.67,
            },
            ConcreteEntranceType::GrooveEndWithHeadwall => InletControlCoefficients {
                k: 0.0018,
                m: 2.0,
                c: 0.0292,
                y: 0.74,
            },
            ConcreteEntranceType::GrooveEndProjecting => InletControlCoefficients {
                k: 0.0045,
                m: 2.0,
                c: 0.0317,
                y: 0.69,
            },
        }
    }

    /// Typical entrance-loss coefficient `ke` for this entrance type, used
    /// in outlet-control head-loss computation (HDS-5 Table on entrance
    /// loss coefficients; a headwall entrance is generally milder than a
    /// projecting one).
    pub const fn entrance_loss_coefficient(self) -> f64 {
        match self {
            ConcreteEntranceType::SquareEdgeWithHeadwall => 0.5,
            ConcreteEntranceType::GrooveEndWithHeadwall => 0.2,
            ConcreteEntranceType::GrooveEndProjecting => 0.2,
        }
    }
}

/// A circular concrete-pipe culvert barrel.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CircularConcreteCulvert {
    pub diameter_ft: f64,
    pub length_ft: f64,
    /// Barrel slope, ft/ft (positive = invert drops from inlet to outlet).
    pub slope: f64,
    pub manning_n: f64,
    pub entrance: ConcreteEntranceType,
}

impl CircularConcreteCulvert {
    fn validate(&self) -> HydroResult<()> {
        if self.diameter_ft <= 0.0 {
            return Err(HydrologyError::NonPositiveDimension {
                value: self.diameter_ft,
            });
        }
        if self.length_ft <= 0.0 {
            return Err(HydrologyError::NonPositiveLength {
                length: self.length_ft,
            });
        }
        if self.slope <= 0.0 {
            return Err(HydrologyError::NonPositiveSlope { slope: self.slope });
        }
        if self.manning_n <= 0.0 {
            return Err(HydrologyError::NonPositiveManningN { n: self.manning_n });
        }
        Ok(())
    }

    /// Full-barrel cross-sectional area, ft².
    fn full_area(&self) -> f64 {
        std::f64::consts::PI * (self.diameter_ft / 2.0).powi(2)
    }
}

/// Flow area and top (water-surface) width of a circular section of
/// diameter `diameter_ft` at flow depth `depth_ft` (`0 <= depth_ft <=
/// diameter_ft`), via the standard circular-segment geometry parameterized
/// by the central angle `theta = 2*acos(1 - 2*depth/diameter)`:
///
/// `A = (D²/8)·(θ - sin θ)`, `T = D·sin(θ/2)`
fn circular_section_properties(diameter_ft: f64, depth_ft: f64) -> (f64, f64) {
    let d = depth_ft.clamp(1e-9 * diameter_ft, diameter_ft * (1.0 - 1e-9));
    let theta = 2.0 * (1.0 - 2.0 * d / diameter_ft).acos();
    let area = (diameter_ft.powi(2) / 8.0) * (theta - theta.sin());
    let top_width = diameter_ft * (theta / 2.0).sin();
    (area, top_width)
}

/// Critical depth (ft) in a circular pipe of `diameter_ft` carrying
/// `discharge_cfs`, solved by bisection on the critical-flow condition
/// `Q² = g·A³/T` (Froude number = 1), since a circular section has no
/// closed-form critical depth.
///
/// # Errors
/// - [`HydrologyError::NonPositiveDimension`] if `diameter_ft <= 0`.
/// - [`HydrologyError::NonPositiveDischarge`] if `discharge_cfs <= 0`.
///
/// # Example
/// A 3-ft-diameter pipe carrying 30 cfs:
/// ```
/// use thoth_hydrology::culvert::critical_depth_circular;
///
/// let dc = critical_depth_circular(3.0, 30.0).unwrap();
/// assert!((dc - 1.7741734422661963).abs() < 1e-6);
/// ```
pub fn critical_depth_circular(diameter_ft: f64, discharge_cfs: f64) -> HydroResult<f64> {
    if diameter_ft <= 0.0 {
        return Err(HydrologyError::NonPositiveDimension { value: diameter_ft });
    }
    if discharge_cfs <= 0.0 {
        return Err(HydrologyError::NonPositiveDischarge { q: discharge_cfs });
    }

    let f = |d: f64| -> f64 {
        let (a, t) = circular_section_properties(diameter_ft, d);
        GRAVITY_FT_S2 * a.powi(3) / t - discharge_cfs.powi(2)
    };

    let mut lo = 1e-9 * diameter_ft;
    let mut hi = diameter_ft * (1.0 - 1e-9);
    let f_lo_positive = f(lo) > 0.0;

    for _ in 0..200 {
        let mid = 0.5 * (lo + hi);
        let f_mid = f(mid);
        if (f_mid > 0.0) == f_lo_positive {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    Ok(0.5 * (lo + hi))
}

/// Specific head at critical depth, `Hc = dc + Vc²/(2g)` (ft), for a
/// circular pipe carrying `discharge_cfs` — the "specific energy at
/// critical depth" term HDS-5's Form (1) unsubmerged inlet-control equation
/// needs.
///
/// # Errors
/// Propagates [`critical_depth_circular`]'s errors.
pub fn specific_head_at_critical_depth(diameter_ft: f64, discharge_cfs: f64) -> HydroResult<f64> {
    let dc = critical_depth_circular(diameter_ft, discharge_cfs)?;
    let (area_c, _) = circular_section_properties(diameter_ft, dc);
    let vc = discharge_cfs / area_c;
    Ok(dc + vc.powi(2) / (2.0 * GRAVITY_FT_S2))
}

/// HDS-5's dimensionless discharge ratio `Q/(A·√D)` that governs which
/// inlet-control equation form applies.
fn discharge_ratio(culvert: &CircularConcreteCulvert, discharge_cfs: f64) -> f64 {
    discharge_cfs / (culvert.full_area() * culvert.diameter_ft.sqrt())
}

/// Inlet-control headwater (ft, above the inlet invert) for a circular
/// concrete culvert, per HDS-5 Appendix A Table 8:
///
/// - Unsubmerged (`Q/A√D ≤ 3.5`), Form (1):
///   `HWi/D = Hc/D + K·(Q/A√D)^M - 0.5·S`
/// - Submerged (`Q/A√D ≥ 4.0`):
///   `HWi/D = c·(Q/A√D)² + Y - 0.5·S`
/// - Transition (`3.5 < Q/A√D < 4.0`): linearly interpolated between the
///   two branches evaluated at their respective bounds (see module docs).
///
/// # Errors
/// - Propagates [`CircularConcreteCulvert`]'s validation errors
///   ([`HydrologyError::NonPositiveDimension`],
///   [`HydrologyError::NonPositiveLength`],
///   [`HydrologyError::NonPositiveSlope`],
///   [`HydrologyError::NonPositiveManningN`]).
/// - [`HydrologyError::NonPositiveDischarge`] if `discharge_cfs <= 0`.
///
/// # Example
/// A 3-ft-diameter, square-edge-with-headwall culvert, 1% slope, 30 cfs:
/// ```
/// use thoth_hydrology::culvert::{inlet_control_headwater, CircularConcreteCulvert, ConcreteEntranceType};
///
/// let culvert = CircularConcreteCulvert {
///     diameter_ft: 3.0,
///     length_ft: 200.0,
///     slope: 0.01,
///     manning_n: 0.013,
///     entrance: ConcreteEntranceType::SquareEdgeWithHeadwall,
/// };
/// let hw = inlet_control_headwater(&culvert, 30.0).unwrap();
/// assert!((hw - 2.673494972088593).abs() < 1e-6);
/// ```
pub fn inlet_control_headwater(
    culvert: &CircularConcreteCulvert,
    discharge_cfs: f64,
) -> HydroResult<f64> {
    culvert.validate()?;
    if discharge_cfs <= 0.0 {
        return Err(HydrologyError::NonPositiveDischarge { q: discharge_cfs });
    }
    let coeffs = culvert.entrance.coefficients();
    let d = culvert.diameter_ft;
    let s = culvert.slope;
    let ratio = discharge_ratio(culvert, discharge_cfs);

    let unsubmerged_hw_over_d = |r: f64| -> HydroResult<f64> {
        let hc = specific_head_at_critical_depth(d, r * culvert.full_area() * d.sqrt())?;
        Ok(hc / d + coeffs.k * r.powf(coeffs.m) - 0.5 * s)
    };
    let submerged_hw_over_d = |r: f64| -> f64 { coeffs.c * r.powi(2) + coeffs.y - 0.5 * s };

    let hw_over_d = if ratio <= 3.5 {
        unsubmerged_hw_over_d(ratio)?
    } else if ratio >= 4.0 {
        submerged_hw_over_d(ratio)
    } else {
        // Transition zone: linearly interpolate between the unsubmerged
        // branch evaluated at 3.5 and the submerged branch at 4.0.
        let lo = unsubmerged_hw_over_d(3.5)?;
        let hi = submerged_hw_over_d(4.0);
        let frac = (ratio - 3.5) / (4.0 - 3.5);
        lo + (hi - lo) * frac
    };
    Ok(hw_over_d * d)
}

/// Outlet-control headwater (ft, above the inlet invert) for a full-flowing
/// circular concrete culvert barrel, per HDS-5 §9.6.4 (full-flow energy
/// balance) and §9.6.4.5 (partial-full approximation):
///
/// `H = [1 + ke + 29·n²·L/R^(4/3)]·V²/(2g)` (entrance + friction + exit
/// losses, exit velocity neglected), `ho = max(TW, (dc+D)/2)`,
/// `HWo = ho + H - S·L`.
///
/// `tailwater_depth_ft` is the downstream water depth above the *outlet*
/// invert. This "partial-full approximation" method is only valid when the
/// barrel flows full for at least part of its length or headwater is at
/// least `0.75·D` — a full backwater profile should be used otherwise, not
/// implemented here.
///
/// # Errors
/// - Propagates [`CircularConcreteCulvert`]'s validation errors.
/// - [`HydrologyError::NonPositiveDischarge`] if `discharge_cfs <= 0`.
/// - [`HydrologyError::NegativeHead`] if `tailwater_depth_ft < 0`.
///
/// # Example
/// Same culvert as [`inlet_control_headwater`]'s example, 2 ft of
/// tailwater:
/// ```
/// use thoth_hydrology::culvert::{outlet_control_headwater, CircularConcreteCulvert, ConcreteEntranceType};
///
/// let culvert = CircularConcreteCulvert {
///     diameter_ft: 3.0,
///     length_ft: 200.0,
///     slope: 0.01,
///     manning_n: 0.013,
///     entrance: ConcreteEntranceType::SquareEdgeWithHeadwall,
/// };
/// let hw = outlet_control_headwater(&culvert, 30.0, 2.0).unwrap();
/// assert!((hw - 1.2089745879458094).abs() < 1e-6);
/// ```
pub fn outlet_control_headwater(
    culvert: &CircularConcreteCulvert,
    discharge_cfs: f64,
    tailwater_depth_ft: f64,
) -> HydroResult<f64> {
    culvert.validate()?;
    if discharge_cfs <= 0.0 {
        return Err(HydrologyError::NonPositiveDischarge { q: discharge_cfs });
    }
    if tailwater_depth_ft < 0.0 {
        return Err(HydrologyError::NegativeHead {
            head: tailwater_depth_ft,
        });
    }

    let area = culvert.full_area();
    let velocity = discharge_cfs / area;
    let r = ChannelCrossSection::CircularPipeFull {
        diameter_ft: culvert.diameter_ft,
    }
    .hydraulic_radius()?;
    let ke = culvert.entrance.entrance_loss_coefficient();
    let head_loss =
        (1.0 + ke + 29.0 * culvert.manning_n.powi(2) * culvert.length_ft / r.powf(4.0 / 3.0))
            * velocity.powi(2)
            / (2.0 * GRAVITY_FT_S2);

    let dc = critical_depth_circular(culvert.diameter_ft, discharge_cfs)?;
    let ho = tailwater_depth_ft.max((dc + culvert.diameter_ft) / 2.0);
    Ok(ho + head_loss - culvert.slope * culvert.length_ft)
}

/// Which control section governs a culvert's headwater.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FlowControl {
    Inlet,
    Outlet,
}

/// The full result of a culvert headwater check: both candidate
/// headwaters, which one governs, and the governing headwater.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CulvertHeadwaterResult {
    pub headwater_ft: f64,
    pub control: FlowControl,
    pub inlet_control_headwater_ft: f64,
    pub outlet_control_headwater_ft: f64,
    pub barrel_velocity_fps: f64,
}

/// Compute both inlet- and outlet-control headwater for a circular concrete
/// culvert and report the governing (larger) one — the standard HDS-5
/// culvert design check.
///
/// # Errors
/// Propagates [`inlet_control_headwater`]'s and
/// [`outlet_control_headwater`]'s errors.
///
/// # Example
/// ```
/// use thoth_hydrology::culvert::{compute_headwater, CircularConcreteCulvert, ConcreteEntranceType, FlowControl};
///
/// let culvert = CircularConcreteCulvert {
///     diameter_ft: 3.0,
///     length_ft: 200.0,
///     slope: 0.01,
///     manning_n: 0.013,
///     entrance: ConcreteEntranceType::SquareEdgeWithHeadwall,
/// };
/// let result = compute_headwater(&culvert, 30.0, 2.0).unwrap();
/// assert_eq!(result.control, FlowControl::Inlet);
/// assert!((result.headwater_ft - 2.673494972088593).abs() < 1e-6);
/// ```
pub fn compute_headwater(
    culvert: &CircularConcreteCulvert,
    discharge_cfs: f64,
    tailwater_depth_ft: f64,
) -> HydroResult<CulvertHeadwaterResult> {
    let hwi = inlet_control_headwater(culvert, discharge_cfs)?;
    let hwo = outlet_control_headwater(culvert, discharge_cfs, tailwater_depth_ft)?;
    let (headwater_ft, control) = if hwi >= hwo {
        (hwi, FlowControl::Inlet)
    } else {
        (hwo, FlowControl::Outlet)
    };
    Ok(CulvertHeadwaterResult {
        headwater_ft,
        control,
        inlet_control_headwater_ft: hwi,
        outlet_control_headwater_ft: hwo,
        barrel_velocity_fps: discharge_cfs / culvert.full_area(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn test_culvert() -> CircularConcreteCulvert {
        CircularConcreteCulvert {
            diameter_ft: 3.0,
            length_ft: 200.0,
            slope: 0.01,
            manning_n: 0.013,
            entrance: ConcreteEntranceType::SquareEdgeWithHeadwall,
        }
    }

    #[test]
    fn critical_depth_matches_reference_bisection() {
        let dc = critical_depth_circular(3.0, 30.0).unwrap();
        assert_relative_eq!(dc, 1.7741734422661963, epsilon = 1e-6);
    }

    #[test]
    fn critical_depth_rejects_bad_inputs() {
        assert!(critical_depth_circular(0.0, 30.0).is_err());
        assert!(critical_depth_circular(3.0, 0.0).is_err());
        assert!(critical_depth_circular(3.0, -1.0).is_err());
    }

    #[test]
    fn critical_depth_satisfies_froude_one_condition() {
        let d = 4.5;
        let q = 60.0;
        let dc = critical_depth_circular(d, q).unwrap();
        let (a, t) = circular_section_properties(d, dc);
        let lhs = q.powi(2) * t;
        let rhs = GRAVITY_FT_S2 * a.powi(3);
        assert_relative_eq!(lhs, rhs, epsilon = 1.0);
    }

    #[test]
    fn inlet_control_headwater_matches_reference_computation() {
        let hw = inlet_control_headwater(&test_culvert(), 30.0).unwrap();
        assert_relative_eq!(hw, 2.673494972088593, epsilon = 1e-6);
    }

    #[test]
    fn inlet_control_headwater_rejects_bad_inputs() {
        assert!(inlet_control_headwater(&test_culvert(), 0.0).is_err());
        let mut bad = test_culvert();
        bad.diameter_ft = 0.0;
        assert!(inlet_control_headwater(&bad, 30.0).is_err());
        bad = test_culvert();
        bad.slope = 0.0;
        assert!(inlet_control_headwater(&bad, 30.0).is_err());
    }

    #[test]
    fn outlet_control_headwater_matches_reference_computation() {
        let hw = outlet_control_headwater(&test_culvert(), 30.0, 2.0).unwrap();
        assert_relative_eq!(hw, 1.2089745879458094, epsilon = 1e-6);
    }

    #[test]
    fn outlet_control_headwater_rejects_negative_tailwater() {
        assert!(matches!(
            outlet_control_headwater(&test_culvert(), 30.0, -1.0),
            Err(HydrologyError::NegativeHead { .. })
        ));
    }

    #[test]
    fn compute_headwater_selects_governing_control() {
        let result = compute_headwater(&test_culvert(), 30.0, 2.0).unwrap();
        assert_eq!(result.control, FlowControl::Inlet);
        assert_relative_eq!(result.headwater_ft, 2.673494972088593, epsilon = 1e-6);
        assert_relative_eq!(
            result.inlet_control_headwater_ft,
            2.673494972088593,
            epsilon = 1e-6
        );
        assert_relative_eq!(
            result.outlet_control_headwater_ft,
            1.2089745879458094,
            epsilon = 1e-6
        );
    }

    #[test]
    fn higher_tailwater_can_flip_control_to_outlet() {
        // A very high tailwater should push outlet control above inlet control.
        let result = compute_headwater(&test_culvert(), 30.0, 10.0).unwrap();
        assert_eq!(result.control, FlowControl::Outlet);
        assert!(result.outlet_control_headwater_ft > result.inlet_control_headwater_ft);
    }

    #[test]
    fn entrance_coefficients_match_hds5_table_9_chart_1() {
        let c = ConcreteEntranceType::SquareEdgeWithHeadwall.coefficients();
        assert_relative_eq!(c.k, 0.0098);
        assert_relative_eq!(c.m, 2.0);
        assert_relative_eq!(c.c, 0.0398);
        assert_relative_eq!(c.y, 0.67);
    }
}
