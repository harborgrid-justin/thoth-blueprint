//! Cadastral parcel-fabric import and parcel-boundary matching against
//! external (county/assessor) parcel data.
//!
//! Scope: this module works against an in-memory [`FabricParcel`] list — the
//! caller is responsible for getting county/assessor data into that shape
//! (typically via [`crate::shapefile::parse_shp`]/`parse_dbf` for a county
//! GIS parcel-fabric export, or [`crate::landxml::parcels`] for a LandXML
//! cadastral exchange — this module doesn't reparse either, it consumes
//! their output). Matching has two strategies, run in that priority order:
//!
//! 1. **APN match**: exact string match between `thoth_planning::Parcel::apn`
//!    and `FabricParcel::apn`, when both are present and non-empty. This is
//!    authoritative when available — assessor parcel numbers are the
//!    jurisdiction's own identifier.
//! 2. **Spatial overlap match**: when no APN match is found (or either side
//!    lacks an APN), the fabric parcel whose boundary has the greatest
//!    intersection-over-union (IoU) with the plan parcel is proposed as a
//!    match, gated by [`MatchOptions::min_iou`] — below that, the plan
//!    parcel is reported unmatched rather than forced onto a poor spatial
//!    guess. Polygon intersection is computed via a generic (non-convex,
//!    non-holed) Sutherland–Hodgman clip of the fabric ring against the plan
//!    ring, which is exact for convex clip polygons and a documented
//!    approximation otherwise — county parcel boundaries are close enough to
//!    convex in the overwhelming majority of real subdivisions that this is
//!    an acceptable trade against implementing full generic polygon boolean
//!    ops (a "new geometry engine", explicitly out of scope per the
//!    gap-analysis boundary notes for the sibling planning-automation crate).

use thoth_planning::elements::Parcel as PlanningParcel;
use thoth_spatial::{area, ensure_counter_clockwise, Point, Polygon};

/// An external (county/assessor) parcel record to match against.
#[derive(Debug, Clone, PartialEq)]
pub struct FabricParcel {
    pub id: String,
    pub apn: Option<String>,
    pub boundary: Polygon,
}

/// Tuning knobs for [`match_parcels`].
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MatchOptions {
    /// Minimum intersection-over-union to accept a spatial match when no APN
    /// match is available. `0.0..=1.0`.
    pub min_iou: f64,
}

impl Default for MatchOptions {
    fn default() -> Self {
        MatchOptions { min_iou: 0.5 }
    }
}

/// How a plan parcel was matched to a fabric parcel, if at all.
#[derive(Debug, Clone, PartialEq)]
pub enum MatchBasis {
    Apn,
    SpatialOverlap { iou: f64 },
}

/// The result of matching one plan parcel against the fabric.
#[derive(Debug, Clone, PartialEq)]
pub struct ParcelMatch {
    pub plan_parcel_id: String,
    /// `None` when no fabric parcel met the match criteria.
    pub fabric_parcel_id: Option<String>,
    pub basis: Option<MatchBasis>,
}

fn polygon_bounds_overlap(a: &Polygon, b: &Polygon) -> bool {
    let ba = thoth_spatial::bounds(a);
    let bb = thoth_spatial::bounds(b);
    ba.min_x <= bb.max_x && bb.min_x <= ba.max_x && ba.min_y <= bb.max_y && bb.min_y <= ba.max_y
}

/// Clip subject polygon `subject` against convex clip polygon `clip` using
/// Sutherland–Hodgman. Exact when `clip` is convex; when it isn't, this
/// still produces a valid (if occasionally incomplete) intersection — see
/// module scope doc.
fn clip_polygon(subject: &[Point], clip: &[Point]) -> Vec<Point> {
    let mut output = subject.to_vec();
    let n = clip.len();
    for i in 0..n {
        if output.is_empty() {
            break;
        }
        let clip_a = clip[i];
        let clip_b = clip[(i + 1) % n];
        let edge = thoth_spatial::subtract(clip_b, clip_a);
        // Inside test assumes `clip` is wound counter-clockwise (see caller).
        let inside =
            |p: Point| thoth_spatial::cross(edge, thoth_spatial::subtract(p, clip_a)) >= 0.0;

        let input = output;
        let mut new_output = Vec::with_capacity(input.len() + 1);
        for j in 0..input.len() {
            let curr = input[j];
            let prev = input[(j + input.len() - 1) % input.len()];
            let curr_in = inside(curr);
            let prev_in = inside(prev);
            if curr_in {
                if !prev_in {
                    if let Some(pt) = segment_intersection(prev, curr, clip_a, clip_b) {
                        new_output.push(pt);
                    }
                }
                new_output.push(curr);
            } else if prev_in {
                if let Some(pt) = segment_intersection(prev, curr, clip_a, clip_b) {
                    new_output.push(pt);
                }
            }
        }
        output = new_output;
    }
    output
}

fn segment_intersection(a: Point, b: Point, c: Point, d: Point) -> Option<Point> {
    let r = thoth_spatial::subtract(b, a);
    let s = thoth_spatial::subtract(d, c);
    let denom = thoth_spatial::cross(r, s);
    if denom.abs() < 1e-12 {
        return None;
    }
    let t = thoth_spatial::cross(thoth_spatial::subtract(c, a), s) / denom;
    Some(thoth_spatial::add(a, thoth_spatial::scale(r, t)))
}

/// Intersection-over-union of two boundary rings, in `[0, 1]`.
pub fn polygon_iou(a: &Polygon, b: &Polygon) -> f64 {
    if a.len() < 3 || b.len() < 3 || !polygon_bounds_overlap(a, b) {
        return 0.0;
    }
    let ccw_b = ensure_counter_clockwise(b);
    let intersection = clip_polygon(a, &ccw_b);
    if intersection.len() < 3 {
        return 0.0;
    }
    let inter_area = area(&intersection);
    let union_area = area(a) + area(b) - inter_area;
    if union_area <= 0.0 {
        0.0
    } else {
        (inter_area / union_area).clamp(0.0, 1.0)
    }
}

/// Match every plan parcel against the given fabric, in priority order (APN,
/// then best-IoU spatial overlap gated by [`MatchOptions::min_iou`]).
///
/// This function does not itself validate parcel geometry (boundaries with
/// fewer than 3 vertices simply score a `0.0` IoU against everything, per
/// [`polygon_iou`]) — callers should validate parcels with
/// `thoth_spatial::is_valid_polygon` beforehand, matching the rest of this
/// crate's "don't build a second geometry-validation layer" stance.
pub fn match_parcels(
    plan_parcels: &[PlanningParcel],
    fabric: &[FabricParcel],
    options: &MatchOptions,
) -> Vec<ParcelMatch> {
    plan_parcels
        .iter()
        .map(|plan| {
            if let Some(apn) = plan.apn.as_deref().filter(|s| !s.is_empty()) {
                if let Some(hit) = fabric.iter().find(|f| f.apn.as_deref() == Some(apn)) {
                    return ParcelMatch {
                        plan_parcel_id: plan.base.id.clone(),
                        fabric_parcel_id: Some(hit.id.clone()),
                        basis: Some(MatchBasis::Apn),
                    };
                }
            }

            let best = fabric
                .iter()
                .map(|f| (f, polygon_iou(&plan.base.boundary, &f.boundary)))
                .filter(|(_, iou)| *iou >= options.min_iou)
                .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

            match best {
                Some((hit, iou)) => ParcelMatch {
                    plan_parcel_id: plan.base.id.clone(),
                    fabric_parcel_id: Some(hit.id.clone()),
                    basis: Some(MatchBasis::SpatialOverlap { iou }),
                },
                None => ParcelMatch {
                    plan_parcel_id: plan.base.id.clone(),
                    fabric_parcel_id: None,
                    basis: None,
                },
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_planning::new_base;
    use thoth_spatial::ElementKind;

    fn square(x0: f64, y0: f64, size: f64) -> Polygon {
        vec![
            Point::new(x0, y0),
            Point::new(x0 + size, y0),
            Point::new(x0 + size, y0 + size),
            Point::new(x0, y0 + size),
        ]
    }

    fn plan_parcel(id: &str, apn: Option<&str>, boundary: Polygon) -> PlanningParcel {
        PlanningParcel {
            base: new_base(id, ElementKind::Parcel, "Lot", "layer", boundary),
            apn: apn.map(str::to_string),
        }
    }

    #[test]
    fn identical_squares_have_iou_of_one() {
        let a = square(0.0, 0.0, 10.0);
        let b = square(0.0, 0.0, 10.0);
        assert!((polygon_iou(&a, &b) - 1.0).abs() < 1e-6);
    }

    #[test]
    fn disjoint_squares_have_iou_of_zero() {
        let a = square(0.0, 0.0, 10.0);
        let b = square(100.0, 100.0, 10.0);
        assert_eq!(polygon_iou(&a, &b), 0.0);
    }

    #[test]
    fn half_overlapping_squares_have_iou_one_third() {
        let a = square(0.0, 0.0, 10.0);
        let b = square(5.0, 0.0, 10.0);
        // Intersection = 5x10 = 50; union = 100+100-50 = 150; IoU = 1/3.
        assert!((polygon_iou(&a, &b) - (1.0 / 3.0)).abs() < 1e-6);
    }

    #[test]
    fn matches_by_apn_before_considering_geometry() {
        let plan = vec![plan_parcel(
            "p1",
            Some("045-12-007"),
            square(0.0, 0.0, 10.0),
        )];
        // Deliberately far away geometrically — APN should still win.
        let fabric = vec![FabricParcel {
            id: "f1".to_string(),
            apn: Some("045-12-007".to_string()),
            boundary: square(500.0, 500.0, 10.0),
        }];
        let matches = match_parcels(&plan, &fabric, &MatchOptions::default());
        assert_eq!(matches[0].fabric_parcel_id.as_deref(), Some("f1"));
        assert_eq!(matches[0].basis, Some(MatchBasis::Apn));
    }

    #[test]
    fn falls_back_to_spatial_overlap_without_a_matching_apn() {
        let plan = vec![plan_parcel("p1", None, square(0.0, 0.0, 10.0))];
        let fabric = vec![
            FabricParcel {
                id: "far".to_string(),
                apn: None,
                boundary: square(500.0, 500.0, 10.0),
            },
            FabricParcel {
                id: "close".to_string(),
                apn: None,
                boundary: square(0.5, 0.5, 9.0),
            },
        ];
        let matches = match_parcels(&plan, &fabric, &MatchOptions::default());
        assert_eq!(matches[0].fabric_parcel_id.as_deref(), Some("close"));
        assert!(matches!(
            matches[0].basis,
            Some(MatchBasis::SpatialOverlap { .. })
        ));
    }

    #[test]
    fn below_threshold_overlap_is_reported_unmatched() {
        let plan = vec![plan_parcel("p1", None, square(0.0, 0.0, 10.0))];
        let fabric = vec![FabricParcel {
            id: "barely".to_string(),
            apn: None,
            boundary: square(9.0, 0.0, 10.0), // tiny sliver overlap
        }];
        let matches = match_parcels(&plan, &fabric, &MatchOptions { min_iou: 0.5 });
        assert!(matches[0].fabric_parcel_id.is_none());
        assert!(matches[0].basis.is_none());
    }
}
