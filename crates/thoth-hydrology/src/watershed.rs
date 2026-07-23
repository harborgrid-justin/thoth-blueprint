//! Watershed/catchment delineation from a DEM: D8 flow direction, flow
//! accumulation, and upstream-contributing-area delineation from a pour
//! point, built directly over `thoth_civil::terrain::ElevationGrid`.
//!
//! Source: O'Callaghan & Mark (1984), "The extraction of drainage networks
//! from digital elevation data" — the D8 (deterministic eight-neighbor)
//! flow-routing algorithm that underlies most GIS hydrology tools (ArcGIS
//! Hydrology toolset, TauDEM, GRASS `r.watershed`).
//!
//! This module reads an already-built [`ElevationGrid`] (its validating
//! constructor, `elevation_at`, contour tracing, and water-drop-path
//! tracing already live in `thoth_civil::terrain` — this module does not
//! reimplement grid indexing; it adds the drainage-network algorithms
//! `thoth_civil` doesn't have) and does not modify or extend that type.
//!
//! # Assumptions and valid range
//! - **Single-flow-direction (D8) only** — each cell drains entirely to
//!   its single steepest downslope neighbor, never split across multiple
//!   neighbors (contrast with multiple-flow-direction/D-infinity methods,
//!   which better represent divergent flow on convex slopes but are not
//!   implemented here).
//! - **No depression filling**: a local pit (a cell with no lower
//!   neighbor) is a legitimate sink with `flow_direction = None`; this
//!   module does not fill/breach depressions the way production DEM
//!   hydrology pipelines typically do as a preprocessing step. A DEM with
//!   many spurious pits (common in raw/noisy elevation data) will produce a
//!   fragmented drainage network unless filled upstream of this module.
//! - Flat areas (tied elevations) are resolved by "no direction" (a cell
//!   with no *strictly* lower neighbor is a pit), not the flow-across-flats
//!   resolution algorithms (e.g. Garbrecht & Martz 1997) production tools
//!   use — flat DEM regions will show as sinks here.
//! - A boundary cell that would drain off the grid's edge is treated as a
//!   sink (`None`) rather than as "flow exits the domain", since there is
//!   no neighbor elevation to evaluate outside the grid.

use std::collections::VecDeque;

use thoth_civil::terrain::ElevationGrid;
use thoth_spatial::Point;

use crate::error::{HydroResult, HydrologyError};

/// One of the eight D8 flow directions.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum D8Direction {
    N,
    Ne,
    E,
    Se,
    S,
    Sw,
    W,
    Nw,
}

impl D8Direction {
    /// All eight directions with their `(dc, dr)` grid-index offset and
    /// horizontal distance factor (`1.0` for cardinal, `√2` for diagonal).
    const ALL: [(D8Direction, i64, i64, f64); 8] = [
        (D8Direction::N, 0, -1, 1.0),
        (D8Direction::Ne, 1, -1, std::f64::consts::SQRT_2),
        (D8Direction::E, 1, 0, 1.0),
        (D8Direction::Se, 1, 1, std::f64::consts::SQRT_2),
        (D8Direction::S, 0, 1, 1.0),
        (D8Direction::Sw, -1, 1, std::f64::consts::SQRT_2),
        (D8Direction::W, -1, 0, 1.0),
        (D8Direction::Nw, -1, -1, std::f64::consts::SQRT_2),
    ];
}

/// Flow direction at every cell of `grid`, row-major (`cols * rows`
/// entries, matching [`ElevationGrid::heights`]'s layout): the D8 direction
/// of steepest descent, or `None` if the cell is a sink (no neighbor is
/// strictly lower, including grid-boundary neighbors that don't exist).
pub fn flow_direction(grid: &ElevationGrid) -> Vec<Option<D8Direction>> {
    let cols = grid.cols() as i64;
    let rows = grid.rows() as i64;
    let cell_size = grid.cell_size();
    let heights = grid.heights();

    let mut result = Vec::with_capacity(heights.len());
    for r in 0..rows {
        for c in 0..cols {
            let here = heights[(r * cols + c) as usize];
            let mut best: Option<(D8Direction, f64)> = None;
            for &(dir, dc, dr, dist_factor) in &D8Direction::ALL {
                let (nc, nr) = (c + dc, r + dr);
                if nc < 0 || nc >= cols || nr < 0 || nr >= rows {
                    continue;
                }
                let neighbor = heights[(nr * cols + nc) as usize];
                let drop = here - neighbor;
                if drop <= 0.0 {
                    continue;
                }
                let slope = drop / (cell_size * dist_factor);
                let is_better = match best {
                    None => true,
                    Some((_, best_slope)) => slope > best_slope,
                };
                if is_better {
                    best = Some((dir, slope));
                }
            }
            result.push(best.map(|(dir, _)| dir));
        }
    }
    result
}

fn neighbor_index(cols: i64, rows: i64, r: i64, c: i64, dir: D8Direction) -> Option<usize> {
    let (_, dc, dr, _) = D8Direction::ALL.iter().find(|&&(d, ..)| d == dir).unwrap();
    let (nc, nr) = (c + dc, r + dr);
    if nc < 0 || nc >= cols || nr < 0 || nr >= rows {
        None
    } else {
        Some((nr * cols + nc) as usize)
    }
}

/// Flow accumulation at every cell (row-major, matching `flow_direction`'s
/// layout): the number of grid cells (including itself) whose flow path
/// passes through this cell — i.e. its contributing-area cell count.
/// Multiply by `cell_size²` for a plan-unit contributing area.
///
/// Computed by processing cells in descending elevation order (guaranteed
/// to be a valid topological order: D8 only routes to a *strictly* lower
/// neighbor, so no cell can be downstream of a lower one, ruling out
/// cycles) and pushing each cell's accumulated count onto its downstream
/// neighbor.
///
/// # Errors
/// [`HydrologyError::ShapeMismatch`] if `flow_dir` isn't exactly
/// `grid.cols() * grid.rows()` entries (i.e. wasn't produced by
/// [`flow_direction`] on this same grid).
pub fn flow_accumulation(
    grid: &ElevationGrid,
    flow_dir: &[Option<D8Direction>],
) -> HydroResult<Vec<f64>> {
    let cols = grid.cols() as i64;
    let rows = grid.rows() as i64;
    let n = (cols * rows) as usize;
    if flow_dir.len() != n {
        return Err(HydrologyError::ShapeMismatch {
            reason: format!(
                "flow_dir has {} entries, expected {} (grid.cols() * grid.rows())",
                flow_dir.len(),
                n
            ),
        });
    }

    let heights = grid.heights();
    let mut order: Vec<usize> = (0..n).collect();
    order.sort_by(|&a, &b| heights[b].partial_cmp(&heights[a]).unwrap());

    let mut accumulation = vec![1.0; n];
    for &idx in &order {
        let r = idx as i64 / cols;
        let c = idx as i64 % cols;
        if let Some(dir) = flow_dir[idx] {
            if let Some(target) = neighbor_index(cols, rows, r, c, dir) {
                accumulation[target] += accumulation[idx];
            }
        }
    }
    Ok(accumulation)
}

/// The grid cell (column, row) nearest to `p`, and its area covered as
/// cell-center [`Point`]s for a delineated watershed, returned by
/// [`delineate_watershed`].
#[derive(Debug, Clone, PartialEq)]
pub struct WatershedDelineation {
    /// Grid `(col, row)` indices of every cell whose flow path reaches the
    /// pour-point cell (including the pour-point cell itself).
    pub contributing_cells: Vec<(usize, usize)>,
    /// Contributing area, in the grid's plan units squared
    /// (`contributing_cells.len() * cell_size²`).
    pub area_plan_units_sq: f64,
}

/// Delineate the upstream contributing area (watershed) draining to the
/// grid cell nearest `pour_point`, given a precomputed `flow_dir` (from
/// [`flow_direction`]).
///
/// Works by reversing the flow-direction graph and breadth-first
/// searching upstream from the pour-point cell — every cell that (directly
/// or transitively) drains into it is part of its watershed.
///
/// # Errors
/// - [`HydrologyError::ShapeMismatch`] if `flow_dir` doesn't match the
///   grid's cell count.
/// - [`HydrologyError::Network`] if `pour_point` falls outside the grid's
///   covered extent.
pub fn delineate_watershed(
    grid: &ElevationGrid,
    flow_dir: &[Option<D8Direction>],
    pour_point: Point,
) -> HydroResult<WatershedDelineation> {
    let cols = grid.cols() as i64;
    let rows = grid.rows() as i64;
    let n = (cols * rows) as usize;
    if flow_dir.len() != n {
        return Err(HydrologyError::ShapeMismatch {
            reason: format!(
                "flow_dir has {} entries, expected {} (grid.cols() * grid.rows())",
                flow_dir.len(),
                n
            ),
        });
    }

    let cell_size = grid.cell_size();
    let origin = grid.origin();
    let pc = ((pour_point.x - origin.x) / cell_size).round() as i64;
    let pr = ((pour_point.y - origin.y) / cell_size).round() as i64;
    if pc < 0 || pc >= cols || pr < 0 || pr >= rows {
        return Err(HydrologyError::Network {
            reason: format!(
                "pour point ({}, {}) falls outside the grid's {}x{} extent",
                pour_point.x, pour_point.y, cols, rows
            ),
        });
    }

    // Build reverse adjacency: for each cell, which cells drain directly
    // into it.
    let mut upstream_of: Vec<Vec<usize>> = vec![Vec::new(); n];
    for (idx, dir) in flow_dir.iter().enumerate() {
        let r = idx as i64 / cols;
        let c = idx as i64 % cols;
        if let Some(dir) = dir {
            if let Some(target) = neighbor_index(cols, rows, r, c, *dir) {
                upstream_of[target].push(idx);
            }
        }
    }

    let pour_idx = (pr * cols + pc) as usize;
    let mut visited = vec![false; n];
    visited[pour_idx] = true;
    let mut queue = VecDeque::from([pour_idx]);
    let mut contributing = Vec::new();

    while let Some(idx) = queue.pop_front() {
        contributing.push((idx % cols as usize, idx / cols as usize));
        for &up in &upstream_of[idx] {
            if !visited[up] {
                visited[up] = true;
                queue.push_back(up);
            }
        }
    }

    Ok(WatershedDelineation {
        area_plan_units_sq: contributing.len() as f64 * cell_size * cell_size,
        contributing_cells: contributing,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A 5x5 paraboloid "bowl" grid centered at (2,2): every cell should
    /// drain toward the center, and the center should accumulate all 25
    /// cells.
    fn bowl_grid() -> ElevationGrid {
        let n = 5;
        let mut heights = Vec::with_capacity(n * n);
        for r in 0..n {
            for c in 0..n {
                let dr = r as f64 - 2.0;
                let dc = c as f64 - 2.0;
                heights.push(dr * dr + dc * dc);
            }
        }
        ElevationGrid::new(Point::new(0.0, 0.0), 10.0, n, n, heights).unwrap()
    }

    #[test]
    fn flow_direction_has_no_direction_at_the_bowl_center() {
        let grid = bowl_grid();
        let dirs = flow_direction(&grid);
        // center cell index = row 2, col 2 => idx = 2*5+2=12
        assert_eq!(dirs[12], None);
    }

    #[test]
    fn flow_direction_points_downhill_on_a_ramp() {
        // z = x (increasing eastward), so every interior cell should drain
        // west (down-slope) toward decreasing x.
        let n = 5;
        let mut heights = Vec::with_capacity(n * n);
        for _r in 0..n {
            for c in 0..n {
                heights.push(c as f64);
            }
        }
        let grid = ElevationGrid::new(Point::new(0.0, 0.0), 1.0, n, n, heights).unwrap();
        let dirs = flow_direction(&grid);
        // Row 2 (middle row), column 3 (idx = 2*5+3=13) should drain W.
        assert_eq!(dirs[13], Some(D8Direction::W));
    }

    #[test]
    fn flow_accumulation_sums_to_total_cells_at_the_sink() {
        let grid = bowl_grid();
        let dirs = flow_direction(&grid);
        let acc = flow_accumulation(&grid, &dirs).unwrap();
        assert_eq!(acc[12], 25.0);
    }

    #[test]
    fn flow_accumulation_rejects_mismatched_length() {
        let grid = bowl_grid();
        assert!(flow_accumulation(&grid, &[]).is_err());
    }

    #[test]
    fn delineate_watershed_from_the_bowl_center_covers_the_whole_grid() {
        let grid = bowl_grid();
        let dirs = flow_direction(&grid);
        // Center cell world coordinate: origin + (2,2)*10 = (20, 20).
        let result = delineate_watershed(&grid, &dirs, Point::new(20.0, 20.0)).unwrap();
        assert_eq!(result.contributing_cells.len(), 25);
        assert_eq!(result.area_plan_units_sq, 25.0 * 10.0 * 10.0);
    }

    #[test]
    fn delineate_watershed_rejects_out_of_bounds_pour_point() {
        let grid = bowl_grid();
        let dirs = flow_direction(&grid);
        assert!(matches!(
            delineate_watershed(&grid, &dirs, Point::new(1000.0, 1000.0)),
            Err(HydrologyError::Network { .. })
        ));
    }
}
