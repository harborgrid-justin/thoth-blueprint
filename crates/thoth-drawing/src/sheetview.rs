//! Paper-space **viewports** and **view references**.
//!
//! A viewport is a rectangle on a sheet (paper units) that shows a region of
//! the model at a named scale. [`viewport_transform`] produces the
//! model->paper projection a renderer uses. View references (section /
//! elevation / detail marks and match lines) tie one sheet's cut to another
//! sheet's drawing.
//!
//! Coordinate convention follows the survey frame: north is -Y, so the
//! transform preserves the Y sense (north stays up) and never flips.
//!
//! Port of `packages/domain/src/drawing/sheetview.ts`. The TS original builds
//! its 2D affine transform with `gl-matrix`'s `mat2d`; this port computes the
//! same translate -> rotate -> scale -> translate composition directly with
//! `f64` trigonometry, which is exact for a single point transform and avoids
//! a dependency with no other use in this crate.

use thoth_spatial::{bounds_center, Bounds, Point};

use crate::common::units::paper_per_model;
use crate::error::DrawingError;
use crate::sheetsize::{PaperRect, PaperUnit};
use thoth_spatial::Unit;

/// The kind of drawing a viewport frames.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ViewKind {
    Plan,
    Detail,
    Section,
    Elevation,
    Schedule,
    Keymap,
    #[serde(rename = "3d")]
    ThreeD,
    Legend,
    Titleblock,
    Index,
}

/// A rectangular window on a sheet showing the model at a scale.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct SheetViewport {
    pub id: String,
    pub kind: ViewKind,
    /// The rectangle on the sheet, in the sheet's paper unit.
    pub sheet_rect: PaperRect,
    /// Named drawing scale id (from `crate::drafting`), or "as-shown" to fit.
    pub scale_id: String,
    /// Model point centred in the viewport.
    pub model_center: Point,
    /// Optional rotation of the view about `model_center`, degrees CW.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rotation_deg: Option<f64>,
    /// View number shown in the viewport title bubble (e.g. 3).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub view_number: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

/// A model->paper projection plus the resolved paper-units-per-model-unit scale.
pub struct ViewportTransform {
    project: Box<dyn Fn(Point) -> Point>,
    /// Paper units (the sheet's unit) per one model unit.
    pub scale_px: f64,
}

impl ViewportTransform {
    /// Project a model-space point into paper space.
    pub fn project(&self, p: Point) -> Point {
        (self.project)(p)
    }
}

/// A section-cut mark: a cut line with a bubble tag referencing another view.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct SectionMark {
    pub id: String,
    /// Tag shown in the bubble, e.g. "A" or "1".
    pub tag: String,
    /// The cut line in model space.
    pub at_line: [Point; 2],
    /// Direction the section looks (unit vector); defaults perpendicular to
    /// the cut.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gaze: Option<Point>,
    /// Sheet number the section is drawn on, e.g. "A-301".
    pub target_sheet: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_view: Option<u32>,
}

/// An interior/exterior elevation mark (a bubble with a pointing arrow).
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct ElevationMark {
    pub id: String,
    pub tag: String,
    pub position: Point,
    /// Direction the elevation faces (unit vector).
    pub gaze: Point,
    pub target_sheet: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_view: Option<u32>,
}

/// A detail callout: a boundary (circle/rect) around an area, tagged to a detail.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct DetailMark {
    pub id: String,
    pub tag: String,
    /// Centre of the callout in model space.
    pub center: Point,
    /// Callout radius in model units.
    pub radius: f64,
    pub target_sheet: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_view: Option<u32>,
}

/// A match line: where a plan continues on an adjoining sheet.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct MatchLine {
    pub id: String,
    pub at_line: [Point; 2],
    pub adjoining_sheet: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

/// The projection for a viewport at its named scale, centred on its model
/// centre. If `scale_id` is `"as-shown"`, use [`fit_viewport_transform`]
/// instead.
pub fn viewport_transform(
    vp: &SheetViewport,
    model_unit: Unit,
    paper_unit: PaperUnit,
) -> Result<ViewportTransform, DrawingError> {
    let s = paper_per_model(&vp.scale_id, model_unit, paper_unit)?;
    let cx = vp.sheet_rect.x + vp.sheet_rect.w / 2.0;
    let cy = vp.sheet_rect.y + vp.sheet_rect.h / 2.0;
    let rot = (vp.rotation_deg.unwrap_or(0.0)) * std::f64::consts::PI / 180.0;
    let (sin_r, cos_r) = rot.sin_cos();
    let model_center = vp.model_center;

    // translate(cx,cy) . rotate(rot) . scale(s,s) . translate(-model_center)
    let project = move |p: Point| -> Point {
        let dx = (p.x - model_center.x) * s;
        let dy = (p.y - model_center.y) * s;
        let rx = dx * cos_r - dy * sin_r;
        let ry = dx * sin_r + dy * cos_r;
        Point::new(cx + rx, cy + ry)
    };
    Ok(ViewportTransform {
        project: Box::new(project),
        scale_px: s,
    })
}

/// A projection that fits `model_bounds` into the viewport rect (ignoring the
/// named scale) — for key maps, index thumbnails, and "as-shown" windows.
pub fn fit_viewport_transform(
    rect: PaperRect,
    model_bounds: Bounds,
    pad: f64,
) -> ViewportTransform {
    let bw = (model_bounds.max_x - model_bounds.min_x).max(1e-6);
    let bh = (model_bounds.max_y - model_bounds.min_y).max(1e-6);
    let iw = rect.w * (1.0 - pad * 2.0);
    let ih = rect.h * (1.0 - pad * 2.0);
    let s = (iw / bw).min(ih / bh);
    let c = bounds_center(model_bounds);
    let cx = rect.x + rect.w / 2.0;
    let cy = rect.y + rect.h / 2.0;
    let project = move |p: Point| Point::new(cx + (p.x - c.x) * s, cy + (p.y - c.y) * s);
    ViewportTransform {
        project: Box::new(project),
        scale_px: s,
    }
}

/// Pick the largest named scale from `candidates` at which `model_bounds`
/// still fits inside `rect`. Returns the first (largest-scale) that fits,
/// else the last (smallest-scale) candidate. Scale ids that fail to resolve
/// to a valid ratio (see [`paper_per_model`]) are skipped rather than
/// aborting the whole search.
pub fn fit_scale(
    candidates: &[String],
    model_bounds: Bounds,
    rect: PaperRect,
    model_unit: Unit,
    paper_unit: PaperUnit,
) -> Option<String> {
    if candidates.is_empty() {
        return None;
    }
    let bw = (model_bounds.max_x - model_bounds.min_x).max(1e-6);
    let bh = (model_bounds.max_y - model_bounds.min_y).max(1e-6);

    let mut resolved: Vec<(String, f64)> = candidates
        .iter()
        .filter_map(|id| {
            paper_per_model(id, model_unit, paper_unit)
                .ok()
                .map(|s| (id.clone(), s))
        })
        .collect();
    // Descending by paper-per-model ratio (largest drawing first), matching
    // the TS `orderBy(..., ["s"], ["desc"])`.
    resolved.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    for (id, s) in &resolved {
        if bw * s <= rect.w && bh * s <= rect.h {
            return Some(id.clone());
        }
    }
    resolved
        .last()
        .map(|(id, _)| id.clone())
        .or_else(|| candidates.first().cloned())
}

/// Unit perpendicular (left normal) of a directed segment, in the -Y-north
/// frame.
pub fn section_gaze(mark: &SectionMark) -> Point {
    if let Some(g) = mark.gaze {
        return g;
    }
    let [a, b] = mark.at_line;
    let vx = b.x - a.x;
    let vy = b.y - a.y;
    let len = vx.hypot(vy);
    let len = if len == 0.0 { 1.0 } else { len };
    Point::new(-vy / len, vx / len)
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn vp(
        scale_id: &str,
        rect: PaperRect,
        model_center: Point,
        rotation_deg: Option<f64>,
    ) -> SheetViewport {
        SheetViewport {
            id: "vp1".to_string(),
            kind: ViewKind::Plan,
            sheet_rect: rect,
            scale_id: scale_id.to_string(),
            model_center,
            rotation_deg,
            view_number: None,
            label: None,
        }
    }

    #[test]
    fn viewport_transform_centers_the_model_center_in_the_rect() {
        let rect = PaperRect {
            x: 10.0,
            y: 10.0,
            w: 20.0,
            h: 20.0,
        };
        let v = vp("1:1", rect, Point::new(5.0, 5.0), None);
        let t = viewport_transform(&v, Unit::Meters, PaperUnit::Mm).unwrap();
        let p = t.project(Point::new(5.0, 5.0));
        assert_relative_eq!(p.x, 20.0, epsilon = 1e-9);
        assert_relative_eq!(p.y, 20.0, epsilon = 1e-9);
    }

    #[test]
    fn viewport_transform_rotates_about_the_model_center() {
        let rect = PaperRect {
            x: 0.0,
            y: 0.0,
            w: 1000.0,
            h: 1000.0,
        };
        let v = vp("1:1", rect, Point::new(0.0, 0.0), Some(90.0));
        let t = viewport_transform(&v, Unit::Meters, PaperUnit::Mm).unwrap();
        let s = t.scale_px;
        // A point 10 model units +X from the model center should land
        // `10 * s` paper units +Y after a 90 degree CW rotation (screen
        // convention: y-down, so a positive-angle 2D rotation reads as CW).
        let p = t.project(Point::new(10.0, 0.0));
        assert_relative_eq!(p.x, 500.0, epsilon = 1e-6);
        assert_relative_eq!(p.y, 500.0 + 10.0 * s, epsilon = 1e-6);
    }

    #[test]
    fn fit_viewport_transform_fits_bounds_into_rect_with_padding() {
        let rect = PaperRect {
            x: 0.0,
            y: 0.0,
            w: 100.0,
            h: 100.0,
        };
        let bounds = Bounds {
            min_x: 0.0,
            min_y: 0.0,
            max_x: 10.0,
            max_y: 10.0,
        };
        let t = fit_viewport_transform(rect, bounds, 0.0);
        let p0 = t.project(Point::new(0.0, 0.0));
        let p1 = t.project(Point::new(10.0, 10.0));
        assert_relative_eq!(p1.x - p0.x, 100.0, epsilon = 1e-9);
        assert_relative_eq!(p1.y - p0.y, 100.0, epsilon = 1e-9);
    }

    #[test]
    fn fit_scale_picks_the_largest_scale_that_still_fits() {
        // eng-10 => paper/model = 0.3048/(120*0.0254) = 0.1, which just fits
        // a 100x50-foot extent into a 10x10-inch rect (100*0.1=10, 50*0.1=5),
        // and is the largest (most-detailed) of the three candidates.
        let rect = PaperRect {
            x: 0.0,
            y: 0.0,
            w: 10.0,
            h: 10.0,
        };
        let bounds = Bounds {
            min_x: 0.0,
            min_y: 0.0,
            max_x: 100.0,
            max_y: 50.0,
        };
        let candidates = vec![
            "eng-10".to_string(),
            "eng-50".to_string(),
            "eng-100".to_string(),
        ];
        let picked = fit_scale(&candidates, bounds, rect, Unit::Feet, PaperUnit::In).unwrap();
        assert_eq!(picked, "eng-10");
    }

    #[test]
    fn fit_scale_falls_back_to_the_smallest_scale_when_nothing_fits() {
        let rect = PaperRect {
            x: 0.0,
            y: 0.0,
            w: 1.0,
            h: 1.0,
        };
        let bounds = Bounds {
            min_x: 0.0,
            min_y: 0.0,
            max_x: 100_000.0,
            max_y: 100_000.0,
        };
        let candidates = vec!["eng-10".to_string(), "eng-100".to_string()];
        let picked = fit_scale(&candidates, bounds, rect, Unit::Feet, PaperUnit::In).unwrap();
        assert_eq!(picked, "eng-100");
    }

    #[test]
    fn fit_scale_of_empty_candidates_is_none() {
        let rect = PaperRect {
            x: 0.0,
            y: 0.0,
            w: 10.0,
            h: 10.0,
        };
        let bounds = Bounds {
            min_x: 0.0,
            min_y: 0.0,
            max_x: 1.0,
            max_y: 1.0,
        };
        assert!(fit_scale(&[], bounds, rect, Unit::Feet, PaperUnit::In).is_none());
    }

    #[test]
    fn section_gaze_uses_explicit_gaze_when_present() {
        let mark = SectionMark {
            id: "s1".to_string(),
            tag: "A".to_string(),
            at_line: [Point::new(0.0, 0.0), Point::new(10.0, 0.0)],
            gaze: Some(Point::new(0.0, 1.0)),
            target_sheet: "A-301".to_string(),
            target_view: None,
        };
        assert_eq!(section_gaze(&mark), Point::new(0.0, 1.0));
    }

    #[test]
    fn section_gaze_defaults_to_left_normal_of_the_cut_line() {
        let mark = SectionMark {
            id: "s1".to_string(),
            tag: "A".to_string(),
            at_line: [Point::new(0.0, 0.0), Point::new(10.0, 0.0)],
            gaze: None,
            target_sheet: "A-301".to_string(),
            target_view: None,
        };
        let g = section_gaze(&mark);
        assert_relative_eq!(g.x, 0.0, epsilon = 1e-9);
        assert_relative_eq!(g.y, 1.0, epsilon = 1e-9);
    }
}
