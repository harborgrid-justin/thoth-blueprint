//! Pavement structural design (item 23): the AASHTO 1993 flexible-pavement
//! design equation (solved for structural number `SN`), and the companion
//! AASHTO 1993 rigid-pavement design equation (solved for slab thickness
//! `D`).
//!
//! Source: AASHTO, *Guide for Design of Pavement Structures* (1993),
//! Part II, Chapter 3. Both equations are transcendental in their design
//! unknown (`SN` or `D` appears on both sides), so both are solved here by
//! bisection over a physically reasonable bracket — the standard numerical
//! approach every AASHTO 1993 design nomograph/spreadsheet implementation
//! uses in place of the original design chart.

use crate::error::{TransportationError, TransportationResult};

/// Standard normal deviate `Z_R` for a given design reliability `R`
/// (probability in `(0, 1)`), via a fast, accurate rational approximation
/// of the inverse normal CDF (Acklam's algorithm's simplified low-precision
/// variant is not used here; instead a well-known Beasley-Springer-Moro-
/// style rational approximation accurate to ~1e-4 is used, adequate for
/// pavement design's coarse reliability inputs of 50–99.99%).
#[allow(clippy::excessive_precision)]
fn inverse_normal_cdf(p: f64) -> f64 {
    // Peter Acklam's algorithm.
    const A: [f64; 6] = [
        -3.969_683_028_665_376e+01,
        2.209_460_984_245_205e+02,
        -2.759_285_104_469_687e+02,
        1.383_577_518_672_690e+02,
        -3.066_479_806_614_716e+01,
        2.506_628_277_459_239e+00,
    ];
    const B: [f64; 5] = [
        -5.447_609_879_822_406e+01,
        1.615_858_368_580_409e+02,
        -1.556_989_798_598_866e+02,
        6.680_131_188_771_972e+01,
        -1.328_068_155_288_572e+01,
    ];
    const C: [f64; 6] = [
        -7.784_894_002_430_293e-03,
        -3.223_964_580_411_365e-01,
        -2.400_758_277_161_838e+00,
        -2.549_732_539_343_734e+00,
        4.374_664_141_464_968e+00,
        2.938_163_982_698_783e+00,
    ];
    const D: [f64; 4] = [
        7.784_695_709_041_462e-03,
        3.224_671_290_700_398e-01,
        2.445_134_137_142_996e+00,
        3.754_408_661_907_416e+00,
    ];
    const P_LOW: f64 = 0.02425;
    let p_high = 1.0 - P_LOW;

    if p < P_LOW {
        let q = (-2.0 * p.ln()).sqrt();
        (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5])
            / ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1.0)
    } else if p <= p_high {
        let q = p - 0.5;
        let r = q * q;
        (((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q
            / (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1.0)
    } else {
        let q = (-2.0 * (1.0 - p).ln()).sqrt();
        -(((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5])
            / ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1.0)
    }
}

fn z_r_for_reliability(reliability: f64) -> TransportationResult<f64> {
    if !(reliability > 0.0 && reliability < 1.0) {
        return Err(TransportationError::InvalidReliability { value: reliability });
    }
    // AASHTO's Z_R is the deviate for the *upper* tail at (1 - R), since a
    // higher design confidence needs a more negative Z_R (more conservative).
    Ok(inverse_normal_cdf(1.0 - reliability))
}

/// Bisects `f` for a root on `[lo, hi]`, assuming `f` is monotonically
/// increasing (the AASHTO 1993 equations are: more structural
/// number/thickness always supports more or equal traffic, for any
/// physically sensible input combination).
fn bisect_increasing(
    f: impl Fn(f64) -> f64,
    lo: f64,
    hi: f64,
    solver: &'static str,
) -> TransportationResult<f64> {
    let (mut lo, mut hi) = (lo, hi);
    let (f_lo, f_hi) = (f(lo), f(hi));
    if f_lo > 0.0 || f_hi < 0.0 {
        // Target isn't bracketed by the assumed physical range at all.
        return Err(TransportationError::ConvergenceFailure {
            solver,
            iterations: 0,
        });
    }
    const MAX_ITERATIONS: u32 = 100;
    for i in 0..MAX_ITERATIONS {
        let mid = (lo + hi) / 2.0;
        let f_mid = f(mid);
        if f_mid.abs() < 1e-9 || (hi - lo) < 1e-9 {
            return Ok(mid);
        }
        if f_mid < 0.0 {
            lo = mid;
        } else {
            hi = mid;
        }
        if i == MAX_ITERATIONS - 1 {
            return Err(TransportationError::ConvergenceFailure {
                solver,
                iterations: MAX_ITERATIONS,
            });
        }
    }
    Ok((lo + hi) / 2.0)
}

/// Solves the AASHTO 1993 flexible-pavement design equation for the
/// required structural number `SN`, given:
/// - `w18`: design traffic in 18-kip Equivalent Single Axle Loads (ESALs)
///   over the design period.
/// - `reliability`: design reliability, `(0, 1)` (e.g. `0.90` for 90%).
/// - `s0`: overall standard deviation (typical range 0.40–0.50 for
///   flexible pavements).
/// - `delta_psi`: design serviceability loss, `p0 - pt` (typical 1.5–2.5).
/// - `subgrade_resilient_modulus_psi`: subgrade resilient modulus `M_R`,
///   psi.
///
/// AASHTO 1993 Guide, Part II, Equation 3.1 (flexible pavement):
/// `log10(W18) = Z_R·S0 + 9.36·log10(SN+1) − 0.20 +
/// log10(ΔPSI/2.7) / (0.40 + 1094/(SN+1)^5.19) + 2.32·log10(M_R) − 8.07`.
///
/// # Errors
/// - [`TransportationError::NonPositiveValue`] if `w18`, `s0`, `delta_psi`,
///   or `subgrade_resilient_modulus_psi` is not strictly positive.
/// - [`TransportationError::InvalidReliability`] if `reliability` is
///   outside `(0, 1)`.
/// - [`TransportationError::ConvergenceFailure`] if the bisection solver
///   cannot bracket/converge on a structural number in `[0.1, 20]` (an
///   extreme, likely non-physical, input combination).
pub fn flexible_pavement_structural_number(
    w18: f64,
    reliability: f64,
    s0: f64,
    delta_psi: f64,
    subgrade_resilient_modulus_psi: f64,
) -> TransportationResult<f64> {
    for (field, value) in [
        ("w18", w18),
        ("s0", s0),
        ("delta_psi", delta_psi),
        (
            "subgrade_resilient_modulus_psi",
            subgrade_resilient_modulus_psi,
        ),
    ] {
        if value <= 0.0 {
            return Err(TransportationError::NonPositiveValue { field, value });
        }
    }
    let z_r = z_r_for_reliability(reliability)?;
    let log_w18 = w18.log10();

    let f = move |sn: f64| -> f64 {
        z_r * s0 + 9.36 * (sn + 1.0).log10() - 0.20
            + (delta_psi / 2.7).log10() / (0.40 + 1094.0 / (sn + 1.0).powf(5.19))
            + 2.32 * subgrade_resilient_modulus_psi.log10()
            - 8.07
            - log_w18
    };
    bisect_increasing(f, 0.1, 20.0, "AASHTO 1993 flexible pavement SN bisection")
}

/// Converts a required structural number `SN` into layer thicknesses given
/// layer coefficients and drainage coefficients (`SN = a1·D1 + a2·D2·m2 +
/// a3·D3·m3`), solving for the base-course thickness `D2` that exactly
/// meets `SN` given caller-chosen surface thickness `d1` and subbase
/// thickness `d3` (typical practice: the designer fixes practical/minimum
/// surface and subbase thicknesses and solves for the base course that
/// makes up the remaining structural number).
///
/// # Errors
/// [`TransportationError::NonPositiveValue`] if `a2` or `m2` is not
/// positive (division by zero/negative would follow), or if the resulting
/// `D2` would be negative (the chosen `d1`/`d3` already exceed `sn`).
#[allow(clippy::too_many_arguments)]
pub fn solve_base_course_thickness(
    sn: f64,
    a1: f64,
    d1: f64,
    a2: f64,
    m2: f64,
    a3: f64,
    d3: f64,
    m3: f64,
) -> TransportationResult<f64> {
    if a2 <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "a2",
            value: a2,
        });
    }
    if m2 <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "m2",
            value: m2,
        });
    }
    let remaining = sn - a1 * d1 - a3 * d3 * m3;
    if remaining < 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "remaining structural number after surface/subbase",
            value: remaining,
        });
    }
    Ok(remaining / (a2 * m2))
}

/// Solves the AASHTO 1993 rigid-pavement design equation for the required
/// slab thickness `D` (inches), given:
/// - `w18`, `reliability`, `s0`, `delta_psi` as in
///   [`flexible_pavement_structural_number`] (rigid `s0` is typically
///   0.30–0.40, `ΔPSI` uses a terminal serviceability `pt` typically 2.5).
/// - `pt`: terminal serviceability index (typically 2.5).
/// - `modulus_of_rupture_psi` (`Sc`): PCC modulus of rupture, psi (typical
///   600–700 psi).
/// - `load_transfer_coefficient` (`J`): typical 2.8–3.2 for doweled joints.
/// - `drainage_coefficient` (`Cd`): typical 1.0 for adequate drainage.
/// - `elastic_modulus_psi` (`Ec`): PCC elastic modulus, psi (typical
///   ~4,000,000 psi).
/// - `modulus_of_subgrade_reaction_pci` (`k`): effective modulus of
///   subgrade reaction, pci.
///
/// AASHTO 1993 Guide, Part II, Equation 3.7 (rigid pavement):
/// `log10(W18) = Z_R·S0 + 7.35·log10(D+1) − 0.06 +
/// log10(ΔPSI/3.0) / (1 + 1.624e7/(D+1)^8.46) +
/// (4.22 − 0.32·pt)·log10( Sc·Cd·(D^0.75 − 1.132) /
/// (215.63·J·(D^0.75 − 18.42/(Ec/k)^0.25)) )`.
///
/// # Errors
/// Same shape as [`flexible_pavement_structural_number`], plus
/// [`TransportationError::ConvergenceFailure`] if no thickness in
/// `[3.0, 20.0]` inches brackets the target traffic.
#[allow(clippy::too_many_arguments)]
pub fn rigid_pavement_slab_thickness(
    w18: f64,
    reliability: f64,
    s0: f64,
    delta_psi: f64,
    pt: f64,
    modulus_of_rupture_psi: f64,
    load_transfer_coefficient: f64,
    drainage_coefficient: f64,
    elastic_modulus_psi: f64,
    modulus_of_subgrade_reaction_pci: f64,
) -> TransportationResult<f64> {
    for (field, value) in [
        ("w18", w18),
        ("s0", s0),
        ("delta_psi", delta_psi),
        ("pt", pt),
        ("modulus_of_rupture_psi", modulus_of_rupture_psi),
        ("load_transfer_coefficient", load_transfer_coefficient),
        ("drainage_coefficient", drainage_coefficient),
        ("elastic_modulus_psi", elastic_modulus_psi),
        (
            "modulus_of_subgrade_reaction_pci",
            modulus_of_subgrade_reaction_pci,
        ),
    ] {
        if value <= 0.0 {
            return Err(TransportationError::NonPositiveValue { field, value });
        }
    }
    let z_r = z_r_for_reliability(reliability)?;
    let log_w18 = w18.log10();
    let ec_over_k = (elastic_modulus_psi / modulus_of_subgrade_reaction_pci).powf(0.25);

    let f = move |d: f64| -> f64 {
        let d075 = d.powf(0.75);
        let strength_ratio = (modulus_of_rupture_psi * drainage_coefficient * (d075 - 1.132))
            / (215.63 * load_transfer_coefficient * (d075 - 18.42 / ec_over_k));
        z_r * s0 + 7.35 * (d + 1.0).log10() - 0.06
            + (delta_psi / 3.0).log10() / (1.0 + 1.624e7 / (d + 1.0).powf(8.46))
            + (4.22 - 0.32 * pt) * strength_ratio.log10()
            - log_w18
    };
    bisect_increasing(
        f,
        3.0,
        20.0,
        "AASHTO 1993 rigid pavement thickness bisection",
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn flexible_sn_falls_in_a_typical_arterial_range() {
        // 5,000,000 ESALs, 90% reliability, S0=0.45, ΔPSI=1.9, Mr=5,000 psi
        // is a fairly typical arterial design case; published nomograph
        // results for similar inputs land around SN ~ 4.5-5.5.
        let sn =
            flexible_pavement_structural_number(5_000_000.0, 0.90, 0.45, 1.9, 5_000.0).unwrap();
        assert!(sn > 3.5 && sn < 6.5, "SN={sn} out of expected range");
    }

    #[test]
    fn flexible_sn_increases_with_design_traffic() {
        let low = flexible_pavement_structural_number(100_000.0, 0.90, 0.45, 1.9, 5_000.0).unwrap();
        let high =
            flexible_pavement_structural_number(10_000_000.0, 0.90, 0.45, 1.9, 5_000.0).unwrap();
        assert!(high > low);
    }

    #[test]
    fn flexible_sn_increases_with_reliability() {
        let low_r =
            flexible_pavement_structural_number(2_000_000.0, 0.50, 0.45, 1.9, 5_000.0).unwrap();
        let high_r =
            flexible_pavement_structural_number(2_000_000.0, 0.99, 0.45, 1.9, 5_000.0).unwrap();
        assert!(high_r > low_r);
    }

    #[test]
    fn flexible_sn_rejects_invalid_reliability() {
        assert!(matches!(
            flexible_pavement_structural_number(1_000_000.0, 1.0, 0.45, 1.9, 5_000.0),
            Err(TransportationError::InvalidReliability { .. })
        ));
        assert!(matches!(
            flexible_pavement_structural_number(1_000_000.0, 0.0, 0.45, 1.9, 5_000.0),
            Err(TransportationError::InvalidReliability { .. })
        ));
    }

    #[test]
    fn base_course_thickness_solves_the_linear_sn_equation() {
        // SN = 5.0, a1*d1 = 0.44*4=1.76, a3*d3*m3 = 0.11*6*1.0=0.66.
        // remaining = 5.0-1.76-0.66=2.58; a2*m2 = 0.14*1.0=0.14 -> D2=18.43.
        let d2 = solve_base_course_thickness(5.0, 0.44, 4.0, 0.14, 1.0, 0.11, 6.0, 1.0).unwrap();
        assert_relative_eq!(d2, 2.58 / 0.14, epsilon = 1e-6);
    }

    #[test]
    fn base_course_thickness_rejects_a_negative_remaining_sn() {
        assert!(matches!(
            solve_base_course_thickness(1.0, 0.44, 10.0, 0.14, 1.0, 0.11, 6.0, 1.0),
            Err(TransportationError::NonPositiveValue { .. })
        ));
    }

    #[test]
    fn rigid_slab_thickness_falls_in_a_typical_arterial_range() {
        // Typical AASHTO 1993 rigid worked-example inputs land D ~ 8-10 in.
        let d = rigid_pavement_slab_thickness(
            5_000_000.0,
            0.90,
            0.35,
            1.9,
            2.5,
            650.0,
            3.2,
            1.0,
            4_000_000.0,
            200.0,
        )
        .unwrap();
        assert!(d > 6.0 && d < 12.0, "D={d} out of expected range");
    }

    #[test]
    fn rigid_slab_thickness_increases_with_design_traffic() {
        let low = rigid_pavement_slab_thickness(
            500_000.0,
            0.90,
            0.35,
            1.9,
            2.5,
            650.0,
            3.2,
            1.0,
            4_000_000.0,
            200.0,
        )
        .unwrap();
        let high = rigid_pavement_slab_thickness(
            20_000_000.0,
            0.90,
            0.35,
            1.9,
            2.5,
            650.0,
            3.2,
            1.0,
            4_000_000.0,
            200.0,
        )
        .unwrap();
        assert!(high > low);
    }

    #[test]
    fn z_r_is_negative_for_high_reliability_and_positive_for_low() {
        assert!(z_r_for_reliability(0.99).unwrap() < 0.0);
        assert!(z_r_for_reliability(0.50).unwrap().abs() < 1e-6);
        assert!(z_r_for_reliability(0.10).unwrap() > 0.0);
    }
}
