//! Synthetic design-storm rainfall distributions for hydrograph convolution
//! (item 4's rainfall input) and the standard NRCS Type II 24-hour
//! distribution.
//!
//! Source: USDA NRCS *National Engineering Handbook*, Part 630, Chapter 4
//! (*Storm Rainfall Depth and Distribution*); the specific Type II ordinates
//! below are the standard nationally-applicable NRCS/SCS Type II 24-hour
//! distribution as tabulated at 0.1-hour (6-minute) resolution in the
//! Washington State DOT *Highway Runoff Manual* (M 31-16.04, April 2014),
//! Appendix 4C, Table 4C-4 — a state DOT manual's verbatim reproduction of
//! the nationally standard NRCS Type II curve, cross-checked here against
//! NEH-630 Chapter 4's independently published Type II embedded-duration
//! ratios (Figure 4-42: e.g. the 6-hr/24-hr ratio of 0.707 implies a
//! cumulative fraction of `0.5 - 0.707/2 = 0.1465` at hour 9, matching this
//! table's `0.147` at hour 9.0).
//!
//! # Assumptions and valid range
//! - Type II is one of four NRCS regional 24-hour synthetic storm shapes
//!   (I, IA, II, III); it applies to most of the continental interior US.
//!   Coastal Gulf/Atlantic areas (Type III) and the Pacific maritime climate
//!   (I/IA) need a different distribution — not included here. Consult NEH-630
//!   Chapter 4 or your state DOT's design manual for the correct regional
//!   type, and note NEH-630 itself recommends moving to a site-specific
//!   NOAA Atlas 14-based distribution where available rather than a legacy
//!   regional type.
//! - Only whole-storm (24-hour) distributions are represented; sub-storm
//!   nested distributions (e.g. extracting a 6-hour distribution from the
//!   24-hour one) are not implemented.

use crate::error::{HydroResult, HydrologyError};

/// A synthetic design-storm shape: parallel arrays of elapsed time (hours,
/// strictly increasing, starting at 0) and cumulative fraction of total
/// storm depth (non-decreasing, starting at 0 and ending at 1).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RainfallDistribution<'a> {
    pub time_hours: &'a [f64],
    pub cumulative_fraction: &'a [f64],
}

impl<'a> RainfallDistribution<'a> {
    /// Validate the distribution's shape invariants.
    ///
    /// # Errors
    /// [`HydrologyError::ShapeMismatch`] if the arrays differ in length, are
    /// shorter than 2 points, `time_hours` is not strictly increasing,
    /// `cumulative_fraction` is not non-decreasing, or the endpoints are not
    /// (approximately) 0 and 1.
    pub fn validate(&self) -> HydroResult<()> {
        if self.time_hours.len() != self.cumulative_fraction.len() {
            return Err(HydrologyError::ShapeMismatch {
                reason: format!(
                    "time_hours has {} points, cumulative_fraction has {}",
                    self.time_hours.len(),
                    self.cumulative_fraction.len()
                ),
            });
        }
        if self.time_hours.len() < 2 {
            return Err(HydrologyError::ShapeMismatch {
                reason: "a rainfall distribution needs at least 2 points".into(),
            });
        }
        for w in self.time_hours.windows(2) {
            if w[1] <= w[0] {
                return Err(HydrologyError::ShapeMismatch {
                    reason: format!("time_hours is not strictly increasing at {:?}", w),
                });
            }
        }
        for w in self.cumulative_fraction.windows(2) {
            if w[1] < w[0] {
                return Err(HydrologyError::ShapeMismatch {
                    reason: format!("cumulative_fraction decreases at {:?}", w),
                });
            }
        }
        if (self.cumulative_fraction[0]).abs() > 1e-6
            || (self.cumulative_fraction[self.cumulative_fraction.len() - 1] - 1.0).abs() > 1e-6
        {
            return Err(HydrologyError::ShapeMismatch {
                reason: "cumulative_fraction must start at 0.0 and end at 1.0".into(),
            });
        }
        Ok(())
    }

    /// Total storm duration (hours) this distribution covers.
    pub fn duration_hours(&self) -> f64 {
        self.time_hours[self.time_hours.len() - 1]
    }

    /// Cumulative fraction of total storm depth elapsed by time `t_hours`,
    /// linearly interpolated between tabulated points. Clamps to the
    /// nearest endpoint outside `[0, duration_hours()]` rather than
    /// erroring (matching `thoth_civil::terrain::elevation_at`'s "total"
    /// convention) — use [`Self::cumulative_fraction_at_strict`] to reject
    /// out-of-domain queries instead.
    pub fn cumulative_fraction_at(&self, t_hours: f64) -> f64 {
        let n = self.time_hours.len();
        if t_hours <= self.time_hours[0] {
            return self.cumulative_fraction[0];
        }
        if t_hours >= self.time_hours[n - 1] {
            return self.cumulative_fraction[n - 1];
        }
        // Linear scan is fine: distributions here have at most a few
        // hundred points and this is not called in a hot inner loop over
        // large grids the way terrain sampling is.
        let mut i = 0;
        while i + 1 < n && self.time_hours[i + 1] < t_hours {
            i += 1;
        }
        let (t0, t1) = (self.time_hours[i], self.time_hours[i + 1]);
        let (c0, c1) = (self.cumulative_fraction[i], self.cumulative_fraction[i + 1]);
        let frac = (t_hours - t0) / (t1 - t0);
        c0 + (c1 - c0) * frac
    }

    /// [`Self::cumulative_fraction_at`], but rejects a query time outside
    /// `[0, duration_hours()]` instead of clamping.
    ///
    /// # Errors
    /// [`HydrologyError::ShapeMismatch`] if `t_hours` falls outside the
    /// distribution's covered time range.
    pub fn cumulative_fraction_at_strict(&self, t_hours: f64) -> HydroResult<f64> {
        if t_hours < self.time_hours[0] || t_hours > self.duration_hours() {
            return Err(HydrologyError::ShapeMismatch {
                reason: format!(
                    "time {} hr is outside the distribution's range [0, {}]",
                    t_hours,
                    self.duration_hours()
                ),
            });
        }
        Ok(self.cumulative_fraction_at(t_hours))
    }

    /// Resample the distribution to `n` uniform intervals spanning
    /// `[0, duration_hours()]`, returning `(actual_dt_hours, cumulative_fraction_samples)`
    /// with `cumulative_fraction_samples.len() == n + 1`.
    ///
    /// `n` is chosen as the nearest whole number of intervals to
    /// `duration_hours() / target_dt_hours` (at least 1); the returned
    /// `actual_dt_hours` is the exact, evenly divided step this implies —
    /// standard practice (TR-20/HEC-1 both pick a computational interval
    /// that evenly divides the storm duration and is close to, but not
    /// necessarily exactly, a target value).
    ///
    /// # Errors
    /// [`HydrologyError::NonPositiveTimeStep`] if `target_dt_hours <= 0`.
    pub fn resample_uniform(&self, target_dt_hours: f64) -> HydroResult<(f64, Vec<f64>)> {
        if target_dt_hours <= 0.0 {
            return Err(HydrologyError::NonPositiveTimeStep {
                dt: target_dt_hours,
            });
        }
        let duration = self.duration_hours();
        let n = (duration / target_dt_hours).round().max(1.0) as usize;
        let actual_dt = duration / n as f64;
        let samples = (0..=n)
            .map(|k| self.cumulative_fraction_at(k as f64 * actual_dt))
            .collect();
        Ok((actual_dt, samples))
    }
}

/// Elapsed time (hours) ordinates for the standard NRCS Type II 24-hour
/// distribution (WSDOT HRM Table 4C-4), at 0.1-hour resolution.
pub const NRCS_TYPE_II_TIME_HOURS: &[f64] = &[
    0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8,
    1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7,
    3.8, 3.9, 4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6,
    5.7, 5.8, 5.9, 6.0, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 7.0, 7.1, 7.2, 7.3, 7.4, 7.5,
    7.6, 7.7, 7.8, 7.9, 8.0, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 9.0, 9.1, 9.2, 9.3, 9.4,
    9.5, 9.6, 9.7, 9.8, 9.9, 10.0, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 11.0,
    11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 12.0, 12.1, 12.2, 12.3, 12.4, 12.5,
    12.6, 12.7, 12.8, 12.9, 13.0, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 14.0,
    14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 15.0, 15.1, 15.2, 15.3, 15.4, 15.5,
    15.6, 15.7, 15.8, 15.9, 16.0, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 17.0,
    17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9, 18.0, 18.1, 18.2, 18.3, 18.4, 18.5,
    18.6, 18.7, 18.8, 18.9, 19.0, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 20.0,
    20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8, 20.9, 21.0, 21.1, 21.2, 21.3, 21.4, 21.5,
    21.6, 21.7, 21.8, 21.9, 22.0, 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 22.9, 23.0,
    23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7, 23.8, 23.9, 24.0,
];

/// Cumulative fraction of 24-hour rainfall ordinates for the standard NRCS
/// Type II distribution, parallel to [`NRCS_TYPE_II_TIME_HOURS`].
pub const NRCS_TYPE_II_CUMULATIVE_FRACTION: &[f64] = &[
    0.000, 0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.011, 0.012, 0.013,
    0.014, 0.015, 0.016, 0.017, 0.018, 0.020, 0.021, 0.022, 0.023, 0.024, 0.026, 0.027, 0.028,
    0.029, 0.031, 0.032, 0.033, 0.035, 0.036, 0.037, 0.038, 0.040, 0.041, 0.042, 0.044, 0.045,
    0.047, 0.048, 0.049, 0.051, 0.052, 0.054, 0.055, 0.057, 0.058, 0.060, 0.061, 0.063, 0.065,
    0.066, 0.068, 0.070, 0.071, 0.073, 0.075, 0.076, 0.078, 0.080, 0.082, 0.084, 0.085, 0.087,
    0.089, 0.091, 0.093, 0.095, 0.097, 0.099, 0.101, 0.103, 0.105, 0.107, 0.109, 0.111, 0.113,
    0.116, 0.118, 0.120, 0.122, 0.125, 0.127, 0.130, 0.132, 0.135, 0.138, 0.141, 0.144, 0.147,
    0.150, 0.153, 0.157, 0.160, 0.163, 0.166, 0.170, 0.173, 0.177, 0.181, 0.185, 0.189, 0.194,
    0.199, 0.204, 0.209, 0.215, 0.221, 0.228, 0.235, 0.243, 0.251, 0.261, 0.271, 0.283, 0.307,
    0.354, 0.431, 0.568, 0.663, 0.682, 0.699, 0.713, 0.725, 0.735, 0.743, 0.751, 0.759, 0.766,
    0.772, 0.778, 0.784, 0.789, 0.794, 0.799, 0.804, 0.808, 0.812, 0.816, 0.820, 0.824, 0.827,
    0.831, 0.834, 0.838, 0.841, 0.844, 0.847, 0.850, 0.854, 0.856, 0.859, 0.862, 0.865, 0.868,
    0.870, 0.873, 0.875, 0.878, 0.880, 0.882, 0.885, 0.887, 0.889, 0.891, 0.893, 0.895, 0.898,
    0.900, 0.902, 0.904, 0.906, 0.908, 0.910, 0.912, 0.914, 0.915, 0.917, 0.919, 0.921, 0.923,
    0.925, 0.926, 0.928, 0.930, 0.931, 0.933, 0.935, 0.936, 0.938, 0.939, 0.941, 0.942, 0.944,
    0.945, 0.947, 0.948, 0.949, 0.951, 0.952, 0.953, 0.955, 0.956, 0.957, 0.958, 0.960, 0.961,
    0.962, 0.964, 0.965, 0.966, 0.967, 0.968, 0.970, 0.971, 0.972, 0.973, 0.975, 0.976, 0.977,
    0.978, 0.979, 0.981, 0.982, 0.983, 0.984, 0.985, 0.986, 0.988, 0.989, 0.990, 0.991, 0.992,
    0.993, 0.994, 0.996, 0.997, 0.998, 0.999, 1.000,
];

/// The standard NRCS/SCS Type II 24-hour design storm distribution.
///
/// # Example
/// ```
/// use thoth_hydrology::rainfall::nrcs_type_ii;
///
/// let dist = nrcs_type_ii();
/// assert!(dist.validate().is_ok());
/// // The classic "84% of rain falls in the middle 12 hours" signature of
/// // Type II: cumulative fraction at hour 12 is 0.663 (from the published table).
/// assert!((dist.cumulative_fraction_at(12.0) - 0.663).abs() < 1e-9);
/// ```
pub fn nrcs_type_ii() -> RainfallDistribution<'static> {
    RainfallDistribution {
        time_hours: NRCS_TYPE_II_TIME_HOURS,
        cumulative_fraction: NRCS_TYPE_II_CUMULATIVE_FRACTION,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn nrcs_type_ii_table_is_well_formed() {
        let dist = nrcs_type_ii();
        assert_eq!(
            dist.time_hours.len(),
            dist.cumulative_fraction.len()
        );
        dist.validate().unwrap();
        assert_relative_eq!(dist.duration_hours(), 24.0, epsilon = 1e-9);
    }

    #[test]
    fn cumulative_fraction_matches_published_table_at_key_points() {
        let dist = nrcs_type_ii();
        // Hour 9: matches NEH-630 Fig. 4-42's embedded 6-hr/24-hr ratio of
        // 0.707 => cumulative fraction at hour 9 = 0.5 - 0.707/2 = 0.1465,
        // rounding to the table's published 0.147.
        assert_relative_eq!(dist.cumulative_fraction_at(9.0), 0.147, epsilon = 1e-9);
        // Peak burst at hour 12.
        assert_relative_eq!(dist.cumulative_fraction_at(12.0), 0.663, epsilon = 1e-9);
        assert_relative_eq!(dist.cumulative_fraction_at(24.0), 1.0, epsilon = 1e-9);
        assert_relative_eq!(dist.cumulative_fraction_at(0.0), 0.0, epsilon = 1e-9);
    }

    #[test]
    fn cumulative_fraction_at_interpolates_between_points() {
        let dist = nrcs_type_ii();
        // Halfway between hour 9.0 (0.147) and hour 9.1 (0.150).
        let mid = dist.cumulative_fraction_at(9.05);
        assert_relative_eq!(mid, 0.1485, epsilon = 1e-9);
    }

    #[test]
    fn cumulative_fraction_at_clamps_outside_domain() {
        let dist = nrcs_type_ii();
        assert_relative_eq!(dist.cumulative_fraction_at(-5.0), 0.0, epsilon = 1e-9);
        assert_relative_eq!(dist.cumulative_fraction_at(30.0), 1.0, epsilon = 1e-9);
    }

    #[test]
    fn cumulative_fraction_at_strict_rejects_out_of_domain() {
        let dist = nrcs_type_ii();
        assert!(dist.cumulative_fraction_at_strict(-1.0).is_err());
        assert!(dist.cumulative_fraction_at_strict(25.0).is_err());
        assert!(dist.cumulative_fraction_at_strict(12.0).is_ok());
    }

    #[test]
    fn resample_uniform_produces_expected_step_count() {
        let dist = nrcs_type_ii();
        let (dt, samples) = dist.resample_uniform(0.133).unwrap();
        // 24 / 0.133 ~= 180.45 -> rounds to 180 intervals.
        assert_eq!(samples.len(), 181);
        assert_relative_eq!(dt * 180.0, 24.0, epsilon = 1e-9);
        assert_relative_eq!(samples[0], 0.0, epsilon = 1e-9);
        assert_relative_eq!(samples[180], 1.0, epsilon = 1e-9);
    }

    #[test]
    fn resample_uniform_rejects_non_positive_step() {
        let dist = nrcs_type_ii();
        assert!(dist.resample_uniform(0.0).is_err());
        assert!(dist.resample_uniform(-1.0).is_err());
    }

    #[test]
    fn validate_rejects_mismatched_lengths() {
        let dist = RainfallDistribution {
            time_hours: &[0.0, 1.0, 2.0],
            cumulative_fraction: &[0.0, 1.0],
        };
        assert!(dist.validate().is_err());
    }

    #[test]
    fn validate_rejects_non_increasing_time() {
        let dist = RainfallDistribution {
            time_hours: &[0.0, 1.0, 1.0],
            cumulative_fraction: &[0.0, 0.5, 1.0],
        };
        assert!(dist.validate().is_err());
    }

    #[test]
    fn validate_rejects_endpoints_not_zero_one() {
        let dist = RainfallDistribution {
            time_hours: &[0.0, 1.0, 2.0],
            cumulative_fraction: &[0.1, 0.5, 0.9],
        };
        assert!(dist.validate().is_err());
    }
}
