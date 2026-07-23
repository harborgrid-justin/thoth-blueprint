//! The subdivision engine: splitting a polygon by an infinite line, walking a
//! frontage to cut lots of a target area ("slide line"), pivoting a partition
//! line from a fixed point ("swing line"), and merging adjacent lots back
//! together.
//!
//! Port of `packages/domain/src/planning/subdivision.ts`. Per CLAUDE.md rule
//! #6, every impossible-target / degenerate-geometry case that the TS
//! original throws a `new Error(...)` for is preserved here as an explicit,
//! typed [`SubdivisionError`] variant rather than a panic.

use thoth_spatial::{
    add, area as polygon_area, distance, length, scale, subtract, ElementKind, Point, Polygon,
};

use crate::elements::{new_base, Lot};

/// Everything that can go wrong asking the subdivision engine to cut, sweep,
/// or merge lots. Mirrors the exact `Error` messages the TS original throws,
/// since the planning UI surfaces these to a human planner verbatim.
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum SubdivisionError {
    #[error("Invalid frontage: must contain at least 2 points.")]
    InvalidFrontage,
    #[error("Invalid target area: must be greater than 0.")]
    InvalidTargetArea,
    #[error(
        "Unrealistic subdivision: target area ({target:.2}) exceeds total parcel area ({total:.2})."
    )]
    TargetAreaExceedsParcel { target: f64, total: f64 },
    #[error("Parcel area is too small to subdivide.")]
    ParcelTooSmall,
    #[error("Invalid boundary: must contain at least 3 points.")]
    InvalidBoundary,
    #[error("No lots provided for merge")]
    NoLotsProvided,
    #[error("Invalid adjacent lot layout: no outer boundary found")]
    NoOuterBoundary,
    #[error("Cannot merge disjoint lots: boundaries do not connect")]
    DisjointLots,
}

/// Options for [`subdivide_slide_line`].
pub struct SlideLineOptions<'a> {
    pub target_area: f64,
    pub frontage: &'a [Point],
    /// Angle in degrees relative to the frontage tangent (default 90).
    pub angle: Option<f64>,
    pub layer_id: String,
    pub make_id: Box<dyn FnMut() -> String + 'a>,
    pub setback: Option<f64>,
}

/// Options for [`subdivide_swing_line`].
pub struct SwingLineOptions<'a> {
    pub target_area: f64,
    pub pivot: Point,
    pub layer_id: String,
    pub make_id: Box<dyn FnMut() -> String + 'a>,
    pub setback: Option<f64>,
}

/// Split a polygon by an infinite line passing through `p1` and `p2`.
/// Returns `[left, right]` (relative to the line direction `p1 -> p2`), or
/// `None` if no valid two-piece split results (degenerate/too-small pieces).
pub fn split_polygon_by_line(polygon: &Polygon, p1: Point, p2: Point) -> Option<[Polygon; 2]> {
    let n = polygon.len();
    if n < 3 {
        return None;
    }

    let a_coef = p2.y - p1.y;
    let b_coef = p1.x - p2.x;
    let c_coef = p2.x * p1.y - p1.x * p2.y;
    let side = |p: Point| a_coef * p.x + b_coef * p.y + c_coef;

    let mut left: Vec<Point> = Vec::new();
    let mut right: Vec<Point> = Vec::new();

    for i in 0..n {
        let curr = polygon[i];
        let next = polygon[(i + 1) % n];
        let s_curr = side(curr);
        let s_next = side(next);

        if s_curr >= -1e-6 {
            left.push(curr);
        }
        if s_curr <= 1e-6 {
            right.push(curr);
        }

        if (s_curr > 1e-6 && s_next < -1e-6) || (s_curr < -1e-6 && s_next > 1e-6) {
            let t = s_curr / (s_curr - s_next);
            let intersect = Point::new(
                curr.x + t * (next.x - curr.x),
                curr.y + t * (next.y - curr.y),
            );
            left.push(intersect);
            right.push(intersect);
        }
    }

    fn clean(pts: Vec<Point>) -> Vec<Point> {
        let mut res: Vec<Point> = Vec::with_capacity(pts.len());
        for p in pts {
            if res
                .last()
                .map(|&last| distance(p, last) > 1e-4)
                .unwrap_or(true)
            {
                res.push(p);
            }
        }
        if res.len() > 1 && distance(res[0], *res.last().unwrap()) < 1e-4 {
            res.pop();
        }
        res
    }

    let clean_left = clean(left);
    let clean_right = clean(right);

    if clean_left.len() < 3 || clean_right.len() < 3 {
        return None;
    }
    if polygon_area(&clean_left).abs() < 1e-3 || polygon_area(&clean_right).abs() < 1e-3 {
        return None;
    }

    Some([clean_left, clean_right])
}

fn make_lot(
    id: String,
    name: String,
    layer_id: &str,
    boundary: Polygon,
    setback: Option<f64>,
) -> Lot {
    Lot {
        base: new_base(id, ElementKind::Lot, name, layer_id.to_string(), boundary),
        parcel_id: None,
        block_id: None,
        setback,
    }
}

/// Slide Line Subdivision: walk along a frontage path and slide a lot
/// partition line perpendicular (or at an angle) to the frontage to cut off a
/// lot of `target_area`.
pub fn subdivide_slide_line(
    boundary: &Polygon,
    mut options: SlideLineOptions,
) -> Result<Vec<Lot>, SubdivisionError> {
    if options.frontage.len() < 2 {
        return Err(SubdivisionError::InvalidFrontage);
    }
    if options.target_area <= 0.0 {
        return Err(SubdivisionError::InvalidTargetArea);
    }
    let total_area = polygon_area(boundary);
    if options.target_area > total_area {
        return Err(SubdivisionError::TargetAreaExceedsParcel {
            target: options.target_area,
            total: total_area,
        });
    }
    if total_area < 10.0 {
        return Err(SubdivisionError::ParcelTooSmall);
    }

    let angle = options.angle.unwrap_or(90.0);
    let frontage_start = options.frontage[0];
    let mut remainder = boundary.clone();
    let mut lots: Vec<Lot> = Vec::new();

    for idx in 0..options.frontage.len() - 1 {
        let start_pt = options.frontage[idx];
        let end_pt = options.frontage[idx + 1];
        let ab = subtract(end_pt, start_pt);
        let seg_len = length(ab);
        if seg_len < 1e-4 {
            continue;
        }

        let theta = ab.y.atan2(ab.x) + angle.to_radians();
        let px = theta.cos();
        let py = theta.sin();

        let get_split = |t: f64, remainder: &Polygon| -> Option<(Polygon, Polygon)> {
            let split_pt = Point::new(start_pt.x + t * ab.x, start_pt.y + t * ab.y);
            let p2 = Point::new(split_pt.x + px, split_pt.y + py);
            let split = split_polygon_by_line(remainder, split_pt, p2)?;

            let line_a = p2.y - split_pt.y;
            let line_b = split_pt.x - p2.x;
            let line_c = p2.x * split_pt.y - split_pt.x * p2.y;
            let side_f0 = line_a * frontage_start.x + line_b * frontage_start.y + line_c;
            let contains_front_start = side_f0 >= 0.0;

            let [a, b] = split;
            Some(if contains_front_start { (a, b) } else { (b, a) })
        };

        let max_split = get_split(1.0, &remainder);
        if let Some((ref lot, ref rem)) = max_split {
            if polygon_area(lot) < options.target_area {
                lots.push(make_lot(
                    (options.make_id)(),
                    format!("Lot {}", lots.len() + 1),
                    &options.layer_id,
                    lot.clone(),
                    options.setback,
                ));
                remainder = rem.clone();
                continue;
            }
        }

        let mut low = 0.0_f64;
        let mut high = 1.0_f64;
        let mut best: Option<(Polygon, Polygon)> = None;

        for _ in 0..20 {
            let mid = (low + high) / 2.0;
            let Some((lot, rem)) = get_split(mid, &remainder) else {
                high = mid;
                continue;
            };
            let a = polygon_area(&lot);
            if (a - options.target_area).abs() < 1e-2 {
                best = Some((lot, rem));
                break;
            }
            if a < options.target_area {
                low = mid;
            } else {
                high = mid;
                best = Some((lot, rem));
            }
        }

        if let Some((lot, _rem)) = best {
            // The loop always exits here (the TS original mirrors this: it
            // cuts at most one lot per `subdivide_slide_line` call), so the
            // leftover remainder never needs to feed a subsequent iteration.
            lots.push(make_lot(
                (options.make_id)(),
                format!("Lot {}", lots.len() + 1),
                &options.layer_id,
                lot,
                options.setback,
            ));
            break;
        }
    }

    Ok(lots)
}

/// Swing Line Subdivision: pivot a partition line from a fixed point on the
/// parcel boundary and binary-search the sweep fraction between the two
/// adjacent corner edges.
pub fn subdivide_swing_line(
    boundary: &Polygon,
    options: SwingLineOptions,
) -> Result<Vec<Lot>, SubdivisionError> {
    let mut options = options;
    if boundary.len() < 3 {
        return Err(SubdivisionError::InvalidBoundary);
    }
    if options.target_area <= 0.0 {
        return Err(SubdivisionError::InvalidTargetArea);
    }
    let total_area = polygon_area(boundary);
    if options.target_area > total_area {
        return Err(SubdivisionError::TargetAreaExceedsParcel {
            target: options.target_area,
            total: total_area,
        });
    }

    let n = boundary.len();
    let mut idx = 0usize;
    let mut min_dist = f64::INFINITY;
    for (i, &p) in boundary.iter().enumerate() {
        let d = distance(p, options.pivot);
        if d < min_dist {
            min_dist = d;
            idx = i;
        }
    }

    let (prev_pt, next_pt) = if min_dist > 1e-2 {
        // Pivot is on an edge. Find the edge.
        let mut edge_idx = 0usize;
        let mut min_edge_dist = f64::INFINITY;
        for i in 0..n {
            let p1 = boundary[i];
            let p2 = boundary[(i + 1) % n];
            let ab = subtract(p2, p1);
            let len = length(ab);
            if len < 1e-4 {
                continue;
            }
            let t =
                ((options.pivot.x - p1.x) * ab.x + (options.pivot.y - p1.y) * ab.y) / (len * len);
            if (0.0..=1.0).contains(&t) {
                let p_loc = add(p1, scale(ab, t));
                let d = distance(options.pivot, p_loc);
                if d < min_edge_dist {
                    min_edge_dist = d;
                    edge_idx = i;
                }
            }
        }
        (boundary[edge_idx], boundary[(edge_idx + 1) % n])
    } else {
        (boundary[(idx + n - 1) % n], boundary[(idx + 1) % n])
    };

    let v1 = subtract(prev_pt, options.pivot);
    let v2 = subtract(next_pt, options.pivot);
    let theta1 = v1.y.atan2(v1.x);
    let theta2 = v2.y.atan2(v2.x);

    let mut sweep_angle = theta2 - theta1;
    while sweep_angle <= -std::f64::consts::PI {
        sweep_angle += 2.0 * std::f64::consts::PI;
    }
    while sweep_angle > std::f64::consts::PI {
        sweep_angle -= 2.0 * std::f64::consts::PI;
    }

    let pivot = options.pivot;
    let get_split = |s: f64| -> Option<Polygon> {
        let rad = theta1 + s * sweep_angle;
        let dir = Point::new(rad.cos(), rad.sin());
        let p2 = add(pivot, dir);
        let split = split_polygon_by_line(boundary, pivot, p2)?;

        let line_a = p2.y - pivot.y;
        let line_b = pivot.x - p2.x;
        let line_c = p2.x * pivot.y - pivot.x * p2.y;
        let side_prev = line_a * prev_pt.x + line_b * prev_pt.y + line_c;
        let contains_prev = side_prev >= 0.0;

        let [a, b] = split;
        Some(if contains_prev { a } else { b })
    };

    let mut low = 0.0_f64;
    let mut high = 1.0_f64;
    let mut best_lot: Option<Polygon> = None;

    for _ in 0..20 {
        let mid = (low + high) / 2.0;
        let Some(lot) = get_split(mid) else {
            if mid < 0.5 {
                low = mid;
            } else {
                high = mid;
            }
            continue;
        };
        let a = polygon_area(&lot);
        if (a - options.target_area).abs() < 1e-2 {
            best_lot = Some(lot);
            break;
        }
        if a < options.target_area {
            low = mid;
        } else {
            high = mid;
            best_lot = Some(lot);
        }
    }

    Ok(match best_lot {
        Some(lot) => vec![make_lot(
            (options.make_id)(),
            format!("Lot {}", boundary.len() + 1),
            &options.layer_id,
            lot,
            options.setback,
        )],
        None => Vec::new(),
    })
}

/// Merge adjacent lots by dissolving their shared boundaries: collect every
/// directed edge, discard edges whose reverse also appears (interior/shared
/// edges), and walk the surviving outer loop.
pub fn merge_lots(
    lots: &[Lot],
    layer_id: &str,
    mut make_id: impl FnMut() -> String,
) -> Result<Lot, SubdivisionError> {
    if lots.is_empty() {
        return Err(SubdivisionError::NoLotsProvided);
    }
    if lots.len() == 1 {
        return Ok(lots[0].clone());
    }

    fn point_key(p: Point) -> String {
        format!(
            "{}:{}",
            (p.x * 1000.0).round() as i64,
            (p.y * 1000.0).round() as i64
        )
    }

    struct DirectedEdge {
        from: Point,
        key_from: String,
        key_to: String,
    }

    let mut all_edges: Vec<DirectedEdge> = Vec::new();
    let mut edge_counts: std::collections::HashMap<String, u32> = std::collections::HashMap::new();

    for lot in lots {
        let poly = &lot.base.boundary;
        let n = poly.len();
        for i in 0..n {
            let from = poly[i];
            let to = poly[(i + 1) % n];
            let k_from = point_key(from);
            let k_to = point_key(to);
            let norm_key = if k_from < k_to {
                format!("{k_from}_{k_to}")
            } else {
                format!("{k_to}_{k_from}")
            };
            *edge_counts.entry(norm_key).or_insert(0) += 1;
            all_edges.push(DirectedEdge {
                from,
                key_from: k_from,
                key_to: k_to,
            });
        }
    }

    let outer_edges: Vec<&DirectedEdge> = all_edges
        .iter()
        .filter(|e| {
            let norm_key = if e.key_from < e.key_to {
                format!("{}_{}", e.key_from, e.key_to)
            } else {
                format!("{}_{}", e.key_to, e.key_from)
            };
            edge_counts.get(&norm_key).copied() == Some(1)
        })
        .collect();

    if outer_edges.len() < 3 {
        return Err(SubdivisionError::NoOuterBoundary);
    }

    let next_edge_map: std::collections::HashMap<&str, &DirectedEdge> = outer_edges
        .iter()
        .map(|e| (e.key_from.as_str(), *e))
        .collect();

    let mut boundary_points: Vec<Point> = Vec::new();
    let mut visited: std::collections::HashSet<*const DirectedEdge> =
        std::collections::HashSet::new();
    let mut curr: Option<&DirectedEdge> = Some(outer_edges[0]);

    while let Some(edge) = curr {
        let ptr = edge as *const DirectedEdge;
        if visited.contains(&ptr) {
            break;
        }
        visited.insert(ptr);
        boundary_points.push(edge.from);
        curr = next_edge_map.get(edge.key_to.as_str()).copied();
    }

    if visited.len() < outer_edges.len() || boundary_points.len() < 3 {
        return Err(SubdivisionError::DisjointLots);
    }

    Ok(Lot {
        base: new_base(
            make_id(),
            ElementKind::Lot,
            "Merged Lot",
            layer_id.to_string(),
            boundary_points,
        ),
        parcel_id: None,
        block_id: None,
        setback: lots[0].setback,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn square() -> Polygon {
        vec![
            Point::new(0.0, 0.0),
            Point::new(100.0, 0.0),
            Point::new(100.0, 100.0),
            Point::new(0.0, 100.0),
        ]
    }

    fn counter(start: u32) -> impl FnMut() -> String {
        let mut n = start;
        move || {
            n += 1;
            format!("lot-{n}")
        }
    }

    #[test]
    fn splits_a_polygon_by_a_line() {
        let p1 = Point::new(50.0, 0.0);
        let p2 = Point::new(50.0, 100.0);
        let split = split_polygon_by_line(&square(), p1, p2).expect("split");
        assert_relative_eq!(polygon_area(&split[0]), 5000.0, epsilon = 1e-6);
        assert_relative_eq!(polygon_area(&split[1]), 5000.0, epsilon = 1e-6);
    }

    #[test]
    fn subdivides_a_parcel_using_slide_line() {
        let frontage = vec![Point::new(0.0, 0.0), Point::new(100.0, 0.0)];
        let make_id = counter(0);
        let lots = subdivide_slide_line(
            &square(),
            SlideLineOptions {
                target_area: 3000.0,
                frontage: &frontage,
                angle: Some(90.0),
                layer_id: "lot-layer".to_string(),
                make_id: Box::new(make_id),
                setback: None,
            },
        )
        .unwrap();

        assert_eq!(lots.len(), 1);
        assert_relative_eq!(polygon_area(&lots[0].base.boundary), 3000.0, epsilon = 1.0);
        let xs: Vec<f64> = lots[0].base.boundary.iter().map(|p| p.x).collect();
        let span = xs.iter().cloned().fold(f64::MIN, f64::max)
            - xs.iter().cloned().fold(f64::MAX, f64::min);
        assert_relative_eq!(span.abs(), 30.0, epsilon = 1.0);
    }

    #[test]
    fn subdivides_a_parcel_using_swing_line() {
        let pivot = Point::new(0.0, 100.0);
        let make_id = counter(0);
        let lots = subdivide_swing_line(
            &square(),
            SwingLineOptions {
                target_area: 2500.0,
                pivot,
                layer_id: "lot-layer".to_string(),
                make_id: Box::new(make_id),
                setback: None,
            },
        )
        .unwrap();

        assert_eq!(lots.len(), 1);
        assert_relative_eq!(polygon_area(&lots[0].base.boundary), 2500.0, epsilon = 1.0);
    }

    #[test]
    fn merges_adjacent_lots_by_boundary_dissolution() {
        let lot1 = make_lot(
            "l1".into(),
            "Lot 1".into(),
            "lot-layer",
            vec![
                Point::new(0.0, 0.0),
                Point::new(50.0, 0.0),
                Point::new(50.0, 100.0),
                Point::new(0.0, 100.0),
            ],
            None,
        );
        let lot2 = make_lot(
            "l2".into(),
            "Lot 2".into(),
            "lot-layer",
            vec![
                Point::new(50.0, 0.0),
                Point::new(100.0, 0.0),
                Point::new(100.0, 100.0),
                Point::new(50.0, 100.0),
            ],
            None,
        );

        let make_id = counter(0);
        let merged = merge_lots(&[lot1, lot2], "lot-layer", make_id).unwrap();
        assert_relative_eq!(polygon_area(&merged.base.boundary), 10000.0, epsilon = 1e-6);

        let xs: Vec<f64> = merged.base.boundary.iter().map(|p| p.x).collect();
        let ys: Vec<f64> = merged.base.boundary.iter().map(|p| p.y).collect();
        assert_relative_eq!(xs.iter().cloned().fold(f64::MIN, f64::max), 100.0);
        assert_relative_eq!(xs.iter().cloned().fold(f64::MAX, f64::min), 0.0);
        assert_relative_eq!(ys.iter().cloned().fold(f64::MIN, f64::max), 100.0);
        assert_relative_eq!(ys.iter().cloned().fold(f64::MAX, f64::min), 0.0);
    }

    // --- error-boundary parity with subdivision_error_boundaries.test.ts ---

    #[test]
    fn slide_line_rejects_target_area_exceeding_parcel() {
        let frontage = vec![square()[0], square()[1]];
        let err = subdivide_slide_line(
            &square(),
            SlideLineOptions {
                target_area: 15000.0,
                frontage: &frontage,
                angle: None,
                layer_id: "test".into(),
                make_id: Box::new(|| "lot".to_string()),
                setback: None,
            },
        )
        .unwrap_err();
        assert_eq!(
            err,
            SubdivisionError::TargetAreaExceedsParcel {
                target: 15000.0,
                total: 10000.0
            }
        );
        assert_eq!(
            err.to_string(),
            "Unrealistic subdivision: target area (15000.00) exceeds total parcel area (10000.00)."
        );
    }

    #[test]
    fn slide_line_rejects_non_positive_target_area() {
        let frontage = vec![square()[0], square()[1]];
        for target in [-100.0, 0.0] {
            let err = subdivide_slide_line(
                &square(),
                SlideLineOptions {
                    target_area: target,
                    frontage: &frontage,
                    angle: None,
                    layer_id: "test".into(),
                    make_id: Box::new(|| "lot".to_string()),
                    setback: None,
                },
            )
            .unwrap_err();
            assert_eq!(err, SubdivisionError::InvalidTargetArea);
        }
    }

    #[test]
    fn slide_line_rejects_a_too_small_parcel() {
        let small = vec![
            Point::new(0.0, 0.0),
            Point::new(2.0, 0.0),
            Point::new(2.0, 2.0),
            Point::new(0.0, 2.0),
        ];
        let frontage = vec![small[0], small[1]];
        let err = subdivide_slide_line(
            &small,
            SlideLineOptions {
                target_area: 2.0,
                frontage: &frontage,
                angle: None,
                layer_id: "test".into(),
                make_id: Box::new(|| "lot".to_string()),
                setback: None,
            },
        )
        .unwrap_err();
        assert_eq!(err, SubdivisionError::ParcelTooSmall);
    }

    #[test]
    fn slide_line_rejects_invalid_frontage() {
        let frontage = vec![square()[0]];
        let err = subdivide_slide_line(
            &square(),
            SlideLineOptions {
                target_area: 5000.0,
                frontage: &frontage,
                angle: None,
                layer_id: "test".into(),
                make_id: Box::new(|| "lot".to_string()),
                setback: None,
            },
        )
        .unwrap_err();
        assert_eq!(err, SubdivisionError::InvalidFrontage);
    }

    #[test]
    fn swing_line_rejects_target_area_exceeding_parcel() {
        let err = subdivide_swing_line(
            &square(),
            SwingLineOptions {
                target_area: 15000.0,
                pivot: square()[2],
                layer_id: "test".into(),
                make_id: Box::new(|| "lot".to_string()),
                setback: None,
            },
        )
        .unwrap_err();
        assert_eq!(
            err,
            SubdivisionError::TargetAreaExceedsParcel {
                target: 15000.0,
                total: 10000.0
            }
        );
    }

    #[test]
    fn swing_line_rejects_non_positive_target_area() {
        let err = subdivide_swing_line(
            &square(),
            SwingLineOptions {
                target_area: -500.0,
                pivot: square()[2],
                layer_id: "test".into(),
                make_id: Box::new(|| "lot".to_string()),
                setback: None,
            },
        )
        .unwrap_err();
        assert_eq!(err, SubdivisionError::InvalidTargetArea);
    }

    #[test]
    fn swing_line_rejects_a_degenerate_boundary() {
        let line_boundary = vec![Point::new(0.0, 0.0), Point::new(100.0, 0.0)];
        let err = subdivide_swing_line(
            &line_boundary,
            SwingLineOptions {
                target_area: 5000.0,
                pivot: square()[2],
                layer_id: "test".into(),
                make_id: Box::new(|| "lot".to_string()),
                setback: None,
            },
        )
        .unwrap_err();
        assert_eq!(err, SubdivisionError::InvalidBoundary);
    }

    #[test]
    fn merge_rejects_an_empty_lot_list() {
        let err = merge_lots(&[], "test", || "merged".to_string()).unwrap_err();
        assert_eq!(err, SubdivisionError::NoLotsProvided);
    }

    #[test]
    fn merge_rejects_disjoint_lots() {
        let lot1 = make_lot("1".into(), "l1".into(), "test", square(), None);
        let lot2 = make_lot(
            "2".into(),
            "l2".into(),
            "test",
            vec![
                Point::new(200.0, 200.0),
                Point::new(300.0, 200.0),
                Point::new(300.0, 300.0),
                Point::new(200.0, 300.0),
            ],
            None,
        );
        let err = merge_lots(&[lot1, lot2], "test", || "merged".to_string()).unwrap_err();
        assert_eq!(err, SubdivisionError::DisjointLots);
    }

    // --- collision/overlap parity with subdivision_100_collision.test.ts ---
    //
    // The TS file expresses this as 100 separate `it()` cases (50 progressive
    // slide-line scenarios + 50 grid-bisection scenarios) so a single failure
    // names its scenario number independently. Here the same 100 scenarios
    // (identical generator parameters, identical assertions) run as two
    // looping `#[test]` functions instead of 100 discrete ones — full
    // numerical parity, coarser failure attribution (a panic message still
    // names the failing scenario index via the `i` in each assertion).

    fn get_centroid(poly: &Polygon) -> Point {
        let mut cx = 0.0;
        let mut cy = 0.0;
        for p in poly {
            cx += p.x;
            cy += p.y;
        }
        Point::new(cx / poly.len() as f64, cy / poly.len() as f64)
    }

    fn generate_base_polygon(offset: f64, size: f64) -> Polygon {
        vec![
            Point::new(offset, offset),
            Point::new(offset + size, offset),
            Point::new(offset + size + size * 0.2, offset + size * 0.8),
            Point::new(offset + size, offset + size),
            Point::new(offset, offset + size),
        ]
    }

    #[test]
    fn grid_block_bisections_do_not_overlap_across_50_generated_scenarios() {
        for i in 51..=100u32 {
            let poly = generate_base_polygon(0.0, 500.0 + i as f64);
            let x_split = 250.0 + i as f64 * 0.5;
            let y_split = 250.0 + i as f64 * 0.5;

            let v_split = split_polygon_by_line(
                &poly,
                Point::new(x_split, -100.0),
                Point::new(x_split, 1000.0),
            )
            .expect("vertical split");

            let left_cut = split_polygon_by_line(
                &v_split[0],
                Point::new(-100.0, y_split),
                Point::new(1000.0, y_split),
            );
            let right_cut = split_polygon_by_line(
                &v_split[1],
                Point::new(-100.0, y_split),
                Point::new(1000.0, y_split),
            );

            let mut final_lots: Vec<Polygon> = Vec::new();
            if let Some(lc) = left_cut {
                final_lots.extend(lc);
            }
            if let Some(rc) = right_cut {
                final_lots.extend(rc);
            }
            assert!(
                final_lots.len() >= 2,
                "scenario {i}: expected at least 2 lots"
            );

            let original_area = polygon_area(&poly);
            let total_sub_area: f64 = final_lots.iter().map(|p| polygon_area(p)).sum();
            assert!(
                (original_area - total_sub_area).abs() < original_area * 0.01,
                "scenario {i}: area not conserved"
            );

            for a in 0..final_lots.len() {
                for b in (a + 1)..final_lots.len() {
                    let ca = get_centroid(&final_lots[a]);
                    let cb = get_centroid(&final_lots[b]);
                    assert!(
                        !thoth_spatial::point_in_polygon(ca, &final_lots[b]),
                        "scenario {i}: lot {a} centroid falls inside lot {b}"
                    );
                    assert!(
                        !thoth_spatial::point_in_polygon(cb, &final_lots[a]),
                        "scenario {i}: lot {b} centroid falls inside lot {a}"
                    );
                }
            }
        }
    }

    #[test]
    fn progressive_slide_line_cuts_do_not_overlap_across_50_generated_scenarios() {
        for i in 1..=50u32 {
            let poly = generate_base_polygon(i as f64 * 10.0, 200.0 + i as f64 * 2.0);
            let mut sub_lots: Vec<Polygon> = Vec::new();
            let mut remainder: Option<Polygon> = Some(poly);

            for _ in 0..4 {
                let Some(rem) = remainder.clone() else { break };
                if polygon_area(&rem) < 500.0 {
                    break;
                }
                let target_area = polygon_area(&rem) * 0.2;
                let frontage = vec![rem[0], rem[1]];
                let lots = subdivide_slide_line(
                    &rem,
                    SlideLineOptions {
                        target_area,
                        frontage: &frontage,
                        angle: Some(90.0),
                        layer_id: "test".into(),
                        make_id: Box::new(|| "lot".to_string()),
                        setback: None,
                    },
                );

                let Ok(lots) = lots else { break };
                if lots.is_empty() {
                    break;
                }
                let lot_boundary = lots[0].base.boundary.clone();
                sub_lots.push(lot_boundary.clone());

                let split_pt = lot_boundary[2];
                let p2 = Point::new(split_pt.x, split_pt.y + 100.0);
                match split_polygon_by_line(&rem, split_pt, p2) {
                    Some([_, right]) => remainder = Some(right),
                    None => break,
                }
            }

            for a in 0..sub_lots.len() {
                for b in (a + 1)..sub_lots.len() {
                    assert!(
                        !thoth_spatial::point_in_polygon(get_centroid(&sub_lots[a]), &sub_lots[b]),
                        "scenario {i}: progressive cut {a}/{b} overlap"
                    );
                }
            }
        }
    }
}
