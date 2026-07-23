//! Circular-arc geometry for boundaries: exact area/perimeter of a ring whose
//! edges may be either straight lines or circular arcs.
//!
//! **Gap notice** (see `crates/thoth-planning/GAPS.md`): this is a port of
//! `packages/domain/src/spatial/curve.ts`, which conceptually belongs beside
//! `thoth_spatial::geometry` (it is the curved-edge counterpart of the plain
//! polygon ops there) but was not included in `thoth-spatial`'s ported
//! surface. Rather than edit the frozen `thoth-spatial` crate, the minimum
//! subset that `metrics.rs` and `renovation.rs` need — exact area and
//! perimeter of a boundary that mixes straight and arc edges, honoring the
//! DXF/LandXML "bulge" convention — is reimplemented locally here.
//!
//! Arcs are encoded per edge as a **bulge** (`bulge = tan(Δ / 4)`, where Δ is
//! the arc's included angle); a bulge of 0 is a straight line. All math is
//! analytic and exact — no tessellation.

use thoth_spatial::{add, distance, scale, subtract, Point, Polygon};

/// A resolved circular arc for one boundary edge.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Arc {
    pub center: Point,
    /// Radius (always positive), plan units.
    pub radius: f64,
    /// Included (central) angle magnitude, radians (0 < Δ < 2π).
    pub delta: f64,
    /// Signed swept angle start→end, radians; sign encodes CCW(+)/CW(−).
    pub sweep: f64,
}

/// Edge-arc bulge mappings keyed by vertex index (matches
/// `thoth_spatial::EdgeArcs`'s string-keyed wire format).
pub type EdgeArcs = std::collections::BTreeMap<String, f64>;

/// The bulge of edge `i`, or 0 (straight) when absent or non-finite.
fn edge_bulge(arcs: Option<&EdgeArcs>, i: usize) -> f64 {
    let Some(arcs) = arcs else {
        return 0.0;
    };
    match arcs.get(&i.to_string()) {
        Some(b) if b.is_finite() => *b,
        _ => 0.0,
    }
}

/// Unit-normal to the chord direction (rotated +90°).
fn chord_normal(a: Point, b: Point, len: f64) -> Point {
    let diff = subtract(b, a);
    Point::new(-diff.y / len, diff.x / len)
}

const GEOMETRY_EPSILON: f64 = thoth_spatial::GEOMETRY_EPSILON;

/// Resolve the arc for edge `a`→`b` with the given `bulge`. Returns `None` for
/// a zero/degenerate bulge or a zero-length chord (those edges are straight).
pub fn bulge_to_arc(a: Point, b: Point, bulge: f64) -> Option<Arc> {
    if !bulge.is_finite() || bulge.abs() < GEOMETRY_EPSILON {
        return None;
    }
    let chord_length = distance(a, b);
    if chord_length < GEOMETRY_EPSILON {
        return None;
    }

    let t = bulge.abs();
    let delta = 4.0 * t.atan();
    let radius = (chord_length * (1.0 + t * t)) / (4.0 * t);
    let half_chord = chord_length / 2.0;

    let n = chord_normal(a, b, chord_length);
    let bulge_dir = scale(n, bulge.signum());
    let mid_ordinate = radius * (1.0 - (delta / 2.0).cos());
    let chord_mid = scale(add(a, b), 0.5);
    let mid = add(chord_mid, scale(bulge_dir, mid_ordinate));

    // Center lies on the perpendicular bisector; the apothem flips side
    // between a minor arc (|b|<1) and a major arc (|b|>1).
    let apothem = (radius * radius - half_chord * half_chord).max(0.0).sqrt();
    let center_dir = -bulge.signum() * (1.0 - t * t).signum();
    let center = add(chord_mid, scale(n, center_dir * apothem));

    // Sweep direction is fixed by the mid-arc point (which lies on the arc).
    let ang_a = (a.y - center.y).atan2(a.x - center.x);
    let ang_m = (mid.y - center.y).atan2(mid.x - center.x);
    let step_to_mid = normalize_signed(ang_m - ang_a);
    let sweep = step_to_mid.signum() * delta;

    Some(Arc {
        center,
        radius,
        delta,
        sweep,
    })
}

/// Normalize an angle to (−π, π].
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

/// Signed area contribution of edge `a`→`b` when it is the arc `arc`, via
/// Green's theorem. Summed with the shoelace terms of straight edges, this
/// gives the exact signed area of a ring that mixes lines and arcs.
fn arc_area_term(a: Point, b: Point, arc: &Arc) -> f64 {
    0.5 * (arc.center.x * (b.y - a.y) - arc.center.y * (b.x - a.x)
        + arc.radius * arc.radius * arc.sweep)
}

/// Exact area of a ring that may mix straight and arc edges, plan units².
/// Falls back to the plain shoelace area when `arcs` is `None`/empty.
pub fn boundary_area(boundary: &Polygon, arcs: Option<&EdgeArcs>) -> f64 {
    let n = boundary.len();
    if n < 3 {
        return 0.0;
    }
    let mut signed = 0.0;
    for i in 0..n {
        let a = boundary[i];
        let b = boundary[(i + 1) % n];
        let bulge = edge_bulge(arcs, i);
        signed += match bulge_to_arc(a, b, bulge) {
            Some(arc) => arc_area_term(a, b, &arc),
            None => (a.x * b.y - b.x * a.y) / 2.0,
        };
    }
    signed.abs()
}

/// Exact perimeter of a ring that may mix straight and arc edges, plan units.
pub fn boundary_perimeter(boundary: &Polygon, arcs: Option<&EdgeArcs>) -> f64 {
    let n = boundary.len();
    if n < 2 {
        return 0.0;
    }
    let mut total = 0.0;
    for i in 0..n {
        let a = boundary[i];
        let b = boundary[(i + 1) % n];
        let bulge = edge_bulge(arcs, i);
        total += match bulge_to_arc(a, b, bulge) {
            Some(arc) => arc.radius * arc.delta,
            None => distance(a, b),
        };
    }
    total
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
    fn boundary_area_matches_plain_area_without_arcs() {
        assert_relative_eq!(boundary_area(&square(10.0), None), 100.0, epsilon = 1e-9);
    }

    #[test]
    fn boundary_area_of_semicircle_bulge_matches_known_radius() {
        // A unit square's first edge bulged to a semicircle (bulge = 1 => Δ=π)
        // should yield the arc's radius = half the chord length.
        let square = square(100.0);
        let mut arcs = EdgeArcs::new();
        arcs.insert("0".to_string(), -1.0);
        let arc = bulge_to_arc(square[0], square[1], -1.0).expect("semicircle arc");
        assert_relative_eq!(arc.radius, 50.0, epsilon = 1e-6);
    }

    #[test]
    fn boundary_perimeter_without_arcs_matches_plain_perimeter() {
        assert_relative_eq!(
            boundary_perimeter(&square(10.0), None),
            40.0,
            epsilon = 1e-9
        );
    }

    #[test]
    fn zero_bulge_is_treated_as_straight() {
        let mut arcs = EdgeArcs::new();
        arcs.insert("0".to_string(), 0.0);
        assert_relative_eq!(
            boundary_area(&square(10.0), Some(&arcs)),
            100.0,
            epsilon = 1e-9
        );
    }
}
