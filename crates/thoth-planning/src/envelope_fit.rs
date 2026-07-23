//! Automated building-envelope fit-check: setbacks + easements + FAR/coverage
//! composed into one pass over a proposed building footprint on a lot.
//!
//! Item 41 of the Theme 4 subdivision-design-automation gap analysis. This
//! is orchestration over existing primitives — [`crate::rules::buildable_envelope`]
//! for the setback inset, [`Zone::max_far`]/[`Zone::max_coverage`] for the
//! zoning caps — plus one new, minimal geometry primitive this crate didn't
//! already have: a convex-polygon clip, needed to quantify how much of the
//! setback envelope an easement actually encroaches (a yes/no overlap test
//! alone can't tell a planner whether an easement clips the corner of the
//! envelope or swallows it whole).

use serde::{Deserialize, Serialize};
use thoth_spatial::{
    add, area as polygon_area, cross, subtract, ComplianceFinding, ComplianceSeverity, Point,
    Polygon, GEOMETRY_EPSILON,
};

use crate::elements::{Easement, Lot, Zone};
use crate::rules::buildable_envelope;

/// Inputs to one building-envelope fit-check pass.
pub struct EnvelopeFitInputs<'a> {
    pub lot: &'a Lot,
    pub zone: &'a Zone,
    /// Easements to check the buildable envelope against. Only easements
    /// with a **convex** boundary are clipped exactly (see
    /// [`polygon_intersection_area`]); a non-convex easement still triggers
    /// the yes/no overlap finding but its encroachment area may be
    /// under/over-counted — see that function's doc comment.
    pub easements: &'a [Easement],
    /// The footprint area of the building being test-fit, plan units².
    pub proposed_footprint_area: f64,
    /// Storeys the proposed building would have (for FAR).
    pub storeys: f64,
}

/// The result of one building-envelope fit-check pass.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EnvelopeFitReport {
    /// The setback-derived buildable envelope, or `None` if the setback
    /// consumes the whole lot.
    pub buildable_envelope: Option<Polygon>,
    /// Envelope area before subtracting easement encroachment, plan units².
    pub gross_buildable_area: f64,
    /// Total envelope area overlapped by easements, plan units².
    pub easement_encroachment_area: f64,
    /// `gross_buildable_area - easement_encroachment_area`, floored at 0.
    pub net_buildable_area: f64,
    /// Maximum footprint area the zone's FAR allows at the requested
    /// storeys, or `None` if the zone sets no FAR cap.
    pub max_footprint_by_far: Option<f64>,
    /// Maximum footprint area the zone's coverage cap allows, or `None` if
    /// the zone sets no coverage cap.
    pub max_footprint_by_coverage: Option<f64>,
    /// `true` only if the proposed footprint fits the net buildable area
    /// *and* satisfies every zoning cap the zone declares.
    pub fits: bool,
    pub findings: Vec<ComplianceFinding>,
}

/// Sutherland-Hodgman polygon clipping (Sutherland, I.E. & Hodgman, G.W.,
/// "Reentrant Polygon Clipping", *Communications of the ACM* 17(1), 1974):
/// clip `subject` (any simple polygon) against `clip` (must be convex).
/// Returns the clipped polygon's vertices, or an empty vec if there is no
/// overlap. `clip`'s winding order does not need to be pre-normalized — it
/// is re-wound counter-clockwise internally.
fn clip_convex(subject: &[Point], clip: &[Point]) -> Vec<Point> {
    let clip = thoth_spatial::ensure_counter_clockwise(clip);
    let mut output = subject.to_vec();

    for i in 0..clip.len() {
        if output.is_empty() {
            break;
        }
        let a = clip[i];
        let b = clip[(i + 1) % clip.len()];
        let edge = subtract(b, a);
        // Inside test: the point lies to the left of (or on) the directed
        // edge a->b, matching a CCW-wound clip polygon's interior.
        let inside = |p: Point| cross(edge, subtract(p, a)) >= -GEOMETRY_EPSILON;

        let input = output;
        let mut next = Vec::with_capacity(input.len() + 1);
        for j in 0..input.len() {
            let curr = input[j];
            let prev = input[(j + input.len() - 1) % input.len()];
            let curr_in = inside(curr);
            let prev_in = inside(prev);
            if curr_in {
                if !prev_in {
                    if let Some(p) = segment_line_intersection(prev, curr, a, b) {
                        next.push(p);
                    }
                }
                next.push(curr);
            } else if prev_in {
                if let Some(p) = segment_line_intersection(prev, curr, a, b) {
                    next.push(p);
                }
            }
        }
        output = next;
    }
    output
}

/// Intersection of the segment `p1`-`p2` with the infinite line through
/// `a`-`b`. `None` if they are parallel.
fn segment_line_intersection(p1: Point, p2: Point, a: Point, b: Point) -> Option<Point> {
    let d1 = subtract(p2, p1);
    let d2 = subtract(b, a);
    let denom = cross(d1, d2);
    if denom.abs() < GEOMETRY_EPSILON {
        return None;
    }
    let diff = subtract(a, p1);
    let t = cross(diff, d2) / denom;
    Some(add(p1, thoth_spatial::scale(d1, t)))
}

/// The area of `subject ∩ clip_convex`, plan units². Exact when
/// `clip_convex` is a convex polygon (the common case for utility/access
/// easement corridors, which are almost always drawn as simple rectangles or
/// trapezoids); a non-convex `clip_convex` can under- or over-count the
/// overlap since each clip edge is treated as a half-plane. Returns `0.0`
/// for no overlap.
pub fn polygon_intersection_area(subject: &Polygon, clip_convex_poly: &Polygon) -> f64 {
    let clipped = clip_convex(subject, clip_convex_poly);
    if clipped.len() < 3 {
        0.0
    } else {
        polygon_area(&clipped)
    }
}

/// Run one building-envelope fit-check pass: setback envelope, minus
/// easement encroachment, checked against the zone's FAR and coverage caps.
pub fn check_building_envelope_fit(inputs: &EnvelopeFitInputs) -> EnvelopeFitReport {
    let envelope = buildable_envelope(inputs.lot);
    let gross_buildable_area = envelope.as_deref().map(polygon_area).unwrap_or(0.0);

    let mut findings = Vec::new();

    let easement_encroachment_area: f64 = match &envelope {
        Some(env) => inputs
            .easements
            .iter()
            .map(|e| {
                let overlap = polygon_intersection_area(env, &e.base.boundary);
                if overlap > GEOMETRY_EPSILON {
                    findings.push(ComplianceFinding {
                        severity: ComplianceSeverity::Warning,
                        code: "envelope.easementEncroachment".to_string(),
                        message: format!(
                            "{} encroaches {:.1} plan-unit² of the buildable envelope on {}.",
                            e.base.name, overlap, inputs.lot.base.name
                        ),
                        element_id: Some(inputs.lot.base.id.clone()),
                    });
                }
                overlap
            })
            .sum(),
        None => 0.0,
    };
    let net_buildable_area = (gross_buildable_area - easement_encroachment_area).max(0.0);

    if envelope.is_none() {
        findings.push(ComplianceFinding {
            severity: ComplianceSeverity::Error,
            code: "envelope.setbackConsumesLot".to_string(),
            message: format!(
                "{}'s setback leaves no buildable envelope.",
                inputs.lot.base.name
            ),
            element_id: Some(inputs.lot.base.id.clone()),
        });
    }

    let lot_area = polygon_area(&inputs.lot.base.boundary);
    let max_footprint_by_far = inputs
        .zone
        .max_far
        .map(|far| far * lot_area / inputs.storeys.max(1.0));
    let max_footprint_by_coverage = inputs.zone.max_coverage.map(|cov| cov * lot_area);

    if inputs.proposed_footprint_area > net_buildable_area + GEOMETRY_EPSILON {
        findings.push(ComplianceFinding {
            severity: ComplianceSeverity::Error,
            code: "envelope.footprintExceedsBuildableArea".to_string(),
            message: format!(
                "Proposed footprint {:.1} exceeds the net buildable area {:.1} after setbacks and easements.",
                inputs.proposed_footprint_area, net_buildable_area
            ),
            element_id: Some(inputs.lot.base.id.clone()),
        });
    }
    if let Some(max_far_area) = max_footprint_by_far {
        if inputs.proposed_footprint_area > max_far_area + GEOMETRY_EPSILON {
            findings.push(ComplianceFinding {
                severity: ComplianceSeverity::Error,
                code: "envelope.exceedsFar".to_string(),
                message: format!(
                    "Proposed footprint {:.1} at {} storeys exceeds the zone's FAR-derived cap of {:.1}.",
                    inputs.proposed_footprint_area, inputs.storeys, max_far_area
                ),
                element_id: Some(inputs.lot.base.id.clone()),
            });
        }
    }
    if let Some(max_cov_area) = max_footprint_by_coverage {
        if inputs.proposed_footprint_area > max_cov_area + GEOMETRY_EPSILON {
            findings.push(ComplianceFinding {
                severity: ComplianceSeverity::Error,
                code: "envelope.exceedsCoverage".to_string(),
                message: format!(
                    "Proposed footprint {:.1} exceeds the zone's coverage-derived cap of {:.1}.",
                    inputs.proposed_footprint_area, max_cov_area
                ),
                element_id: Some(inputs.lot.base.id.clone()),
            });
        }
    }

    let fits = !findings
        .iter()
        .any(|f| f.severity == ComplianceSeverity::Error);

    EnvelopeFitReport {
        buildable_envelope: envelope,
        gross_buildable_area,
        easement_encroachment_area,
        net_buildable_area,
        max_footprint_by_far,
        max_footprint_by_coverage,
        fits,
        findings,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::elements::new_base;
    use approx::assert_relative_eq;
    use thoth_spatial::ElementKind;

    fn rect(w: f64, h: f64, ox: f64, oy: f64) -> Polygon {
        vec![
            Point::new(ox, oy),
            Point::new(ox + w, oy),
            Point::new(ox + w, oy + h),
            Point::new(ox, oy + h),
        ]
    }

    #[test]
    fn clips_a_square_against_an_overlapping_convex_rectangle() {
        let subject = rect(100.0, 100.0, 0.0, 0.0); // [0,100]x[0,100]
        let clip = rect(50.0, 200.0, 50.0, -50.0); // [50,100]x[-50,150]
        let overlap = polygon_intersection_area(&subject, &clip);
        assert_relative_eq!(overlap, 50.0 * 100.0, epsilon = 1e-6);
    }

    #[test]
    fn no_overlap_yields_zero_area() {
        let subject = rect(10.0, 10.0, 0.0, 0.0);
        let clip = rect(10.0, 10.0, 100.0, 100.0);
        assert_eq!(polygon_intersection_area(&subject, &clip), 0.0);
    }

    #[test]
    fn full_containment_returns_the_subject_area() {
        let subject = rect(10.0, 10.0, 0.0, 0.0);
        let clip = rect(100.0, 100.0, -50.0, -50.0);
        assert_relative_eq!(
            polygon_intersection_area(&subject, &clip),
            100.0,
            epsilon = 1e-6
        );
    }

    fn lot_100x80_setback_10() -> Lot {
        Lot {
            base: new_base(
                "l1",
                ElementKind::Lot,
                "Lot 1",
                "layer",
                rect(100.0, 80.0, 0.0, 0.0),
            ),
            parcel_id: None,
            block_id: None,
            setback: Some(10.0),
        }
    }

    fn zone_r1() -> Zone {
        Zone {
            base: new_base(
                "z1",
                ElementKind::Zone,
                "R-1",
                "layer",
                rect(1000.0, 1000.0, -500.0, -500.0),
            ),
            designation: "R-1".to_string(),
            allowed_uses: vec![],
            max_coverage: Some(0.40),
            max_far: Some(0.50),
            max_height: None,
            min_setback: None,
        }
    }

    #[test]
    fn fits_a_reasonable_footprint_with_no_easements() {
        let lot = lot_100x80_setback_10();
        let zone = zone_r1();
        // Envelope: 80x60 = 4,800. Lot area 8,000; FAR 0.5 -> cap 4,000 at 1
        // storey; coverage 0.4 -> cap 3,200. Propose 3,000: within all caps.
        let inputs = EnvelopeFitInputs {
            lot: &lot,
            zone: &zone,
            easements: &[],
            proposed_footprint_area: 3_000.0,
            storeys: 1.0,
        };
        let report = check_building_envelope_fit(&inputs);
        assert_relative_eq!(report.gross_buildable_area, 4_800.0, epsilon = 1e-6);
        assert_eq!(report.easement_encroachment_area, 0.0);
        assert_relative_eq!(
            report.max_footprint_by_far.unwrap(),
            4_000.0,
            epsilon = 1e-6
        );
        assert_relative_eq!(
            report.max_footprint_by_coverage.unwrap(),
            3_200.0,
            epsilon = 1e-6
        );
        assert!(report.fits);
        assert!(report.findings.is_empty());
    }

    #[test]
    fn flags_far_exceedance_and_easement_encroachment() {
        let lot = lot_100x80_setback_10();
        let zone = zone_r1();
        // A utility easement strip overlapping the west 20 units of the
        // envelope (envelope spans x in [10,90], y in [10,70]).
        let easement = Easement {
            base: new_base(
                "e1",
                ElementKind::Easement,
                "Utility Easement",
                "layer",
                rect(20.0, 200.0, 0.0, -50.0),
            ),
            purpose: Some(crate::elements::EasementPurpose::Utility),
        };
        let inputs = EnvelopeFitInputs {
            lot: &lot,
            zone: &zone,
            easements: std::slice::from_ref(&easement),
            proposed_footprint_area: 4_500.0, // exceeds both FAR (4,000) and coverage (3,200)
            storeys: 1.0,
        };
        let report = check_building_envelope_fit(&inputs);
        // Easement overlaps x in [10,20], y in [10,70] within the envelope: 10*60=600.
        assert_relative_eq!(report.easement_encroachment_area, 600.0, epsilon = 1e-6);
        assert_relative_eq!(report.net_buildable_area, 4_800.0 - 600.0, epsilon = 1e-6);
        assert!(!report.fits);
        assert!(report
            .findings
            .iter()
            .any(|f| f.code == "envelope.easementEncroachment"));
        assert!(report
            .findings
            .iter()
            .any(|f| f.code == "envelope.exceedsFar"));
        assert!(report
            .findings
            .iter()
            .any(|f| f.code == "envelope.exceedsCoverage"));
    }

    #[test]
    fn reports_no_buildable_envelope_when_setback_consumes_the_lot() {
        let mut lot = lot_100x80_setback_10();
        lot.setback = Some(50.0);
        let zone = zone_r1();
        let inputs = EnvelopeFitInputs {
            lot: &lot,
            zone: &zone,
            easements: &[],
            proposed_footprint_area: 100.0,
            storeys: 1.0,
        };
        let report = check_building_envelope_fit(&inputs);
        assert!(report.buildable_envelope.is_none());
        assert_eq!(report.gross_buildable_area, 0.0);
        assert!(!report.fits);
        assert!(report
            .findings
            .iter()
            .any(|f| f.code == "envelope.setbackConsumesLot"));
    }
}
