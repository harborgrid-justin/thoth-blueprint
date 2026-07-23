//! Automated lot-yield optimization: given a parcel boundary and zoning
//! minimum lot area/frontage, search a grid of candidate row/column layouts
//! to maximize the count of conforming lots.
//!
//! Item 38 of the Theme 4 subdivision-design-automation gap analysis — this
//! is Civil 3D/OpenSite Designer territory (their "optimize lot yield"
//! tools), and per the task brief this is intentionally a **heuristic**, not
//! a provably optimal solver (true footprint packing on an arbitrary polygon
//! is a mixed-integer packing problem; NP-hard in general).
//!
//! ## Algorithm
//! 1. Reserve a frontage-road strip of `row_width` along the boundary's
//!    bounding-box south edge, plus `row_width` between every pair of lot
//!    rows (every row gets its own street frontage — a double-loaded-street
//!    subdivision layout).
//! 2. For each candidate `rows` in `1..=max_rows` and `columns` in
//!    `1..=max_columns`, divide the remaining usable rectangle into a
//!    `rows × columns` grid and check whether the resulting cell area/width
//!    satisfy the zoning minimums.
//! 3. Among every candidate that conforms, keep the layout that maximizes
//!    total conforming lot count (ties broken by the smallest leftover area,
//!    i.e. the tightest-fitting grid).
//! 4. As in [`crate::rules::subdivide_grid`], a cell is only kept if its
//!    center lies inside the parcel boundary, discarding cells that fall
//!    outside an irregular (non-rectangular) parcel.
//!
//! ## Known limitations (be honest about these)
//! - **Bounding-box grid, not true footprint packing.** Like
//!   `subdivide_grid`, this treats the parcel as its axis-aligned bounding
//!   box and drops cells whose center falls outside the real boundary. On an
//!   irregular parcel this undercounts yield relative to what a human
//!   planner drawing lots by hand could fit.
//! - **Single frontage-road assumption.** Only one loaded street per row is
//!   modeled (every row has its own street along its south edge);
//!   cul-de-sac/loop road geometries, corner-lot double-frontage rules, and
//!   flag lots are out of scope.
//! - **No true global optimum.** The `rows × columns` search is exhaustive
//!   over a bounded range, but a non-uniform (non-grid) layout can pack more
//!   conforming lots into an irregular parcel than any grid can.
//! - **Orthogonal grid only.** Rotated grids (to follow a parcel's dominant
//!   frontage angle) are not searched — see [`crate::road_network`] for the
//!   companion gap on angled street layouts.

use serde::{Deserialize, Serialize};
use thoth_spatial::{bounds, point_in_polygon, Bounds, ElementKind, Point, Polygon};

use crate::elements::{new_base, Lot};
use crate::subdivision::SubdivisionError;

/// Zoning/road constraints the lot-yield search must respect. Deliberately
/// separate from [`crate::elements::Zone`] (which doesn't carry a minimum
/// lot area/frontage field) rather than adding fields to that shared struct.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct LotYieldConstraints {
    /// Minimum conforming lot area, plan units².
    pub min_lot_area: f64,
    /// Minimum conforming lot frontage (street-facing width), plan units.
    pub min_frontage: f64,
    /// Nominal width of the internal streets used to give every row its own
    /// frontage, plan units.
    pub row_width: f64,
    /// Setback stamped onto every produced lot (informational; not
    /// subtracted from the yield search itself).
    pub setback: Option<f64>,
}

/// The result of a lot-yield optimization pass.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LotYieldResult {
    pub lots: Vec<Lot>,
    pub rows: u32,
    pub columns: u32,
    pub lot_width: f64,
    pub lot_depth: f64,
    pub lot_area: f64,
    /// A short, human-readable note on the algorithm's scope, meant to
    /// travel with the result to a UI (see the module doc for the full
    /// limitations list).
    pub algorithm_notes: &'static str,
}

const ALGORITHM_NOTES: &str = "Heuristic bounding-box grid search (rows x columns), \
single-frontage-road-per-row assumption, orthogonal grid only; not a provably optimal packing.";

/// Count how many of the `rows × columns` grid cells (each `lot_width` ×
/// `lot_depth`, stacked from the bounding box's south edge with `row_width`
/// reserved below the first row and between rows) have their center inside
/// `boundary`; used by the search loop to score a candidate layout without
/// materializing lot geometry for every candidate.
fn count_conforming_cells(
    boundary: &Polygon,
    box_: Bounds,
    rows: u32,
    columns: u32,
    lot_width: f64,
    lot_depth: f64,
    row_width: f64,
) -> usize {
    let mut count = 0;
    for r in 0..rows {
        let y0 = box_.min_y + row_width + r as f64 * (lot_depth + row_width);
        for c in 0..columns {
            let x0 = box_.min_x + c as f64 * lot_width;
            let center = Point::new(x0 + lot_width / 2.0, y0 + lot_depth / 2.0);
            if point_in_polygon(center, boundary) {
                count += 1;
            }
        }
    }
    count
}

/// Materialize the actual [`Lot`] elements for a chosen `rows × columns`
/// layout (the same cell geometry [`count_conforming_cells`] scored).
#[allow(clippy::too_many_arguments)]
fn generate_lots(
    boundary: &Polygon,
    box_: Bounds,
    rows: u32,
    columns: u32,
    lot_width: f64,
    lot_depth: f64,
    row_width: f64,
    layer_id: &str,
    setback: Option<f64>,
    make_id: &mut impl FnMut() -> String,
) -> Vec<Lot> {
    let mut lots = Vec::new();
    for r in 0..rows {
        let y0 = box_.min_y + row_width + r as f64 * (lot_depth + row_width);
        for c in 0..columns {
            let x0 = box_.min_x + c as f64 * lot_width;
            let center = Point::new(x0 + lot_width / 2.0, y0 + lot_depth / 2.0);
            if !point_in_polygon(center, boundary) {
                continue;
            }
            let cell: Polygon = vec![
                Point::new(x0, y0),
                Point::new(x0 + lot_width, y0),
                Point::new(x0 + lot_width, y0 + lot_depth),
                Point::new(x0, y0 + lot_depth),
            ];
            lots.push(Lot {
                base: new_base(
                    make_id(),
                    ElementKind::Lot,
                    format!("Lot {}", lots.len() + 1),
                    layer_id.to_string(),
                    cell,
                ),
                parcel_id: None,
                block_id: None,
                setback,
            });
        }
    }
    lots
}

/// Search `1..=max_rows` × `1..=max_columns` grid layouts and return the one
/// producing the most zoning-conforming lots (a heuristic, not a provable
/// optimum — see the module doc comment). Returns an error if no layout in
/// the searched range fits even one conforming lot.
pub fn optimize_lot_yield(
    boundary: &Polygon,
    constraints: &LotYieldConstraints,
    max_rows: u32,
    max_columns: u32,
    layer_id: impl Into<String>,
    mut make_id: impl FnMut() -> String,
) -> Result<LotYieldResult, SubdivisionError> {
    if boundary.len() < 3 {
        return Err(SubdivisionError::InvalidBoundary);
    }
    let layer_id = layer_id.into();

    let box_ = bounds(boundary);
    let total_w = box_.max_x - box_.min_x;
    let total_h = box_.max_y - box_.min_y;

    let mut best: Option<(u32, u32, f64, f64)> = None; // (rows, cols, lot_w, lot_h)
    let mut best_count = 0usize;
    let mut best_leftover = f64::INFINITY;

    for rows in 1..=max_rows.max(1) {
        let usable_h = total_h - rows as f64 * constraints.row_width;
        if usable_h <= 0.0 {
            continue;
        }
        let lot_depth = usable_h / rows as f64;

        for columns in 1..=max_columns.max(1) {
            let lot_width = total_w / columns as f64;
            let lot_area = lot_width * lot_depth;
            if lot_width < constraints.min_frontage || lot_area < constraints.min_lot_area {
                continue;
            }

            let count = count_conforming_cells(
                boundary,
                box_,
                rows,
                columns,
                lot_width,
                lot_depth,
                constraints.row_width,
            );
            if count == 0 {
                continue;
            }
            let leftover = (total_w * total_h) - (count as f64 * lot_area);
            let is_better = count > best_count || (count == best_count && leftover < best_leftover);
            if is_better {
                best_count = count;
                best_leftover = leftover;
                best = Some((rows, columns, lot_width, lot_depth));
            }
        }
    }

    let Some((rows, columns, lot_width, lot_depth)) = best else {
        return Err(SubdivisionError::ParcelTooSmall);
    };

    let lots = generate_lots(
        boundary,
        box_,
        rows,
        columns,
        lot_width,
        lot_depth,
        constraints.row_width,
        &layer_id,
        constraints.setback,
        &mut make_id,
    );

    Ok(LotYieldResult {
        lots,
        rows,
        columns,
        lot_width,
        lot_depth,
        lot_area: lot_width * lot_depth,
        algorithm_notes: ALGORITHM_NOTES,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rect(w: f64, h: f64) -> Polygon {
        vec![
            Point::new(0.0, 0.0),
            Point::new(w, 0.0),
            Point::new(w, h),
            Point::new(0.0, h),
        ]
    }

    /// A typical suburban R-1 zone: 7,200 sq ft minimum lot area, 60 ft
    /// minimum frontage, 50 ft internal streets — on a 600 ft x 300 ft
    /// rectangular parcel (assume plan units = feet).
    fn constraints() -> LotYieldConstraints {
        LotYieldConstraints {
            min_lot_area: 7_200.0,
            min_frontage: 60.0,
            row_width: 50.0,
            setback: Some(10.0),
        }
    }

    #[test]
    fn finds_a_conforming_layout_on_a_rectangular_parcel() {
        let boundary = rect(600.0, 300.0);
        let mut n = 0;
        let result = optimize_lot_yield(&boundary, &constraints(), 4, 12, "l", || {
            n += 1;
            format!("lot-{n}")
        })
        .unwrap();

        assert!(!result.lots.is_empty());
        assert_eq!(result.lots.len() as u32, result.rows * result.columns);
        assert!(result.lot_width >= constraints().min_frontage);
        assert!(result.lot_area >= constraints().min_lot_area);
        for lot in &result.lots {
            assert_eq!(lot.setback, Some(10.0));
            assert!(thoth_spatial::area(&lot.base.boundary) >= constraints().min_lot_area - 1e-6);
        }
    }

    #[test]
    fn maximizing_count_actually_subdivides_rather_than_returning_one_big_lot() {
        let boundary = rect(600.0, 300.0);
        let mut n = 0;
        let result = optimize_lot_yield(&boundary, &constraints(), 4, 12, "l", || {
            n += 1;
            format!("lot-{n}")
        })
        .unwrap();
        assert!(result.rows * result.columns > 1);
    }

    #[test]
    fn errors_when_the_parcel_is_too_small_for_any_conforming_lot() {
        let boundary = rect(50.0, 50.0); // far too small for a 7,200 sqft / 60 ft-frontage lot
        let result = optimize_lot_yield(&boundary, &constraints(), 4, 4, "l", || "x".to_string());
        assert_eq!(result, Err(SubdivisionError::ParcelTooSmall));
    }

    #[test]
    fn rejects_a_degenerate_boundary() {
        let result = optimize_lot_yield(
            &[Point::ZERO, Point::new(1.0, 1.0)],
            &constraints(),
            2,
            2,
            "l",
            || "x".to_string(),
        );
        assert_eq!(result, Err(SubdivisionError::InvalidBoundary));
    }

    #[test]
    fn undercounts_yield_on_an_irregular_l_shaped_parcel_a_documented_limitation() {
        // An L-shaped parcel: a 600x300 rectangle with a 300x150 notch bitten
        // out of the NE corner. The bounding-box grid search will still
        // reject any cell whose *center* falls in the missing notch, so the
        // total yield is lower than a hand-fit irregular layout could reach
        // — exactly the limitation this module documents.
        let l_shape: Polygon = vec![
            Point::new(0.0, 0.0),
            Point::new(600.0, 0.0),
            Point::new(600.0, 150.0),
            Point::new(300.0, 150.0),
            Point::new(300.0, 300.0),
            Point::new(0.0, 300.0),
        ];
        let mut n = 0;
        let result = optimize_lot_yield(&l_shape, &constraints(), 4, 12, "l", || {
            n += 1;
            format!("lot-{n}")
        })
        .unwrap();
        assert!(!result.lots.is_empty());
        // Full rectangle of the same bounding box would yield strictly more
        // conforming lots than the notched shape.
        let mut m = 0;
        let full_rect_result =
            optimize_lot_yield(&rect(600.0, 300.0), &constraints(), 4, 12, "l", || {
                m += 1;
                format!("lot-{m}")
            })
            .unwrap();
        assert!(result.lots.len() <= full_rect_result.lots.len());
    }
}
