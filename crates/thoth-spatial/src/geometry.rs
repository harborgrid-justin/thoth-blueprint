//! Geometry primitives and pure functions for Thoth Blueprint.
//!
//! Framework-agnostic. All coordinates are plain plan-space numbers; their
//! real-world meaning comes from an accompanying [`crate::units::SpatialContext`].
//! Nothing here does I/O or touches a framework.
//!
//! Direct port of `packages/domain/src/spatial/geometry.ts`. Function names,
//! semantics, and edge-case behavior (degenerate rings, collapsed offsets,
//! zero-length inputs) are preserved exactly so the two implementations stay
//! numerically interchangeable across the WASM boundary.

use serde::{Deserialize, Serialize};

/// A single position in plan space.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

impl Point {
    pub const ZERO: Point = Point { x: 0.0, y: 0.0 };

    pub const fn new(x: f64, y: f64) -> Self {
        Point { x, y }
    }
}

/// An open sequence of connected points.
pub type Polyline = Vec<Point>;

/// A closed ring of points describing an area. The closing edge from the last
/// point back to the first is implied; callers should NOT repeat the first point.
pub type Polygon = Vec<Point>;

/// An axis-aligned bounding box in plan space.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Bounds {
    pub min_x: f64,
    pub min_y: f64,
    pub max_x: f64,
    pub max_y: f64,
}

/// A named tolerance for geometric comparisons — never use bare magic numbers.
pub const GEOMETRY_EPSILON: f64 = 1e-9;

/// Euclidean distance between two points, in plan units.
pub fn distance(a: Point, b: Point) -> f64 {
    (b.x - a.x).hypot(b.y - a.y)
}

/// Add two points as vectors.
pub fn add(a: Point, b: Point) -> Point {
    Point::new(a.x + b.x, a.y + b.y)
}

/// Subtract `b` from `a` as vectors.
pub fn subtract(a: Point, b: Point) -> Point {
    Point::new(a.x - b.x, a.y - b.y)
}

/// Scale a point/vector by a scalar.
pub fn scale(p: Point, k: f64) -> Point {
    Point::new(p.x * k, p.y * k)
}

/// Vector length (magnitude).
pub fn length(v: Point) -> f64 {
    v.x.hypot(v.y)
}

/// Return `v` scaled to unit length, or the zero vector if `v` is ~zero.
pub fn normalize(v: Point) -> Point {
    let len = v.x.hypot(v.y);
    if len < GEOMETRY_EPSILON {
        Point::ZERO
    } else {
        Point::new(v.x / len, v.y / len)
    }
}

/// Dot product of two vectors.
pub fn dot(a: Point, b: Point) -> f64 {
    a.x * b.x + a.y * b.y
}

/// 2D cross product (z-component of the 3D cross), useful for orientation.
pub fn cross(a: Point, b: Point) -> f64 {
    a.x * b.y - a.y * b.x
}

/// Signed area of a polygon via the shoelace formula. Positive for a
/// counter-clockwise ring, negative for clockwise (in a standard math frame).
pub fn signed_area(polygon: &[Point]) -> f64 {
    let n = polygon.len();
    if n < 3 {
        return 0.0;
    }
    let mut sum = 0.0;
    for i in 0..n {
        let a = polygon[i];
        let b = polygon[(i + 1) % n];
        sum += a.x * b.y - b.x * a.y;
    }
    sum / 2.0
}

/// Absolute area of a polygon in plan units², regardless of winding order.
pub fn area(polygon: &[Point]) -> f64 {
    signed_area(polygon).abs()
}

/// `true` if the ring is wound counter-clockwise.
pub fn is_counter_clockwise(polygon: &[Point]) -> bool {
    signed_area(polygon) > 0.0
}

/// Return a copy of the ring wound counter-clockwise.
pub fn ensure_counter_clockwise(polygon: &[Point]) -> Polygon {
    if is_counter_clockwise(polygon) {
        polygon.to_vec()
    } else {
        let mut reversed = polygon.to_vec();
        reversed.reverse();
        reversed
    }
}

/// Total length of a polyline in plan units.
pub fn polyline_length(line: &[Point]) -> f64 {
    let mut total = 0.0;
    for i in 1..line.len() {
        total += distance(line[i - 1], line[i]);
    }
    total
}

/// Perimeter of a closed polygon in plan units (includes the closing edge).
pub fn perimeter(polygon: &[Point]) -> f64 {
    let n = polygon.len();
    if n < 2 {
        return 0.0;
    }
    let mut total = 0.0;
    for i in 0..n {
        total += distance(polygon[i], polygon[(i + 1) % n]);
    }
    total
}

fn vertex_mean(points: &[Point]) -> Point {
    if points.is_empty() {
        return Point::ZERO;
    }
    let mut sx = 0.0;
    let mut sy = 0.0;
    for p in points {
        sx += p.x;
        sy += p.y;
    }
    Point::new(sx / points.len() as f64, sy / points.len() as f64)
}

/// Area-weighted centroid of a polygon. Falls back to the vertex mean if degenerate.
pub fn centroid(polygon: &[Point]) -> Point {
    let n = polygon.len();
    if n == 0 {
        return Point::ZERO;
    }
    if n < 3 {
        return vertex_mean(polygon);
    }

    let mut cx = 0.0;
    let mut cy = 0.0;
    let mut a = 0.0;
    for i in 0..n {
        let p0 = polygon[i];
        let p1 = polygon[(i + 1) % n];
        let f = p0.x * p1.y - p1.x * p0.y;
        cx += (p0.x + p1.x) * f;
        cy += (p0.y + p1.y) * f;
        a += f;
    }
    a *= 0.5;
    Point::new(cx / (6.0 * a), cy / (6.0 * a))
}

/// Axis-aligned bounding box of a set of points. Returns a zero box if empty.
pub fn bounds(points: &[Point]) -> Bounds {
    if points.is_empty() {
        return Bounds {
            min_x: 0.0,
            min_y: 0.0,
            max_x: 0.0,
            max_y: 0.0,
        };
    }
    let mut min_x = f64::INFINITY;
    let mut min_y = f64::INFINITY;
    let mut max_x = f64::NEG_INFINITY;
    let mut max_y = f64::NEG_INFINITY;
    for p in points {
        min_x = min_x.min(p.x);
        min_y = min_y.min(p.y);
        max_x = max_x.max(p.x);
        max_y = max_y.max(p.y);
    }
    Bounds {
        min_x,
        min_y,
        max_x,
        max_y,
    }
}

/// Merge several bounds into one that contains them all.
pub fn union_bounds(boxes: &[Bounds]) -> Option<Bounds> {
    let first = boxes.first()?;
    let mut min_x = first.min_x;
    let mut min_y = first.min_y;
    let mut max_x = first.max_x;
    let mut max_y = first.max_y;
    for b in &boxes[1..] {
        min_x = min_x.min(b.min_x);
        min_y = min_y.min(b.min_y);
        max_x = max_x.max(b.max_x);
        max_y = max_y.max(b.max_y);
    }
    Some(Bounds {
        min_x,
        min_y,
        max_x,
        max_y,
    })
}

/// Center point of a bounding box.
pub fn bounds_center(b: Bounds) -> Point {
    Point::new((b.min_x + b.max_x) / 2.0, (b.min_y + b.max_y) / 2.0)
}

/// Expand a bounds by a margin so a tight or zero-size selection keeps context.
pub fn pad_bounds(b: Bounds) -> Bounds {
    let span = (b.max_x - b.min_x).max(b.max_y - b.min_y) * 0.15;
    let pad = if span == 0.0 { 10.0 } else { span };
    Bounds {
        min_x: b.min_x - pad,
        min_y: b.min_y - pad,
        max_x: b.max_x + pad,
        max_y: b.max_y + pad,
    }
}

/// `true` if `p` lies on the segment `a`-`b` within [`GEOMETRY_EPSILON`].
pub fn point_on_segment(p: Point, a: Point, b: Point) -> bool {
    let cross_product = (p.y - a.y) * (b.x - a.x) - (p.x - a.x) * (b.y - a.y);
    if cross_product.abs() > GEOMETRY_EPSILON * distance(a, b).max(1.0) {
        return false;
    }
    let dot_product = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
    if dot_product < 0.0 {
        return false;
    }
    let squared_len = (b.x - a.x).powi(2) + (b.y - a.y).powi(2);
    dot_product <= squared_len
}

/// Point-in-polygon test using the ray-casting (even-odd) rule. Points exactly
/// on an edge are considered inside.
pub fn point_in_polygon(point: Point, polygon: &[Point]) -> bool {
    let n = polygon.len();
    if n < 3 {
        return false;
    }
    let mut inside = false;
    let mut j = n - 1;
    for i in 0..n {
        let pi = polygon[i];
        let pj = polygon[j];
        if point_on_segment(point, pi, pj) {
            return true;
        }
        let intersects = (pi.y > point.y) != (pj.y > point.y)
            && point.x < (pj.x - pi.x) * (point.y - pi.y) / (pj.y - pi.y) + pi.x;
        if intersects {
            inside = !inside;
        }
        j = i;
    }
    inside
}

/// Closest point to `p` on the segment `a`-`b`.
pub fn closest_point_on_segment(p: Point, a: Point, b: Point) -> Point {
    let abx = b.x - a.x;
    let aby = b.y - a.y;
    let len_sq = abx * abx + aby * aby;
    if len_sq < GEOMETRY_EPSILON {
        return a;
    }

    let apx = p.x - a.x;
    let apy = p.y - a.y;
    let t = ((apx * abx + apy * aby) / len_sq).clamp(0.0, 1.0);

    Point::new(a.x + abx * t, a.y + aby * t)
}

/// Intersection of two infinite lines given as point + direction. `None` if parallel.
fn line_intersection(p1: Point, d1: Point, p2: Point, d2: Point) -> Option<Point> {
    let denom = cross(d1, d2);
    if denom.abs() < GEOMETRY_EPSILON {
        return None;
    }
    let diff = subtract(p2, p1);
    let t = cross(diff, d2) / denom;
    Some(Point::new(p1.x + d1.x * t, p1.y + d1.y * t))
}

/// Offset (inset/outset) a simple polygon by `d` plan units. A positive `d`
/// insets a counter-clockwise ring inward — the operation setbacks rely on.
/// This is a straight-skeleton-free approximation adequate for convex-ish
/// planning polygons; returns `None` if the result collapses.
pub fn offset_polygon(polygon: &[Point], d: f64) -> Option<Polygon> {
    let ring = ensure_counter_clockwise(polygon);
    let n = ring.len();
    if n < 3 {
        return None;
    }

    struct OffsetEdge {
        p: Point,
        dir: Point,
    }

    let mut offset_edges = Vec::with_capacity(n);
    for i in 0..n {
        let a = ring[i];
        let b = ring[(i + 1) % n];
        let edge = normalize(subtract(b, a));
        // Inward normal for a CCW ring points to the left of the edge direction.
        let normal = Point::new(-edge.y, edge.x);
        offset_edges.push(OffsetEdge {
            p: Point::new(a.x + normal.x * d, a.y + normal.y * d),
            dir: edge,
        });
    }

    let mut result: Polygon = Vec::with_capacity(n);
    for i in 0..n {
        let prev = &offset_edges[(i + n - 1) % n];
        let curr = &offset_edges[i];
        let intersection = line_intersection(prev.p, prev.dir, curr.p, curr.dir)?;
        result.push(intersection);
    }

    // A valid inset keeps the ring's winding and each edge's direction. When the
    // offset consumes the polygon, an edge reverses (an "edge event"): the vector
    // from result[i] to result[i+1] no longer aligns with its source edge.
    for i in 0..n {
        let edge_vec = subtract(result[(i + 1) % n], result[i]);
        if dot(edge_vec, offset_edges[i].dir) <= GEOMETRY_EPSILON {
            return None;
        }
    }

    if area(&result) < GEOMETRY_EPSILON {
        return None;
    }
    if is_counter_clockwise(&result) != is_counter_clockwise(&ring) {
        return None;
    }
    Some(result)
}

/// Compass bearing (0° = +Y/north, clockwise) from `a` to `b`, in degrees.
pub fn bearing(a: Point, b: Point) -> f64 {
    let angle = (b.x - a.x).atan2(b.y - a.y) * (180.0 / std::f64::consts::PI);
    (angle + 360.0) % 360.0
}

/// Translate every point of a polygon by a vector.
pub fn translate_polygon(polygon: &[Point], delta: Point) -> Polygon {
    polygon.iter().map(|&p| add(p, delta)).collect()
}

/// `true` if a polygon is a valid ring (>=3 distinct points, non-zero area).
pub fn is_valid_polygon(polygon: &[Point]) -> bool {
    polygon.len() >= 3 && area(polygon) > GEOMETRY_EPSILON
}

/// Format a plan-space point for a cursor readout. Survey format follows the
/// platform's convention (north is -Y, east is +X); plan format is raw x/y.
pub fn format_coord(p: Point, survey: bool, digits: usize) -> String {
    let x = format!("{:.*}", digits, p.x);
    let y = format!("{:.*}", digits, p.y);
    if survey {
        format!("N {:.*} · E {}", digits, -p.y, x)
    } else {
        format!("x {} · y {}", x, y)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn square(side: f64) -> Polygon {
        vec![
            Point::new(0.0, 0.0),
            Point::new(side, 0.0),
            Point::new(side, side),
            Point::new(0.0, side),
        ]
    }

    #[test]
    fn area_of_unit_square_is_one() {
        assert_relative_eq!(area(&square(1.0)), 1.0, epsilon = 1e-12);
    }

    #[test]
    fn signed_area_is_positive_for_ccw_and_negative_for_cw() {
        let ccw = square(10.0);
        let mut cw = ccw.clone();
        cw.reverse();
        assert!(signed_area(&ccw) > 0.0);
        assert!(signed_area(&cw) < 0.0);
    }

    #[test]
    fn centroid_of_square_is_its_center() {
        let c = centroid(&square(4.0));
        assert_relative_eq!(c.x, 2.0, epsilon = 1e-9);
        assert_relative_eq!(c.y, 2.0, epsilon = 1e-9);
    }

    #[test]
    fn perimeter_of_unit_square_is_four() {
        assert_relative_eq!(perimeter(&square(1.0)), 4.0, epsilon = 1e-12);
    }

    #[test]
    fn point_in_polygon_detects_interior_and_exterior_points() {
        let sq = square(10.0);
        assert!(point_in_polygon(Point::new(5.0, 5.0), &sq));
        assert!(!point_in_polygon(Point::new(15.0, 5.0), &sq));
    }

    #[test]
    fn point_in_polygon_treats_edge_points_as_inside() {
        let sq = square(10.0);
        assert!(point_in_polygon(Point::new(0.0, 5.0), &sq));
    }

    #[test]
    fn offset_polygon_insets_a_square() {
        let sq = square(10.0);
        let inset = offset_polygon(&sq, 1.0).expect("valid inset");
        assert_relative_eq!(area(&inset), 64.0, epsilon = 1e-6);
    }

    #[test]
    fn offset_polygon_collapses_when_offset_exceeds_half_width() {
        let sq = square(2.0);
        assert!(offset_polygon(&sq, 2.0).is_none());
    }

    #[test]
    fn bearing_of_due_north_is_zero() {
        assert_relative_eq!(
            bearing(Point::ZERO, Point::new(0.0, 10.0)),
            0.0,
            epsilon = 1e-9
        );
    }

    #[test]
    fn bearing_of_due_east_is_ninety() {
        assert_relative_eq!(
            bearing(Point::ZERO, Point::new(10.0, 0.0)),
            90.0,
            epsilon = 1e-9
        );
    }

    #[test]
    fn closest_point_on_segment_clamps_to_endpoints() {
        let a = Point::new(0.0, 0.0);
        let b = Point::new(10.0, 0.0);
        let p = closest_point_on_segment(Point::new(-5.0, 3.0), a, b);
        assert_eq!(p, a);
    }

    #[test]
    fn union_bounds_of_empty_slice_is_none() {
        assert!(union_bounds(&[]).is_none());
    }

    #[test]
    fn is_valid_polygon_rejects_degenerate_rings() {
        assert!(!is_valid_polygon(&[Point::ZERO, Point::new(1.0, 1.0)]));
        assert!(is_valid_polygon(&square(1.0)));
    }
}
