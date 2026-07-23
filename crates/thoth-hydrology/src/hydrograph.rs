//! TR-20-style hydrograph convolution/routing: incremental SCS excess
//! rainfall convolved with the NRCS dimensionless unit hydrograph against an
//! incremental design-storm rainfall distribution (e.g. NRCS Type II
//! 24-hour), producing a composite runoff hydrograph for a watershed too
//! large, or too composite, for a single Rational Method peak-flow estimate.
//!
//! Source: USDA NRCS TR-20 (*Computer Program for Project Formulation
//! Hydrology*) and TR-55 Ch. 2/4, which build a runoff hydrograph by:
//! 1. Applying the SCS curve-number loss method to the **cumulative**
//!    design-storm rainfall hyetograph to get a cumulative excess-rainfall
//!    (direct runoff) hyetograph, then differencing it into incremental
//!    excess-rainfall pulses per computational interval.
//! 2. Convolving each pulse with the (uniform-interval) unit hydrograph and
//!    summing the lagged, scaled responses — ordinary discrete linear-system
//!    convolution, the same principle TR-20 automates.
//!
//! # Assumptions and valid range
//! - **Single sub-basin**: this module assumes one homogeneous curve number
//!   and one time of concentration for the whole contributing area. A
//!   composite watershed made of sub-basins with different CN/Tc should be
//!   modeled as separate calls to [`design_storm_hydrograph`] whose outputs
//!   are added (or, for a routed system, passed through
//!   [`crate::pond_routing`]) — this module does not do multi-sub-basin
//!   assembly itself.
//! - **Standard NRCS Type II 24-hour storm distribution only** (or any other
//!   [`crate::rainfall::RainfallDistribution`] the caller supplies); this
//!   module does not accept an arbitrary user-recorded hyetograph directly —
//!   wrap one in a `RainfallDistribution` (cumulative fraction vs. time) if
//!   needed.
//! - The unit-hydrograph pulse duration is derived from time of
//!   concentration (`D = 0.133·Tc`, NRCS's rule of thumb) and then snapped to
//!   the nearest value that evenly divides the storm duration, matching how
//!   TR-20/HEC-1-family tools choose a single computational interval.

use crate::curve_number::{runoff_depth, DIMENSIONLESS_UNIT_HYDROGRAPH, NRCS_PEAK_RATE_FACTOR};
use crate::error::{HydroResult, HydrologyError};
use crate::rainfall::RainfallDistribution;

/// Linear interpolation over the NRCS dimensionless unit hydrograph table
/// ([`DIMENSIONLESS_UNIT_HYDROGRAPH`]); returns `0.0` for `t_ratio` beyond
/// the tabulated range (t/Tp > 5), matching the physical unit hydrograph
/// which has returned to baseflow by then.
fn interpolate_dimensionless_uh(t_ratio: f64) -> f64 {
    let table = DIMENSIONLESS_UNIT_HYDROGRAPH;
    if t_ratio <= table[0].0 {
        return table[0].1;
    }
    let last = table[table.len() - 1];
    if t_ratio >= last.0 {
        return 0.0;
    }
    let mut i = 0;
    while i + 1 < table.len() && table[i + 1].0 < t_ratio {
        i += 1;
    }
    let (t0, q0) = table[i];
    let (t1, q1) = table[i + 1];
    let frac = (t_ratio - t0) / (t1 - t0);
    q0 + (q1 - q0) * frac
}

/// Incremental SCS excess-rainfall pulses for a design storm: resample
/// `distribution` to `n` uniform intervals of `dt_hours` spanning the storm
/// duration, scale by `total_depth_in` to a cumulative rainfall hyetograph,
/// apply the SCS curve-number runoff equation ([`crate::curve_number::runoff_depth`])
/// to each cumulative depth to get a cumulative excess-rainfall hyetograph,
/// then difference it into `n` incremental pulses (inches of excess rainfall
/// per interval).
///
/// # Errors
/// - [`HydrologyError::NonPositiveTimeStep`] if `dt_hours <= 0`.
/// - [`HydrologyError::NegativeRainfallDepth`] if `total_depth_in < 0`.
/// - Propagates [`crate::curve_number::runoff_depth`]'s
///   [`HydrologyError::CurveNumberOutOfRange`].
pub fn incremental_excess_rainfall(
    distribution: &RainfallDistribution,
    total_depth_in: f64,
    cn: f64,
    dt_hours: f64,
) -> HydroResult<(f64, Vec<f64>)> {
    if total_depth_in < 0.0 {
        return Err(HydrologyError::NegativeRainfallDepth {
            depth: total_depth_in,
        });
    }
    let (actual_dt, cumulative_fraction) = distribution.resample_uniform(dt_hours)?;
    let mut cumulative_runoff = Vec::with_capacity(cumulative_fraction.len());
    for &f in &cumulative_fraction {
        cumulative_runoff.push(runoff_depth(cn, f * total_depth_in)?);
    }
    let pulses = cumulative_runoff.windows(2).map(|w| w[1] - w[0]).collect();
    Ok((actual_dt, pulses))
}

/// Discrete linear convolution of `n` excess-rainfall pulses (inches) with
/// an `M`-ordinate unit hydrograph (cfs, for 1 inch of excess spread evenly
/// over one interval), both sampled at the same time step. Returns
/// `n + M - 1` ordinates of the composite outflow hydrograph (cfs), the
/// first at `t = 0`, spaced `dt_hours` apart:
///
/// `Q[k] = Σ_{m=0}^{min(k, n-1)} pulses[m] · unit_hydrograph[k - m]`
/// (only summed where `k - m` is a valid index into `unit_hydrograph`).
///
/// # Errors
/// [`HydrologyError::HydrographTooShort`] if `unit_hydrograph` has fewer
/// than 2 ordinates, or `pulses` is empty.
pub fn convolve(unit_hydrograph: &[f64], pulses: &[f64]) -> HydroResult<Vec<f64>> {
    if unit_hydrograph.len() < 2 {
        return Err(HydrologyError::HydrographTooShort {
            got: unit_hydrograph.len(),
        });
    }
    if pulses.is_empty() {
        return Err(HydrologyError::HydrographTooShort { got: 0 });
    }
    let n = pulses.len();
    let m = unit_hydrograph.len();
    let mut q = vec![0.0; n + m - 1];
    for (pi, &p) in pulses.iter().enumerate() {
        if p == 0.0 {
            continue;
        }
        for (ui, &u) in unit_hydrograph.iter().enumerate() {
            q[pi + ui] += p * u;
        }
    }
    Ok(q)
}

/// A composite runoff hydrograph produced by [`design_storm_hydrograph`].
#[derive(Debug, Clone, PartialEq)]
pub struct CompositeHydrograph {
    /// Computational time step (hours) between ordinates.
    pub dt_hours: f64,
    /// Elapsed time (hours) at each ordinate, starting at 0.
    pub time_hours: Vec<f64>,
    /// Outflow (cfs) at each ordinate.
    pub flow_cfs: Vec<f64>,
}

impl CompositeHydrograph {
    /// The peak flow (cfs) and the time (hours) at which it occurs.
    ///
    /// # Errors
    /// [`HydrologyError::HydrographTooShort`] if the hydrograph has no
    /// ordinates (should not happen for a hydrograph built by
    /// [`design_storm_hydrograph`], but guards direct construction).
    pub fn peak(&self) -> HydroResult<(f64, f64)> {
        let mut best_i = 0;
        let mut best_q = f64::NEG_INFINITY;
        for (i, &q) in self.flow_cfs.iter().enumerate() {
            if q > best_q {
                best_q = q;
                best_i = i;
            }
        }
        if self.flow_cfs.is_empty() {
            return Err(HydrologyError::HydrographTooShort { got: 0 });
        }
        Ok((best_q, self.time_hours[best_i]))
    }
}

/// Build a TR-20-style composite runoff hydrograph for a single sub-basin
/// subjected to a design storm.
///
/// Pipeline: [`incremental_excess_rainfall`] turns the design storm
/// (`distribution`, `total_depth_in`) into excess-rainfall pulses via the
/// curve-number method, a unit hydrograph is built at the same time step
/// from `area_sq_mi`/`tc_hours` (NRCS peak-rate-factor method, matching
/// [`crate::curve_number::unit_hydrograph`] but resampled to uniform
/// intervals for convolution), and [`convolve`] combines them.
///
/// # Errors
/// - [`HydrologyError::NonPositiveArea`] if `area_sq_mi <= 0`.
/// - [`HydrologyError::NonPositiveTimeOfConcentration`] if `tc_hours <= 0`.
/// - Propagates [`incremental_excess_rainfall`]'s errors (curve number
///   range, negative rainfall).
///
/// # Example
/// 1 mi² basin, `Tc = 1` hr, `CN = 80`, a 5 in design storm following the
/// NRCS Type II distribution:
/// ```
/// use thoth_hydrology::hydrograph::design_storm_hydrograph;
/// use thoth_hydrology::rainfall::nrcs_type_ii;
///
/// let hydrograph = design_storm_hydrograph(&nrcs_type_ii(), 5.0, 80.0, 1.0, 1.0).unwrap();
/// let (peak_cfs, peak_time_hr) = hydrograph.peak().unwrap();
/// assert!((peak_cfs - 981.1400503916892).abs() < 1e-6);
/// assert!((peak_time_hr - 12.533333333333333).abs() < 1e-9);
/// ```
pub fn design_storm_hydrograph(
    distribution: &RainfallDistribution,
    total_depth_in: f64,
    cn: f64,
    area_sq_mi: f64,
    tc_hours: f64,
) -> HydroResult<CompositeHydrograph> {
    if area_sq_mi <= 0.0 {
        return Err(HydrologyError::NonPositiveArea { area: area_sq_mi });
    }
    if tc_hours <= 0.0 {
        return Err(HydrologyError::NonPositiveTimeOfConcentration { tc: tc_hours });
    }

    let target_dt = 0.133 * tc_hours;
    let (dt_hours, pulses) =
        incremental_excess_rainfall(distribution, total_depth_in, cn, target_dt)?;

    let tp = dt_hours / 2.0 + 0.6 * tc_hours;
    let qp = NRCS_PEAK_RATE_FACTOR * area_sq_mi / tp;
    let uh_len = ((5.0 * tp / dt_hours).ceil() as usize) + 1;
    let unit_hydrograph: Vec<f64> = (0..uh_len)
        .map(|k| interpolate_dimensionless_uh((k as f64 * dt_hours) / tp) * qp)
        .collect();

    let flow_cfs = convolve(&unit_hydrograph, &pulses)?;
    let time_hours = (0..flow_cfs.len()).map(|k| k as f64 * dt_hours).collect();

    Ok(CompositeHydrograph {
        dt_hours,
        time_hours,
        flow_cfs,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rainfall::nrcs_type_ii;
    use approx::assert_relative_eq;

    #[test]
    fn design_storm_hydrograph_matches_reference_computation() {
        let hg = design_storm_hydrograph(&nrcs_type_ii(), 5.0, 80.0, 1.0, 1.0).unwrap();
        assert_eq!(hg.flow_cfs.len(), 205);
        let (peak, peak_time) = hg.peak().unwrap();
        assert_relative_eq!(peak, 981.1400503916892, epsilon = 1e-6);
        assert_relative_eq!(peak_time, 12.533333333333333, epsilon = 1e-9);
    }

    #[test]
    fn incremental_excess_rainfall_sums_to_total_runoff_depth() {
        let dist = nrcs_type_ii();
        let (_, pulses) = incremental_excess_rainfall(&dist, 5.0, 80.0, 0.133).unwrap();
        let total: f64 = pulses.iter().sum();
        let expected = runoff_depth(80.0, 5.0).unwrap();
        assert_relative_eq!(total, expected, epsilon = 1e-9);
    }

    #[test]
    fn incremental_excess_rainfall_pulses_are_non_negative() {
        let dist = nrcs_type_ii();
        let (_, pulses) = incremental_excess_rainfall(&dist, 5.0, 80.0, 0.133).unwrap();
        assert!(pulses.iter().all(|&p| p >= -1e-12));
    }

    #[test]
    fn convolve_conserves_volume() {
        // A simple triangular unit hydrograph (base=4, dt=1) and a single
        // 1-inch pulse should reproduce the unit hydrograph exactly.
        let uh = vec![0.0, 1.0, 0.5, 0.0];
        let pulses = vec![1.0];
        let q = convolve(&uh, &pulses).unwrap();
        assert_eq!(q, uh);
    }

    #[test]
    fn convolve_sums_overlapping_responses() {
        let uh = vec![0.0, 1.0, 0.0];
        let pulses = vec![1.0, 1.0];
        // Pulse 0 contributes [0,1,0] at offset 0; pulse 1 contributes
        // [0,1,0] at offset 1 => total [0, 1, 1, 0].
        let q = convolve(&uh, &pulses).unwrap();
        assert_eq!(q, vec![0.0, 1.0, 1.0, 0.0]);
    }

    #[test]
    fn convolve_rejects_degenerate_inputs() {
        assert!(convolve(&[1.0], &[1.0]).is_err());
        assert!(convolve(&[1.0, 2.0], &[]).is_err());
    }

    #[test]
    fn design_storm_hydrograph_rejects_bad_inputs() {
        let dist = nrcs_type_ii();
        assert!(design_storm_hydrograph(&dist, 5.0, 80.0, 0.0, 1.0).is_err());
        assert!(design_storm_hydrograph(&dist, 5.0, 80.0, 1.0, 0.0).is_err());
        assert!(design_storm_hydrograph(&dist, 5.0, 25.0, 1.0, 1.0).is_err());
    }
}
