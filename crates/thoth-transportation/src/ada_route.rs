//! ADA accessible-route compliance check (item 24): running slope, cross
//! slope, and ramp-landing spacing against ADA Standards for Accessible
//! Design / PROWAG thresholds, for a path polyline with an elevation
//! profile.
//!
//! Source: 2010 ADA Standards for Accessible Design §403 (Walking
//! Surfaces) and §405 (Ramps); U.S. Access Board *Public Right-of-Way
//! Accessibility Guidelines* (PROWAG) R302/R405. **Simplifying
//! assumption**: this checks the three scalar thresholds (running slope,
//! cross slope, ramp rise-before-landing) from station/elevation/cross-
//! slope samples the caller supplies; it does not model landing *width*
//! against the widest ramp run, handrail/edge-protection presence, or
//! surface-texture/opening requirements, all of which PROWAG also
//! regulates.

use crate::error::{TransportationError, TransportationResult};

/// Maximum running slope for an accessible "walk" (not a ramp) before ADA
/// requires ramp treatment (handrails, landings, edge protection).
/// 2010 ADA Standards §403.3: max 1:20 (5.0%).
pub const MAX_WALK_RUNNING_SLOPE: f64 = 0.05;
/// Maximum running slope for an accessible ramp. 2010 ADA Standards
/// §405.2: max 1:12 (8.33%).
pub const MAX_RAMP_RUNNING_SLOPE: f64 = 1.0 / 12.0;
/// Maximum cross slope for a walk or ramp run. 2010 ADA Standards §403.3 /
/// §405.3: max 1:48 (2.083%).
pub const MAX_CROSS_SLOPE: f64 = 1.0 / 48.0;
/// Maximum rise permitted on a single ramp run between required landings,
/// inches. 2010 ADA Standards §405.6.
pub const MAX_RISE_PER_RAMP_RUN_IN: f64 = 30.0;
/// Minimum landing length in the direction of travel, inches. 2010 ADA
/// Standards §405.7.3.
pub const MIN_LANDING_LENGTH_IN: f64 = 60.0;

/// One station along an accessible route: distance along the path
/// (`station`), elevation, and (optionally) the measured cross slope at
/// that station.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RouteSample {
    pub station: f64,
    pub elevation: f64,
    pub cross_slope: Option<f64>,
    /// Marks this station as a landing (a level, `MIN_LANDING_LENGTH_IN`+
    /// rest point) — resets the ramp rise-accumulation check.
    pub is_landing: bool,
}

/// Result of checking one segment's running slope between two consecutive
/// samples.
#[derive(Debug, Clone, PartialEq)]
pub struct RunningSlopeCheck {
    pub start_station: f64,
    pub end_station: f64,
    pub slope: f64,
    pub is_ramp: bool,
    pub is_violation: bool,
    pub message: String,
}

/// Checks the running slope of every consecutive pair of `samples` against
/// [`MAX_WALK_RUNNING_SLOPE`] (flagged as `is_ramp = false`, compliant as a
/// walk) or, if it exceeds that, against [`MAX_RAMP_RUNNING_SLOPE`]
/// (flagged `is_ramp = true`; a violation here means the segment is too
/// steep to be an accessible route even with ramp treatment).
///
/// # Errors
/// [`TransportationError::DegeneratePath`] if `samples.len() < 2`.
pub fn check_running_slope(
    samples: &[RouteSample],
) -> TransportationResult<Vec<RunningSlopeCheck>> {
    if samples.len() < 2 {
        return Err(TransportationError::DegeneratePath {
            count: samples.len(),
        });
    }
    Ok(samples
        .windows(2)
        .map(|w| {
            let (a, b) = (w[0], w[1]);
            let run = b.station - a.station;
            let slope = if run.abs() < 1e-9 {
                0.0
            } else {
                (b.elevation - a.elevation) / run
            };
            let magnitude = slope.abs();
            let is_ramp = magnitude > MAX_WALK_RUNNING_SLOPE;
            let is_violation = magnitude > MAX_RAMP_RUNNING_SLOPE;
            RunningSlopeCheck {
                start_station: a.station,
                end_station: b.station,
                slope,
                is_ramp,
                is_violation,
                message: if is_violation {
                    format!(
                        "Segment {:.1}-{:.1}: running slope {:.2}% exceeds the {:.2}% ADA ramp maximum.",
                        a.station, b.station, magnitude * 100.0, MAX_RAMP_RUNNING_SLOPE * 100.0
                    )
                } else if is_ramp {
                    format!(
                        "Segment {:.1}-{:.1}: running slope {:.2}% requires ramp treatment (exceeds {:.1}% walk maximum).",
                        a.station, b.station, magnitude * 100.0, MAX_WALK_RUNNING_SLOPE * 100.0
                    )
                } else {
                    format!("Segment {:.1}-{:.1} is compliant as an accessible walk.", a.station, b.station)
                },
            }
        })
        .collect())
}

/// Result of checking one sample's cross slope.
#[derive(Debug, Clone, PartialEq)]
pub struct CrossSlopeCheck {
    pub station: f64,
    pub cross_slope: f64,
    pub is_violation: bool,
    pub message: String,
}

/// Checks every sample that carries a `cross_slope` measurement against
/// [`MAX_CROSS_SLOPE`]. Samples without a cross-slope measurement are
/// skipped (not every station need be surveyed for cross slope).
pub fn check_cross_slope(samples: &[RouteSample]) -> Vec<CrossSlopeCheck> {
    samples
        .iter()
        .filter_map(|s| {
            let cs = s.cross_slope?;
            let is_violation = cs.abs() > MAX_CROSS_SLOPE;
            Some(CrossSlopeCheck {
                station: s.station,
                cross_slope: cs,
                is_violation,
                message: if is_violation {
                    format!(
                        "Station {:.1}: cross slope {:.2}% exceeds the {:.2}% ADA maximum.",
                        s.station,
                        cs.abs() * 100.0,
                        MAX_CROSS_SLOPE * 100.0
                    )
                } else {
                    format!("Station {:.1} cross slope is compliant.", s.station)
                },
            })
        })
        .collect()
}

/// Result of checking accumulated rise on a ramp run between landings.
#[derive(Debug, Clone, PartialEq)]
pub struct LandingSpacingCheck {
    pub run_start_station: f64,
    pub run_end_station: f64,
    pub accumulated_rise_in: f64,
    pub is_violation: bool,
    pub message: String,
}

/// Walks `samples` (assumed to be in a ramp run, i.e. every consecutive
/// running slope exceeds [`MAX_WALK_RUNNING_SLOPE`]) and flags any stretch
/// between landings (`is_landing == true` samples, plus the first and last
/// sample, which are implicitly top/bottom landings) whose accumulated
/// rise exceeds [`MAX_RISE_PER_RAMP_RUN_IN`]. `elevation`/`station` units
/// are assumed to be **feet**; rise is reported and compared in inches per
/// the ADA threshold's units.
///
/// # Errors
/// [`TransportationError::DegeneratePath`] if `samples.len() < 2`.
pub fn check_landing_spacing(
    samples: &[RouteSample],
) -> TransportationResult<Vec<LandingSpacingCheck>> {
    if samples.len() < 2 {
        return Err(TransportationError::DegeneratePath {
            count: samples.len(),
        });
    }
    let mut results = Vec::new();
    let mut run_start_idx = 0usize;
    let mut run_start_elevation = samples[0].elevation;

    for i in 1..samples.len() {
        let is_landing_boundary = samples[i].is_landing || i == samples.len() - 1;
        if is_landing_boundary {
            let rise_ft = (samples[i].elevation - run_start_elevation).abs();
            let rise_in = rise_ft * 12.0;
            let is_violation = rise_in > MAX_RISE_PER_RAMP_RUN_IN;
            results.push(LandingSpacingCheck {
                run_start_station: samples[run_start_idx].station,
                run_end_station: samples[i].station,
                accumulated_rise_in: rise_in,
                is_violation,
                message: if is_violation {
                    format!(
                        "Ramp run {:.1}-{:.1}: accumulated rise {:.1} in exceeds the {:.0} in maximum before a landing is required.",
                        samples[run_start_idx].station, samples[i].station, rise_in, MAX_RISE_PER_RAMP_RUN_IN
                    )
                } else {
                    format!(
                        "Ramp run {:.1}-{:.1} rise ({:.1} in) is within the maximum run before a landing.",
                        samples[run_start_idx].station, samples[i].station, rise_in
                    )
                },
            });
            run_start_idx = i;
            run_start_elevation = samples[i].elevation;
        }
    }
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample(station: f64, elevation: f64) -> RouteSample {
        RouteSample {
            station,
            elevation,
            cross_slope: None,
            is_landing: false,
        }
    }

    #[test]
    fn flat_walk_is_compliant() {
        let samples = vec![
            sample(0.0, 100.0),
            sample(50.0, 100.0),
            sample(100.0, 100.0),
        ];
        let checks = check_running_slope(&samples).unwrap();
        assert!(checks.iter().all(|c| !c.is_violation && !c.is_ramp));
    }

    #[test]
    fn six_percent_slope_requires_ramp_treatment_but_is_still_compliant() {
        let samples = vec![sample(0.0, 100.0), sample(100.0, 106.0)]; // 6% slope
        let checks = check_running_slope(&samples).unwrap();
        assert!(checks[0].is_ramp);
        assert!(!checks[0].is_violation);
    }

    #[test]
    fn steep_slope_beyond_ramp_maximum_is_a_violation() {
        let samples = vec![sample(0.0, 100.0), sample(100.0, 112.0)]; // 12% slope
        let checks = check_running_slope(&samples).unwrap();
        assert!(checks[0].is_violation);
    }

    #[test]
    fn running_slope_rejects_a_degenerate_path() {
        assert!(matches!(
            check_running_slope(&[sample(0.0, 0.0)]),
            Err(TransportationError::DegeneratePath { count: 1 })
        ));
    }

    #[test]
    fn cross_slope_flags_excess_and_skips_unmeasured_stations() {
        let samples = vec![
            RouteSample {
                station: 0.0,
                elevation: 0.0,
                cross_slope: Some(0.01),
                is_landing: false,
            },
            RouteSample {
                station: 10.0,
                elevation: 0.0,
                cross_slope: Some(0.03),
                is_landing: false,
            },
            RouteSample {
                station: 20.0,
                elevation: 0.0,
                cross_slope: None,
                is_landing: false,
            },
        ];
        let checks = check_cross_slope(&samples);
        assert_eq!(checks.len(), 2);
        assert!(!checks[0].is_violation);
        assert!(checks[1].is_violation);
    }

    #[test]
    fn landing_spacing_flags_excess_rise_between_landings() {
        // 40 ft run at 8% slope -> 3.2 ft rise = 38.4 in > 30 in max, no landing.
        let samples = vec![sample(0.0, 100.0), sample(40.0, 103.2)];
        let checks = check_landing_spacing(&samples).unwrap();
        assert_eq!(checks.len(), 1);
        assert!(checks[0].is_violation);
    }

    #[test]
    fn landing_spacing_passes_when_a_landing_resets_the_rise() {
        let samples = vec![
            sample(0.0, 100.0),
            RouteSample {
                station: 20.0,
                elevation: 101.6,
                cross_slope: None,
                is_landing: true,
            }, // 1.6ft = 19.2in
            sample(40.0, 103.2), // another 1.6 ft
        ];
        let checks = check_landing_spacing(&samples).unwrap();
        assert_eq!(checks.len(), 2);
        assert!(checks.iter().all(|c| !c.is_violation));
    }
}
