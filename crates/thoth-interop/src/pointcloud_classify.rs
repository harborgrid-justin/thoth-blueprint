//! Ground / non-ground semantic classification for point clouds parsed by
//! `thoth_civil::pointcloud` — a classification pass layered on top of that
//! crate's existing `PointCloud`/`CloudPoint` representation, per this
//! crate's mandate (item 33): this module does **not** reparse XYZ/PTS/PLY/
//! LAS/DXF; it only classifies points `thoth_civil::pointcloud` already
//! parsed.
//!
//! **Algorithm scope**: a grid-based, progressive-morphological-filter
//! *style* classifier (Zhang et al. 2003), not a bit-exact reproduction of
//! that paper. Points are binned onto a regular XY grid keyed by their
//! minimum elevation per cell; grayscale morphological opening (erosion then
//! dilation via min/max filters) is applied at a schedule of increasing
//! window sizes, and a cell is permanently marked non-ground the first time
//! the pre-opening/post-opening elevation difference exceeds a
//! slope-scaled threshold. A point is finally classified `Ground` only if
//! its cell was never marked non-ground *and* its own elevation sits within
//! [`GroundClassifierParams::point_to_surface_tolerance`] of that cell's
//! final surface elevation (so an isolated high point sharing a
//! mostly-ground cell doesn't get pulled down with its neighbors). Empty
//! grid cells (no points fell in them) are filled with the cloud's global
//! minimum elevation before filtering — a conservative, documented
//! simplification so morphological filtering has a dense array to work on;
//! it never affects point classification directly, since points are always
//! looked up by the cell they actually fell into.

use thoth_civil::pointcloud::{point_cloud_bounds, PointCloud};

use crate::error::{InteropError, InteropResult};

const FORMAT: &str = "PointCloudClassify";

/// Parameters controlling the progressive-morphological-filter-style ground
/// classifier. Defaults are reasonable for a gently sloping suburban site
/// with meter-scale point spacing; steeper or denser sites should tighten
/// `slope`/`cell_size`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct GroundClassifierParams {
    /// Grid cell size, plan units. Must be positive.
    pub cell_size: f64,
    /// Starting morphological window size, plan units.
    pub base_window: f64,
    /// Largest morphological window size, plan units; the schedule doubles
    /// `base_window` until it would exceed this.
    pub max_window: f64,
    /// Assumed terrain slope (rise/run) used to scale the elevation
    /// threshold with window size — steeper assumed slope tolerates larger
    /// elevation jumps between ground cells before flagging an object.
    pub slope: f64,
    /// Elevation-difference threshold at the smallest window size.
    pub initial_threshold: f64,
    /// Elevation-difference threshold is capped at this value regardless of
    /// window size.
    pub max_threshold: f64,
    /// How far above its cell's final surface elevation a point may sit and
    /// still count as `Ground`.
    pub point_to_surface_tolerance: f64,
}

impl Default for GroundClassifierParams {
    fn default() -> Self {
        GroundClassifierParams {
            cell_size: 1.0,
            base_window: 1.0,
            max_window: 16.0,
            slope: 0.15,
            initial_threshold: 0.2,
            max_threshold: 2.0,
            point_to_surface_tolerance: 0.15,
        }
    }
}

/// A point's ground/non-ground classification.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PointClass {
    Ground,
    NonGround,
}

/// The classification result: one [`PointClass`] per input point, in the
/// same order as `PointCloud::points`.
#[derive(Debug, Clone, PartialEq)]
pub struct ClassifiedCloud {
    pub classifications: Vec<PointClass>,
}

impl ClassifiedCloud {
    pub fn ground_count(&self) -> usize {
        self.classifications.iter().filter(|c| **c == PointClass::Ground).count()
    }

    pub fn non_ground_count(&self) -> usize {
        self.classifications.len() - self.ground_count()
    }
}

struct Grid {
    cols: usize,
    rows: usize,
    values: Vec<f64>,
}

impl Grid {
    fn get(&self, c: usize, r: usize) -> f64 {
        self.values[r * self.cols + c]
    }

    fn min_filter(&self, radius_cells: usize) -> Grid {
        self.window_filter(radius_cells, f64::INFINITY, f64::min)
    }

    fn max_filter(&self, radius_cells: usize) -> Grid {
        self.window_filter(radius_cells, f64::NEG_INFINITY, f64::max)
    }

    fn window_filter(&self, radius: usize, identity: f64, combine: fn(f64, f64) -> f64) -> Grid {
        let mut out = vec![identity; self.cols * self.rows];
        for r in 0..self.rows {
            let r0 = r.saturating_sub(radius);
            let r1 = (r + radius).min(self.rows - 1);
            for c in 0..self.cols {
                let c0 = c.saturating_sub(radius);
                let c1 = (c + radius).min(self.cols - 1);
                let mut acc = identity;
                for rr in r0..=r1 {
                    for cc in c0..=c1 {
                        acc = combine(acc, self.get(cc, rr));
                    }
                }
                out[r * self.cols + c] = acc;
            }
        }
        Grid {
            cols: self.cols,
            rows: self.rows,
            values: out,
        }
    }
}

/// Classify every point in `cloud` as ground or non-ground.
///
/// # Errors
/// [`InteropError::Unsupported`] if `params.cell_size` is not positive, or
/// the resulting grid would exceed this module's safety cap (4,000,000
/// cells) — a guard against an accidentally microscopic `cell_size` on a
/// large cloud allocating an unbounded grid.
pub fn classify_ground(cloud: &PointCloud, params: &GroundClassifierParams) -> InteropResult<ClassifiedCloud> {
    if cloud.points.is_empty() {
        return Ok(ClassifiedCloud { classifications: Vec::new() });
    }
    if !(params.cell_size.is_finite() && params.cell_size > 0.0) {
        return Err(InteropError::Unsupported {
            format: FORMAT,
            reason: format!("cell_size must be positive, got {}", params.cell_size),
        });
    }

    let bounds = point_cloud_bounds(cloud);
    let cols = (((bounds.max_x - bounds.min_x) / params.cell_size).ceil() as usize + 1).max(1);
    let rows = (((bounds.max_y - bounds.min_y) / params.cell_size).ceil() as usize + 1).max(1);
    const MAX_CELLS: usize = 4_000_000;
    if cols.saturating_mul(rows) > MAX_CELLS {
        return Err(InteropError::Unsupported {
            format: FORMAT,
            reason: format!(
                "grid would need {cols}x{rows} cells (> {MAX_CELLS}); increase cell_size"
            ),
        });
    }

    let cell_of = |x: f64, y: f64| -> (usize, usize) {
        let c = ((x - bounds.min_x) / params.cell_size).floor().clamp(0.0, (cols - 1) as f64) as usize;
        let r = ((y - bounds.min_y) / params.cell_size).floor().clamp(0.0, (rows - 1) as f64) as usize;
        (c, r)
    };

    let global_min_z = cloud.points.iter().map(|p| p.z).fold(f64::INFINITY, f64::min);

    let mut min_z = vec![f64::INFINITY; cols * rows];
    let mut point_cells = Vec::with_capacity(cloud.points.len());
    for p in &cloud.points {
        let (c, r) = cell_of(p.x, p.y);
        let idx = r * cols + c;
        if p.z < min_z[idx] {
            min_z[idx] = p.z;
        }
        point_cells.push(idx);
    }
    for v in &mut min_z {
        if !v.is_finite() {
            *v = global_min_z;
        }
    }

    let mut surface = Grid { cols, rows, values: min_z };
    let mut removed = vec![false; cols * rows];

    let mut window = params.base_window;
    loop {
        let radius_cells = ((window / (2.0 * params.cell_size)).round() as usize).max(1);
        let eroded = surface.min_filter(radius_cells);
        let opened = eroded.max_filter(radius_cells);
        let threshold = (params.initial_threshold + params.slope * window).min(params.max_threshold);

        for i in 0..surface.values.len() {
            if !removed[i] && (surface.values[i] - opened.values[i]) > threshold {
                removed[i] = true;
            }
        }
        surface = opened;

        if window >= params.max_window {
            break;
        }
        window = (window * 2.0).min(params.max_window);
    }

    let classifications = cloud
        .points
        .iter()
        .zip(&point_cells)
        .map(|(p, &idx)| {
            if removed[idx] {
                PointClass::NonGround
            } else if (p.z - surface.values[idx]).abs() <= params.point_to_surface_tolerance {
                PointClass::Ground
            } else {
                PointClass::NonGround
            }
        })
        .collect();

    Ok(ClassifiedCloud { classifications })
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_civil::pointcloud::CloudPoint;

    fn flat_ground(n: usize, spacing: f64) -> PointCloud {
        let mut points = Vec::new();
        for r in 0..n {
            for c in 0..n {
                points.push(CloudPoint::bare(c as f64 * spacing, r as f64 * spacing, 0.0));
            }
        }
        PointCloud { points }
    }

    #[test]
    fn flat_plane_is_entirely_ground() {
        let cloud = flat_ground(10, 1.0);
        let result = classify_ground(&cloud, &GroundClassifierParams::default()).unwrap();
        assert_eq!(result.ground_count(), cloud.points.len());
        assert_eq!(result.non_ground_count(), 0);
    }

    #[test]
    fn isolated_elevated_cluster_is_classified_non_ground() {
        let mut cloud = flat_ground(20, 1.0);
        let ground_count = cloud.points.len();
        // A 3x3 "building" blob well above the surrounding flat ground.
        for r in 8..11 {
            for c in 8..11 {
                cloud.points.push(CloudPoint::bare(c as f64, r as f64, 5.0));
            }
        }
        let result = classify_ground(&cloud, &GroundClassifierParams::default()).unwrap();
        assert_eq!(result.classifications.len(), cloud.points.len());
        // The original flat points should still be ground...
        assert!(result.classifications[..ground_count].iter().all(|c| *c == PointClass::Ground));
        // ...and every blob point should be non-ground.
        assert!(result.classifications[ground_count..].iter().all(|c| *c == PointClass::NonGround));
    }

    #[test]
    fn empty_cloud_yields_empty_classification() {
        let cloud = PointCloud { points: vec![] };
        let result = classify_ground(&cloud, &GroundClassifierParams::default()).unwrap();
        assert!(result.classifications.is_empty());
    }

    #[test]
    fn non_positive_cell_size_is_rejected() {
        let cloud = flat_ground(2, 1.0);
        let params = GroundClassifierParams { cell_size: 0.0, ..Default::default() };
        assert!(matches!(
            classify_ground(&cloud, &params),
            Err(InteropError::Unsupported { .. })
        ));
    }

    #[test]
    fn microscopic_cell_size_on_a_large_extent_is_rejected() {
        let cloud = PointCloud {
            points: vec![CloudPoint::bare(0.0, 0.0, 0.0), CloudPoint::bare(10_000.0, 10_000.0, 0.0)],
        };
        let params = GroundClassifierParams { cell_size: 0.001, ..Default::default() };
        assert!(matches!(
            classify_ground(&cloud, &params),
            Err(InteropError::Unsupported { .. })
        ));
    }
}
