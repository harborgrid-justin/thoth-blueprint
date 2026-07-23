//! Orifice and weir outlet-structure hydraulics: single equations plus
//! multi-stage composite rating curves for detention/retention outlet
//! structures.
//!
//! Sources: standard hydraulics texts and handbooks — Brater & King,
//! *Handbook of Hydraulics*; USBR *Water Measurement Manual*; the orifice
//! and weir equations reproduced in essentially every stormwater design
//! manual (e.g. HydroCAD/GeoSTORM's outlet-structure editors implement the
//! same forms).
//!
//! # Assumptions and valid range
//! - All equations here are **free (unsubmerged) discharge** forms; none of
//!   them apply a tailwater/submergence correction. A submerged orifice can
//!   still use the orifice equation with `h` taken as the headwater-minus-
//!   tailwater differential, but a submerged weir needs a distinct
//!   correction factor not implemented here.
//! - Coefficients (`Cd`, `Cw`) are empirical and geometry-dependent;
//!   defaults given in doc comments are typical starting points, not
//!   universal constants — site-specific calibration or manufacturer data
//!   should override them for final design.
//! - `g = 32.2 ft/s²` (US customary units throughout this module: feet,
//!   seconds, cfs).

use crate::error::{HydroResult, HydrologyError};

/// Standard gravitational acceleration, ft/s².
pub const GRAVITY_FT_S2: f64 = 32.2;

/// Orifice discharge (free/unsubmerged): `Q = Cd·A·√(2·g·h)`.
///
/// `cd` is the discharge coefficient (typically 0.6 for a sharp-edged
/// orifice, up to ~0.8 for a well-rounded entrance), `area_sqft` is the
/// orifice's flow area (ft²), and `head_ft` is the hydraulic head above the
/// orifice's centroid (ft) — for a submerged outlet, use the headwater
/// minus tailwater elevation differential instead of headwater-above-invert.
///
/// # Errors
/// - [`HydrologyError::NonPositiveCoefficient`] if `cd <= 0`.
/// - [`HydrologyError::NonPositiveDimension`] if `area_sqft <= 0`.
/// - [`HydrologyError::NegativeHead`] if `head_ft < 0`.
///
/// # Example
/// A 1-ft-diameter sharp-edged orifice (`Cd = 0.6`) under 2 ft of head:
/// ```
/// use thoth_hydrology::outlet_hydraulics::orifice_discharge;
/// use std::f64::consts::PI;
///
/// let area = PI * (1.0_f64 / 2.0).powi(2);
/// let q = orifice_discharge(0.6, area, 2.0).unwrap();
/// assert!((q - 5.348094385326138).abs() < 1e-9);
/// ```
pub fn orifice_discharge(cd: f64, area_sqft: f64, head_ft: f64) -> HydroResult<f64> {
    if cd <= 0.0 {
        return Err(HydrologyError::NonPositiveCoefficient { value: cd });
    }
    if area_sqft <= 0.0 {
        return Err(HydrologyError::NonPositiveDimension { value: area_sqft });
    }
    if head_ft < 0.0 {
        return Err(HydrologyError::NegativeHead { head: head_ft });
    }
    Ok(cd * area_sqft * (2.0 * GRAVITY_FT_S2 * head_ft).sqrt())
}

/// Rectangular sharp-crested weir discharge, uncontracted/suppressed
/// (Francis formula): `Q = Cw·L·H^1.5`.
///
/// `cw` is the weir coefficient (typically ~3.33 for a suppressed
/// sharp-crested weir in US customary units, neglecting velocity of
/// approach), `length_ft` is the weir crest length (ft), and `head_ft` is
/// the head above the weir crest (ft).
///
/// # Errors
/// - [`HydrologyError::NonPositiveCoefficient`] if `cw <= 0`.
/// - [`HydrologyError::NonPositiveDimension`] if `length_ft <= 0`.
/// - [`HydrologyError::NegativeHead`] if `head_ft < 0`.
///
/// # Example
/// A 5-ft-long suppressed weir under 0.5 ft of head:
/// ```
/// use thoth_hydrology::outlet_hydraulics::rectangular_weir_discharge;
///
/// let q = rectangular_weir_discharge(3.33, 5.0, 0.5).unwrap();
/// assert!((q - 5.886663953378008).abs() < 1e-9);
/// ```
pub fn rectangular_weir_discharge(cw: f64, length_ft: f64, head_ft: f64) -> HydroResult<f64> {
    if cw <= 0.0 {
        return Err(HydrologyError::NonPositiveCoefficient { value: cw });
    }
    if length_ft <= 0.0 {
        return Err(HydrologyError::NonPositiveDimension { value: length_ft });
    }
    if head_ft < 0.0 {
        return Err(HydrologyError::NegativeHead { head: head_ft });
    }
    Ok(cw * length_ft * head_ft.powf(1.5))
}

/// Rectangular sharp-crested weir discharge **with two end contractions**
/// (Francis formula's contraction correction): `Q = Cw·(L - 0.2H)·H^1.5`.
///
/// Valid only while `L > 0.2·H` (a physically meaningful effective crest
/// length remains); use [`rectangular_weir_discharge`] for a suppressed weir
/// spanning the full channel width (no contractions).
///
/// # Errors
/// - [`HydrologyError::NonPositiveCoefficient`] if `cw <= 0`.
/// - [`HydrologyError::NonPositiveDimension`] if `length_ft <= 0`, or if the
///   effective contracted length `length_ft - 0.2·head_ft` is not positive.
/// - [`HydrologyError::NegativeHead`] if `head_ft < 0`.
///
/// # Example
/// ```
/// use thoth_hydrology::outlet_hydraulics::contracted_rectangular_weir_discharge;
///
/// let q = contracted_rectangular_weir_discharge(3.33, 5.0, 0.5).unwrap();
/// assert!((q - 5.7689306743104485).abs() < 1e-9);
/// ```
pub fn contracted_rectangular_weir_discharge(
    cw: f64,
    length_ft: f64,
    head_ft: f64,
) -> HydroResult<f64> {
    if cw <= 0.0 {
        return Err(HydrologyError::NonPositiveCoefficient { value: cw });
    }
    if length_ft <= 0.0 {
        return Err(HydrologyError::NonPositiveDimension { value: length_ft });
    }
    if head_ft < 0.0 {
        return Err(HydrologyError::NegativeHead { head: head_ft });
    }
    let effective_length = length_ft - 0.2 * head_ft;
    if effective_length <= 0.0 {
        return Err(HydrologyError::NonPositiveDimension {
            value: effective_length,
        });
    }
    Ok(cw * effective_length * head_ft.powf(1.5))
}

/// Broad-crested weir discharge: `Q = Cw·L·H^1.5`, the same functional form
/// as [`rectangular_weir_discharge`] but with a lower typical coefficient
/// (`Cw ≈ 2.6-3.1` in US customary units, versus ~3.33 for sharp-crested)
/// reflecting critical-depth-controlled flow over a wide crest rather than a
/// thin plate.
///
/// # Errors
/// Same as [`rectangular_weir_discharge`].
pub fn broad_crested_weir_discharge(cw: f64, length_ft: f64, head_ft: f64) -> HydroResult<f64> {
    rectangular_weir_discharge(cw, length_ft, head_ft)
}

/// V-notch (triangular) weir discharge:
///
/// `Q = (8/15)·Cd·√(2g)·tan(θ/2)·H^2.5`
///
/// `cd` is the discharge coefficient (typically ~0.58-0.62 for a sharp-edged
/// V-notch), `notch_angle_radians` is the full notch angle `θ` (e.g. `π/2`
/// for the common 90° V-notch), and `head_ft` is head above the notch's
/// vertex (ft).
///
/// # Errors
/// - [`HydrologyError::NonPositiveCoefficient`] if `cd <= 0`.
/// - [`HydrologyError::AngleOutOfRange`] if `notch_angle_radians` is outside
///   `(0, π)`.
/// - [`HydrologyError::NegativeHead`] if `head_ft < 0`.
///
/// # Example
/// A 90° V-notch (`Cd = 0.58`) under 0.5 ft of head — note this reproduces
/// the commonly cited "`Q ≈ 2.5·H^2.5`" rule of thumb for a 90° notch:
/// ```
/// use thoth_hydrology::outlet_hydraulics::v_notch_weir_discharge;
/// use std::f64::consts::PI;
///
/// let q = v_notch_weir_discharge(0.58, PI / 2.0, 0.5).unwrap();
/// assert!((q - 0.4388283390018369).abs() < 1e-9);
/// assert!((q - 2.4823879542802234 * 0.5f64.powf(2.5)).abs() < 1e-9);
/// ```
pub fn v_notch_weir_discharge(cd: f64, notch_angle_radians: f64, head_ft: f64) -> HydroResult<f64> {
    if cd <= 0.0 {
        return Err(HydrologyError::NonPositiveCoefficient { value: cd });
    }
    if !(notch_angle_radians > 0.0 && notch_angle_radians < std::f64::consts::PI) {
        return Err(HydrologyError::AngleOutOfRange {
            radians: notch_angle_radians,
        });
    }
    if head_ft < 0.0 {
        return Err(HydrologyError::NegativeHead { head: head_ft });
    }
    Ok((8.0 / 15.0)
        * cd
        * (2.0 * GRAVITY_FT_S2).sqrt()
        * (notch_angle_radians / 2.0).tan()
        * head_ft.powf(2.5))
}

/// One stage of a multi-stage outlet structure: an orifice or weir with an
/// invert elevation. [`rating_curve`] sums each component's free-discharge
/// contribution at a given water-surface (headwater) elevation, using
/// `max(0, elevation - invert)` as that component's head — the standard way
/// composite outlet structures (e.g. an orifice for the water-quality
/// volume, a weir riser for the 10-year event, an emergency spillway for
/// the 100-year event) are modeled.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum OutletComponent {
    Orifice {
        invert_ft: f64,
        cd: f64,
        area_sqft: f64,
    },
    RectangularWeir {
        invert_ft: f64,
        cw: f64,
        length_ft: f64,
    },
    ContractedRectangularWeir {
        invert_ft: f64,
        cw: f64,
        length_ft: f64,
    },
    VNotchWeir {
        invert_ft: f64,
        cd: f64,
        notch_angle_radians: f64,
    },
}

impl OutletComponent {
    /// This component's invert (activation) elevation.
    pub fn invert_ft(&self) -> f64 {
        match *self {
            OutletComponent::Orifice { invert_ft, .. }
            | OutletComponent::RectangularWeir { invert_ft, .. }
            | OutletComponent::ContractedRectangularWeir { invert_ft, .. }
            | OutletComponent::VNotchWeir { invert_ft, .. } => invert_ft,
        }
    }

    /// This component's discharge (cfs) at water-surface elevation
    /// `elevation_ft`; `0.0` if `elevation_ft` is at or below the
    /// component's invert.
    ///
    /// # Errors
    /// Propagates the underlying hydraulic equation's coefficient/dimension
    /// validation errors.
    pub fn discharge_at(&self, elevation_ft: f64) -> HydroResult<f64> {
        let head = elevation_ft - self.invert_ft();
        if head <= 0.0 {
            return Ok(0.0);
        }
        match *self {
            OutletComponent::Orifice { cd, area_sqft, .. } => {
                orifice_discharge(cd, area_sqft, head)
            }
            OutletComponent::RectangularWeir { cw, length_ft, .. } => {
                rectangular_weir_discharge(cw, length_ft, head)
            }
            OutletComponent::ContractedRectangularWeir { cw, length_ft, .. } => {
                contracted_rectangular_weir_discharge(cw, length_ft, head)
            }
            OutletComponent::VNotchWeir {
                cd,
                notch_angle_radians,
                ..
            } => v_notch_weir_discharge(cd, notch_angle_radians, head),
        }
    }
}

/// A composite outlet-structure rating curve: total discharge (cfs) at each
/// of `stages_ft` (ft), summing every component's contribution.
///
/// # Errors
/// Propagates any component's [`OutletComponent::discharge_at`] error.
///
/// # Example
/// A two-stage structure: a low-flow orifice with a 1-ft invert, and an
/// overflow weir with a 3-ft invert:
/// ```
/// use thoth_hydrology::outlet_hydraulics::{rating_curve, OutletComponent};
/// use std::f64::consts::PI;
///
/// let components = vec![
///     OutletComponent::Orifice {
///         invert_ft: 1.0,
///         cd: 0.6,
///         area_sqft: PI * (0.5_f64).powi(2),
///     },
///     OutletComponent::RectangularWeir {
///         invert_ft: 3.0,
///         cw: 3.33,
///         length_ft: 5.0,
///     },
/// ];
/// let curve = rating_curve(&components, &[0.5, 1.5, 3.5]).unwrap();
/// assert_eq!(curve[0], 0.0); // below both inverts
/// assert!(curve[1] > 0.0 && curve[2] > curve[1]); // orifice, then orifice + weir
/// ```
pub fn rating_curve(components: &[OutletComponent], stages_ft: &[f64]) -> HydroResult<Vec<f64>> {
    stages_ft
        .iter()
        .map(|&stage| {
            components
                .iter()
                .try_fold(0.0, |acc, c| Ok(acc + c.discharge_at(stage)?))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;
    use std::f64::consts::PI;

    #[test]
    fn orifice_discharge_matches_hand_calculation() {
        let area = PI * (1.0_f64 / 2.0).powi(2);
        let q = orifice_discharge(0.6, area, 2.0).unwrap();
        assert_relative_eq!(q, 5.348094385326138, epsilon = 1e-9);
    }

    #[test]
    fn orifice_discharge_rejects_bad_inputs() {
        assert!(orifice_discharge(0.0, 1.0, 1.0).is_err());
        assert!(orifice_discharge(0.6, 0.0, 1.0).is_err());
        assert!(orifice_discharge(0.6, 1.0, -1.0).is_err());
    }

    #[test]
    fn rectangular_weir_matches_francis_formula() {
        let q = rectangular_weir_discharge(3.33, 5.0, 0.5).unwrap();
        assert_relative_eq!(q, 5.886663953378008, epsilon = 1e-9);
    }

    #[test]
    fn contracted_weir_is_less_than_suppressed_weir() {
        let suppressed = rectangular_weir_discharge(3.33, 5.0, 0.5).unwrap();
        let contracted = contracted_rectangular_weir_discharge(3.33, 5.0, 0.5).unwrap();
        assert!(contracted < suppressed);
        assert_relative_eq!(contracted, 5.7689306743104485, epsilon = 1e-9);
    }

    #[test]
    fn contracted_weir_rejects_degenerate_effective_length() {
        // L=0.1, H=1.0 => effective length = 0.1 - 0.2 = negative.
        assert!(contracted_rectangular_weir_discharge(3.33, 0.1, 1.0).is_err());
    }

    #[test]
    fn v_notch_matches_hand_calculation() {
        let q = v_notch_weir_discharge(0.58, PI / 2.0, 0.5).unwrap();
        assert_relative_eq!(q, 0.4388283390018369, epsilon = 1e-9);
    }

    #[test]
    fn v_notch_rejects_bad_angle() {
        assert!(v_notch_weir_discharge(0.58, 0.0, 1.0).is_err());
        assert!(v_notch_weir_discharge(0.58, PI, 1.0).is_err());
        assert!(v_notch_weir_discharge(0.58, -0.1, 1.0).is_err());
    }

    #[test]
    fn component_discharge_is_zero_below_invert() {
        let orifice = OutletComponent::Orifice {
            invert_ft: 2.0,
            cd: 0.6,
            area_sqft: 1.0,
        };
        assert_eq!(orifice.discharge_at(1.0).unwrap(), 0.0);
        assert_eq!(orifice.discharge_at(2.0).unwrap(), 0.0);
        assert!(orifice.discharge_at(2.5).unwrap() > 0.0);
    }

    #[test]
    fn rating_curve_sums_active_components() {
        let components = vec![
            OutletComponent::Orifice {
                invert_ft: 1.0,
                cd: 0.6,
                area_sqft: PI * 0.5_f64.powi(2),
            },
            OutletComponent::RectangularWeir {
                invert_ft: 3.0,
                cw: 3.33,
                length_ft: 5.0,
            },
        ];
        let stages = [0.5, 1.5, 3.5];
        let curve = rating_curve(&components, &stages).unwrap();
        assert_relative_eq!(curve[0], 0.0, epsilon = 1e-12);
        let orifice_only = orifice_discharge(0.6, PI * 0.5_f64.powi(2), 0.5).unwrap();
        assert_relative_eq!(curve[1], orifice_only, epsilon = 1e-9);
        let orifice_at_3_5 = orifice_discharge(0.6, PI * 0.5_f64.powi(2), 2.5).unwrap();
        let weir_at_3_5 = rectangular_weir_discharge(3.33, 5.0, 0.5).unwrap();
        assert_relative_eq!(curve[2], orifice_at_3_5 + weir_at_3_5, epsilon = 1e-9);
    }
}
