//! Grading pad earthwork, feature-line daylighting, pond storage, and
//! drainage-flow arrows.
//!
//! Port of `packages/domain/src/civil/grading.ts` +
//! `packages/domain/src/civil/types/grading.ts`. The TS source reads its
//! `cuFtPerCuYd` constant from `planning/geoid/data/federalReference.json`;
//! since that data file belongs to the planning domain (out of this crate's
//! dependency graph — see `crates/thoth-civil/GAPS.md`), its value (27, the
//! textbook cubic-feet-per-cubic-yard conversion) is mirrored here as
//! [`CU_FT_PER_CU_YD`].

use thoth_spatial::{add, closest_point_on_segment, distance, length, point_in_polygon, scale, subtract, Point, Polygon};

use crate::terrain::{elevation_at, ElevationGrid};

/// Cubic feet per cubic yard — the textbook earthwork unit conversion.
/// Mirrors `federalReference.json`'s `standards.grading.cuFtPerCuYd`.
pub const CU_FT_PER_CU_YD: f64 = 27.0;

/// A flat-pad grading footprint with cut/fill daylight slopes.
#[derive(Debug, Clone)]
pub struct GradingPad {
    pub id: String,
    pub name: String,
    /// 2D polygon vertices of the pad footprint.
    pub points: Vec<Point>,
    pub target_elevation: f64,
    /// Cut daylight slope ratio (H:V), e.g. `2.0` for 2:1.
    pub cut_slope: f64,
    /// Fill daylight slope ratio (H:V), e.g. `3.0` for 3:1.
    pub fill_slope: f64,
}

/// Cut/fill volumes for a graded pad, in cubic yards.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct VolumeReport {
    pub cut_volume: f64,
    pub fill_volume: f64,
    /// `cut_volume - fill_volume`.
    pub net_volume: f64,
}

/// A 3D coordinate (feature lines, draped polylines, daylight lines).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Point3D {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Point3D {
    pub const fn new(x: f64, y: f64, z: f64) -> Self {
        Point3D { x, y, z }
    }

    fn xy(self) -> Point {
        Point::new(self.x, self.y)
    }
}

/// A drainage-flow direction sample at a surface point.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FlowArrow {
    pub point: Point,
    pub direction: Point,
    pub slope: f64,
}

/// Ray-casting point-in-polygon test matching the TS local helper in
/// `grading.ts` exactly (plain even-odd rule, no on-edge special case —
/// deliberately distinct from `thoth_spatial::point_in_polygon`, which treats
/// boundary points as inside).
fn is_point_in_polygon_plain(p: Point, polygon: &[Point]) -> bool {
    let mut inside = false;
    let n = polygon.len();
    if n == 0 {
        return false;
    }
    let mut j = n - 1;
    for i in 0..n {
        let (xi, yi) = (polygon[i].x, polygon[i].y);
        let (xj, yj) = (polygon[j].x, polygon[j].y);
        let intersect = (yi > p.y) != (yj > p.y) && p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi;
        if intersect {
            inside = !inside;
        }
        j = i;
    }
    inside
}

/// Distance from a point to the nearest edge of a polygon (not just its
/// vertices).
fn distance_to_polygon(p: Point, polygon: &[Point]) -> f64 {
    let mut min_dist = f64::INFINITY;
    let n = polygon.len();
    for i in 0..n {
        let p1 = polygon[i];
        let p2 = polygon[(i + 1) % n];
        if distance(p1, p2) < 1e-6 {
            continue;
        }
        let proj = closest_point_on_segment(p, p1, p2);
        min_dist = min_dist.min(distance(p, proj));
    }
    min_dist
}

/// Computes grading volumes by sampling a grid inside the pad's horizontal
/// footprint and surrounding daylight buffer.
pub fn calculate_grading_volumes(pad: &GradingPad, pad_z: f64, surface: &ElevationGrid, grid_resolution: f64) -> VolumeReport {
    // Determine bounding box around the pad with a daylight buffer offset.
    let buffer = 150.0; // max daylight run length
    let xs: Vec<f64> = pad.points.iter().map(|p| p.x).collect();
    let ys: Vec<f64> = pad.points.iter().map(|p| p.y).collect();
    let min_x = xs.iter().cloned().fold(f64::INFINITY, f64::min) - buffer;
    let max_x = xs.iter().cloned().fold(f64::NEG_INFINITY, f64::max) + buffer;
    let min_y = ys.iter().cloned().fold(f64::INFINITY, f64::min) - buffer;
    let max_y = ys.iter().cloned().fold(f64::NEG_INFINITY, f64::max) + buffer;

    let mut total_cut_volume = 0.0;
    let mut total_fill_volume = 0.0;
    let cell_area = grid_resolution * grid_resolution;

    let surface_max_x = surface.origin().x + (surface.cols() - 1) as f64 * surface.cell_size();
    let surface_max_y = surface.origin().y + (surface.rows() - 1) as f64 * surface.cell_size();

    let mut x = min_x;
    while x <= max_x {
        let mut y = min_y;
        while y <= max_y {
            if x < surface.origin().x || x > surface_max_x || y < surface.origin().y || y > surface_max_y {
                y += grid_resolution;
                continue;
            }
            let existing_z = elevation_at(surface, Point::new(x, y));

            let inside = is_point_in_polygon_plain(Point::new(x, y), &pad.points);
            let proposed_z = if inside {
                pad_z
            } else {
                let dist = distance_to_polygon(Point::new(x, y), &pad.points);
                if existing_z > pad_z {
                    // Cut region: daylight slope goes upwards from the pad.
                    let mut z = pad_z + dist / pad.cut_slope.max(0.01);
                    if z > existing_z {
                        z = existing_z; // already daylit
                    }
                    z
                } else {
                    // Fill region: daylight slope goes downwards from the pad.
                    let mut z = pad_z - dist / pad.fill_slope.max(0.01);
                    if z < existing_z {
                        z = existing_z; // already daylit
                    }
                    z
                }
            };

            let diff = proposed_z - existing_z; // positive = fill, negative = cut
            if diff > 0.0 {
                total_fill_volume += diff * cell_area;
            } else {
                total_cut_volume += diff.abs() * cell_area;
            }
            y += grid_resolution;
        }
        x += grid_resolution;
    }

    let cut_volume = total_cut_volume / CU_FT_PER_CU_YD;
    let fill_volume = total_fill_volume / CU_FT_PER_CU_YD;

    VolumeReport { cut_volume, fill_volume, net_volume: cut_volume - fill_volume }
}

/// Iteratively solves for the grading pad elevation that achieves a balanced
/// cut/fill (net volume = target, within `tolerance` cubic yards) via
/// bisection over `[-100, 500]`. Returns the best elevation found after 20
/// iterations even if it hasn't converged within `tolerance` — mirrors the TS
/// source, which never signals non-convergence either.
pub fn solve_balanced_elevation(pad: &GradingPad, surface: &ElevationGrid, target_net_volume: f64, tolerance: f64) -> f64 {
    let mut low_z = -100.0;
    let mut high_z = 500.0;
    let mut balanced_z = (low_z + high_z) / 2.0;
    let max_iterations = 20;

    for _ in 0..max_iterations {
        balanced_z = (low_z + high_z) / 2.0;
        let report = calculate_grading_volumes(pad, balanced_z, surface, 10.0);
        let deviation = report.net_volume - target_net_volume;

        if deviation.abs() < tolerance {
            return balanced_z;
        }

        if deviation > 0.0 {
            // Too much cut: raise the pad to reduce cut.
            low_z = balanced_z;
        } else {
            // Too much fill: lower the pad to reduce fill.
            high_z = balanced_z;
        }
    }

    balanced_z
}

/// Drape a 2D polyline onto an `ElevationGrid` surface to create a 3D
/// feature line.
pub fn drape_polyline(points: &[Point], surface: &ElevationGrid) -> Vec<Point3D> {
    points.iter().map(|&p| Point3D::new(p.x, p.y, elevation_at(surface, p))).collect()
}

/// Calculate daylight points for a 3D feature line projecting to meet a
/// terrain surface. `cut_slope`/`fill_slope` are H:V ratios (e.g. `2.0` for
/// 2:1); `search_distance` bounds how far the ray marches outward.
pub fn calculate_daylight_line(feature_line: &[Point3D], surface: &ElevationGrid, cut_slope: f64, fill_slope: f64, search_distance: f64) -> Vec<Point3D> {
    let mut daylight_line = Vec::new();
    let n = feature_line.len();
    if n < 2 {
        return Vec::new();
    }

    for i in 0..n {
        let curr = feature_line[i];

        // Calculate 2D tangent vector.
        let (tx, ty) = if i == 0 {
            (feature_line[1].x - curr.x, feature_line[1].y - curr.y)
        } else if i == n - 1 {
            (curr.x - feature_line[n - 2].x, curr.y - feature_line[n - 2].y)
        } else {
            let t1 = subtract(curr.xy(), feature_line[i - 1].xy());
            let t2 = subtract(feature_line[i + 1].xy(), curr.xy());
            let len1 = length(t1);
            let len2 = length(t2);
            let n1 = if len1 > 0.0 { scale(t1, 1.0 / len1) } else { Point::ZERO };
            let n2 = if len2 > 0.0 { scale(t2, 1.0 / len2) } else { Point::ZERO };
            let sum = add(n1, n2);
            (sum.x, sum.y)
        };

        let tangent = Point::new(tx, ty);
        let tangent_len = length(tangent);
        if tangent_len < 1e-4 {
            continue;
        }

        // Left normal vector.
        let nx = -tangent.y / tangent_len;
        let ny = tangent.x / tangent_len;

        let terrain_at_start = elevation_at(surface, curr.xy());
        let is_cut = curr.z < terrain_at_start;
        let slope = if is_cut { cut_slope } else { fill_slope };

        // March a ray along the normal to find where the proposed slope
        // intersects the terrain.
        let mut found = false;
        let mut prev_dist = 0.0;
        let mut prev_diff = curr.z - terrain_at_start;

        let steps = 150;
        let step_size = search_distance / steps as f64;

        for step in 1..=steps {
            let d = step as f64 * step_size;
            let pt2d = Point::new(curr.x + d * nx, curr.y + d * ny);
            let terr_z = elevation_at(surface, pt2d);
            let prop_z = if is_cut { curr.z + d / slope } else { curr.z - d / slope };

            let diff = prop_z - terr_z;
            if (is_cut && diff < 0.0) || (!is_cut && diff > 0.0) {
                prev_dist = d;
                prev_diff = diff;
            } else {
                let fraction = prev_diff.abs() / (prev_diff.abs() + diff.abs());
                let day_dist = prev_dist + fraction * (d - prev_dist);
                let day_pt = Point::new(curr.x + day_dist * nx, curr.y + day_dist * ny);
                daylight_line.push(Point3D::new(day_pt.x, day_pt.y, elevation_at(surface, day_pt)));
                found = true;
                break;
            }
        }

        if !found {
            let end_pt = Point::new(curr.x + search_distance * nx, curr.y + search_distance * ny);
            daylight_line.push(Point3D::new(end_pt.x, end_pt.y, elevation_at(surface, end_pt)));
        }
    }

    daylight_line
}

/// Compute the pond storage capacity (volume, cubic yards) below a specified
/// water surface elevation.
pub fn calculate_pond_volume(surface: &ElevationGrid, water_elevation: f64, boundary: &Polygon, grid_resolution: f64) -> f64 {
    let xs: Vec<f64> = boundary.iter().map(|p| p.x).collect();
    let ys: Vec<f64> = boundary.iter().map(|p| p.y).collect();
    let min_x = xs.iter().cloned().fold(f64::INFINITY, f64::min);
    let max_x = xs.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let min_y = ys.iter().cloned().fold(f64::INFINITY, f64::min);
    let max_y = ys.iter().cloned().fold(f64::NEG_INFINITY, f64::max);

    let mut total_volume = 0.0;
    let cell_area = grid_resolution * grid_resolution;

    let mut x = min_x + grid_resolution / 2.0;
    while x < max_x {
        let mut y = min_y + grid_resolution / 2.0;
        while y < max_y {
            let p = Point::new(x, y);
            if point_in_polygon(p, boundary) {
                let z = elevation_at(surface, p);
                if z < water_elevation {
                    total_volume += (water_elevation - z) * cell_area;
                }
            }
            y += grid_resolution;
        }
        x += grid_resolution;
    }

    total_volume / CU_FT_PER_CU_YD
}

/// Calculate drainage flow arrows across the surface at grid cell centers,
/// sampling every `cell_stride` nodes.
pub fn calculate_drainage_flow(surface: &ElevationGrid, cell_stride: usize) -> Vec<FlowArrow> {
    let mut arrows = Vec::new();
    let dx = surface.cell_size();
    let cols = surface.cols();
    let heights = surface.heights();

    let mut r = 1;
    while r < surface.rows() - 1 {
        let mut c = 1;
        while c < cols - 1 {
            let x = surface.origin().x + c as f64 * dx;
            let y = surface.origin().y + r as f64 * dx;

            let z_l = heights[r * cols + (c - 1)];
            let z_r = heights[r * cols + (c + 1)];
            let z_t = heights[(r - 1) * cols + c];
            let z_b = heights[(r + 1) * cols + c];

            let grad_x = (z_r - z_l) / (2.0 * dx);
            let grad_y = (z_b - z_t) / (2.0 * dx);
            let grad = Point::new(grad_x, grad_y);
            let slope = length(grad);
            if slope > 1e-4 {
                arrows.push(FlowArrow { point: Point::new(x, y), direction: Point::new(-grad.x / slope, -grad.y / slope), slope });
            }
            c += cell_stride;
        }
        r += cell_stride;
    }
    arrows
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn flat_surface(cols: usize, rows: usize, cell_size: f64, z: f64) -> ElevationGrid {
        ElevationGrid::new(Point::new(0.0, 0.0), cell_size, cols, rows, vec![z; cols * rows]).unwrap()
    }

    #[test]
    fn drape_polyline_samples_flat_surface() {
        let surface = flat_surface(11, 11, 10.0, 10.0);
        let pts = vec![Point::new(15.0, 15.0), Point::new(45.0, 55.0)];
        let draped = drape_polyline(&pts, &surface);
        assert_eq!(draped.len(), 2);
        assert_relative_eq!(draped[0].z, 10.0, epsilon = 1e-9);
        assert_relative_eq!(draped[1].z, 10.0, epsilon = 1e-9);
    }

    #[test]
    fn calculate_daylight_line_projects_cut_and_fill() {
        let flat_surface = flat_surface(11, 11, 10.0, 10.0);

        let feature_line_fill = vec![Point3D::new(20.0, 50.0, 12.0), Point3D::new(80.0, 50.0, 12.0)];
        let daylight_fill = calculate_daylight_line(&feature_line_fill, &flat_surface, 2.0, 3.0, 50.0);
        assert_eq!(daylight_fill.len(), 2);
        assert_relative_eq!(daylight_fill[0].y, 56.0, epsilon = 1.0);
        assert_relative_eq!(daylight_fill[1].y, 56.0, epsilon = 1.0);

        let feature_line_cut = vec![Point3D::new(20.0, 50.0, 8.0), Point3D::new(80.0, 50.0, 8.0)];
        let daylight_cut = calculate_daylight_line(&feature_line_cut, &flat_surface, 2.0, 3.0, 50.0);
        assert_eq!(daylight_cut.len(), 2);
        assert_relative_eq!(daylight_cut[0].y, 54.0, epsilon = 1.0);
        assert_relative_eq!(daylight_cut[1].y, 54.0, epsilon = 1.0);
    }

    #[test]
    fn calculate_pond_volume_measures_storage_below_water_level() {
        let flat_surface = flat_surface(11, 11, 10.0, 10.0);
        let pond_boundary: Polygon = vec![Point::new(10.0, 10.0), Point::new(50.0, 10.0), Point::new(50.0, 50.0), Point::new(10.0, 50.0)];
        let volume = calculate_pond_volume(&flat_surface, 15.0, &pond_boundary, 2.0);
        assert_relative_eq!(volume, 296.3, epsilon = 0.1);
    }

    #[test]
    fn calculate_drainage_flow_points_downhill() {
        let mut heights = Vec::with_capacity(25);
        for _r in 0..5 {
            for c in 0..5 {
                heights.push(c as f64 * 10.0);
            }
        }
        let sloped = ElevationGrid::new(Point::new(0.0, 0.0), 10.0, 5, 5, heights).unwrap();
        let arrows = calculate_drainage_flow(&sloped, 1);
        assert!(!arrows.is_empty());
        assert_relative_eq!(arrows[0].direction.x, -1.0, epsilon = 1e-2);
        assert_relative_eq!(arrows[0].direction.y, 0.0, epsilon = 1e-2);
    }

    #[test]
    fn calculate_grading_volumes_and_balance() {
        let surface = ElevationGrid::new(Point::new(0.0, 0.0), 20.0, 5, 5, vec![10.0; 25]).unwrap();
        let pad = GradingPad {
            id: "g1".into(),
            name: "Pad 1".into(),
            points: vec![Point::new(20.0, 20.0), Point::new(80.0, 20.0), Point::new(80.0, 80.0), Point::new(20.0, 80.0)],
            target_elevation: 12.0,
            cut_slope: 2.0,
            fill_slope: 3.0,
        };

        let res = calculate_grading_volumes(&pad, 12.0, &surface, 10.0);
        assert!(res.fill_volume > 0.0);
        assert_eq!(res.cut_volume, 0.0);

        let bal_z = solve_balanced_elevation(&pad, &surface, 0.0, 5.0);
        assert_relative_eq!(bal_z, 10.0, epsilon = 0.5);
    }

    #[test]
    fn calculate_grading_volumes_skips_points_outside_surface_bounds() {
        // A pad whose daylight buffer extends beyond the surface's coverage
        // must not panic — those samples are simply skipped (mirrors the TS
        // `if (x < surface.origin.x || ...) continue;`).
        let surface = flat_surface(3, 3, 10.0, 5.0); // 0..20 x 0..20
        let pad = GradingPad {
            id: "edge".into(),
            name: "Edge Pad".into(),
            points: vec![Point::new(0.0, 0.0), Point::new(20.0, 0.0), Point::new(20.0, 20.0), Point::new(0.0, 20.0)],
            target_elevation: 6.0,
            cut_slope: 2.0,
            fill_slope: 2.0,
        };
        let res = calculate_grading_volumes(&pad, 6.0, &surface, 5.0);
        assert!(res.fill_volume >= 0.0);
    }
}
