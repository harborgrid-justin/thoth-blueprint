//! Viewshed analysis (competitive gap-analysis Theme 5, item 58).
//!
//! Computes a line-of-sight visibility raster from a digital terrain model:
//! given an observer point + eye height and a target height above each
//! terrain cell, determine which cells are visible from the observer.
//!
//! This crate does not otherwise depend on `thoth-civil`, but that crate's
//! [`thoth_civil::terrain::ElevationGrid`] is complete/stable and already
//! the shape every terrain-consuming crate in the workspace uses, so this
//! module takes a direct dependency on it (see `Cargo.toml`'s comment and
//! `GAP_ANALYSIS_STATUS.md`) rather than duplicating a local elevation-grid
//! type — unlike the small plain-data mirrors elsewhere in this crate
//! (`qto::CrossSection`, `dimension::CoordinateBasis`), a full grid type
//! with validated invariants is not "small," so the mirror-locally pattern
//! documented in `GAPS.md` doesn't apply here.
//!
//! ## Method and simplifying assumptions
//!
//! For each terrain cell, the straight 3D line from the observer's eye to
//! that cell's target point is sampled at several points; the cell is
//! visible if the terrain surface never rises above that line anywhere in
//! between (a standard flat-earth line-of-sight test). **Earth curvature and
//! atmospheric refraction are not modeled** — both are usually negligible at
//! site-planning scales (a few kilometers) but would matter for a
//! regional-scale viewshed.

use thoth_civil::terrain::{elevation_at, grid_bounds, node_height, ElevationGrid};
use thoth_spatial::{distance, Point};

use crate::error::DrawingError;

/// An observer's plan position and eye height above the terrain surface at
/// that position.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Observer {
    pub position: Point,
    /// Height of the observer's eye above the terrain surface. Must be
    /// finite and non-negative.
    pub eye_height: f64,
}

/// A computed line-of-sight visibility raster, one boolean per terrain grid
/// node, laid out exactly like the source [`ElevationGrid`] (row-major,
/// `origin + (c*cell_size, r*cell_size)`).
#[derive(Debug, Clone, PartialEq)]
pub struct ViewshedGrid {
    origin: Point,
    cell_size: f64,
    cols: usize,
    rows: usize,
    visible: Vec<bool>,
}

impl ViewshedGrid {
    pub fn origin(&self) -> Point {
        self.origin
    }

    pub fn cell_size(&self) -> f64 {
        self.cell_size
    }

    pub fn cols(&self) -> usize {
        self.cols
    }

    pub fn rows(&self) -> usize {
        self.rows
    }

    /// Whether grid node `(c, r)` is visible from the observer.
    pub fn is_visible(&self, c: usize, r: usize) -> bool {
        self.visible[r * self.cols + c]
    }

    /// All visibility flags, row-major.
    pub fn visible(&self) -> &[bool] {
        &self.visible
    }

    /// Fraction of nodes visible from the observer, in `[0, 1]`.
    pub fn visible_fraction(&self) -> f64 {
        if self.visible.is_empty() {
            return 0.0;
        }
        self.visible.iter().filter(|v| **v).count() as f64 / self.visible.len() as f64
    }
}

/// Compute a viewshed over `terrain` from `observer`, testing visibility of
/// each grid node's surface plus `target_height` above it.
///
/// `samples_per_cell` controls line-of-sight sampling density along each
/// observer-to-target ray: at least one sample per terrain cell width the
/// ray crosses (`>= 1`; values `< 1` are clamped up to `1`).
///
/// # Errors
/// - [`DrawingError::InvalidObserverHeight`] if `observer.eye_height` is
///   negative or non-finite.
/// - [`DrawingError::InvalidTargetHeight`] if `target_height` is negative or
///   non-finite.
/// - [`DrawingError::ObserverOutsideElevationGrid`] if `observer.position`
///   falls outside `terrain`'s covered extent.
pub fn compute_viewshed(
    terrain: &ElevationGrid,
    observer: Observer,
    target_height: f64,
    samples_per_cell: usize,
) -> Result<ViewshedGrid, DrawingError> {
    if !observer.eye_height.is_finite() || observer.eye_height < 0.0 {
        return Err(DrawingError::InvalidObserverHeight(observer.eye_height));
    }
    if !target_height.is_finite() || target_height < 0.0 {
        return Err(DrawingError::InvalidTargetHeight(target_height));
    }
    let bounds = grid_bounds(terrain);
    if observer.position.x < bounds.min_x
        || observer.position.x > bounds.max_x
        || observer.position.y < bounds.min_y
        || observer.position.y > bounds.max_y
    {
        return Err(DrawingError::ObserverOutsideElevationGrid);
    }

    let samples_per_cell = samples_per_cell.max(1);
    let cell_size = terrain.cell_size();
    let cols = terrain.cols();
    let rows = terrain.rows();
    let origin = terrain.origin();
    let observer_z = elevation_at(terrain, observer.position) + observer.eye_height;

    const EPS: f64 = 1e-6;
    let mut visible = vec![false; cols * rows];
    for r in 0..rows {
        for c in 0..cols {
            let target_xy = Point::new(
                origin.x + c as f64 * cell_size,
                origin.y + r as f64 * cell_size,
            );
            let target_z = node_height(terrain, c as i64, r as i64) + target_height;

            let dist = distance(observer.position, target_xy);
            let steps = (((dist / cell_size).ceil() as usize) * samples_per_cell).max(1);

            let mut is_visible = true;
            // Sample strictly between the observer and the target; the
            // endpoints are the observer (always "below" its own eye) and
            // the target itself (visibility is defined by the path to it,
            // not itself occluding itself).
            for step in 1..steps {
                let t = step as f64 / steps as f64;
                let sample_xy = Point::new(
                    observer.position.x + (target_xy.x - observer.position.x) * t,
                    observer.position.y + (target_xy.y - observer.position.y) * t,
                );
                let line_z = observer_z + (target_z - observer_z) * t;
                let terrain_z = elevation_at(terrain, sample_xy);
                if terrain_z > line_z + EPS {
                    is_visible = false;
                    break;
                }
            }
            visible[r * cols + c] = is_visible;
        }
    }

    Ok(ViewshedGrid {
        origin,
        cell_size,
        cols,
        rows,
        visible,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn flat_grid(cols: usize, rows: usize, cell_size: f64) -> ElevationGrid {
        ElevationGrid::new(
            Point::new(0.0, 0.0),
            cell_size,
            cols,
            rows,
            vec![0.0; cols * rows],
        )
        .unwrap()
    }

    #[test]
    fn flat_terrain_is_fully_visible() {
        let grid = flat_grid(5, 5, 10.0);
        let observer = Observer {
            position: Point::new(0.0, 0.0),
            eye_height: 5.0,
        };
        let vs = compute_viewshed(&grid, observer, 0.0, 2).unwrap();
        assert!((vs.visible_fraction() - 1.0).abs() < 1e-9);
    }

    #[test]
    fn a_tall_ridge_blocks_the_line_of_sight_behind_it() {
        // 5x5 grid, cell size 10: observer at (0,0), a tall spike at
        // column 2 (world x=20) blocking the far column (x=40) from view,
        // while a near column (x=10, before the spike) stays visible.
        let cols = 5;
        let rows = 5;
        let cell_size = 10.0;
        let mut heights = vec![0.0; cols * rows];
        for r in 0..rows {
            heights[r * cols + 2] = 100.0; // a tall ridge down the middle column
        }
        let grid =
            ElevationGrid::new(Point::new(0.0, 0.0), cell_size, cols, rows, heights).unwrap();
        let observer = Observer {
            position: Point::new(0.0, 0.0),
            eye_height: 2.0,
        };
        let vs = compute_viewshed(&grid, observer, 1.0, 4).unwrap();

        // Node (4, 0) is far beyond the ridge along the same row as the
        // observer -> occluded.
        assert!(!vs.is_visible(4, 0));
        // Node (1, 0) is before the ridge -> visible.
        assert!(vs.is_visible(1, 0));
        // The observer's own row/col node is trivially visible.
        assert!(vs.is_visible(0, 0));
    }

    #[test]
    fn compute_viewshed_rejects_a_negative_observer_height() {
        let grid = flat_grid(3, 3, 10.0);
        let observer = Observer {
            position: Point::new(0.0, 0.0),
            eye_height: -1.0,
        };
        let err = compute_viewshed(&grid, observer, 0.0, 1).unwrap_err();
        assert_eq!(err, DrawingError::InvalidObserverHeight(-1.0));
    }

    #[test]
    fn compute_viewshed_rejects_an_observer_outside_the_grid_extent() {
        let grid = flat_grid(3, 3, 10.0);
        let observer = Observer {
            position: Point::new(1000.0, 1000.0),
            eye_height: 2.0,
        };
        let err = compute_viewshed(&grid, observer, 0.0, 1).unwrap_err();
        assert_eq!(err, DrawingError::ObserverOutsideElevationGrid);
    }

    #[test]
    fn compute_viewshed_rejects_a_negative_target_height() {
        let grid = flat_grid(3, 3, 10.0);
        let observer = Observer {
            position: Point::new(0.0, 0.0),
            eye_height: 2.0,
        };
        let err = compute_viewshed(&grid, observer, -1.0, 1).unwrap_err();
        assert_eq!(err, DrawingError::InvalidTargetHeight(-1.0));
    }
}
