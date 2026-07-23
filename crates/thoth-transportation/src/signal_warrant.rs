//! Traffic-signal warrant analysis (item 25): MUTCD Warrant 1 (Eight-Hour
//! Vehicular Volume) — Condition A (Minimum Vehicular Volume), Condition B
//! (Interruption of Continuous Traffic), and the Combination warrant.
//!
//! Source: *Manual on Uniform Traffic Control Devices* (MUTCD), Section
//! 4C.02, Table 4C-1 (Condition A) and Table 4C-2 (Condition B), 100%
//! volume-column values (the values used directly, not the 70%-rural or
//! 56%-metro-adjustment columns — see the doc comment on
//! [`warrant1_condition_a`] for how to apply those instead).
//!
//! **Explicitly not implemented (documented per the deliverable's honesty
//! requirement)**: MUTCD Warrant 3 (Peak Hour Volume) is a graphical
//! standard (Figure 4C-3, a curve relating total entering volume to the
//! minor-street high-volume approach) rather than a numeric table; it is
//! not reproduced here because this crate cannot verify a hand-transcribed
//! curve's coordinates against the published MUTCD figure without a
//! primary-source lookup. Only the 8-hour Warrant 1 (Conditions A, B, and
//! Combination) is implemented.

use crate::error::{TransportationError, TransportationResult};

/// Number of through/left-turn lanes on an approach, for warrant-threshold
/// lookup purposes (MUTCD Table 4C-1/4C-2 key by "1" vs. "2 or more").
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LaneConfig {
    One,
    TwoOrMore,
}

/// One hour's worth of approach volumes for the warrant check: the major
/// street's total of both approaches, and the minor street's higher-volume
/// single approach (MUTCD's defined inputs for Warrant 1).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct HourlyVolumes {
    pub major_street_total_vph: f64,
    pub minor_street_high_approach_vph: f64,
}

fn validate_volumes(hours: &[HourlyVolumes]) -> TransportationResult<()> {
    for h in hours {
        if h.major_street_total_vph < 0.0 {
            return Err(TransportationError::NegativeVolume {
                field: "major_street_total_vph",
                value: h.major_street_total_vph,
            });
        }
        if h.minor_street_high_approach_vph < 0.0 {
            return Err(TransportationError::NegativeVolume {
                field: "minor_street_high_approach_vph",
                value: h.minor_street_high_approach_vph,
            });
        }
    }
    Ok(())
}

/// MUTCD Table 4C-1 Condition A thresholds (100% column), vehicles per hour,
/// for a given major/minor lane configuration.
fn condition_a_thresholds(major: LaneConfig, minor: LaneConfig) -> (f64, f64) {
    match (major, minor) {
        (LaneConfig::One, LaneConfig::One) => (500.0, 150.0),
        (LaneConfig::TwoOrMore, LaneConfig::One) => (600.0, 150.0),
        (LaneConfig::TwoOrMore, LaneConfig::TwoOrMore) => (600.0, 200.0),
        (LaneConfig::One, LaneConfig::TwoOrMore) => (500.0, 200.0),
    }
}

/// MUTCD Table 4C-2 Condition B thresholds (100% column), vehicles per hour.
fn condition_b_thresholds(major: LaneConfig, minor: LaneConfig) -> (f64, f64) {
    match (major, minor) {
        (LaneConfig::One, LaneConfig::One) => (750.0, 75.0),
        (LaneConfig::TwoOrMore, LaneConfig::One) => (900.0, 75.0),
        (LaneConfig::TwoOrMore, LaneConfig::TwoOrMore) => (900.0, 100.0),
        (LaneConfig::One, LaneConfig::TwoOrMore) => (750.0, 100.0),
    }
}

/// Result of a MUTCD Warrant 1 volume-threshold check across a set of
/// hourly volumes.
#[derive(Debug, Clone, PartialEq)]
pub struct WarrantCheck {
    /// Number of hours (out of those supplied) that meet the threshold.
    pub hours_satisfied: usize,
    /// MUTCD Warrant 1 requires the threshold to be met in at least 8 hours
    /// of an average day.
    pub is_satisfied: bool,
    pub message: String,
}

/// Checks MUTCD Warrant 1, **Condition A** (Minimum Vehicular Volume):
/// satisfied when the major-street total and minor-street high-approach
/// volumes both meet or exceed [`condition_a_thresholds`] for at least 8
/// hours of an average day, scaled by `percent_factor` (pass `1.0` for the
/// standard urban 100% column, or e.g. `0.70` for the rural/reduced-volume
/// alternative the MUTCD also allows).
///
/// # Errors
/// - [`TransportationError::NegativeVolume`] if any supplied volume is
///   negative.
/// - [`TransportationError::NonPositiveValue`] if `percent_factor <= 0`.
pub fn warrant1_condition_a(
    hours: &[HourlyVolumes],
    major: LaneConfig,
    minor: LaneConfig,
    percent_factor: f64,
) -> TransportationResult<WarrantCheck> {
    if percent_factor <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "percent_factor",
            value: percent_factor,
        });
    }
    validate_volumes(hours)?;
    let (major_min, minor_min) = condition_a_thresholds(major, minor);
    let (major_min, minor_min) = (major_min * percent_factor, minor_min * percent_factor);

    let hours_satisfied = hours
        .iter()
        .filter(|h| {
            h.major_street_total_vph >= major_min && h.minor_street_high_approach_vph >= minor_min
        })
        .count();
    let is_satisfied = hours_satisfied >= 8;
    Ok(WarrantCheck {
        hours_satisfied,
        is_satisfied,
        message: if is_satisfied {
            format!("Warrant 1, Condition A satisfied: {hours_satisfied} hours meet or exceed thresholds (need >= 8).")
        } else {
            format!("Warrant 1, Condition A not satisfied: only {hours_satisfied} hours meet thresholds (need >= 8).")
        },
    })
}

/// Checks MUTCD Warrant 1, **Condition B** (Interruption of Continuous
/// Traffic): same structure as [`warrant1_condition_a`], against
/// [`condition_b_thresholds`].
///
/// # Errors
/// Same as [`warrant1_condition_a`].
pub fn warrant1_condition_b(
    hours: &[HourlyVolumes],
    major: LaneConfig,
    minor: LaneConfig,
    percent_factor: f64,
) -> TransportationResult<WarrantCheck> {
    if percent_factor <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "percent_factor",
            value: percent_factor,
        });
    }
    validate_volumes(hours)?;
    let (major_min, minor_min) = condition_b_thresholds(major, minor);
    let (major_min, minor_min) = (major_min * percent_factor, minor_min * percent_factor);

    let hours_satisfied = hours
        .iter()
        .filter(|h| {
            h.major_street_total_vph >= major_min && h.minor_street_high_approach_vph >= minor_min
        })
        .count();
    let is_satisfied = hours_satisfied >= 8;
    Ok(WarrantCheck {
        hours_satisfied,
        is_satisfied,
        message: if is_satisfied {
            format!("Warrant 1, Condition B satisfied: {hours_satisfied} hours meet or exceed thresholds (need >= 8).")
        } else {
            format!("Warrant 1, Condition B not satisfied: only {hours_satisfied} hours meet thresholds (need >= 8).")
        },
    })
}

/// Checks the MUTCD Warrant 1 **Combination** warrant: both Condition A and
/// Condition B are checked at the reduced 80% factor, and satisfied only if
/// **both** are met (each independently, not necessarily in the same
/// hours — matching MUTCD's stated combination rule) for at least 8 hours.
///
/// # Errors
/// Same as [`warrant1_condition_a`].
pub fn warrant1_combination(
    hours: &[HourlyVolumes],
    major: LaneConfig,
    minor: LaneConfig,
) -> TransportationResult<WarrantCheck> {
    const COMBINATION_FACTOR: f64 = 0.80;
    let a = warrant1_condition_a(hours, major, minor, COMBINATION_FACTOR)?;
    let b = warrant1_condition_b(hours, major, minor, COMBINATION_FACTOR)?;
    let is_satisfied = a.is_satisfied && b.is_satisfied;
    let hours_satisfied = a.hours_satisfied.min(b.hours_satisfied);
    Ok(WarrantCheck {
        hours_satisfied,
        is_satisfied,
        message: if is_satisfied {
            "Warrant 1, Combination satisfied: both Condition A and Condition B are met at the 80% factor for >= 8 hours.".to_string()
        } else {
            "Warrant 1, Combination not satisfied.".to_string()
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn constant_hours(major: f64, minor: f64, count: usize) -> Vec<HourlyVolumes> {
        vec![
            HourlyVolumes {
                major_street_total_vph: major,
                minor_street_high_approach_vph: minor,
            };
            count
        ]
    }

    #[test]
    fn condition_a_satisfied_with_8_qualifying_hours_one_lane_each() {
        let hours = constant_hours(550.0, 160.0, 8);
        let check = warrant1_condition_a(&hours, LaneConfig::One, LaneConfig::One, 1.0).unwrap();
        assert!(check.is_satisfied);
        assert_eq!(check.hours_satisfied, 8);
    }

    #[test]
    fn condition_a_not_satisfied_with_only_5_qualifying_hours() {
        let hours = constant_hours(550.0, 160.0, 5);
        let check = warrant1_condition_a(&hours, LaneConfig::One, LaneConfig::One, 1.0).unwrap();
        assert!(!check.is_satisfied);
    }

    #[test]
    fn condition_a_thresholds_rise_with_more_lanes() {
        let hours = constant_hours(550.0, 160.0, 8);
        // These volumes clear the 1x1 thresholds but not the 2+x2+ thresholds.
        let one_lane = warrant1_condition_a(&hours, LaneConfig::One, LaneConfig::One, 1.0).unwrap();
        let two_lane =
            warrant1_condition_a(&hours, LaneConfig::TwoOrMore, LaneConfig::TwoOrMore, 1.0)
                .unwrap();
        assert!(one_lane.is_satisfied);
        assert!(!two_lane.is_satisfied);
    }

    #[test]
    fn condition_b_uses_its_own_higher_major_lower_minor_thresholds() {
        let hours = constant_hours(800.0, 80.0, 8);
        let check = warrant1_condition_b(&hours, LaneConfig::One, LaneConfig::One, 1.0).unwrap();
        assert!(check.is_satisfied);
    }

    #[test]
    fn combination_warrant_requires_both_conditions_at_80_percent() {
        // Volumes that clear 80% of Condition A AND 80% of Condition B
        // thresholds for a 1x1 approach: A@80% = (400, 120), B@80% = (600, 60).
        let hours = constant_hours(650.0, 130.0, 8);
        let check = warrant1_combination(&hours, LaneConfig::One, LaneConfig::One).unwrap();
        assert!(check.is_satisfied);
    }

    #[test]
    fn rejects_negative_volume() {
        let hours = vec![HourlyVolumes {
            major_street_total_vph: -1.0,
            minor_street_high_approach_vph: 100.0,
        }];
        assert!(matches!(
            warrant1_condition_a(&hours, LaneConfig::One, LaneConfig::One, 1.0),
            Err(TransportationError::NegativeVolume { .. })
        ));
    }

    #[test]
    fn rejects_non_positive_percent_factor() {
        let hours = constant_hours(600.0, 200.0, 8);
        assert!(matches!(
            warrant1_condition_a(&hours, LaneConfig::One, LaneConfig::One, 0.0),
            Err(TransportationError::NonPositiveValue { .. })
        ));
    }
}
