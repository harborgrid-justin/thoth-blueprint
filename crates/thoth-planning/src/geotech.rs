//! Basic geotechnical screening: the infinite-slope factor-of-safety check.
//!
//! Item 49 of the Theme 4 subdivision-design-automation gap analysis. This is
//! a screening-level tool (a quick "is this slope worth a geotechnical
//! engineer's attention" flag), not a substitute for a site-specific
//! subsurface investigation or a rigorous limit-equilibrium analysis (e.g.
//! Bishop, Janbu, or Spencer methods with a searched critical slip surface).
//! The infinite-slope method assumes a slip surface parallel to the ground
//! surface at a uniform depth, which is a reasonable approximation for a
//! shallow, planar, translational slide on a long slope (the common failure
//! mode for residential subdivision cut/fill slopes) but not for rotational
//! or deep-seated failures.
//!
//! No new dependency: pure formula over caller-supplied soil/slope
//! parameters, consistent with this crate's framework-agnostic scope.

use thiserror::Error;

/// Everything that can make an infinite-slope factor-of-safety input invalid.
#[derive(Debug, Clone, Copy, PartialEq, Error)]
pub enum GeotechError {
    #[error("Slope angle must be strictly between 0 and 90 degrees, got {0}.")]
    InvalidSlopeAngle(f64),
    #[error("Friction angle must be within [0, 90) degrees, got {0}.")]
    InvalidFrictionAngle(f64),
    #[error("Soil unit weight must be greater than 0, got {0}.")]
    InvalidUnitWeight(f64),
    #[error("Slip-plane depth must be greater than 0, got {0}.")]
    InvalidDepth(f64),
    #[error("Cohesion must be non-negative, got {0}.")]
    InvalidCohesion(f64),
}

/// A qualitative stability bucket for a computed factor of safety, using the
/// thresholds conventional in geotechnical practice for permanent slopes
/// (e.g. NAVFAC DM-7.1 and typical state DOT geotechnical manuals treat
/// FS &lt; 1.0 as an active/imminent failure condition, FS in [1.0, 1.25) as
/// marginally stable and warranting mitigation, FS in [1.25, 1.5) as stable
/// but below the typical permanent-structure design target, and FS &gt;= 1.5
/// as meeting the common long-term static design target).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SlopeStabilityClass {
    /// FS < 1.0 — the slope is analytically at or past failure.
    Unstable,
    /// 1.0 <= FS < 1.25 — marginally stable; mitigation should be evaluated.
    MarginallyStable,
    /// 1.25 <= FS < 1.5 — stable but below the common long-term design target.
    Stable,
    /// FS >= 1.5 — meets the common long-term static design target.
    WellStable,
}

/// Classify a computed factor of safety into a [`SlopeStabilityClass`].
pub fn slope_stability_class(factor_of_safety: f64) -> SlopeStabilityClass {
    if factor_of_safety < 1.0 {
        SlopeStabilityClass::Unstable
    } else if factor_of_safety < 1.25 {
        SlopeStabilityClass::MarginallyStable
    } else if factor_of_safety < 1.5 {
        SlopeStabilityClass::Stable
    } else {
        SlopeStabilityClass::WellStable
    }
}

/// Infinite-slope limit-equilibrium factor of safety, the classic screening
/// formula for a shallow translational slide on a long, planar slope:
///
/// ```text
/// FS = [c + (γ·z·cos²β − u)·tanφ] / (γ·z·sinβ·cosβ)
/// ```
///
/// where `c` is the soil's effective cohesion, `γ` its total unit weight,
/// `z` the vertical depth to the slip plane, `β` the slope angle from
/// horizontal, `φ` the effective friction angle, and `u` the pore-water
/// pressure at the slip plane. `γ·z·cos²β` is the total normal stress on the
/// slip plane and `γ·z·sinβ·cosβ` is the mobilized (driving) shear stress;
/// the numerator is the plane's shear strength via the Mohr-Coulomb
/// criterion. This is the standard infinite-slope equation presented in
/// geotechnical references such as Duncan, Wright & Brandon, *Soil Strength
/// and Slope Stability*, 2nd ed. (Wiley, 2014), §2.4, and used by USGS/NRCS
/// regional slope-stability screening tools.
///
/// All stress inputs (`soil_unit_weight`, `cohesion`, `pore_pressure`) must
/// share one consistent unit system (e.g. all in kPa/kN·m⁻³, or all in
/// psf/pcf) — this function does not perform unit conversion.
///
/// # Errors
/// Returns [`GeotechError`] for a slope angle outside `(0, 90)` degrees (flat
/// ground has no driving shear; vertical ground makes the normal-stress term
/// undefined), a friction angle outside `[0, 90)`, a non-positive unit weight
/// or depth, or negative cohesion.
pub fn infinite_slope_factor_of_safety(
    slope_angle_deg: f64,
    soil_unit_weight: f64,
    slip_plane_depth: f64,
    cohesion: f64,
    friction_angle_deg: f64,
    pore_pressure: f64,
) -> Result<f64, GeotechError> {
    if !(slope_angle_deg > 0.0 && slope_angle_deg < 90.0) {
        return Err(GeotechError::InvalidSlopeAngle(slope_angle_deg));
    }
    if !(friction_angle_deg >= 0.0 && friction_angle_deg < 90.0) {
        return Err(GeotechError::InvalidFrictionAngle(friction_angle_deg));
    }
    if soil_unit_weight <= 0.0 {
        return Err(GeotechError::InvalidUnitWeight(soil_unit_weight));
    }
    if slip_plane_depth <= 0.0 {
        return Err(GeotechError::InvalidDepth(slip_plane_depth));
    }
    if cohesion < 0.0 {
        return Err(GeotechError::InvalidCohesion(cohesion));
    }

    let beta = slope_angle_deg.to_radians();
    let phi = friction_angle_deg.to_radians();
    let vertical_stress = soil_unit_weight * slip_plane_depth;
    let normal_stress = vertical_stress * beta.cos().powi(2);
    let driving_shear = vertical_stress * beta.sin() * beta.cos();
    let shear_strength = cohesion + (normal_stress - pore_pressure) * phi.tan();

    Ok(shear_strength / driving_shear)
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    /// Dry, cohesive slope: β=30°, γ=19 kN/m³, z=3 m, c=5 kPa, φ=30°, u=0.
    /// Hand-computed expected FS ≈ 1.203.
    #[test]
    fn dry_slope_matches_hand_calculation() {
        let fs = infinite_slope_factor_of_safety(30.0, 19.0, 3.0, 5.0, 30.0, 0.0).unwrap();
        assert_relative_eq!(fs, 1.2028, epsilon = 1e-3);
        assert_eq!(slope_stability_class(fs), SlopeStabilityClass::MarginallyStable);
    }

    /// The same slope saturated to u=20 kPa: pore pressure erodes the
    /// effective normal stress and drops FS below 1 (unstable) — the
    /// textbook demonstration of why drainage matters for cut slopes.
    #[test]
    fn pore_pressure_can_push_a_marginal_slope_to_failure() {
        let fs = infinite_slope_factor_of_safety(30.0, 19.0, 3.0, 5.0, 30.0, 20.0).unwrap();
        assert!(fs < 1.0, "expected an unstable FS, got {fs}");
        assert_eq!(slope_stability_class(fs), SlopeStabilityClass::Unstable);
    }

    /// Cohesionless, dry slope at the friction angle: FS should be
    /// approximately 1.0 regardless of depth (the classic infinite-slope
    /// result that a cohesionless slope is marginally stable at φ = β).
    #[test]
    fn cohesionless_slope_at_friction_angle_is_marginally_stable() {
        let fs = infinite_slope_factor_of_safety(28.0, 18.0, 2.0, 0.0, 28.0, 0.0).unwrap();
        assert_relative_eq!(fs, 1.0, epsilon = 1e-9);
    }

    #[test]
    fn rejects_flat_and_vertical_slope_angles() {
        assert!(matches!(
            infinite_slope_factor_of_safety(0.0, 19.0, 3.0, 5.0, 30.0, 0.0),
            Err(GeotechError::InvalidSlopeAngle(_))
        ));
        assert!(matches!(
            infinite_slope_factor_of_safety(90.0, 19.0, 3.0, 5.0, 30.0, 0.0),
            Err(GeotechError::InvalidSlopeAngle(_))
        ));
    }

    #[test]
    fn rejects_nonpositive_unit_weight_and_depth() {
        assert!(matches!(
            infinite_slope_factor_of_safety(30.0, 0.0, 3.0, 5.0, 30.0, 0.0),
            Err(GeotechError::InvalidUnitWeight(_))
        ));
        assert!(matches!(
            infinite_slope_factor_of_safety(30.0, 19.0, 0.0, 5.0, 30.0, 0.0),
            Err(GeotechError::InvalidDepth(_))
        ));
    }

    #[test]
    fn rejects_negative_cohesion_and_out_of_range_friction_angle() {
        assert!(matches!(
            infinite_slope_factor_of_safety(30.0, 19.0, 3.0, -1.0, 30.0, 0.0),
            Err(GeotechError::InvalidCohesion(_))
        ));
        assert!(matches!(
            infinite_slope_factor_of_safety(30.0, 19.0, 3.0, 5.0, 90.0, 0.0),
            Err(GeotechError::InvalidFrictionAngle(_))
        ));
    }

    #[test]
    fn stability_class_thresholds() {
        assert_eq!(slope_stability_class(0.9), SlopeStabilityClass::Unstable);
        assert_eq!(
            slope_stability_class(1.1),
            SlopeStabilityClass::MarginallyStable
        );
        assert_eq!(slope_stability_class(1.3), SlopeStabilityClass::Stable);
        assert_eq!(slope_stability_class(1.6), SlopeStabilityClass::WellStable);
    }
}
