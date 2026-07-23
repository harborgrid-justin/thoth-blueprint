//! LID/BMP sizing: bioretention cell, permeable pavement, and vegetated
//! swale capacity/sizing calculations.
//!
//! Sources:
//! - Bioretention: the Darcy's Law filter-bed sizing equation used by
//!   numerous state BMP design manuals (e.g. Virginia DEQ/DCR BMP Design
//!   Specification No. 9, "Bioretention"; the Prince George's County, MD
//!   *Bioretention Manual*).
//! - Permeable pavement: aggregate-reservoir storage volume from depth and
//!   void ratio (porosity) — standard practice in every permeable pavement
//!   design guide (e.g. ACI 522R, FHWA's *Porous Asphalt Pavements*).
//! - Vegetated swale: Manning's-equation capacity (via
//!   [`crate::time_of_concentration::manning_velocity`]) plus a minimum
//!   hydraulic residence time criterion for water-quality treatment
//!   (commonly 9 minutes at the water-quality design flow — e.g. the
//!   Georgia Stormwater Manual, and many others derived from it).
//!
//! # Assumptions and valid range
//! - Bioretention sizing assumes steady, saturated (Darcy) flow through
//!   the filter media at its full design ponding depth for the entire
//!   drawdown period — a simplification of the true unsteady infiltration
//!   process, but the standard hand-calculation method these manuals
//!   specify.
//! - Permeable pavement sizing assumes a single-layer aggregate reservoir
//!   with a single effective porosity, not a multi-layer (bedding +
//!   base + subbase) system with different porosities per layer.
//! - Vegetated swale sizing checks *capacity and residence time* only; it
//!   does not check erosion/permissible-velocity criteria (a separate,
//!   material-specific check).

use crate::error::{HydroResult, HydrologyError};
use crate::time_of_concentration::{manning_velocity, ChannelCrossSection};

/// Bioretention filter-bed surface area (ft²) via the Darcy's Law sizing
/// equation:
///
/// `Af = (WQv · d) / (k · (h + d) · tf)`
///
/// `wqv_cf` is the water-quality volume to capture (ft³, see
/// [`crate::water_quality::water_quality_volume`]), `media_depth_ft` is the
/// filter media depth (`d`, ft — typically 2-4 ft), `permeability_ft_per_day`
/// is the filter media's saturated hydraulic conductivity (`k`, ft/day),
/// `avg_ponding_head_ft` is the average height of ponded water above the
/// filter surface during drawdown (`h`, ft — often taken as half the
/// maximum ponding depth), and `drain_time_days` is the target full-volume
/// drawdown time (`tf`, days — commonly capped at 2 days / 48 hours to
/// avoid a mosquito-breeding/vector concern and to reset capacity before
/// the next storm).
///
/// # Errors
/// - [`HydrologyError::NonPositiveDimension`] if `wqv_cf <= 0` or
///   `media_depth_ft <= 0`.
/// - [`HydrologyError::NonPositiveCoefficient`] if
///   `permeability_ft_per_day <= 0`.
/// - [`HydrologyError::NegativeHead`] if `avg_ponding_head_ft < 0`.
/// - [`HydrologyError::NonPositiveTimeStep`] if `drain_time_days <= 0`.
///
/// # Example
/// A 2000 ft³ water-quality volume, 2.5 ft media depth, `k = 0.5` ft/day,
/// 0.5 ft average ponding head, 2-day drawdown:
/// ```
/// use thoth_hydrology::lid::bioretention_surface_area;
///
/// let area = bioretention_surface_area(2000.0, 2.5, 0.5, 0.5, 2.0).unwrap();
/// assert!((area - 1666.6666666666667).abs() < 1e-6);
/// ```
pub fn bioretention_surface_area(
    wqv_cf: f64,
    media_depth_ft: f64,
    permeability_ft_per_day: f64,
    avg_ponding_head_ft: f64,
    drain_time_days: f64,
) -> HydroResult<f64> {
    if wqv_cf <= 0.0 {
        return Err(HydrologyError::NonPositiveDimension { value: wqv_cf });
    }
    if media_depth_ft <= 0.0 {
        return Err(HydrologyError::NonPositiveDimension {
            value: media_depth_ft,
        });
    }
    if permeability_ft_per_day <= 0.0 {
        return Err(HydrologyError::NonPositiveCoefficient {
            value: permeability_ft_per_day,
        });
    }
    if avg_ponding_head_ft < 0.0 {
        return Err(HydrologyError::NegativeHead {
            head: avg_ponding_head_ft,
        });
    }
    if drain_time_days <= 0.0 {
        return Err(HydrologyError::NonPositiveTimeStep {
            dt: drain_time_days,
        });
    }
    Ok((wqv_cf * media_depth_ft)
        / (permeability_ft_per_day * (avg_ponding_head_ft + media_depth_ft) * drain_time_days))
}

/// Permeable pavement aggregate-reservoir surface area (ft²) needed to
/// store `required_storage_cf` in a single-layer aggregate base of
/// `aggregate_depth_ft` depth and `porosity` void ratio:
///
/// `Area = V / (depth · porosity)`
///
/// # Errors
/// - [`HydrologyError::NonPositiveDimension`] if `required_storage_cf <= 0`
///   or `aggregate_depth_ft <= 0`.
/// - [`HydrologyError::FractionOutOfRange`] if `porosity` is outside
///   `(0, 1]`.
///
/// # Example
/// A 1500 ft³ storage requirement, 1.5 ft aggregate depth, 40% porosity:
/// ```
/// use thoth_hydrology::lid::permeable_pavement_area;
///
/// let area = permeable_pavement_area(1500.0, 1.5, 0.4).unwrap();
/// assert!((area - 2499.9999999999995).abs() < 1e-6);
/// ```
pub fn permeable_pavement_area(
    required_storage_cf: f64,
    aggregate_depth_ft: f64,
    porosity: f64,
) -> HydroResult<f64> {
    if required_storage_cf <= 0.0 {
        return Err(HydrologyError::NonPositiveDimension {
            value: required_storage_cf,
        });
    }
    if aggregate_depth_ft <= 0.0 {
        return Err(HydrologyError::NonPositiveDimension {
            value: aggregate_depth_ft,
        });
    }
    if !(0.0..=1.0).contains(&porosity) || porosity == 0.0 {
        return Err(HydrologyError::FractionOutOfRange { value: porosity });
    }
    Ok(required_storage_cf / (aggregate_depth_ft * porosity))
}

/// Minimum vegetated-swale length (ft) to provide a target hydraulic
/// residence time at the water-quality design flow:
///
/// `L = V · t_residence`
///
/// `V` is the Manning's-equation flow velocity ([`manning_velocity`]) in
/// the swale's cross section at `design_flow_cfs`'s corresponding flow
/// depth (encoded in `cross_section`), and `min_residence_time_minutes` is
/// the minimum contact time for water-quality treatment (commonly 9
/// minutes).
///
/// Note: `design_flow_cfs` is not itself used in this formula beyond having
/// already determined `cross_section`'s flow depth upstream (i.e. the
/// caller must size `cross_section` to convey `design_flow_cfs` at normal
/// depth before calling this function) — it is accepted here only for
/// documentation/traceability in the returned context, not re-derived.
///
/// # Errors
/// - [`HydrologyError::NonPositiveTimeStep`] if
///   `min_residence_time_minutes <= 0`.
/// - Propagates [`manning_velocity`]'s errors.
///
/// # Example
/// A trapezoidal swale (4 ft bottom width, 3H:1V side slopes, 0.5 ft flow
/// depth), `n = 0.035`, 2% slope, 9-minute minimum residence time:
/// ```
/// use thoth_hydrology::lid::swale_water_quality_length;
/// use thoth_hydrology::time_of_concentration::ChannelCrossSection;
///
/// let cross_section = ChannelCrossSection::Trapezoidal {
///     bottom_width_ft: 4.0,
///     side_slope_h_per_v: 3.0,
///     depth_ft: 0.5,
/// };
/// let length = swale_water_quality_length(5.0, cross_section, 0.02, 0.035, 9.0).unwrap();
/// assert!((length - 1717.4390843626807).abs() < 1e-6);
/// ```
pub fn swale_water_quality_length(
    _design_flow_cfs: f64,
    cross_section: ChannelCrossSection,
    slope: f64,
    manning_n: f64,
    min_residence_time_minutes: f64,
) -> HydroResult<f64> {
    if min_residence_time_minutes <= 0.0 {
        return Err(HydrologyError::NonPositiveTimeStep {
            dt: min_residence_time_minutes,
        });
    }
    let velocity = manning_velocity(manning_n, cross_section, slope)?;
    Ok(velocity * min_residence_time_minutes * 60.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn bioretention_area_matches_hand_calculation() {
        let area = bioretention_surface_area(2000.0, 2.5, 0.5, 0.5, 2.0).unwrap();
        assert_relative_eq!(area, 1666.6666666666667, epsilon = 1e-6);
    }

    #[test]
    fn bioretention_area_rejects_bad_inputs() {
        assert!(bioretention_surface_area(0.0, 2.5, 0.5, 0.5, 2.0).is_err());
        assert!(bioretention_surface_area(2000.0, 0.0, 0.5, 0.5, 2.0).is_err());
        assert!(bioretention_surface_area(2000.0, 2.5, 0.0, 0.5, 2.0).is_err());
        assert!(bioretention_surface_area(2000.0, 2.5, 0.5, -0.1, 2.0).is_err());
        assert!(bioretention_surface_area(2000.0, 2.5, 0.5, 0.5, 0.0).is_err());
    }

    #[test]
    fn deeper_media_increases_required_area() {
        // Deeper media needs a larger area to drain the same volume in the
        // same time at the same permeability (more media to push water
        // through, same driving head).
        let shallow = bioretention_surface_area(2000.0, 1.5, 0.5, 0.5, 2.0).unwrap();
        let deep = bioretention_surface_area(2000.0, 3.0, 0.5, 0.5, 2.0).unwrap();
        assert!(deep > shallow);
    }

    #[test]
    fn permeable_pavement_area_matches_hand_calculation() {
        let area = permeable_pavement_area(1500.0, 1.5, 0.4).unwrap();
        assert_relative_eq!(area, 2499.9999999999995, epsilon = 1e-6);
    }

    #[test]
    fn permeable_pavement_area_rejects_bad_inputs() {
        assert!(permeable_pavement_area(0.0, 1.5, 0.4).is_err());
        assert!(permeable_pavement_area(1500.0, 0.0, 0.4).is_err());
        assert!(permeable_pavement_area(1500.0, 1.5, 0.0).is_err());
        assert!(permeable_pavement_area(1500.0, 1.5, 1.5).is_err());
    }

    #[test]
    fn swale_length_matches_hand_calculation() {
        let cross_section = ChannelCrossSection::Trapezoidal {
            bottom_width_ft: 4.0,
            side_slope_h_per_v: 3.0,
            depth_ft: 0.5,
        };
        let length = swale_water_quality_length(5.0, cross_section, 0.02, 0.035, 9.0).unwrap();
        assert_relative_eq!(length, 1717.4390843626807, epsilon = 1e-6);
    }

    #[test]
    fn swale_length_rejects_non_positive_residence_time() {
        let cross_section = ChannelCrossSection::Trapezoidal {
            bottom_width_ft: 4.0,
            side_slope_h_per_v: 3.0,
            depth_ft: 0.5,
        };
        assert!(swale_water_quality_length(5.0, cross_section, 0.02, 0.035, 0.0).is_err());
    }
}
