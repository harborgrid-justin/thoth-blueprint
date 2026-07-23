//! Superelevation runoff/runout transition-station generation and
//! interpolation, per AASHTO practice.
//!
//! Port of `packages/domain/src/civil/superelevation.ts` +
//! `packages/domain/src/civil/types/superElevation.ts`. Default eMax/normal
//! crown/speed-multiplier constants mirror `federalReference.json`'s
//! `standards.roads` — see `crates/thoth-civil/GAPS.md`.

use crate::alignment::{resolve_alignment, HorizontalAlignment};

/// Federal default maximum superelevation rate. Mirrors
/// `federalReference.json`'s `standards.roads.eMax`.
pub const DEFAULT_EMAX: f64 = 0.06;
/// Federal default normal crown. Mirrors `standards.roads.normalCrown`.
pub const DEFAULT_NORMAL_CROWN: f64 = -0.02;
/// Federal default transition-length speed multiplier. Mirrors
/// `standards.roads.transitionSpeedMultiplier`.
pub const DEFAULT_SPEED_MULTIPLIER: f64 = 4.0;

/// A single named transition station on a superelevation runoff/runout curve.
#[derive(Debug, Clone, PartialEq)]
pub struct SuperelevationStation {
    pub station: f64,
    pub left_outer_slope: f64,
    pub right_outer_slope: f64,
    pub description: &'static str,
}

/// A full superelevation transition curve for one horizontal curve.
#[derive(Debug, Clone, PartialEq)]
pub struct SuperelevationCurve {
    pub alignment_id: String,
    pub design_speed: f64,
    pub e_max: f64,
    pub normal_crown: f64,
    pub transition_stations: Vec<SuperelevationStation>,
}

/// Lane slopes interpolated at a station.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LaneSlopes {
    pub left_slope: f64,
    pub right_slope: f64,
}

/// Calculates transition stations for a curve along an alignment per AASHTO
/// standards: Normal Crown (NC) → Level Crown (LC) → Reverse Crown (RC) →
/// Full Superelevation (FS), mirrored on the far side of the curve.
pub fn calculate_superelevation_runoff(
    alignment: &HorizontalAlignment,
    design_speed: f64,
    e_max: f64,
    normal_crown: f64,
    speed_multiplier: f64,
) -> SuperelevationCurve {
    let transition_length = design_speed * speed_multiplier;
    let tangent_runout = (normal_crown.abs() / e_max) * transition_length;

    let resolved = resolve_alignment(alignment).ok();
    let curves = resolved
        .as_ref()
        .map(|r| r.curves.clone())
        .unwrap_or_default();
    let total_length = resolved.as_ref().map_or(1000.0, |r| r.length);
    let mid_station = if !curves.is_empty() {
        (curves[0].pc_station + curves[0].pt_station) / 2.0
    } else {
        total_length / 2.0
    };
    let start_fs = mid_station - transition_length / 2.0;
    let end_fs = mid_station + transition_length / 2.0;

    let left_in = start_fs - transition_length;
    let left_lc = left_in - tangent_runout / 2.0;
    let left_nc = left_lc - tangent_runout / 2.0;

    let right_out = end_fs + transition_length;
    let right_lc = right_out + tangent_runout / 2.0;
    let right_nc = right_lc + tangent_runout / 2.0;

    let mut raw_stations = vec![
        SuperelevationStation {
            station: left_nc,
            left_outer_slope: normal_crown,
            right_outer_slope: normal_crown,
            description: "Normal Crown (NC)",
        },
        SuperelevationStation {
            station: left_lc,
            left_outer_slope: 0.0,
            right_outer_slope: normal_crown,
            description: "Level Crown (LC)",
        },
        SuperelevationStation {
            station: left_in,
            left_outer_slope: -normal_crown,
            right_outer_slope: normal_crown,
            description: "Reverse Crown (RC)",
        },
        SuperelevationStation {
            station: start_fs,
            left_outer_slope: e_max,
            right_outer_slope: -e_max,
            description: "Full Superelevation Start (FS)",
        },
        SuperelevationStation {
            station: end_fs,
            left_outer_slope: e_max,
            right_outer_slope: -e_max,
            description: "Full Superelevation End (FS)",
        },
        SuperelevationStation {
            station: right_out,
            left_outer_slope: -normal_crown,
            right_outer_slope: normal_crown,
            description: "Reverse Crown (RC)",
        },
        SuperelevationStation {
            station: right_lc,
            left_outer_slope: 0.0,
            right_outer_slope: normal_crown,
            description: "Level Crown (LC)",
        },
        SuperelevationStation {
            station: right_nc,
            left_outer_slope: normal_crown,
            right_outer_slope: normal_crown,
            description: "Normal Crown (NC)",
        },
    ];

    raw_stations.sort_by(|a, b| {
        a.station
            .partial_cmp(&b.station)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    SuperelevationCurve {
        alignment_id: alignment.id.clone(),
        design_speed,
        e_max,
        normal_crown,
        transition_stations: raw_stations,
    }
}

/// Interpolates outer lane slopes at a given station, clamping to the first/
/// last transition station outside the curve's range.
pub fn get_superelevation_slope(curve: &SuperelevationCurve, station: f64) -> LaneSlopes {
    let nc = curve.normal_crown;
    let stations = &curve.transition_stations;
    if stations.is_empty() {
        return LaneSlopes {
            left_slope: nc,
            right_slope: nc,
        };
    }

    if station <= stations[0].station {
        return LaneSlopes {
            left_slope: stations[0].left_outer_slope,
            right_slope: stations[0].right_outer_slope,
        };
    }
    if station >= stations[stations.len() - 1].station {
        let last = &stations[stations.len() - 1];
        return LaneSlopes {
            left_slope: last.left_outer_slope,
            right_slope: last.right_outer_slope,
        };
    }

    for w in stations.windows(2) {
        let (s0, s1) = (&w[0], &w[1]);
        if station >= s0.station && station <= s1.station {
            let t = (station - s0.station) / (s1.station - s0.station);
            return LaneSlopes {
                left_slope: s0.left_outer_slope + t * (s1.left_outer_slope - s0.left_outer_slope),
                right_slope: s0.right_outer_slope
                    + t * (s1.right_outer_slope - s0.right_outer_slope),
            };
        }
    }

    LaneSlopes {
        left_slope: nc,
        right_slope: nc,
    }
}

/// Detects and resolves overlap between transition runoffs of adjacent
/// curves, pro-rating each curve's boundary transition to meet at the
/// midpoint of the overlap.
pub fn detect_and_resolve_superelevation_overlap(
    curves: &[SuperelevationCurve],
) -> (bool, Vec<SuperelevationCurve>) {
    if curves.len() <= 1 {
        return (false, curves.to_vec());
    }

    let mut has_overlap = false;
    let mut resolved: Vec<SuperelevationCurve> = curves.to_vec();
    resolved.sort_by(|a, b| {
        let sa = a.transition_stations.first().map_or(0.0, |s| s.station);
        let sb = b.transition_stations.first().map_or(0.0, |s| s.station);
        sa.partial_cmp(&sb).unwrap_or(std::cmp::Ordering::Equal)
    });

    for i in 0..resolved.len() - 1 {
        let end1 = resolved[i]
            .transition_stations
            .last()
            .map_or(0.0, |s| s.station);
        let start2 = resolved[i + 1]
            .transition_stations
            .first()
            .map_or(0.0, |s| s.station);

        if end1 > start2 {
            has_overlap = true;
            let mid = (end1 + start2) / 2.0;
            if let Some(last) = resolved[i].transition_stations.last_mut() {
                last.station = mid;
            }
            if let Some(first) = resolved[i + 1].transition_stations.first_mut() {
                first.station = mid;
            }
        }
    }

    (has_overlap, resolved)
}

/// Validates shoulder rollover limit against lane cross slope.
pub fn check_shoulder_rollover(
    lane_slope: f64,
    shoulder_slope: f64,
    max_rollover: f64,
) -> (bool, f64) {
    let rollover = (lane_slope - shoulder_slope).abs();
    (rollover > max_rollover, rollover)
}

/// Exports superelevation critical stations to LandXML 1.2 schema.
pub fn export_superelevation_land_xml(curve: &SuperelevationCurve) -> String {
    let stations_xml = curve
        .transition_stations
        .iter()
        .map(|s| format!("      <SuperelevationStation sta=\"{:.3}\" leftGrade=\"{:.2}\" rightGrade=\"{:.2}\"/>", s.station, s.left_outer_slope * 100.0, s.right_outer_slope * 100.0))
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<LandXML xmlns=\"http://www.landxml.org/schema/LandXML-1.2\" version=\"1.2\">\n  <Superelevation alignmentRef=\"{}\" eMax=\"{:.1}%\">\n{}\n  </Superelevation>\n</LandXML>",
        curve.alignment_id,
        curve.e_max * 100.0,
        stations_xml
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::alignment::AlignmentPi;
    use approx::assert_relative_eq;
    use thoth_spatial::Point;

    #[test]
    fn generates_correct_aashto_transition_stations() {
        let align = HorizontalAlignment::new(
            "a1",
            "Super Road",
            vec![
                AlignmentPi::simple(Point::new(0.0, 0.0)),
                AlignmentPi::simple(Point::new(500.0, 0.0)),
                AlignmentPi::simple(Point::new(1000.0, 0.0)),
            ],
            0.0,
        );
        let curve = calculate_superelevation_runoff(
            &align,
            45.0,
            DEFAULT_EMAX,
            DEFAULT_NORMAL_CROWN,
            DEFAULT_SPEED_MULTIPLIER,
        );
        assert_eq!(curve.transition_stations.len(), 8);
        assert_eq!(
            curve.transition_stations[0].description,
            "Normal Crown (NC)"
        );
        assert_eq!(
            curve.transition_stations[3].description,
            "Full Superelevation Start (FS)"
        );
    }

    #[test]
    fn interpolates_lane_slope_within_transition_ranges() {
        let align = HorizontalAlignment::new(
            "a1",
            "Super Road",
            vec![
                AlignmentPi::simple(Point::new(0.0, 0.0)),
                AlignmentPi::simple(Point::new(1000.0, 0.0)),
            ],
            0.0,
        );
        let curve = calculate_superelevation_runoff(
            &align,
            45.0,
            DEFAULT_EMAX,
            DEFAULT_NORMAL_CROWN,
            DEFAULT_SPEED_MULTIPLIER,
        );
        let rc_station = curve.transition_stations[2].station;
        let fs_station = curve.transition_stations[3].station;
        let mid_station = (rc_station + fs_station) / 2.0;
        let slopes = get_superelevation_slope(&curve, mid_station);
        assert_relative_eq!(slopes.left_slope, 0.04, epsilon = 1e-2);
        assert_relative_eq!(slopes.right_slope, -0.04, epsilon = 1e-2);
    }

    #[test]
    fn shoulder_rollover_flags_excess_difference() {
        let (is_violation, rollover) = check_shoulder_rollover(0.02, -0.06, 0.07);
        assert!(is_violation);
        assert_relative_eq!(rollover, 0.08, epsilon = 1e-9);
        let (ok, _) = check_shoulder_rollover(0.02, -0.02, 0.07);
        assert!(!ok);
    }

    #[test]
    fn detects_and_resolves_overlap_between_adjacent_curves() {
        let a = SuperelevationCurve {
            alignment_id: "a".into(),
            design_speed: 45.0,
            e_max: 0.06,
            normal_crown: -0.02,
            transition_stations: vec![
                SuperelevationStation {
                    station: 0.0,
                    left_outer_slope: 0.0,
                    right_outer_slope: 0.0,
                    description: "NC",
                },
                SuperelevationStation {
                    station: 200.0,
                    left_outer_slope: 0.0,
                    right_outer_slope: 0.0,
                    description: "FS",
                },
            ],
        };
        let b = SuperelevationCurve {
            alignment_id: "a".into(),
            design_speed: 45.0,
            e_max: 0.06,
            normal_crown: -0.02,
            transition_stations: vec![
                SuperelevationStation {
                    station: 100.0,
                    left_outer_slope: 0.0,
                    right_outer_slope: 0.0,
                    description: "NC",
                },
                SuperelevationStation {
                    station: 300.0,
                    left_outer_slope: 0.0,
                    right_outer_slope: 0.0,
                    description: "FS",
                },
            ],
        };
        let (has_overlap, resolved) = detect_and_resolve_superelevation_overlap(&[a, b]);
        assert!(has_overlap);
        assert_relative_eq!(
            resolved[0].transition_stations.last().unwrap().station,
            150.0,
            epsilon = 1e-9
        );
        assert_relative_eq!(
            resolved[1].transition_stations.first().unwrap().station,
            150.0,
            epsilon = 1e-9
        );
    }
}
