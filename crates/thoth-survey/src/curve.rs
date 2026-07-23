//! Circular-arc boundary geometry — bulge-encoded arcs mixed with straight
//! edges in a boundary ring.
//!
//! **Workspace gap.** This is a local port of
//! `packages/domain/src/spatial/curve.ts`. That module is *not* re-exported
//! from the frozen `thoth-spatial` crate (see `crates/thoth-survey/GAPS.md`
//! for why), so it lives here, private to the survey/plat pipeline that
//! needs it ([`crate::survey::polygon_courses`],
//! [`crate::survey::survey_report`], [`crate::helpers::metes_and_bounds`]).
//! Semantics — including the bulge (`tan(Δ/4)`) convention, sweep-sign
//! resolution, and every degenerate-input edge case — mirror the
//! TypeScript exactly.
//!
//! Arcs are encoded per edge as a **bulge** (the DXF/LandXML convention):
//!
//! `bulge = tan(Δ / 4)`
//!
//! where Δ is the arc's included (central) angle and the sign selects the
//! side the arc bulges relative to the chord. A bulge of 0 is a straight
//! line. This single number, with the edge's two endpoints, determines the
//! arc exactly, so boundaries stay a plain vertex ring plus an optional
//! bulge per edge ([`thoth_spatial::EdgeArcs`]).

use thoth_spatial::{
    add, distance, dot, length, normalize, scale, subtract, EdgeArcs, Point, Polygon,
    GEOMETRY_EPSILON,
};

/// `Math.sign` semantics: `0.0` for zero (unlike [`f64::signum`], which
/// returns `1.0` for positive zero). Several sweep/center-side computations
/// below rely on the zero case being genuinely zero, so this must not be
/// replaced with `f64::signum`.
fn js_sign(x: f64) -> f64 {
    if x > 0.0 {
        1.0
    } else if x < 0.0 {
        -1.0
    } else {
        0.0
    }
}

/// Normalize an angle to `(−π, π]`.
fn normalize_signed(angle: f64) -> f64 {
    let mut a = angle % (2.0 * std::f64::consts::PI);
    if a <= -std::f64::consts::PI {
        a += 2.0 * std::f64::consts::PI;
    }
    if a > std::f64::consts::PI {
        a -= 2.0 * std::f64::consts::PI;
    }
    a
}

/// A point + direction + normal sample along a polyline.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Sample {
    pub point: Point,
    pub dir: Point,
    pub nrm: Point,
}

/// Midpoint of an edge, honoring an existing bulge (the arc's midpoint).
pub fn edge_midpoint(a: Point, b: Point, bulge: f64) -> Point {
    if bulge != 0.0 {
        if let Some(arc) = bulge_to_arc(a, b, bulge) {
            return arc.mid;
        }
    }
    Point::new((a.x + b.x) / 2.0, (a.y + b.y) / 2.0)
}

/// The bulge that makes edge a→b pass through `cursor` at its midpoint.
pub fn bulge_through_cursor(a: Point, b: Point, cursor: Point) -> f64 {
    let d = subtract(b, a);
    let len = length(d);
    if len < 1e-6 {
        return 0.0;
    }
    let edge = normalize(d);
    let normal = Point::new(-edge.y, edge.x);
    let mid = scale(add(a, b), 0.5);
    let off = dot(subtract(cursor, mid), normal);
    (2.0 * off) / len
}

/// Evenly-spaced samples (point + direction + normal) along a polyline.
pub fn sample_along(pts: &[Point], spacing: f64) -> Vec<Sample> {
    let mut res = Vec::new();
    if pts.len() < 2 {
        return res;
    }
    let mut seg_len = Vec::with_capacity(pts.len() - 1);
    let mut total = 0.0;
    for i in 1..pts.len() {
        let l = distance(pts[i], pts[i - 1]);
        seg_len.push(l);
        total += l;
    }
    let mut seg = 0usize;
    let mut seg_start = 0.0;
    let mut d = 0.0;
    while d <= total {
        while seg < seg_len.len() - 1 && d > seg_start + seg_len[seg] {
            seg_start += seg_len[seg];
            seg += 1;
        }
        let l = if seg_len[seg] != 0.0 {
            seg_len[seg]
        } else {
            1.0
        };
        let a = pts[seg];
        let b = pts[seg + 1];
        let t = ((d - seg_start) / l).clamp(0.0, 1.0);
        let dir = Point::new((b.x - a.x) / l, (b.y - a.y) / l);
        res.push(Sample {
            point: Point::new(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t),
            dir,
            nrm: Point::new(-dir.y, dir.x),
        });
        d += spacing;
    }
    res
}

/// A fully-resolved circular arc between two boundary vertices.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Arc {
    pub center: Point,
    /// Radius (always positive), plan units.
    pub radius: f64,
    /// Included (central) angle magnitude, radians (0 < Δ < 2π).
    pub delta: f64,
    /// Signed swept angle start→end, radians; sign encodes CCW(+)/CW(−).
    pub sweep: f64,
    /// Chord length (straight distance between endpoints), plan units.
    pub chord_length: f64,
    /// Arc length = R·Δ, plan units.
    pub arc_length: f64,
    /// Tangent distance (PC/PT to PI) = R·tan(Δ/2); `Infinity` at Δ = π.
    pub tangent: f64,
    /// Mid-ordinate (chord-to-arc offset at midpoint) = R(1 − cos(Δ/2)).
    pub mid_ordinate: f64,
    /// The point at the middle of the arc.
    pub mid: Point,
    /// Whether the swept direction is counter-clockwise (`sweep > 0`).
    pub ccw: bool,
}

/// The bulge of edge `i`, or 0 (straight) when absent or non-finite.
pub fn edge_bulge(arcs: Option<&EdgeArcs>, i: usize) -> f64 {
    match arcs {
        None => 0.0,
        Some(map) => map
            .get(&i.to_string())
            .copied()
            .filter(|v| v.is_finite())
            .unwrap_or(0.0),
    }
}

/// Unit-normal to the chord direction (rotated +90°).
fn chord_normal(a: Point, b: Point, len: f64) -> Point {
    let diff = subtract(b, a);
    Point::new(-diff.y / len, diff.x / len)
}

/// Resolve the arc for edge `a`→`b` with the given `bulge`. Returns `None`
/// for a zero/degenerate bulge or a zero-length chord (treat those edges as
/// straight).
pub fn bulge_to_arc(a: Point, b: Point, bulge: f64) -> Option<Arc> {
    if !bulge.is_finite() || bulge.abs() < GEOMETRY_EPSILON {
        return None;
    }
    let chord_length = distance(a, b);
    if chord_length < GEOMETRY_EPSILON {
        return None;
    }

    let t = bulge.abs();
    let delta = 4.0 * t.atan(); // included angle magnitude
    let radius = (chord_length * (1.0 + t * t)) / (4.0 * t);
    let half_chord = chord_length / 2.0;

    let n = chord_normal(a, b, chord_length);
    let bulge_dir = scale(n, js_sign(bulge));
    let mid_ordinate = radius * (1.0 - (delta / 2.0).cos());
    let chord_mid = scale(add(a, b), 0.5);
    let mid = add(chord_mid, scale(bulge_dir, mid_ordinate));

    // Center lies on the perpendicular bisector; the apothem flips side
    // between a minor arc (|b|<1) and a major arc (|b|>1).
    let apothem = (radius * radius - half_chord * half_chord).max(0.0).sqrt();
    let center_dir = -js_sign(bulge) * js_sign(1.0 - t * t);
    let center = add(chord_mid, scale(n, center_dir * apothem));

    // Sweep direction is fixed by the mid-arc point (which lies on the arc).
    let ang_a = (a.y - center.y).atan2(a.x - center.x);
    let ang_m = (mid.y - center.y).atan2(mid.x - center.x);
    let step_to_mid = normalize_signed(ang_m - ang_a);
    let sweep = js_sign(step_to_mid) * delta;

    Some(Arc {
        center,
        radius,
        delta,
        sweep,
        chord_length,
        arc_length: radius * delta,
        tangent: if (delta - std::f64::consts::PI).abs() < GEOMETRY_EPSILON {
            f64::INFINITY
        } else {
            radius * (delta / 2.0).tan()
        },
        mid_ordinate,
        mid,
        ccw: sweep > 0.0,
    })
}

/// Signed area contribution of edge `a`→`b` when it is `arc`, via Green's
/// theorem: `½·[Cx(by − ay) − Cy(bx − ax) + R²·sweep]`. Summed with the
/// shoelace terms of straight edges, this gives the exact signed area of a
/// ring that mixes lines and arcs.
pub fn arc_area_term(a: Point, b: Point, arc: &Arc) -> f64 {
    0.5 * (arc.center.x * (b.y - a.y) - arc.center.y * (b.x - a.x)
        + arc.radius * arc.radius * arc.sweep)
}

/// Tessellate the arc `a`→`b` (bulge) into points, at roughly `deg_per_step`
/// spacing (the TS default was 2°; callers here must pass it explicitly).
/// Returns the intermediate points **excluding both endpoints**, ready to
/// splice between the ring vertices.
pub fn densify_arc(a: Point, b: Point, bulge: f64, deg_per_step: f64) -> Vec<Point> {
    let arc = match bulge_to_arc(a, b, bulge) {
        Some(arc) => arc,
        None => return Vec::new(),
    };
    let steps = (((arc.delta * (180.0 / std::f64::consts::PI)) / deg_per_step).ceil() as i64).max(2)
        as usize;
    let ang_a = (a.y - arc.center.y).atan2(a.x - arc.center.x);
    let mut points = Vec::with_capacity(steps.saturating_sub(1));
    for i in 1..steps {
        let ang = ang_a + (arc.sweep * i as f64) / steps as f64;
        points.push(Point::new(
            arc.center.x + arc.radius * ang.cos(),
            arc.center.y + arc.radius * ang.sin(),
        ));
    }
    points
}

/// An edge of a boundary ring: a straight line, or a resolved circular arc.
#[derive(Debug, Clone, Copy)]
pub struct BoundaryEdge {
    pub index: usize,
    pub from: Point,
    pub to: Point,
    pub bulge: f64,
    /// Resolved arc when the edge is curved; `None` when straight.
    pub arc: Option<Arc>,
}

/// The ordered edges of a ring, each tagged straight or arc.
pub fn boundary_edges(boundary: &[Point], arcs: Option<&EdgeArcs>) -> Vec<BoundaryEdge> {
    let n = boundary.len();
    let mut edges = Vec::with_capacity(n);
    for i in 0..n {
        let from = boundary[i];
        let to = boundary[(i + 1) % n];
        let bulge = edge_bulge(arcs, i);
        let arc = if bulge != 0.0 {
            bulge_to_arc(from, to, bulge)
        } else {
            None
        };
        edges.push(BoundaryEdge {
            index: i,
            from,
            to,
            bulge,
            arc,
        });
    }
    edges
}

/// `true` if any edge of the ring is a circular arc.
pub fn has_arcs(boundary: &[Point], arcs: Option<&EdgeArcs>) -> bool {
    match arcs {
        None => false,
        Some(_) => boundary_edges(boundary, arcs)
            .iter()
            .any(|e| e.arc.is_some()),
    }
}

/// The ring densified into a plain polygon, with every arc tessellated.
/// Used for rendering, hit-testing, and any consumer that needs straight
/// segments. When the ring has no arcs, returns a copy of the original
/// vertices.
pub fn densify_boundary(boundary: &[Point], arcs: Option<&EdgeArcs>, deg_per_step: f64) -> Polygon {
    match arcs {
        None => boundary.to_vec(),
        Some(_) => {
            let mut out = Vec::new();
            for edge in boundary_edges(boundary, arcs) {
                out.push(edge.from);
                if edge.arc.is_some() {
                    out.extend(densify_arc(edge.from, edge.to, edge.bulge, deg_per_step));
                }
            }
            out
        }
    }
}

/// Exact area of a ring that may mix straight and arc edges, plan units².
pub fn boundary_area(boundary: &[Point], arcs: Option<&EdgeArcs>) -> f64 {
    let n = boundary.len();
    if n < 3 {
        return 0.0;
    }
    let mut signed = 0.0;
    for edge in boundary_edges(boundary, arcs) {
        signed += match &edge.arc {
            Some(arc) => arc_area_term(edge.from, edge.to, arc),
            None => (edge.from.x * edge.to.y - edge.to.x * edge.from.y) / 2.0,
        };
    }
    signed.abs()
}

/// Exact perimeter of a ring that may mix straight and arc edges, plan units.
pub fn boundary_perimeter(boundary: &[Point], arcs: Option<&EdgeArcs>) -> f64 {
    let mut total = 0.0;
    for edge in boundary_edges(boundary, arcs) {
        total += match &edge.arc {
            Some(arc) => arc.arc_length,
            None => distance(edge.from, edge.to),
        };
    }
    total
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn bulge_of_one_is_a_semicircle() {
        let a = Point::new(0.0, 0.0);
        let b = Point::new(100.0, 0.0);
        let arc = bulge_to_arc(a, b, 1.0).expect("semicircle bulge resolves");
        assert_relative_eq!(arc.radius, 50.0, epsilon = 1e-9);
        assert_relative_eq!(arc.delta, std::f64::consts::PI, epsilon = 1e-9);
        assert_relative_eq!(arc.arc_length, std::f64::consts::PI * 50.0, epsilon = 1e-9);
        assert!(arc.tangent.is_infinite());
    }

    #[test]
    fn zero_bulge_is_a_straight_edge() {
        assert!(bulge_to_arc(Point::new(0.0, 0.0), Point::new(10.0, 0.0), 0.0).is_none());
    }

    #[test]
    fn zero_length_chord_has_no_arc_even_with_a_bulge() {
        let p = Point::new(5.0, 5.0);
        assert!(bulge_to_arc(p, p, 0.5).is_none());
    }

    #[test]
    fn non_finite_bulge_is_treated_as_straight() {
        assert!(bulge_to_arc(Point::new(0.0, 0.0), Point::new(10.0, 0.0), f64::NAN).is_none());
        assert!(bulge_to_arc(Point::new(0.0, 0.0), Point::new(10.0, 0.0), f64::INFINITY).is_none());
    }

    #[test]
    fn boundary_area_of_a_square_with_no_arcs_matches_shoelace() {
        let square: Polygon = vec![
            Point::new(0.0, 0.0),
            Point::new(10.0, 0.0),
            Point::new(10.0, 10.0),
            Point::new(0.0, 10.0),
        ];
        assert_relative_eq!(boundary_area(&square, None), 100.0, epsilon = 1e-9);
        assert_relative_eq!(boundary_perimeter(&square, None), 40.0, epsilon = 1e-9);
    }

    #[test]
    fn boundary_edges_reports_bulge_zero_for_missing_map_entries() {
        let square: Polygon = vec![
            Point::new(0.0, 0.0),
            Point::new(10.0, 0.0),
            Point::new(10.0, 10.0),
            Point::new(0.0, 10.0),
        ];
        let mut arcs = EdgeArcs::new();
        arcs.insert("2".to_string(), 0.3);
        let edges = boundary_edges(&square, Some(&arcs));
        assert!(edges[0].arc.is_none());
        assert!(edges[1].arc.is_none());
        assert!(edges[2].arc.is_some());
        assert!(edges[3].arc.is_none());
    }

    #[test]
    fn densify_arc_of_a_straight_edge_yields_no_points() {
        assert!(densify_arc(Point::new(0.0, 0.0), Point::new(10.0, 0.0), 0.0, 2.0).is_empty());
    }
}
