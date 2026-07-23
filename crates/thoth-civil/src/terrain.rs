//! Terrain, grading, and earthwork math for Thoth Blueprint.
//!
//! A surface is modeled as a regular [`ElevationGrid`] of node elevations.
//! Grids are typically interpolated from surveyed spot elevations, then
//! reshaped by grading operations; the difference between an existing and a
//! proposed grid gives cut/fill volumes. Everything here is pure — contours,
//! slope, and volumes are computed, never eyeballed.
//!
//! Elevations (`z`) are in the plan's length unit, the same unit as the
//! horizontal coordinates, so slope is a true rise-over-run.
//!
//! Port of `packages/domain/src/civil/terrain.ts` +
//! `packages/domain/src/civil/types/terrain.ts`.

use thoth_spatial::{distance, length, point_in_polygon, Bounds, Point, Polygon, Polyline, SpatialContext, Unit};

use crate::error::{CivilError, CivilResult};

/// A surveyed elevation at a point (a spot grade / benchmark).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SpotElevation {
    pub point: Point,
    pub z: f64,
}

/// A regular grid of node elevations. Node `(c, r)` sits at world coordinate
/// `origin + (c·cell_size, r·cell_size)`; `heights` is row-major with length
/// `cols · rows`.
///
/// Constructed only through [`ElevationGrid::new`], which enforces the
/// invariants every reader in this module relies on: a positive cell size and
/// at least a 2×2 node grid (the minimum needed to define one bilinear cell
/// and central-difference slopes). This turns "degenerate terrain" from a
/// silent-NaN bug into a constructor-time [`CivilError`].
#[derive(Debug, Clone, PartialEq)]
pub struct ElevationGrid {
    origin: Point,
    cell_size: f64,
    cols: usize,
    rows: usize,
    heights: Vec<f64>,
}

impl ElevationGrid {
    /// Build a validated elevation grid.
    ///
    /// # Errors
    /// - [`CivilError::InvalidCellSize`] if `cell_size <= 0`.
    /// - [`CivilError::DegenerateGrid`] if `cols < 2` or `rows < 2`.
    /// - [`CivilError::MalformedData`] if `heights.len() != cols * rows`.
    pub fn new(origin: Point, cell_size: f64, cols: usize, rows: usize, heights: Vec<f64>) -> CivilResult<Self> {
        if !(cell_size > 0.0) {
            return Err(CivilError::InvalidCellSize { cell_size });
        }
        if cols < 2 || rows < 2 {
            return Err(CivilError::DegenerateGrid { cols, rows });
        }
        if heights.len() != cols * rows {
            return Err(CivilError::MalformedData {
                format: "ElevationGrid",
                reason: format!("heights has {} entries, expected cols*rows = {}", heights.len(), cols * rows),
            });
        }
        Ok(ElevationGrid { origin, cell_size, cols, rows, heights })
    }

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

    pub fn heights(&self) -> &[f64] {
        &self.heights
    }

    /// Replace the heights in place, keeping the same shape. Used by grading
    /// operations ([`grade_pad`]) that reshape a copy of a grid.
    fn with_heights(&self, heights: Vec<f64>) -> ElevationGrid {
        ElevationGrid { heights, ..self.clone() }
    }
}

/// Grid resolution/base-elevation knobs for [`interpolate_grid`]. Mirrors the
/// TS `InterpolateOptions` (`power`/`base`/`padding` all default like the TS
/// optional fields).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct InterpolateOptions {
    /// Grid resolution (world units between nodes). Must be positive.
    pub cell_size: f64,
    /// Inverse-distance-weighting power.
    pub power: f64,
    /// Base elevation used when there are no spots.
    pub base: f64,
    /// Padding added around the spots' bounds.
    pub padding: f64,
}

impl InterpolateOptions {
    pub fn new(cell_size: f64) -> Self {
        InterpolateOptions { cell_size, power: 2.0, base: 0.0, padding: 0.0 }
    }
}

/// Contour line segments at a single elevation level.
#[derive(Debug, Clone, PartialEq)]
pub struct ContourLevel {
    pub level: f64,
    pub segments: Vec<(Point, Point)>,
}

/// Slope and aspect sample at a single grid node.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SlopeSample {
    /// Rise over run (dimensionless).
    pub slope: f64,
    /// Slope as a percentage.
    pub percent: f64,
    /// Slope in degrees.
    pub degrees: f64,
    /// Downslope compass aspect in degrees (0 = north/−Y), or `None` if flat.
    pub aspect: Option<f64>,
}

/// Summary slope statistics over a grid (optionally clipped to a region).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SlopeStats {
    pub min_percent: f64,
    pub max_percent: f64,
    pub mean_percent: f64,
    /// Fraction of sampled nodes at or below the buildable threshold.
    pub buildable_fraction: f64,
    pub samples: usize,
}

/// Earthwork volumes between an existing and a proposed surface.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Earthwork {
    /// Excavation volume (proposed below existing), plan units³.
    pub cut: f64,
    /// Placement volume (proposed above existing), plan units³.
    pub fill: f64,
    /// fill − cut. Positive means net import of material.
    pub net: f64,
    pub cut_cubic_meters: f64,
    pub fill_cubic_meters: f64,
    pub net_cubic_meters: f64,
    /// Horizontal area considered, m².
    pub area_square_meters: f64,
    /// `true` when cut and fill are within `balance_tolerance` of each other.
    pub balanced: bool,
}

/// Options for [`cut_fill`].
#[derive(Debug, Clone, Copy, Default)]
pub struct CutFillOptions<'a> {
    pub region: Option<&'a Polygon>,
    pub spatial: Option<&'a SpatialContext>,
    /// Fraction of `max(cut, fill, 1)` within which cut and fill count as
    /// "balanced". TS default is `0.1`.
    pub balance_tolerance: Option<f64>,
}

/// Read the node elevation at grid indices, clamped to the grid.
pub fn node_height(grid: &ElevationGrid, c: i64, r: i64) -> f64 {
    let cc = c.clamp(0, grid.cols as i64 - 1) as usize;
    let rr = r.clamp(0, grid.rows as i64 - 1) as usize;
    grid.heights[rr * grid.cols + cc]
}

/// The world-space bounds covered by a grid.
pub fn grid_bounds(grid: &ElevationGrid) -> Bounds {
    Bounds {
        min_x: grid.origin.x,
        min_y: grid.origin.y,
        max_x: grid.origin.x + (grid.cols - 1) as f64 * grid.cell_size,
        max_y: grid.origin.y + (grid.rows - 1) as f64 * grid.cell_size,
    }
}

/// Min and max elevation over all nodes.
pub fn elevation_range(grid: &ElevationGrid) -> (f64, f64) {
    let mut min = f64::INFINITY;
    let mut max = f64::NEG_INFINITY;
    for &h in &grid.heights {
        min = min.min(h);
        max = max.max(h);
    }
    (min, max)
}

/// Bilinearly interpolate the surface elevation at a world point.
///
/// This is intentionally total (never fails): a point outside the grid's
/// covered extent clamps to the nearest edge cell and extrapolates the
/// bilinear surface from it — the same "keep going flat/linear past the
/// edge" behavior as the TS original, which several callers rely on (e.g.
/// [`crate::grading::calculate_daylight_line`] marches rays well past a
/// terrain model's surveyed extent). Use [`elevation_at_strict`] when you
/// need to reject an out-of-envelope query instead.
pub fn elevation_at(grid: &ElevationGrid, p: Point) -> f64 {
    let fx = (p.x - grid.origin.x) / grid.cell_size;
    let fy = (p.y - grid.origin.y) / grid.cell_size;
    let c = fx.floor();
    let r = fy.floor();
    let tx = fx - c;
    let ty = fy - r;
    let c = c as i64;
    let r = r as i64;
    let tl = node_height(grid, c, r);
    let tr = node_height(grid, c + 1, r);
    let bl = node_height(grid, c, r + 1);
    let br = node_height(grid, c + 1, r + 1);
    let top = tl + (tr - tl) * tx;
    let bottom = bl + (br - bl) * tx;
    top + (bottom - top) * ty
}

/// [`elevation_at`], but rejects a query point outside the grid's covered
/// extent instead of extrapolating.
///
/// # Errors
/// [`CivilError::OutsideDataEnvelope`] if `p` falls outside [`grid_bounds`].
pub fn elevation_at_strict(grid: &ElevationGrid, p: Point) -> CivilResult<f64> {
    let b = grid_bounds(grid);
    if p.x < b.min_x || p.x > b.max_x || p.y < b.min_y || p.y > b.max_y {
        return Err(CivilError::OutsideDataEnvelope {
            x: p.x,
            y: p.y,
            envelope: format!("[{}, {}] x [{}, {}]", b.min_x, b.max_x, b.min_y, b.max_y),
        });
    }
    Ok(elevation_at(grid, p))
}

/// Hypsometric tint ramp for terrain slope visualization.
pub fn slope_color(percent: f64) -> &'static str {
    if percent < 5.0 {
        "#10b981" // 0-5% gentle green
    } else if percent < 15.0 {
        "#f59e0b" // 5-15% moderate yellow
    } else if percent < 25.0 {
        "#f97316" // 15-25% steep orange
    } else {
        "#ef4444" // >25% severe red
    }
}

fn idw(spots: &[SpotElevation], p: Point, power: f64) -> f64 {
    if spots.is_empty() {
        return 0.0;
    }
    let mut num = 0.0;
    let mut den = 0.0;
    for s in spots {
        let dx = s.point.x - p.x;
        let dy = s.point.y - p.y;
        let d2 = dx * dx + dy * dy;
        if d2 < 1e-9 {
            return s.z;
        }
        let w = 1.0 / d2.powf(power / 2.0);
        num += w * s.z;
        den += w;
    }
    if den > 0.0 {
        num / den
    } else {
        0.0
    }
}

/// Build a regular elevation grid over the given extent by inverse-distance
/// weighting of spot elevations. With no spots, returns a flat base surface.
///
/// # Errors
/// [`CivilError::InvalidCellSize`] if `options.cell_size <= 0`.
pub fn interpolate_grid(spots: &[SpotElevation], extent: Bounds, options: InterpolateOptions) -> CivilResult<ElevationGrid> {
    let InterpolateOptions { cell_size, power, base, padding } = options;
    if !(cell_size > 0.0) {
        return Err(CivilError::InvalidCellSize { cell_size });
    }
    let min_x = extent.min_x - padding;
    let min_y = extent.min_y - padding;
    let width = extent.max_x + padding - min_x;
    let height = extent.max_y + padding - min_y;
    let cols = ((width / cell_size).ceil() as i64 + 1).max(2) as usize;
    let rows = ((height / cell_size).ceil() as i64 + 1).max(2) as usize;
    let mut heights = vec![0.0; cols * rows];

    for r in 0..rows {
        for c in 0..cols {
            let p = Point::new(min_x + c as f64 * cell_size, min_y + r as f64 * cell_size);
            heights[r * cols + c] = if spots.is_empty() { base } else { idw(spots, p, power) };
        }
    }
    ElevationGrid::new(Point::new(min_x, min_y), cell_size, cols, rows, heights)
}

// ---------------------------------------------------------------------------
// Contours (marching squares)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Edge {
    T,
    R,
    B,
    L,
}

/// Segment table keyed by the 4-corner case index (TL=8, TR=4, BR=2, BL=1).
/// Each entry lists edge pairs to connect: T(op), R(ight), B(ottom), L(eft).
fn ms_table(idx: u8) -> &'static [(Edge, Edge)] {
    use Edge::*;
    match idx {
        0 => &[],
        1 => &[(L, B)],
        2 => &[(B, R)],
        3 => &[(L, R)],
        4 => &[(T, R)],
        5 => &[(L, T), (B, R)],
        6 => &[(T, B)],
        7 => &[(L, T)],
        8 => &[(L, T)],
        9 => &[(T, B)],
        10 => &[(L, B), (T, R)],
        11 => &[(T, R)],
        12 => &[(L, R)],
        13 => &[(B, R)],
        14 => &[(L, B)],
        _ => &[],
    }
}

fn frac(a: f64, b: f64, level: f64) -> f64 {
    let d = b - a;
    if d.abs() < 1e-12 {
        0.5
    } else {
        (level - a) / d
    }
}

fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t
}

fn march_cell(grid: &ElevationGrid, c: i64, r: i64, level: f64, out: &mut Vec<(Point, Point)>) {
    let tl = node_height(grid, c, r);
    let tr = node_height(grid, c + 1, r);
    let br = node_height(grid, c + 1, r + 1);
    let bl = node_height(grid, c, r + 1);
    let idx = (if tl >= level { 8 } else { 0 }) | (if tr >= level { 4 } else { 0 }) | (if br >= level { 2 } else { 0 }) | (if bl >= level { 1 } else { 0 });
    let pairs = ms_table(idx);
    if pairs.is_empty() {
        return;
    }

    let x_l = grid.origin.x + c as f64 * grid.cell_size;
    let x_r = x_l + grid.cell_size;
    let y_t = grid.origin.y + r as f64 * grid.cell_size;
    let y_b = y_t + grid.cell_size;

    let point = |edge: Edge| -> Point {
        match edge {
            Edge::T => Point::new(lerp(x_l, x_r, frac(tl, tr, level)), y_t),
            Edge::B => Point::new(lerp(x_l, x_r, frac(bl, br, level)), y_b),
            Edge::L => Point::new(x_l, lerp(y_t, y_b, frac(tl, bl, level))),
            Edge::R => Point::new(x_r, lerp(y_t, y_b, frac(tr, br, level))),
        }
    };

    for &(a, b) in pairs {
        out.push((point(a), point(b)));
    }
}

/// Generate contour line segments at every multiple of `interval` between the
/// surface's min and max elevation, using marching squares. A non-positive
/// `interval` yields no contours (there is nothing meaningful to draw),
/// matching the TS source's `if (interval <= 0) return [];`.
pub fn contour_levels(grid: &ElevationGrid, interval: f64) -> Vec<ContourLevel> {
    if interval <= 0.0 {
        return Vec::new();
    }
    let (min, max) = elevation_range(grid);
    let mut levels = Vec::new();
    let start = (min / interval).ceil() * interval;
    let mut level = start;
    while level < max {
        let mut segments = Vec::new();
        for r in 0..grid.rows as i64 - 1 {
            for c in 0..grid.cols as i64 - 1 {
                march_cell(grid, c, r, level, &mut segments);
            }
        }
        if !segments.is_empty() {
            levels.push(ContourLevel { level: (level * 1e6).round() / 1e6, segments });
        }
        level += interval;
    }
    levels
}

/// Stitch a level's segments into continuous polylines for clean rendering
/// and labeling. Endpoints within `eps` world units are treated as the same
/// vertex. Uses an O(N) spatial endpoint lookup table for high performance on
/// dense grids.
pub fn stitch_contours(segments: &[(Point, Point)], eps: f64) -> Vec<Polyline> {
    if segments.is_empty() {
        return Vec::new();
    }
    let key = |p: Point| -> (i64, i64) { ((p.x / eps).round() as i64, (p.y / eps).round() as i64) };

    struct SegNode {
        a: Point,
        b: Point,
        key_a: (i64, i64),
        key_b: (i64, i64),
        used: bool,
    }

    let mut nodes: Vec<SegNode> = segments
        .iter()
        .map(|&(a, b)| SegNode { a, b, key_a: key(a), key_b: key(b), used: false })
        .collect();

    let mut adj: std::collections::HashMap<(i64, i64), Vec<usize>> = std::collections::HashMap::new();
    for (i, n) in nodes.iter().enumerate() {
        adj.entry(n.key_a).or_default().push(i);
        adj.entry(n.key_b).or_default().push(i);
    }

    let mut polylines: Vec<Polyline> = Vec::new();

    for start_idx in 0..nodes.len() {
        if nodes[start_idx].used {
            continue;
        }
        nodes[start_idx].used = true;
        let mut line: Vec<Point> = vec![nodes[start_idx].a, nodes[start_idx].b];
        let mut head_key = nodes[start_idx].key_a;
        let mut tail_key = nodes[start_idx].key_b;

        // Extend tail.
        loop {
            let candidate = adj.get(&tail_key).and_then(|cands| cands.iter().copied().find(|&i| !nodes[i].used));
            let Some(next_idx) = candidate else { break };
            nodes[next_idx].used = true;
            if nodes[next_idx].key_a == tail_key {
                line.push(nodes[next_idx].b);
                tail_key = nodes[next_idx].key_b;
            } else {
                line.push(nodes[next_idx].a);
                tail_key = nodes[next_idx].key_a;
            }
        }

        // Extend head.
        loop {
            let candidate = adj.get(&head_key).and_then(|cands| cands.iter().copied().find(|&i| !nodes[i].used));
            let Some(next_idx) = candidate else { break };
            nodes[next_idx].used = true;
            if nodes[next_idx].key_b == head_key {
                line.insert(0, nodes[next_idx].a);
                head_key = nodes[next_idx].key_a;
            } else {
                line.insert(0, nodes[next_idx].b);
                head_key = nodes[next_idx].key_b;
            }
        }

        polylines.push(line);
    }

    polylines
}

// ---------------------------------------------------------------------------
// Slope & aspect
// ---------------------------------------------------------------------------

/// Slope and aspect at a grid node, via central differences.
pub fn slope_at_node(grid: &ElevationGrid, c: i64, r: i64) -> SlopeSample {
    let dzdx = (node_height(grid, c + 1, r) - node_height(grid, c - 1, r)) / (2.0 * grid.cell_size);
    let dzdy = (node_height(grid, c, r + 1) - node_height(grid, c, r - 1)) / (2.0 * grid.cell_size);
    let grad = Point::new(dzdx, dzdy);
    let slope = length(grad);
    let aspect = if slope < 1e-9 { None } else { Some((grad.x.atan2(grad.y) * (180.0 / std::f64::consts::PI) + 360.0) % 360.0) };
    SlopeSample { slope, percent: slope * 100.0, degrees: slope.atan() * (180.0 / std::f64::consts::PI), aspect }
}

/// Summarize slope over a grid (optionally clipped to a polygon). `buildable`
/// slopes are those at or below `buildable_max_percent` (TS default 15%).
pub fn slope_stats(grid: &ElevationGrid, region: Option<&Polygon>, buildable_max_percent: f64) -> SlopeStats {
    let mut min = f64::INFINITY;
    let mut max = f64::NEG_INFINITY;
    let mut sum = 0.0;
    let mut buildable = 0usize;
    let mut n = 0usize;
    for r in 0..grid.rows as i64 {
        for c in 0..grid.cols as i64 {
            if let Some(region) = region {
                let p = Point::new(grid.origin.x + c as f64 * grid.cell_size, grid.origin.y + r as f64 * grid.cell_size);
                if !point_in_polygon(p, region) {
                    continue;
                }
            }
            let pct = slope_at_node(grid, c, r).percent;
            min = min.min(pct);
            max = max.max(pct);
            sum += pct;
            if pct <= buildable_max_percent {
                buildable += 1;
            }
            n += 1;
        }
    }
    if n == 0 {
        return SlopeStats { min_percent: 0.0, max_percent: 0.0, mean_percent: 0.0, buildable_fraction: 0.0, samples: 0 };
    }
    SlopeStats { min_percent: min, max_percent: max, mean_percent: sum / n as f64, buildable_fraction: buildable as f64 / n as f64, samples: n }
}

// ---------------------------------------------------------------------------
// Grading & earthwork
// ---------------------------------------------------------------------------

/// Return a copy of `grid` with nodes inside `polygon` set to `target_z` (a
/// flat pad).
pub fn grade_pad(grid: &ElevationGrid, polygon: &Polygon, target_z: f64) -> ElevationGrid {
    let mut heights = grid.heights.clone();
    for r in 0..grid.rows {
        for c in 0..grid.cols {
            let p = Point::new(grid.origin.x + c as f64 * grid.cell_size, grid.origin.y + r as f64 * grid.cell_size);
            if point_in_polygon(p, polygon) {
                heights[r * grid.cols + c] = target_z;
            }
        }
    }
    grid.with_heights(heights)
}

fn diff(existing: &ElevationGrid, proposed: &ElevationGrid, c: i64, r: i64) -> f64 {
    node_height(proposed, c, r) - node_height(existing, c, r)
}

/// Compute cut and fill between two identically-shaped grids by integrating
/// the signed elevation difference over each cell (optionally clipped to a
/// region).
pub fn cut_fill(existing: &ElevationGrid, proposed: &ElevationGrid, options: CutFillOptions<'_>) -> Earthwork {
    let balance_tolerance = options.balance_tolerance.unwrap_or(0.1);
    let cell_area = existing.cell_size * existing.cell_size;
    let mut cut = 0.0;
    let mut fill = 0.0;
    let mut cells = 0usize;

    for r in 0..existing.rows as i64 - 1 {
        for c in 0..existing.cols as i64 - 1 {
            let center = Point::new(existing.origin.x + (c as f64 + 0.5) * existing.cell_size, existing.origin.y + (r as f64 + 0.5) * existing.cell_size);
            if let Some(region) = options.region {
                if !point_in_polygon(center, region) {
                    continue;
                }
            }
            let dz = (diff(existing, proposed, c, r) + diff(existing, proposed, c + 1, r) + diff(existing, proposed, c, r + 1) + diff(existing, proposed, c + 1, r + 1)) / 4.0;
            let volume = dz * cell_area;
            if volume > 0.0 {
                fill += volume;
            } else {
                cut += -volume;
            }
            cells += 1;
        }
    }

    let unit_factor: f64 = options.spatial.map_or(1.0, |s| if s.units == Unit::Feet { 0.3048 } else { 1.0 });
    let volume_to_m3 = unit_factor.powi(3);
    let area_to_m2 = unit_factor.powi(2);
    let net = fill - cut;
    Earthwork {
        cut,
        fill,
        net,
        cut_cubic_meters: cut * volume_to_m3,
        fill_cubic_meters: fill * volume_to_m3,
        net_cubic_meters: net * volume_to_m3,
        area_square_meters: cells as f64 * cell_area * area_to_m2,
        balanced: net.abs() <= balance_tolerance * cut.max(fill).max(1.0),
    }
}

/// Convenience: interpolate an existing surface directly from spots over a
/// boundary.
pub fn surface_from_spots(spots: &[SpotElevation], extent: Bounds, cell_size: f64, base: f64) -> CivilResult<ElevationGrid> {
    interpolate_grid(spots, extent, InterpolateOptions { cell_size, power: 2.0, base, padding: cell_size })
}

/// Convenience wrapper: bounds of a set of spot elevations.
pub fn spots_bounds(spots: &[SpotElevation]) -> Bounds {
    thoth_spatial::bounds(&spots.iter().map(|s| s.point).collect::<Vec<_>>())
}

/// Traces a downhill path from a starting coordinate on the terrain grid
/// (Water Drop analysis).
pub fn trace_water_drop_path(grid: &ElevationGrid, start: Point, step_size: f64, max_steps: u32) -> Vec<Point> {
    let mut path = vec![start];
    let mut curr = start;

    for _ in 0..max_steps {
        let c = ((curr.x - grid.origin.x) / grid.cell_size).round() as i64;
        let r = ((curr.y - grid.origin.y) / grid.cell_size).round() as i64;

        if c < 0 || c >= grid.cols as i64 || r < 0 || r >= grid.rows as i64 {
            break;
        }

        let dzdx = (node_height(grid, c + 1, r) - node_height(grid, c - 1, r)) / (2.0 * grid.cell_size);
        let dzdy = (node_height(grid, c, r + 1) - node_height(grid, c, r - 1)) / (2.0 * grid.cell_size);

        let grad = Point::new(dzdx, dzdy);
        let len_val = length(grad);
        if len_val < 0.005 {
            break;
        }

        let next = Point::new(curr.x - (grad.x / len_val) * step_size, curr.y - (grad.y / len_val) * step_size);

        if distance(next, curr) < 1e-3 {
            break;
        }

        path.push(next);
        curr = next;
    }

    path
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    /// A planar ramp z = slope·x over a `size`×`size` extent at unit resolution.
    fn ramp(size: usize, slope: f64) -> ElevationGrid {
        let n = size + 1;
        let mut heights = Vec::with_capacity(n * n);
        for _r in 0..n {
            for c in 0..n {
                heights.push(slope * c as f64);
            }
        }
        ElevationGrid::new(Point::new(0.0, 0.0), 1.0, n, n, heights).unwrap()
    }

    fn flat(size: usize, z: f64) -> ElevationGrid {
        let n = size + 1;
        ElevationGrid::new(Point::new(0.0, 0.0), 1.0, n, n, vec![z; n * n]).unwrap()
    }

    #[test]
    fn elevation_grid_rejects_invalid_dimensions() {
        assert!(matches!(ElevationGrid::new(Point::ZERO, 1.0, 1, 5, vec![0.0; 5]), Err(CivilError::DegenerateGrid { .. })));
        assert!(matches!(ElevationGrid::new(Point::ZERO, 0.0, 5, 5, vec![0.0; 25]), Err(CivilError::InvalidCellSize { .. })));
        assert!(matches!(ElevationGrid::new(Point::ZERO, 1.0, 5, 5, vec![0.0; 10]), Err(CivilError::MalformedData { .. })));
    }

    #[test]
    fn interpolate_grid_reproduces_control_point_elevations() {
        let grid = interpolate_grid(
            &[SpotElevation { point: Point::new(0.0, 0.0), z: 10.0 }, SpotElevation { point: Point::new(10.0, 0.0), z: 20.0 }],
            Bounds { min_x: 0.0, min_y: 0.0, max_x: 10.0, max_y: 10.0 },
            InterpolateOptions::new(5.0),
        )
        .unwrap();
        assert_relative_eq!(elevation_at(&grid, Point::new(0.0, 0.0)), 10.0, epsilon = 1e-5);
        assert_relative_eq!(elevation_at(&grid, Point::new(10.0, 0.0)), 20.0, epsilon = 1e-5);
    }

    #[test]
    fn elevation_at_bilinearly_interpolates() {
        let g = ramp(10, 1.0); // z = x
        assert_relative_eq!(elevation_at(&g, Point::new(3.5, 2.0)), 3.5, epsilon = 1e-6);
    }

    #[test]
    fn slope_at_node_measures_ramp_as_rise_over_run() {
        let g = ramp(10, 0.5); // 50%
        let s = slope_at_node(&g, 5, 5);
        assert_relative_eq!(s.slope, 0.5, epsilon = 1e-6);
        assert_relative_eq!(s.percent, 50.0, epsilon = 1e-4);
        assert_relative_eq!(s.degrees, 26.565, epsilon = 1e-2);
    }

    #[test]
    fn slope_stats_classifies_buildable_fraction() {
        let gentle = slope_stats(&ramp(10, 0.05), None, 15.0); // 5%
        assert_eq!(gentle.buildable_fraction, 1.0);
        let steep = slope_stats(&ramp(10, 0.5), None, 15.0); // 50%
        assert_eq!(steep.buildable_fraction, 0.0);
    }

    #[test]
    fn contour_levels_draws_vertical_contours_across_a_ramp() {
        let g = ramp(20, 1.0); // z = x, 0..20
        let levels = contour_levels(&g, 5.0);
        let level_values: Vec<f64> = levels.iter().map(|l| l.level).collect();
        assert_eq!(level_values, vec![5.0, 10.0, 15.0]);
        let ten = levels.iter().find(|l| l.level == 10.0).unwrap();
        for &(a, b) in &ten.segments {
            assert_relative_eq!(a.x, 10.0, epsilon = 1e-6);
            assert_relative_eq!(b.x, 10.0, epsilon = 1e-6);
        }
    }

    #[test]
    fn stitch_contours_joins_segments_into_one_polyline() {
        let g = ramp(20, 1.0);
        let ten = contour_levels(&g, 5.0).into_iter().find(|l| l.level == 10.0).unwrap();
        let lines = stitch_contours(&ten.segments, 1e-4);
        assert_eq!(lines.len(), 1);
        assert_eq!(lines[0].len(), g.rows);
    }

    #[test]
    fn cut_fill_fills_volume_when_flat_pad_is_raised() {
        let existing = flat(10, 0.0);
        let region: Polygon = vec![Point::new(0.0, 0.0), Point::new(10.0, 0.0), Point::new(10.0, 10.0), Point::new(0.0, 10.0)];
        let proposed = grade_pad(&existing, &region, 2.0);
        let work = cut_fill(&existing, &proposed, CutFillOptions { region: Some(&region), ..Default::default() });
        assert_relative_eq!(work.fill, 200.0, epsilon = 1e-4);
        assert_relative_eq!(work.cut, 0.0, epsilon = 1e-6);
        assert_relative_eq!(work.fill_cubic_meters, 200.0, epsilon = 1e-4);
    }

    #[test]
    fn cut_fill_reports_balanced_when_raising_and_lowering_equal_areas() {
        let existing = flat(10, 0.0);
        let left: Polygon = vec![Point::new(0.0, 0.0), Point::new(4.0, 0.0), Point::new(4.0, 10.0), Point::new(0.0, 10.0)];
        let right: Polygon = vec![Point::new(6.0, 0.0), Point::new(10.0, 0.0), Point::new(10.0, 10.0), Point::new(6.0, 10.0)];
        let proposed = grade_pad(&grade_pad(&existing, &left, 1.0), &right, -1.0);
        let work = cut_fill(&existing, &proposed, CutFillOptions::default());
        assert!(work.balanced);
        assert_relative_eq!(work.net, 0.0, epsilon = 1e-4);
    }

    #[test]
    fn trace_water_drop_path_flows_downhill() {
        let size = 10;
        let n = size + 1;
        let mut heights = Vec::with_capacity(n * n);
        for _r in 0..n {
            for c in 0..n {
                heights.push(10.0 - c as f64);
            }
        }
        let grid = ElevationGrid::new(Point::new(0.0, 0.0), 10.0, n, n, heights).unwrap();
        let path = trace_water_drop_path(&grid, Point::new(20.0, 20.0), 5.0, 10);
        assert!(path.len() > 1);
        assert!(path[1].x > 20.0);
        assert_eq!(path[1].y, 20.0);
    }

    #[test]
    fn elevation_at_strict_rejects_out_of_envelope_points() {
        let g = flat(10, 5.0);
        assert!(elevation_at_strict(&g, Point::new(5.0, 5.0)).is_ok());
        assert!(matches!(elevation_at_strict(&g, Point::new(50.0, 5.0)), Err(CivilError::OutsideDataEnvelope { .. })));
    }
}
