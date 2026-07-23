//! Automated road-network layout generator: given a parcel boundary and a
//! target block size, generate a candidate street-centerline network and
//! check it against block-length standards.
//!
//! Item 39 of the Theme 4 subdivision-design-automation gap analysis.
//!
//! ## Algorithm
//! Treats the parcel as its axis-aligned bounding box (see the module-level
//! limitations below), picks the smallest integer number of blocks along
//! each axis so the resulting block length is as close as possible to
//! `target_block_length`, and lays interior through-streets at the
//! resulting spacing — a regular grid, the layout most US subdivision codes
//! default to for flat, rectangular parcels. Each generated centerline
//! becomes a [`RightOfWay`] at `row_width`, composing directly with
//! [`crate::dedication::generate_row_dedication`] if a caller wants the
//! buffered ROW polygon instead of just the centerline.
//!
//! ## Known limitations (be honest about these)
//! - **Bounding-box parcel, not exact boundary clipping.** Centerlines span
//!   the full bounding-box side; on an irregular parcel they will overrun
//!   the true boundary and need manual trimming — this generator produces a
//!   sketch-level candidate network, not a final engineered layout.
//! - **Through-streets only — no cul-de-sacs generated.** Every interior
//!   street spans the full block dimension; the generator does not create
//!   stub/dead-end streets to serve an irregular leftover area, so while it
//!   *checks* block-length compliance it cannot yet *fix* a dead-end-length
//!   violation by branching a cul-de-sac. This is the item's most significant
//!   scope gap versus a real "OpenSite Designer"-class generator.
//! - **Orthogonal grid only**, and it does not consider topography/drainage
//!   (a real street layout follows existing grade to minimize earthwork —
//!   see [`crate::grading_optimizer`] for the separate, also-simplified,
//!   grading pass).

use serde::{Deserialize, Serialize};
use thiserror::Error;
use thoth_spatial::{bounds, ComplianceFinding, ComplianceSeverity, ElementKind, Point, Polygon};

use crate::elements::{new_base, RightOfWay};

/// Everything that can make a road-network generation request invalid.
#[derive(Debug, Clone, PartialEq, Error)]
pub enum RoadNetworkError {
    #[error("Invalid boundary: must contain at least 3 points.")]
    InvalidBoundary,
    #[error("Target block length must be greater than 0, got {0}.")]
    InvalidTargetBlockLength(f64),
    #[error("Street row width must be greater than 0, got {0}.")]
    InvalidRowWidth(f64),
}

/// A candidate street network generated for a parcel.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RoadNetworkPlan {
    /// One [`RightOfWay`] per generated interior street.
    pub streets: Vec<RightOfWay>,
    /// The achieved block length along the horizontal axis (columns).
    pub block_length_x: f64,
    /// The achieved block length along the vertical axis (rows).
    pub block_length_y: f64,
    pub findings: Vec<ComplianceFinding>,
    pub algorithm_notes: &'static str,
}

const ALGORITHM_NOTES: &str = "Bounding-box orthogonal through-street grid sized to the closest \
integer block count for the target block length; no cul-de-sac/stub-street generation, no \
topography awareness, no boundary clipping beyond the parcel's bounding box.";

/// Generate a candidate street-centerline network for `boundary`, sizing
/// the grid so each block is as close as possible to
/// `target_block_length`, and flag any resulting block whose length exceeds
/// `max_block_length` (when provided).
pub fn generate_road_network(
    boundary: &Polygon,
    target_block_length: f64,
    max_block_length: Option<f64>,
    row_width: f64,
    layer_id: impl Into<String>,
    mut make_id: impl FnMut() -> String,
) -> Result<RoadNetworkPlan, RoadNetworkError> {
    if boundary.len() < 3 {
        return Err(RoadNetworkError::InvalidBoundary);
    }
    if target_block_length <= 0.0 {
        return Err(RoadNetworkError::InvalidTargetBlockLength(target_block_length));
    }
    if row_width <= 0.0 {
        return Err(RoadNetworkError::InvalidRowWidth(row_width));
    }
    let layer_id = layer_id.into();

    let box_ = bounds(boundary);
    let total_w = box_.max_x - box_.min_x;
    let total_h = box_.max_y - box_.min_y;

    let num_cols = ((total_w / target_block_length).round() as u32).max(1);
    let num_rows = ((total_h / target_block_length).round() as u32).max(1);
    let block_length_x = total_w / num_cols as f64;
    let block_length_y = total_h / num_rows as f64;

    let mut streets = Vec::new();

    // Interior vertical streets (running the full parcel height) at each
    // internal column boundary.
    for i in 1..num_cols {
        let x = box_.min_x + i as f64 * block_length_x;
        let centerline = vec![Point::new(x, box_.min_y), Point::new(x, box_.max_y)];
        streets.push(street(&mut make_id, &layer_id, centerline, row_width));
    }
    // Interior horizontal streets (running the full parcel width) at each
    // internal row boundary.
    for j in 1..num_rows {
        let y = box_.min_y + j as f64 * block_length_y;
        let centerline = vec![Point::new(box_.min_x, y), Point::new(box_.max_x, y)];
        streets.push(street(&mut make_id, &layer_id, centerline, row_width));
    }

    let mut findings = Vec::new();
    if let Some(max_len) = max_block_length {
        if block_length_x > max_len + 1e-6 {
            findings.push(block_length_finding("x", block_length_x, max_len));
        }
        if block_length_y > max_len + 1e-6 {
            findings.push(block_length_finding("y", block_length_y, max_len));
        }
    }
    if findings.is_empty() {
        findings.push(ComplianceFinding {
            severity: ComplianceSeverity::Info,
            code: "roadNetwork.blockLengthCompliant".to_string(),
            message: "Generated block lengths are within the standard.".to_string(),
            element_id: None,
        });
    }

    Ok(RoadNetworkPlan {
        streets,
        block_length_x,
        block_length_y,
        findings,
        algorithm_notes: ALGORITHM_NOTES,
    })
}

fn street(
    make_id: &mut impl FnMut() -> String,
    layer_id: &str,
    centerline: Vec<Point>,
    row_width: f64,
) -> RightOfWay {
    let id = make_id();
    let bounds_of_centerline = bounds(&centerline);
    let boundary = vec![
        Point::new(bounds_of_centerline.min_x - row_width / 2.0, bounds_of_centerline.min_y),
        Point::new(bounds_of_centerline.max_x + row_width / 2.0, bounds_of_centerline.min_y),
        Point::new(bounds_of_centerline.max_x + row_width / 2.0, bounds_of_centerline.max_y),
        Point::new(bounds_of_centerline.min_x - row_width / 2.0, bounds_of_centerline.max_y),
    ];
    RightOfWay {
        base: new_base(id, ElementKind::Row, "Generated Street".to_string(), layer_id.to_string(), boundary),
        centerline: Some(centerline),
        width: Some(row_width),
    }
}

fn block_length_finding(axis: &str, length: f64, max: f64) -> ComplianceFinding {
    ComplianceFinding {
        severity: ComplianceSeverity::Warning,
        code: "roadNetwork.blockLengthExceeded".to_string(),
        message: format!(
            "Generated block length along the {axis}-axis ({length:.1}) exceeds the standard maximum of {max:.1}."
        ),
        element_id: None,
    }
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

    #[test]
    fn generates_an_exact_grid_when_dimensions_divide_evenly() {
        let boundary = rect(800.0, 400.0);
        let mut n = 0;
        let plan = generate_road_network(&boundary, 200.0, Some(250.0), 50.0, "streets", || {
            n += 1;
            format!("st-{n}")
        })
        .unwrap();
        assert_eq!(plan.block_length_x, 200.0);
        assert_eq!(plan.block_length_y, 200.0);
        // 4 columns -> 3 interior vertical streets; 2 rows -> 1 interior horizontal street.
        assert_eq!(plan.streets.len(), 4);
        assert!(plan
            .findings
            .iter()
            .any(|f| f.code == "roadNetwork.blockLengthCompliant"));
    }

    #[test]
    fn flags_block_length_exceeding_the_standard() {
        let boundary = rect(1000.0, 300.0);
        let mut n = 0;
        // Target 500 rounds to 2 columns -> block length 500, which exceeds
        // a 400-unit maximum standard.
        let plan = generate_road_network(&boundary, 500.0, Some(400.0), 50.0, "streets", || {
            n += 1;
            format!("st-{n}")
        })
        .unwrap();
        assert!(plan
            .findings
            .iter()
            .any(|f| f.code == "roadNetwork.blockLengthExceeded"));
    }

    #[test]
    fn small_parcel_collapses_to_a_single_block_with_no_interior_streets() {
        let boundary = rect(150.0, 150.0);
        let plan = generate_road_network(&boundary, 500.0, None, 50.0, "streets", || {
            "st".to_string()
        })
        .unwrap();
        assert!(plan.streets.is_empty());
    }

    #[test]
    fn rejects_a_degenerate_boundary_and_bad_inputs() {
        assert_eq!(
            generate_road_network(
                &[Point::ZERO, Point::new(1.0, 1.0)],
                200.0,
                None,
                50.0,
                "l",
                || "x".to_string(),
            ),
            Err(RoadNetworkError::InvalidBoundary)
        );
        assert_eq!(
            generate_road_network(&rect(100.0, 100.0), 0.0, None, 50.0, "l", || "x".to_string()),
            Err(RoadNetworkError::InvalidTargetBlockLength(0.0))
        );
        assert_eq!(
            generate_road_network(&rect(100.0, 100.0), 200.0, None, 0.0, "l", || "x".to_string()),
            Err(RoadNetworkError::InvalidRowWidth(0.0))
        );
    }
}
