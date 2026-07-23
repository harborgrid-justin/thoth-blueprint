//! Superelevation runoff computation and alignment design-speed patching for
//! the plan canvas. Direct port of
//! `packages/domain/src/survey/helpers/superelevationHelpers.ts`.
//!
//! Unlocked this pass by adding `thoth-civil` as a dependency (see
//! `../../GAPS.md` #3 and `../../STATUS.md`).

use thoth_civil::alignment::{DesignSpeedZone, HorizontalAlignment};
use thoth_civil::superelevation::{
    calculate_superelevation_runoff, SuperelevationCurve, DEFAULT_SPEED_MULTIPLIER,
};

/// Computes the superelevation runoff transition curve for `alignment` at
/// `design_speed`/`e_max`/`normal_crown`, using the federal default speed
/// multiplier ([`DEFAULT_SPEED_MULTIPLIER`]) — exactly the multiplier the TS
/// call site leaves at its default. Returns `None` if `alignment` is absent
/// (mirrors the TS `if (!alignment) return null;`).
pub fn compute_superelevation(
    alignment: Option<&HorizontalAlignment>,
    design_speed: f64,
    e_max: f64,
    normal_crown: f64,
) -> Option<SuperelevationCurve> {
    let alignment = alignment?;
    Some(calculate_superelevation_runoff(
        alignment,
        design_speed,
        e_max,
        normal_crown,
        DEFAULT_SPEED_MULTIPLIER,
    ))
}

/// The result of patching an alignment's design speed: the target
/// alignment's id, and the full `site.alignments`-equivalent list with that
/// one alignment replaced by its patched copy.
///
/// No `PartialEq`: `HorizontalAlignment` (`thoth-civil`) doesn't derive it.
#[derive(Debug, Clone)]
pub struct AlignmentSuperelevationPatch {
    pub alignment_id: String,
    pub alignments: Vec<HorizontalAlignment>,
}

/// Patches `alignment`'s `design_speed` to `design_speed` and sets a single
/// design-speed zone at its start station, then returns that patch applied
/// across `site_alignments` (the alignment matching `alignment.id` is
/// replaced; every other alignment passes through unchanged). Returns `None`
/// if `alignment` is absent (mirrors the TS `if (!alignment) return null;`).
///
/// The TS original also accepts a `superCurve` parameter that it never reads
/// (destructured as `superCurve: _superCurve`, explicitly marked unused) —
/// not carried into this signature.
pub fn save_alignment_superelevation(
    alignment: Option<&HorizontalAlignment>,
    site_alignments: &[HorizontalAlignment],
    design_speed: f64,
) -> Option<AlignmentSuperelevationPatch> {
    let alignment = alignment?;

    let patch = HorizontalAlignment {
        design_speed: Some(design_speed),
        design_speeds: vec![DesignSpeedZone {
            station: alignment.start_station,
            speed: design_speed,
        }],
        ..alignment.clone()
    };

    let alignments = site_alignments
        .iter()
        .map(|a| {
            if a.id == alignment.id {
                patch.clone()
            } else {
                a.clone()
            }
        })
        .collect();

    Some(AlignmentSuperelevationPatch {
        alignment_id: alignment.id.clone(),
        alignments,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;
    use thoth_civil::alignment::AlignmentPi;
    use thoth_spatial::Point;

    fn align(id: &str) -> HorizontalAlignment {
        HorizontalAlignment::new(
            id,
            "Super Road",
            vec![
                AlignmentPi::simple(Point::new(0.0, 0.0)),
                AlignmentPi::simple(Point::new(1000.0, 0.0)),
            ],
            0.0,
        )
    }

    #[test]
    fn computes_a_runoff_curve_with_the_default_speed_multiplier() {
        let a = align("a1");
        let curve = compute_superelevation(Some(&a), 45.0, 0.06, -0.02).unwrap();
        assert_eq!(curve.transition_stations.len(), 8);
        assert_relative_eq!(curve.design_speed, 45.0, epsilon = 1e-9);
    }

    #[test]
    fn returns_none_without_an_alignment_for_compute() {
        assert!(compute_superelevation(None, 45.0, 0.06, -0.02).is_none());
    }

    #[test]
    fn patches_the_matching_alignments_design_speed_and_zone() {
        let a1 = align("a1");
        let a2 = align("a2");
        let site_alignments = vec![a1.clone(), a2.clone()];

        let result = save_alignment_superelevation(Some(&a1), &site_alignments, 55.0).unwrap();
        assert_eq!(result.alignment_id, "a1");
        assert_eq!(result.alignments.len(), 2);

        let patched = result.alignments.iter().find(|a| a.id == "a1").unwrap();
        assert_eq!(patched.design_speed, Some(55.0));
        assert_eq!(patched.design_speeds.len(), 1);
        assert_relative_eq!(
            patched.design_speeds[0].station,
            a1.start_station,
            epsilon = 1e-9
        );
        assert_relative_eq!(patched.design_speeds[0].speed, 55.0, epsilon = 1e-9);

        let untouched = result.alignments.iter().find(|a| a.id == "a2").unwrap();
        assert_eq!(untouched.design_speed, None);
    }

    #[test]
    fn returns_none_without_an_alignment_for_save() {
        let a2 = align("a2");
        assert!(save_alignment_superelevation(None, &[a2], 55.0).is_none());
    }
}
