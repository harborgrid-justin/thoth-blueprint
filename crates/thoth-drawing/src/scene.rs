//! The render-agnostic **sheet scene** — an intermediate list of drawing
//! primitives, all in PostScript **points** (1/72"), origin top-left, y-down.
//! A sheet is built once into `SheetPrimitive[]`, then rendered two ways from
//! the same data: to SVG and to a vector PDF page. Because both consume this
//! IR, the on-screen sheet and the exported PDF are identical — per
//! `docs/ARCHITECTURE.md`'s render-agnostic intermediate representation.
//!
//! Port of `packages/domain/src/drawing/scene.ts`.

use crate::error::DrawingError;
use crate::hatch::HatchPattern;

/// A point in sheet space (points).
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct Pt {
    pub x: f64,
    pub y: f64,
}

impl Pt {
    pub const fn new(x: f64, y: f64) -> Self {
        Pt { x, y }
    }
}

/// Text anchor (horizontal alignment relative to `at`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TextAnchor {
    Start,
    Middle,
    End,
}

/// A drawing primitive on a sheet, in points.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(tag = "t")]
pub enum SheetPrimitive {
    #[serde(rename = "line")]
    Line {
        a: Pt,
        b: Pt,
        w: Option<f64>,
        color: Option<String>,
        dash: Option<Vec<f64>>,
    },
    #[serde(rename = "polyline")]
    Polyline {
        pts: Vec<Pt>,
        w: Option<f64>,
        color: Option<String>,
        dash: Option<Vec<f64>>,
        close: Option<bool>,
    },
    #[serde(rename = "polygon")]
    Polygon {
        pts: Vec<Pt>,
        w: Option<f64>,
        stroke: Option<String>,
        fill: Option<String>,
        fill_opacity: Option<f64>,
        dash: Option<Vec<f64>>,
    },
    #[serde(rename = "rect")]
    Rect {
        x: f64,
        y: f64,
        w: f64,
        h: f64,
        sw: Option<f64>,
        stroke: Option<String>,
        fill: Option<String>,
        fill_opacity: Option<f64>,
        dash: Option<Vec<f64>>,
    },
    #[serde(rename = "circle")]
    Circle {
        c: Pt,
        r: f64,
        sw: Option<f64>,
        stroke: Option<String>,
        fill: Option<String>,
        fill_opacity: Option<f64>,
    },
    #[serde(rename = "text")]
    Text {
        at: Pt,
        text: String,
        size: f64,
        color: Option<String>,
        anchor: Option<TextAnchor>,
        weight: Option<f64>,
        angle: Option<f64>,
        #[serde(rename = "mono")]
        monospace: Option<bool>,
    },
}

/// Points per inch / per millimetre.
pub const PT_PER_IN: f64 = 72.0;
pub const PT_PER_MM: f64 = 72.0 / 25.4;

/// Convert a millimetre paper measure to points.
pub fn mm_to_pt(mm: f64) -> f64 {
    mm * PT_PER_MM
}

/// Convert a paper measure in the sheet's unit (in/mm) to points.
pub fn paper_to_points_for_sheet(value: f64, unit: crate::sheetsize::PaperUnit) -> f64 {
    match unit {
        crate::sheetsize::PaperUnit::In => value * PT_PER_IN,
        crate::sheetsize::PaperUnit::Mm => value * PT_PER_MM,
    }
}

/// Standard ink colours.
pub const INK: &str = "#0f172a";
pub const MUTED: &str = "#475569";
pub const LIGHT: &str = "#94a3b8";
pub const SHEET_WHITE: &str = "#ffffff";

/// A group of primitives with a display name (a "band" of the sheet).
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct SheetBand {
    pub name: String,
    pub prims: Vec<SheetPrimitive>,
}

/// Flatten bands to a single primitive list in order.
pub fn flatten_bands(bands: Vec<SheetBand>) -> Vec<SheetPrimitive> {
    bands.into_iter().flat_map(|b| b.prims).collect()
}

// --- geometry helpers for builders -----------------------------------------

/// Test whether a point is inside a polygon (even-odd), points in sheet space.
fn point_in_poly(p: Pt, poly: &[Pt]) -> bool {
    let n = poly.len();
    if n == 0 {
        return false;
    }
    let mut inside = false;
    let mut j = n - 1;
    for i in 0..n {
        let a = poly[i];
        let b = poly[j];
        if (a.y > p.y) != (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x {
            inside = !inside;
        }
        j = i;
    }
    inside
}

/// Clip a set of parallel hatch lines to a polygon, returning inside spans as
/// line primitives. Produces true vector hatch shared by SVG and PDF.
///
/// Errors with [`DrawingError::DegeneratePolygon`] for fewer than 3 vertices,
/// or [`DrawingError::MalformedHatchPattern`] for a non-positive/non-finite
/// `spacing`. The TS original silently returns `[]` for a short polygon, and
/// would loop forever (hang) for non-positive spacing, stepping
/// `x += spacing` without ever crossing `maxX`; this port makes both cases an
/// explicit, typed error instead.
pub fn hatch_lines(
    poly: &[Pt],
    pattern: &HatchPattern,
) -> Result<Vec<SheetPrimitive>, DrawingError> {
    if poly.len() < 3 {
        return Err(DrawingError::DegeneratePolygon(poly.len()));
    }
    let spacing = mm_to_pt(pattern.spacing);
    if !spacing.is_finite() || spacing <= 0.0 {
        return Err(DrawingError::MalformedHatchPattern {
            pattern_id: pattern.id.clone(),
            spacing,
        });
    }
    let color = pattern.color.clone().unwrap_or_else(|| MUTED.to_string());
    let w = 0.4;
    let angle = pattern.angle_deg.to_radians();
    let dirs: Vec<f64> = if matches!(
        pattern.kind,
        crate::hatch::HatchKind::Crosshatch | crate::hatch::HatchKind::Grid
    ) {
        vec![angle, angle + std::f64::consts::FRAC_PI_2]
    } else {
        vec![angle]
    };

    let xs: Vec<f64> = poly.iter().map(|p| p.x).collect();
    let ys: Vec<f64> = poly.iter().map(|p| p.y).collect();
    let min_x = xs.iter().cloned().fold(f64::INFINITY, f64::min);
    let max_x = xs.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let min_y = ys.iter().cloned().fold(f64::INFINITY, f64::min);
    let max_y = ys.iter().cloned().fold(f64::NEG_INFINITY, f64::max);

    if matches!(pattern.kind, crate::hatch::HatchKind::Dots) {
        let mut out = Vec::new();
        let mut y = min_y;
        while y <= max_y {
            let mut x = min_x;
            while x <= max_x {
                let p = Pt::new(x, y);
                if point_in_poly(p, poly) {
                    out.push(SheetPrimitive::Circle {
                        c: p,
                        r: 0.5,
                        sw: None,
                        stroke: None,
                        fill: Some(color.clone()),
                        fill_opacity: None,
                    });
                }
                x += spacing;
            }
            y += spacing;
        }
        return Ok(out);
    }

    let mut out = Vec::new();
    let diag = (max_x - min_x).hypot(max_y - min_y);
    let cx = (min_x + max_x) / 2.0;
    let cy = (min_y + max_y) / 2.0;
    for a in dirs {
        let dx = a.cos();
        let dy = a.sin();
        // Normal to the line direction; step lines along it.
        let nx = -dy;
        let ny = dx;
        let steps = (diag / spacing).ceil() as i64 + 2;
        for k in -steps..=steps {
            let ox = cx + nx * k as f64 * spacing;
            let oy = cy + ny * k as f64 * spacing;
            // Line: (ox,oy) + t*(dx,dy). Find intersections with polygon edges.
            let mut hits: Vec<f64> = Vec::new();
            let n = poly.len();
            for i in 0..n {
                let p1 = poly[i];
                let p2 = poly[(i + 1) % n];
                let ex = p2.x - p1.x;
                let ey = p2.y - p1.y;
                let denom = dx * ey - dy * ex;
                if denom.abs() < 1e-9 {
                    continue;
                }
                let t = ((p1.x - ox) * ey - (p1.y - oy) * ex) / denom;
                let u = ((p1.x - ox) * dy - (p1.y - oy) * dx) / denom;
                if (0.0..=1.0).contains(&u) {
                    hits.push(t);
                }
            }
            hits.sort_by(|m, n| m.partial_cmp(n).unwrap_or(std::cmp::Ordering::Equal));
            let mut i = 0;
            while i + 1 < hits.len() {
                let t1 = hits[i];
                let t2 = hits[i + 1];
                out.push(SheetPrimitive::Line {
                    a: Pt::new(ox + dx * t1, oy + dy * t1),
                    b: Pt::new(ox + dx * t2, oy + dy * t2),
                    w: Some(w),
                    color: Some(color.clone()),
                    dash: None,
                });
                i += 2;
            }
        }
    }
    Ok(out)
}

/// A filled arrowhead (triangle) at `at` pointing along unit `dir`, size in pt.
pub fn arrow_head(at: Pt, dir: Pt, size: f64, color: Option<&str>) -> SheetPrimitive {
    let color = color.unwrap_or(INK).to_string();
    let nx = -dir.y;
    let ny = dir.x;
    let base = Pt::new(at.x - dir.x * size, at.y - dir.y * size);
    SheetPrimitive::Polygon {
        pts: vec![
            at,
            Pt::new(base.x + nx * size * 0.35, base.y + ny * size * 0.35),
            Pt::new(base.x - nx * size * 0.35, base.y - ny * size * 0.35),
        ],
        w: Some(0.3),
        stroke: Some(color.clone()),
        fill: Some(color),
        fill_opacity: None,
        dash: None,
    }
}

/// A 45 degree architectural dimension tick at `at`, size in pt.
pub fn dim_tick(at: Pt, dir: Pt, size: f64, color: Option<&str>) -> SheetPrimitive {
    let color = color.unwrap_or(INK).to_string();
    let a = dir.y.atan2(dir.x) + std::f64::consts::FRAC_PI_4;
    let ex = a.cos() * size;
    let ey = a.sin() * size;
    SheetPrimitive::Line {
        a: Pt::new(at.x - ex, at.y - ey),
        b: Pt::new(at.x + ex, at.y + ey),
        w: Some(0.7),
        color: Some(color),
        dash: None,
    }
}

/// A north arrow (points primitives) centred at `at`, height `h` pt.
pub fn north_arrow(at: Pt, h: f64) -> Vec<SheetPrimitive> {
    vec![
        SheetPrimitive::Line {
            a: Pt::new(at.x, at.y + h),
            b: Pt::new(at.x, at.y),
            w: Some(1.0),
            color: Some(INK.to_string()),
            dash: None,
        },
        SheetPrimitive::Polygon {
            pts: vec![
                Pt::new(at.x, at.y),
                Pt::new(at.x + h * 0.16, at.y + h * 0.4),
                Pt::new(at.x, at.y + h * 0.28),
                Pt::new(at.x - h * 0.16, at.y + h * 0.4),
            ],
            w: Some(0.3),
            stroke: Some(INK.to_string()),
            fill: Some(INK.to_string()),
            fill_opacity: None,
            dash: None,
        },
        SheetPrimitive::Text {
            at: Pt::new(at.x, at.y - 3.0),
            text: "N".to_string(),
            size: h * 0.38,
            color: Some(INK.to_string()),
            anchor: Some(TextAnchor::Middle),
            weight: Some(700.0),
            angle: None,
            monospace: None,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::hatch::hatch_pattern;

    fn square(side: f64) -> Vec<Pt> {
        vec![
            Pt::new(0.0, 0.0),
            Pt::new(side, 0.0),
            Pt::new(side, side),
            Pt::new(0.0, side),
        ]
    }

    #[test]
    fn flatten_bands_concatenates_in_order() {
        let bands = vec![
            SheetBand {
                name: "a".to_string(),
                prims: vec![north_arrow(Pt::new(0.0, 0.0), 1.0)[0].clone()],
            },
            SheetBand {
                name: "b".to_string(),
                prims: vec![north_arrow(Pt::new(1.0, 1.0), 1.0)[0].clone()],
            },
        ];
        assert_eq!(flatten_bands(bands).len(), 2);
    }

    #[test]
    fn hatch_lines_rejects_degenerate_polygon() {
        let pattern = hatch_pattern("concrete").unwrap();
        let err = hatch_lines(&[Pt::new(0.0, 0.0), Pt::new(1.0, 1.0)], &pattern).unwrap_err();
        assert_eq!(err, DrawingError::DegeneratePolygon(2));
    }

    #[test]
    fn hatch_lines_rejects_non_positive_spacing() {
        let mut pattern = hatch_pattern("concrete").unwrap();
        pattern.spacing = 0.0;
        let err = hatch_lines(&square(10.0), &pattern).unwrap_err();
        assert!(matches!(err, DrawingError::MalformedHatchPattern { .. }));
    }

    #[test]
    fn hatch_lines_produces_line_segments_for_a_line_pattern() {
        let pattern = hatch_pattern("earth").unwrap();
        let lines = hatch_lines(&square(20.0), &pattern).unwrap();
        assert!(!lines.is_empty());
        assert!(lines
            .iter()
            .all(|p| matches!(p, SheetPrimitive::Line { .. })));
    }

    #[test]
    fn hatch_lines_produces_circles_for_a_dot_pattern() {
        let pattern = hatch_pattern("concrete").unwrap();
        let dots = hatch_lines(&square(10.0), &pattern).unwrap();
        assert!(!dots.is_empty());
        assert!(dots
            .iter()
            .all(|p| matches!(p, SheetPrimitive::Circle { .. })));
    }

    #[test]
    fn hatch_lines_crosshatch_uses_two_directions() {
        let mut pattern = hatch_pattern("ansi37").unwrap();
        pattern.spacing = 5.0;
        let single_dir = hatch_lines(&square(20.0), &{
            let mut p = pattern.clone();
            p.kind = crate::hatch::HatchKind::Lines;
            p
        })
        .unwrap();
        let crossed = hatch_lines(&square(20.0), &pattern).unwrap();
        // Crosshatch (two directions) should produce at least as many segments
        // as a single-direction pattern with the same spacing/bounds.
        assert!(crossed.len() >= single_dir.len());
    }

    #[test]
    fn arrow_head_and_dim_tick_and_north_arrow_produce_primitives() {
        assert!(matches!(
            arrow_head(Pt::new(0.0, 0.0), Pt::new(1.0, 0.0), 4.0, None),
            SheetPrimitive::Polygon { .. }
        ));
        assert!(matches!(
            dim_tick(Pt::new(0.0, 0.0), Pt::new(1.0, 0.0), 3.0, None),
            SheetPrimitive::Line { .. }
        ));
        assert_eq!(north_arrow(Pt::new(0.0, 0.0), 30.0).len(), 3);
    }
}
