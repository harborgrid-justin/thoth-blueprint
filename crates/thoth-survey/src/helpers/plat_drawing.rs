//! Plat-sheet drawing layout math: sheet/margin geometry, a boundary-fitting
//! viewport projection, and small drafting-annotation helpers (nice tick
//! numbers, screen-space offsets, outward normals). Direct port of
//! `packages/domain/src/survey/helpers/platDrawingHelpers.ts`.

use thoth_spatial::{add, bounds, dot, normalize, scale, subtract, Point};

/// Ink color for plat-sheet linework.
pub const INK: &str = "#0f172a";
/// Muted ink color for secondary plat-sheet text.
pub const INK_MUTED: &str = "#475569";
/// Sheet background color.
pub const SHEET: &str = "#ffffff";

/// Sheet width, px.
pub const W: f64 = 800.0;
/// Sheet height, px.
pub const H: f64 = 620.0;

/// Sheet margins, px.
pub const MARGIN_LEFT: f64 = 76.0;
pub const MARGIN_RIGHT: f64 = 76.0;
pub const MARGIN_TOP: f64 = 58.0;
pub const MARGIN_BOTTOM: f64 = 128.0;

/// Drawable content width, px.
pub const CW: f64 = W - MARGIN_LEFT - MARGIN_RIGHT;
/// Drawable content height, px.
pub const CH: f64 = H - MARGIN_TOP - MARGIN_BOTTOM;

/// Snap `value` to the nearest 1/2/5 × 10^n scale-bar tick step (e.g. 37 →
/// 20, 4 → 5, 1.5 → 2) — the classic "nice number" ticked-axis heuristic.
/// This is a *nearest* step, not a ceiling: 37 snaps down to 20, not up to
/// 50, since 3.7 (37's leading-digit ratio) is closer to the 2-step than
/// the 5-step. Non-positive input returns `1`.
pub fn nice_number(value: f64) -> f64 {
    if value <= 0.0 {
        return 1.0;
    }
    let mag = 10f64.powf(value.log10().floor());
    let r = value / mag;
    (if r >= 5.0 {
        5.0
    } else if r >= 2.0 {
        2.0
    } else {
        1.0
    }) * mag
}

/// A viewport that maps plan-space points into sheet pixel space, fitted to
/// a boundary's extent with uniform scale (no distortion) and centered
/// within the drawable content area.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct View {
    pub scale_px: f64,
    offset_x: f64,
    offset_y: f64,
}

impl View {
    /// Project a plan-space point into sheet pixel space.
    pub fn project(&self, p: Point) -> Point {
        Point::new(
            p.x * self.scale_px + self.offset_x,
            p.y * self.scale_px + self.offset_y,
        )
    }
}

/// Build a [`View`] fitted to `boundary`'s extent. Returns `None` for fewer
/// than 3 points (nothing to fit a viewport to).
pub fn build_view(boundary: &[Point]) -> Option<View> {
    if boundary.len() < 3 {
        return None;
    }
    let bb = bounds(boundary);
    let bw = (bb.max_x - bb.min_x).max(1e-6);
    let bh = (bb.max_y - bb.min_y).max(1e-6);
    let scale_px = (CW / bw).min(CH / bh);
    let offset_x = MARGIN_LEFT + (CW - bw * scale_px) / 2.0 - bb.min_x * scale_px;
    let offset_y = MARGIN_TOP + (CH - bh * scale_px) / 2.0 - bb.min_y * scale_px;
    Some(View {
        scale_px,
        offset_x,
        offset_y,
    })
}

/// Format a screen-space point as `"x.x,y.y"` for an SVG points list.
pub fn screen_pair(p: Point) -> String {
    format!("{:.1},{:.1}", p.x, p.y)
}

/// Offset a point by `px` along direction `dir`.
pub fn offset(p: Point, dir: Point, px: f64) -> Point {
    add(p, scale(dir, px))
}

/// The unit normal of edge `a`→`b`, flipped to point away from interior
/// reference point `c`.
pub fn outward_normal(a: Point, b: Point, c: Point) -> Point {
    let e = normalize(subtract(b, a));
    let mut nrm = Point::new(-e.y, e.x);
    let mid = scale(add(a, b), 0.5);
    if dot(nrm, subtract(mid, c)) < 0.0 {
        nrm = scale(nrm, -1.0);
    }
    nrm
}

/// A safe filename slug from a tract name, falling back to `"tract"` for an
/// empty/all-punctuation input (distinct from
/// `thoth_spatial::slugify`'s `"export"` fallback — this is the plat-sheet
/// variant, ported verbatim from the TS `slug` helper in this file).
pub fn slug(name: &str) -> String {
    let lower = name.to_lowercase();
    let mut out = String::with_capacity(lower.len());
    let mut last_was_dash = false;
    for c in lower.chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c);
            last_was_dash = false;
        } else if !last_was_dash {
            out.push('-');
            last_was_dash = true;
        }
    }
    let trimmed = out.trim_matches('-');
    if trimmed.is_empty() {
        "tract".to_string()
    } else {
        trimmed.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn nice_number_snaps_to_the_nearest_1_2_5_step() {
        assert_relative_eq!(nice_number(37.0), 20.0, epsilon = 1e-9);
        assert_relative_eq!(nice_number(4.0), 2.0, epsilon = 1e-9);
        assert_relative_eq!(nice_number(6.0), 5.0, epsilon = 1e-9);
        assert_relative_eq!(nice_number(1.5), 1.0, epsilon = 1e-9);
        assert_relative_eq!(nice_number(2.0), 2.0, epsilon = 1e-9);
        assert_relative_eq!(nice_number(999.0), 500.0, epsilon = 1e-9);
        assert_relative_eq!(nice_number(0.0), 1.0, epsilon = 1e-9);
        assert_relative_eq!(nice_number(-5.0), 1.0, epsilon = 1e-9);
    }

    #[test]
    fn build_view_centers_and_fits_a_square() {
        let square = vec![
            Point::new(0.0, 0.0),
            Point::new(100.0, 0.0),
            Point::new(100.0, 100.0),
            Point::new(0.0, 100.0),
        ];
        let view = build_view(&square).expect("3+ points builds a view");
        let projected_min = view.project(Point::new(0.0, 0.0));
        let projected_max = view.project(Point::new(100.0, 100.0));
        assert!(projected_min.x < projected_max.x);
        assert!(projected_min.y < projected_max.y);
    }

    #[test]
    fn build_view_returns_none_for_fewer_than_three_points() {
        assert!(build_view(&[Point::new(0.0, 0.0), Point::new(1.0, 1.0)]).is_none());
    }

    #[test]
    fn slug_falls_back_to_tract_not_export() {
        assert_eq!(slug("Main St. Parcel #12"), "main-st-parcel-12");
        assert_eq!(slug("---"), "tract");
        assert_eq!(slug(""), "tract");
    }
}
