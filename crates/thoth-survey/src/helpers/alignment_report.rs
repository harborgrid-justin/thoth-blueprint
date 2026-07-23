//! Alignment curve-table report labeling. Direct port of
//! `packages/domain/src/survey/helpers/alignmentReportHelpers.ts`.
//!
//! Unlocked this pass by adding `thoth-civil` as a dependency (see
//! `../../GAPS.md` #3 and `../../STATUS.md`).

use thoth_civil::alignment::ResolvedAlignment;

/// The curve-table label for the curve resolved at `pi_index` — `"C1"`,
/// `"C2"`, … in curve-table order — or `"PI-{pi_index}"` if that PI has no
/// resolved curve (a simple angle point, or a curve that didn't fit between
/// its neighboring tangents).
pub fn curve_label(resolved: &ResolvedAlignment, pi_index: usize) -> String {
    match resolved.curves.iter().position(|c| c.pi_index == pi_index) {
        Some(idx) => format!("C{}", idx + 1),
        None => format!("PI-{pi_index}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_civil::alignment::{resolve_alignment, AlignmentPi, HorizontalAlignment};
    use thoth_spatial::Point;

    /// POB → PI (curved, R=500) → POE, same layout as `alignment.rs`'s own
    /// fixture.
    fn align() -> HorizontalAlignment {
        HorizontalAlignment::new(
            "a1",
            "R/L TEST",
            vec![
                AlignmentPi::simple(Point::new(0.0, 0.0)),
                AlignmentPi::curved(Point::new(0.0, -1000.0), 500.0),
                AlignmentPi::simple(Point::new(1000.0, -1000.0)),
            ],
            0.0,
        )
    }

    #[test]
    fn labels_a_resolved_curve_by_its_curve_table_position() {
        let r = resolve_alignment(&align()).unwrap();
        assert_eq!(curve_label(&r, 1), "C1");
    }

    #[test]
    fn falls_back_to_a_pi_label_when_no_curve_resolved_at_that_pi() {
        let r = resolve_alignment(&align()).unwrap();
        // PI 0 is the POB (never carries a curve) and PI 99 doesn't exist.
        assert_eq!(curve_label(&r, 0), "PI-0");
        assert_eq!(curve_label(&r, 99), "PI-99");
    }

    #[test]
    fn labels_the_second_curve_c2_when_two_curves_resolve() {
        let a = HorizontalAlignment::new(
            "a2",
            "S curve",
            vec![
                AlignmentPi::simple(Point::new(0.0, 0.0)),
                AlignmentPi::curved(Point::new(0.0, -1000.0), 200.0),
                AlignmentPi::curved(Point::new(500.0, -1000.0), 200.0),
                AlignmentPi::simple(Point::new(500.0, -1500.0)),
            ],
            0.0,
        );
        let r = resolve_alignment(&a).unwrap();
        assert_eq!(r.curves.len(), 2);
        assert_eq!(curve_label(&r, 1), "C1");
        assert_eq!(curve_label(&r, 2), "C2");
    }
}
