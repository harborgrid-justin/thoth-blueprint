//! Water-quality volume (WQv) / first-flush capture-volume sizing.
//!
//! Source: the EPA/Center for Watershed Protection "Simple Method"
//! (Schueler, T.R., 1987, *Controlling Urban Runoff*), the basis for the
//! `Rv` (runoff coefficient) formula most US state stormwater manuals use
//! to size a water-quality/first-flush capture volume ahead of a BMP:
//!
//! `Rv = 0.05 + 0.009·I` (`I` = percent impervious cover, 0-100)
//! `WQv = P·Rv·A / 12` (ac-ft), `P` = water-quality design storm depth (in),
//! `A` = drainage area (acres)
//!
//! # Assumptions and valid range
//! - `Rv`'s linear form is an empirical fit valid for `I` between 0% and
//!   100%; it is not re-derived from soil/land-cover data here.
//! - `P` (the water-quality design storm depth) is a jurisdiction-specific
//!   policy choice (commonly the 90th-percentile 24-hour storm, often
//!   ~1 inch in much of the US) — this module does not embed any single
//!   jurisdiction's value; the caller supplies it.

use crate::error::{HydroResult, HydrologyError};

/// Cubic feet per acre-foot.
const CF_PER_ACRE_FOOT: f64 = 43_560.0;

/// The volumetric runoff coefficient `Rv = 0.05 + 0.009·I` (EPA Simple
/// Method), where `imperviousness_fraction` is `I/100` expressed as a
/// `[0, 1]` fraction.
///
/// # Errors
/// [`HydrologyError::FractionOutOfRange`] if `imperviousness_fraction` is
/// outside `[0, 1]`.
pub fn volumetric_runoff_coefficient(imperviousness_fraction: f64) -> HydroResult<f64> {
    if !(0.0..=1.0).contains(&imperviousness_fraction) {
        return Err(HydrologyError::FractionOutOfRange {
            value: imperviousness_fraction,
        });
    }
    Ok(0.05 + 0.009 * (imperviousness_fraction * 100.0))
}

/// Water-quality volume (WQv) sizing result.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct WaterQualityVolume {
    pub runoff_coefficient: f64,
    pub volume_acre_feet: f64,
    pub volume_cubic_feet: f64,
}

/// Water-quality/first-flush capture volume (the EPA Simple Method):
///
/// `WQv = P·Rv·A / 12` (ac-ft)
///
/// `area_acres` is the contributing drainage area, `imperviousness_fraction`
/// is the fraction (`[0, 1]`) of that area that is impervious, and
/// `design_depth_in` is the water-quality design storm depth (in) — a
/// jurisdiction-specific policy value the caller supplies.
///
/// # Errors
/// - [`HydrologyError::NonPositiveArea`] if `area_acres <= 0`.
/// - [`HydrologyError::FractionOutOfRange`] if `imperviousness_fraction` is
///   outside `[0, 1]`.
/// - [`HydrologyError::NegativeRainfallDepth`] if `design_depth_in < 0`.
///
/// # Example
/// A 10-acre site, 40% impervious, sized to the commonly used 1-inch
/// water-quality storm:
/// ```
/// use thoth_hydrology::water_quality::water_quality_volume;
///
/// let wqv = water_quality_volume(10.0, 0.4, 1.0).unwrap();
/// assert!((wqv.runoff_coefficient - 0.41).abs() < 1e-9);
/// assert!((wqv.volume_acre_feet - 0.3416666666666666).abs() < 1e-9);
/// assert!((wqv.volume_cubic_feet - 14882.999999999998).abs() < 1e-6);
/// ```
pub fn water_quality_volume(
    area_acres: f64,
    imperviousness_fraction: f64,
    design_depth_in: f64,
) -> HydroResult<WaterQualityVolume> {
    if area_acres <= 0.0 {
        return Err(HydrologyError::NonPositiveArea { area: area_acres });
    }
    if design_depth_in < 0.0 {
        return Err(HydrologyError::NegativeRainfallDepth {
            depth: design_depth_in,
        });
    }
    let rv = volumetric_runoff_coefficient(imperviousness_fraction)?;
    let volume_acre_feet = design_depth_in * rv * area_acres / 12.0;
    Ok(WaterQualityVolume {
        runoff_coefficient: rv,
        volume_acre_feet,
        volume_cubic_feet: volume_acre_feet * CF_PER_ACRE_FOOT,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn rv_matches_epa_simple_method_formula() {
        assert_relative_eq!(
            volumetric_runoff_coefficient(0.4).unwrap(),
            0.41,
            epsilon = 1e-9
        );
        assert_relative_eq!(
            volumetric_runoff_coefficient(0.0).unwrap(),
            0.05,
            epsilon = 1e-9
        );
        assert_relative_eq!(
            volumetric_runoff_coefficient(1.0).unwrap(),
            0.95,
            epsilon = 1e-9
        );
    }

    #[test]
    fn rv_rejects_out_of_range_fraction() {
        assert!(volumetric_runoff_coefficient(1.5).is_err());
        assert!(volumetric_runoff_coefficient(-0.1).is_err());
    }

    #[test]
    fn wqv_matches_hand_calculation() {
        let wqv = water_quality_volume(10.0, 0.4, 1.0).unwrap();
        assert_relative_eq!(wqv.runoff_coefficient, 0.41, epsilon = 1e-9);
        assert_relative_eq!(wqv.volume_acre_feet, 0.3416666666666666, epsilon = 1e-9);
        assert_relative_eq!(wqv.volume_cubic_feet, 14882.999999999998, epsilon = 1e-6);
    }

    #[test]
    fn wqv_rejects_bad_inputs() {
        assert!(water_quality_volume(0.0, 0.4, 1.0).is_err());
        assert!(water_quality_volume(10.0, 1.5, 1.0).is_err());
        assert!(water_quality_volume(10.0, 0.4, -1.0).is_err());
    }
}
