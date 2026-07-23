//! Sheet builders — turn sheet/annotation data into `SheetPrimitive`
//! scenes (points), per `docs/ARCHITECTURE.md`'s render-agnostic
//! intermediate representation.
//!
//! Port of `packages/domain/src/drawing/builders.ts`.
//!
//! ## Scope note
//!
//! The TS original's top-level composer (`buildSheetScene`/
//! `buildSheetPrimitives`) and several of its content builders
//! (`drawSitePlan`, `drawFloorPlan`, `drawFramework`, `schedulesFor`,
//! `buildIndexSheet`, `buildBuildingViews`) walk a `Site` /
//! `BuildingModel` / `RegionPlugin` — types owned by `thoth-planning` and
//! `thoth-civil`, which this crate does not depend on. Those are
//! **not-yet-ported**; see `STATUS.md`.
//!
//! Everything else is ported, with one adaptation: functions that only ever
//! touched a couple of fields of the big `Site`/`RegionPlugin` types now take
//! exactly those fields as parameters, so the real primitive-building logic
//! (annotation placement, title block layout, schedule table layout) is
//! fully preserved without inventing a stand-in `Site`/`RegionPlugin` type:
//!
//! - `drawDimensions(site, project)` -> [`draw_dimensions`]`(dimensions, spatial, project)`
//! - `drawGridBubbles(site, project)` -> [`draw_grid_bubbles`]`(grid_lines, project)`
//! - `drawMarks(site, project)` -> [`draw_marks`]`(marks, project)`
//! - `buildTitleBlock(set, sheet, plugin, layout, scaleLabel)` ->
//!   [`build_title_block`]`(set, sheet, firm_lines_override, layout, scale_label)`
//!   (only `plugin.titleBlock.firmLines` was ever read)

use crate::annotation::{grid_bubble_geometry, revision_cloud_bumps, GridLine, RevisionCloud};
use crate::dimension::{dimension_style, measure_dimension, DimArrow, Dimension};
use crate::scene::{
    arrow_head, dim_tick, paper_to_points_for_sheet, Pt, SheetPrimitive, TextAnchor, INK, LIGHT,
    MUTED,
};
use crate::schedule::ScheduleTable;
use crate::sheet::{resolve_title_block, DrawingSet, Sheet};
use crate::sheetsize::{printable_area, sheet_dimensions, PaperUnit};
use crate::sheetview::{section_gaze, DetailMark, MatchLine, SectionMark};
use thoth_spatial::{distance, Bounds, Point, SpatialContext};

/// Paper geometry of a sheet in points.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SheetLayout {
    pub w_pt: f64,
    pub h_pt: f64,
    pub border: RectPt,
    pub draw_area: RectPt,
    pub title_rect: RectPt,
}

/// A rectangle in sheet points.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RectPt {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

/// Compute a sheet's point geometry (border, title strip, drawing area).
pub fn sheet_layout(sheet: &Sheet, unit: PaperUnit) -> SheetLayout {
    let dim = sheet_dimensions(&sheet.size, sheet.orientation, unit);
    let w_pt = paper_to_points_for_sheet(dim.w, unit);
    let h_pt = paper_to_points_for_sheet(dim.h, unit);
    let printable = printable_area(&sheet.size, sheet.orientation, unit, None);
    let bx = paper_to_points_for_sheet(printable.x, unit);
    let by = paper_to_points_for_sheet(printable.y, unit);
    let bw = paper_to_points_for_sheet(printable.w, unit);
    let bh = paper_to_points_for_sheet(printable.h, unit);
    // Title strip down the right edge, ~1.9in wide (clamped to 24% of width).
    let strip_w = (paper_to_points_for_sheet(1.9, PaperUnit::In)).min(bw * 0.26);
    SheetLayout {
        w_pt,
        h_pt,
        border: RectPt {
            x: bx,
            y: by,
            w: bw,
            h: bh,
        },
        draw_area: RectPt {
            x: bx,
            y: by,
            w: bw - strip_w - 6.0,
            h: bh,
        },
        title_rect: RectPt {
            x: bx + bw - strip_w,
            y: by,
            w: strip_w,
            h: bh,
        },
    }
}

/// A model->sheet projector fitting `bounds` into a point rect.
pub struct Projector {
    project: Box<dyn Fn(Point) -> Pt>,
    pub scale_pt: f64,
}

impl Projector {
    pub fn project(&self, p: Point) -> Pt {
        (self.project)(p)
    }
}

/// Build a [`Projector`] that fits a model-space bounding box into a sheet
/// rectangle with the given padding fraction on each side.
pub fn fit_projector(rect: RectPt, b: Bounds, pad: f64) -> Projector {
    let bw = (b.max_x - b.min_x).max(1e-6);
    let bh = (b.max_y - b.min_y).max(1e-6);
    let iw = rect.w * (1.0 - pad * 2.0);
    let ih = rect.h * (1.0 - pad * 2.0);
    let s = (iw / bw).min(ih / bh);
    let cx = (b.min_x + b.max_x) / 2.0;
    let cy = (b.min_y + b.max_y) / 2.0;
    let ox = rect.x + rect.w / 2.0;
    let oy = rect.y + rect.h / 2.0;
    let project = move |p: Point| Pt::new(ox + (p.x - cx) * s, oy + (p.y - cy) * s);
    Projector {
        project: Box::new(project),
        scale_pt: s,
    }
}

// --- the frame + title block -----------------------------------------------

/// The sheet's outer trim/border rectangles.
pub fn build_frame(layout: &SheetLayout) -> Vec<SheetPrimitive> {
    let (w_pt, h_pt, border) = (layout.w_pt, layout.h_pt, layout.border);
    vec![
        SheetPrimitive::Rect {
            x: 6.0,
            y: 6.0,
            w: w_pt - 12.0,
            h: h_pt - 12.0,
            sw: Some(1.6),
            stroke: Some(INK.to_string()),
            fill: Some("#ffffff".to_string()),
            fill_opacity: None,
            dash: None,
        },
        SheetPrimitive::Rect {
            x: border.x,
            y: border.y,
            w: border.w,
            h: border.h,
            sw: Some(0.8),
            stroke: Some(INK.to_string()),
            fill: None,
            fill_opacity: None,
            dash: None,
        },
    ]
}

/// The title-block strip content: firm banner, field rows, and the big
/// sheet-number cell. `firm_lines_override` corresponds to the TS
/// `plugin.titleBlock.firmLines` — see the module rustdoc for why this
/// takes the override directly rather than a full `RegionPlugin`.
pub fn build_title_block(
    set: &DrawingSet,
    sheet: &Sheet,
    firm_lines_override: Option<&[String]>,
    layout: &SheetLayout,
    scale_label: &str,
) -> Vec<SheetPrimitive> {
    let r = layout.title_rect;
    let tb = resolve_title_block(set, sheet, scale_label);
    let mut out = vec![SheetPrimitive::Rect {
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        sw: Some(1.0),
        stroke: Some(INK.to_string()),
        fill: None,
        fill_opacity: None,
        dash: None,
    }];
    let pad = 8.0;
    let firm: &[String] = firm_lines_override.unwrap_or(&set.title_block_defaults.firm_lines);
    let mut y = r.y + 18.0;

    out.push(text(
        r.x + pad,
        y,
        &set.title_block_defaults.project_name.to_uppercase(),
        9.0,
        INK,
        None,
        Some(700.0),
    ));
    y += 12.0;
    for line in firm {
        out.push(text(r.x + pad, y, line, 6.5, MUTED, None, None));
        y += 9.0;
    }
    y += 4.0;
    out.push(line_prim(r.x, y, r.x + r.w, y, 0.6, INK));
    y += 4.0;

    let num_cell_h = 54.0;
    let num_top = r.y + r.h - num_cell_h;
    out.push(line_prim(r.x, num_top, r.x + r.w, num_top, 1.0, INK));
    out.push(text_anchored(
        r.x + r.w / 2.0,
        num_top + 22.0,
        "SHEET",
        6.5,
        MUTED,
        TextAnchor::Middle,
        None,
    ));
    out.push(text_anchored(
        r.x + r.w / 2.0,
        num_top + 42.0,
        &crate::sheet::format_sheet_number(sheet.number),
        20.0,
        INK,
        TextAnchor::Middle,
        Some(700.0),
    ));

    let rows: [(&str, String); 7] = [
        ("SHEET TITLE", sheet.title.clone()),
        ("SCALE", scale_label.to_string()),
        ("DATE", tb.date.clone()),
        (
            "DRAWN",
            tb.drawn_by
                .clone()
                .unwrap_or_else(|| "\u{2014}".to_string()),
        ),
        (
            "CHECKED",
            tb.checked_by
                .clone()
                .unwrap_or_else(|| "\u{2014}".to_string()),
        ),
        (
            "PROJECT NO.",
            tb.project_number
                .clone()
                .unwrap_or_else(|| "\u{2014}".to_string()),
        ),
        ("SHEET", tb.sheet_of.clone()),
    ];
    let row_h = (22.0f64).min((num_top - y - 4.0) / rows.len() as f64);
    for (label, value) in rows {
        out.push(text(r.x + pad, y + 8.0, label, 5.5, MUTED, None, None));
        out.push(text(
            r.x + pad,
            y + 17.0,
            &value,
            8.0,
            INK,
            None,
            Some(600.0),
        ));
        y += row_h;
        out.push(line_prim(r.x, y, r.x + r.w, y, 0.4, LIGHT));
    }
    out
}

/// The revision block above the title strip, if the sheet has revisions.
pub fn build_revision_block(sheet: &Sheet, layout: &SheetLayout) -> Vec<SheetPrimitive> {
    if sheet.revisions.is_empty() {
        return vec![];
    }
    let r = layout.title_rect;
    let h = 12.0 + sheet.revisions.len() as f64 * 10.0;
    let top = r.y + r.h - 54.0 - h - 6.0;
    let mut out = vec![
        SheetPrimitive::Rect {
            x: r.x,
            y: top,
            w: r.w,
            h,
            sw: Some(0.6),
            stroke: Some(INK.to_string()),
            fill: None,
            fill_opacity: None,
            dash: None,
        },
        text(
            r.x + 4.0,
            top + 9.0,
            "REVISIONS",
            6.0,
            MUTED,
            None,
            Some(700.0),
        ),
    ];
    let mut y = top + 20.0;
    for rev in &sheet.revisions {
        out.push(SheetPrimitive::Circle {
            c: Pt::new(r.x + 10.0, y - 3.0),
            r: 5.0,
            sw: Some(0.6),
            stroke: Some(INK.to_string()),
            fill: None,
            fill_opacity: None,
        });
        out.push(text_anchored(
            r.x + 10.0,
            y - 1.0,
            &rev.delta.to_string(),
            6.0,
            INK,
            TextAnchor::Middle,
            Some(700.0),
        ));
        let mut label = format!("{}  {}", rev.date, rev.description);
        label = label.chars().take(34).collect();
        out.push(text(r.x + 20.0, y, &label, 6.0, INK, None, None));
        y += 10.0;
    }
    out
}

// --- dimensions, grids, annotations projected into a view ------------------

/// Draw every dimension in `dimensions`, projected through `project`.
/// Adapted from `drawDimensions(site, project)` — see the module rustdoc.
pub fn draw_dimensions(
    dimensions: &[Dimension],
    spatial: &SpatialContext,
    project: impl Fn(Point) -> Pt,
) -> Vec<SheetPrimitive> {
    let mut out = Vec::new();
    for dim in dimensions {
        let m = measure_dimension(dim, spatial);
        let style = dimension_style(dim.style_id());
        for [a, b] in &m.geometry.lines {
            out.push(SheetPrimitive::Line {
                a: project(*a),
                b: project(*b),
                w: Some(0.4),
                color: Some(INK.to_string()),
                dash: None,
            });
        }
        for tk in &m.geometry.ticks {
            let at = project(tk.at);
            let dir = Pt::new(tk.dir.x, tk.dir.y);
            if style.arrow == DimArrow::Tick {
                out.push(dim_tick(at, dir, 3.0, None));
            } else {
                out.push(arrow_head(at, dir, 4.0, None));
            }
        }
        let t = project(m.geometry.text_at);
        out.push(SheetPrimitive::Text {
            at: t,
            text: m.label,
            size: 5.5,
            color: Some(INK.to_string()),
            anchor: Some(TextAnchor::Middle),
            weight: None,
            angle: Some(m.geometry.text_angle_deg),
            monospace: None,
        });
    }
    out
}

/// Draw every structural gridline's bubbles, projected through `project`.
/// Adapted from `drawGridBubbles(site, project)` — see the module rustdoc.
pub fn draw_grid_bubbles(
    grid_lines: &[GridLine],
    project: impl Fn(Point) -> Pt,
) -> Vec<SheetPrimitive> {
    let mut out = Vec::new();
    for g in grid_lines {
        out.push(SheetPrimitive::Line {
            a: project(g.from),
            b: project(g.to),
            w: Some(0.5),
            color: Some("#64748b".to_string()),
            dash: Some(vec![10.0, 2.0, 2.0, 2.0]),
        });
        for bub in grid_bubble_geometry(g, 6.0) {
            let c = project(bub.center);
            out.push(SheetPrimitive::Circle {
                c,
                r: 8.0,
                sw: Some(0.7),
                stroke: Some(INK.to_string()),
                fill: Some("#ffffff".to_string()),
                fill_opacity: None,
            });
            out.push(text_anchored(
                c.x,
                c.y + 3.0,
                &bub.label,
                7.0,
                INK,
                TextAnchor::Middle,
                Some(700.0),
            ));
        }
    }
    out
}

/// The view-reference marks (section cuts, detail callouts, match lines,
/// revision clouds) a sheet carries, bundled so [`draw_marks`] doesn't need a
/// four-parameter signature per mark kind.
#[derive(Debug, Clone, Default)]
pub struct SheetMarks<'a> {
    pub section_marks: &'a [SectionMark],
    pub detail_marks: &'a [DetailMark],
    pub match_lines: &'a [MatchLine],
    pub revision_clouds: &'a [RevisionCloud],
}

/// Draw section cuts, detail callouts, match lines, and revision clouds,
/// projected through `project`. Adapted from `drawMarks(site, project)` —
/// see the module rustdoc.
pub fn draw_marks(marks: &SheetMarks<'_>, project: impl Fn(Point) -> Pt) -> Vec<SheetPrimitive> {
    let mut out = Vec::new();
    for sm in marks.section_marks {
        let a = project(sm.at_line[0]);
        let b = project(sm.at_line[1]);
        out.push(SheetPrimitive::Line {
            a,
            b,
            w: Some(1.4),
            color: Some(INK.to_string()),
            dash: Some(vec![12.0, 3.0, 3.0, 3.0]),
        });
        let gaze = section_gaze(sm);
        for end in [a, b] {
            out.push(SheetPrimitive::Circle {
                c: end,
                r: 9.0,
                sw: Some(0.9),
                stroke: Some(INK.to_string()),
                fill: Some("#ffffff".to_string()),
                fill_opacity: None,
            });
            out.push(text_anchored(
                end.x,
                end.y + 3.0,
                &sm.tag,
                8.0,
                INK,
                TextAnchor::Middle,
                Some(700.0),
            ));
            out.push(arrow_head(
                Pt::new(end.x + gaze.x * 14.0, end.y + gaze.y * 14.0),
                Pt::new(gaze.x, gaze.y),
                5.0,
                None,
            ));
        }
    }
    for dm in marks.detail_marks {
        let c = project(dm.center);
        let edge = project(Point::new(dm.center.x + dm.radius, dm.center.y));
        let rr = distance(Point::new(edge.x, edge.y), Point::new(c.x, c.y));
        out.push(SheetPrimitive::Circle {
            c,
            r: rr,
            sw: Some(0.8),
            stroke: Some(INK.to_string()),
            fill: Some("transparent".to_string()),
            fill_opacity: Some(0.0),
        });
        out.push(SheetPrimitive::Circle {
            c: Pt::new(c.x + rr + 12.0, c.y - rr),
            r: 9.0,
            sw: Some(0.9),
            stroke: Some(INK.to_string()),
            fill: Some("#ffffff".to_string()),
            fill_opacity: None,
        });
        out.push(text_anchored(
            c.x + rr + 12.0,
            c.y - rr + 3.0,
            &dm.tag,
            8.0,
            INK,
            TextAnchor::Middle,
            Some(700.0),
        ));
    }
    for ml in marks.match_lines {
        let a = project(ml.at_line[0]);
        let b = project(ml.at_line[1]);
        out.push(SheetPrimitive::Line {
            a,
            b,
            w: Some(1.6),
            color: Some("#b91c1c".to_string()),
            dash: Some(vec![16.0, 3.0, 3.0, 3.0]),
        });
        out.push(text_anchored(
            (a.x + b.x) / 2.0,
            (a.y + b.y) / 2.0 - 4.0,
            &format!("MATCH LINE \u{2014} SEE {}", ml.adjoining_sheet),
            6.0,
            "#b91c1c",
            TextAnchor::Middle,
            Some(700.0),
        ));
    }
    for rc in marks.revision_clouds {
        let apexes: Vec<Pt> = revision_cloud_bumps(rc, 6.0)
            .into_iter()
            .map(&project)
            .collect();
        out.push(SheetPrimitive::Polyline {
            pts: apexes,
            w: Some(0.8),
            color: Some("#b91c1c".to_string()),
            dash: None,
            close: Some(true),
        });
        if let Some(first_model) = rc.boundary.first() {
            let first = project(*first_model);
            out.push(SheetPrimitive::Polygon {
                pts: vec![
                    Pt::new(first.x, first.y - 6.0),
                    Pt::new(first.x + 6.0, first.y + 4.0),
                    Pt::new(first.x - 6.0, first.y + 4.0),
                ],
                w: Some(0.3),
                stroke: Some("#b91c1c".to_string()),
                fill: Some("#b91c1c".to_string()),
                fill_opacity: None,
                dash: None,
            });
            out.push(text_anchored(
                first.x,
                first.y + 3.0,
                &rc.delta.to_string(),
                6.0,
                "#ffffff",
                TextAnchor::Middle,
                Some(700.0),
            ));
        }
    }
    out
}

// --- viewport frame + title bubble -----------------------------------------

/// The label/scale caption drawn under a viewport's rectangle, with an
/// optional numbered bubble.
pub fn viewport_title(
    rect: RectPt,
    num: Option<u32>,
    title: &str,
    scale: &str,
) -> Vec<SheetPrimitive> {
    let mut out = Vec::new();
    let y = rect.y + rect.h + 4.0;
    if let Some(n) = num {
        out.push(SheetPrimitive::Circle {
            c: Pt::new(rect.x + 10.0, y + 8.0),
            r: 9.0,
            sw: Some(1.0),
            stroke: Some(INK.to_string()),
            fill: Some("#ffffff".to_string()),
            fill_opacity: None,
        });
        out.push(text_anchored(
            rect.x + 10.0,
            y + 11.0,
            &n.to_string(),
            9.0,
            INK,
            TextAnchor::Middle,
            Some(700.0),
        ));
    }
    out.push(text(
        rect.x + 24.0,
        y + 8.0,
        &title.to_uppercase(),
        8.0,
        INK,
        None,
        Some(700.0),
    ));
    out.push(text(
        rect.x + 24.0,
        y + 17.0,
        &format!("SCALE: {scale}"),
        6.0,
        MUTED,
        None,
        None,
    ));
    out.push(line_prim(
        rect.x,
        y + 20.0,
        rect.x + rect.w.min(160.0),
        y + 20.0,
        1.0,
        INK,
    ));
    out
}

// --- schedules --------------------------------------------------------------

/// Render a schedule table as a bordered grid of text primitives, starting
/// at `(x, y)` with width `w`. Returns the primitives plus the total height
/// consumed, so a caller can stack multiple tables vertically.
pub fn draw_schedule_table(
    table: &ScheduleTable,
    x: f64,
    y: f64,
    w: f64,
) -> (Vec<SheetPrimitive>, f64) {
    let mut out = Vec::new();
    let row_h = 14.0;
    let head_h = 16.0;
    let cols = &table.columns;
    let col_w = w / cols.len().max(1) as f64;

    out.push(text(
        x,
        y - 4.0,
        &table.title.to_uppercase(),
        8.0,
        INK,
        None,
        Some(700.0),
    ));
    out.push(SheetPrimitive::Rect {
        x,
        y,
        w,
        h: head_h,
        sw: Some(0.6),
        stroke: Some(INK.to_string()),
        fill: Some("#e2e8f0".to_string()),
        fill_opacity: None,
        dash: None,
    });
    for (i, c) in cols.iter().enumerate() {
        out.push(text(
            x + i as f64 * col_w + 4.0,
            y + 11.0,
            &c.label,
            6.0,
            INK,
            None,
            Some(700.0),
        ));
        if i > 0 {
            out.push(line_prim(
                x + i as f64 * col_w,
                y,
                x + i as f64 * col_w,
                y + head_h + table.rows.len() as f64 * row_h,
                0.4,
                LIGHT,
            ));
        }
    }
    for (ri, row) in table.rows.iter().enumerate() {
        let ry = y + head_h + ri as f64 * row_h;
        out.push(SheetPrimitive::Rect {
            x,
            y: ry,
            w,
            h: row_h,
            sw: Some(0.3),
            stroke: Some(LIGHT.to_string()),
            fill: None,
            fill_opacity: None,
            dash: None,
        });
        for (i, c) in cols.iter().enumerate() {
            let v = ScheduleTable::cell_text(row, &c.key);
            let anchor = match c.align {
                Some(crate::schedule::ColumnAlign::Right) => TextAnchor::End,
                Some(crate::schedule::ColumnAlign::Center) => TextAnchor::Middle,
                _ => TextAnchor::Start,
            };
            let tx = match c.align {
                Some(crate::schedule::ColumnAlign::Right) => x + (i + 1) as f64 * col_w - 4.0,
                Some(crate::schedule::ColumnAlign::Center) => x + i as f64 * col_w + col_w / 2.0,
                _ => x + i as f64 * col_w + 4.0,
            };
            out.push(text_anchored(tx, ry + 10.0, &v, 6.0, INK, anchor, None));
        }
    }
    (out, head_h + table.rows.len() as f64 * row_h + 24.0)
}

// --- small text/line primitive constructors ---------------------------------

fn text(
    x: f64,
    y: f64,
    s: &str,
    size: f64,
    color: &str,
    anchor: Option<TextAnchor>,
    weight: Option<f64>,
) -> SheetPrimitive {
    SheetPrimitive::Text {
        at: Pt::new(x, y),
        text: s.to_string(),
        size,
        color: Some(color.to_string()),
        anchor,
        weight,
        angle: None,
        monospace: None,
    }
}

fn text_anchored(
    x: f64,
    y: f64,
    s: &str,
    size: f64,
    color: &str,
    anchor: TextAnchor,
    weight: Option<f64>,
) -> SheetPrimitive {
    text(x, y, s, size, color, Some(anchor), weight)
}

fn line_prim(x1: f64, y1: f64, x2: f64, y2: f64, w: f64, color: &str) -> SheetPrimitive {
    SheetPrimitive::Line {
        a: Pt::new(x1, y1),
        b: Pt::new(x2, y2),
        w: Some(w),
        color: Some(color.to_string()),
        dash: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::drafting::DisciplineCode;
    use crate::sheet::{Revision, SheetNumber, TitleBlockDefaults};
    use crate::sheetsize::Orientation;

    fn sample_sheet() -> Sheet {
        Sheet {
            id: "s1".to_string(),
            number: SheetNumber {
                discipline: DisciplineCode::A,
                r#type: 1,
                sequence: 1,
            },
            title: "Floor Plan".to_string(),
            size: "arch-d".to_string(),
            orientation: Orientation::Landscape,
            scale_id: "arch-1-4".to_string(),
            discipline: DisciplineCode::A,
            viewport_ids: vec![],
            revisions: vec![],
            notes: vec![],
            keynote_ids: vec![],
        }
    }

    fn sample_set(sheet: Sheet) -> DrawingSet {
        DrawingSet {
            id: "set1".to_string(),
            name: "Set".to_string(),
            sheets: vec![sheet],
            title_block_defaults: TitleBlockDefaults {
                project_name: "Project".to_string(),
                client: None,
                location: None,
                drawn_by: Some("TB".to_string()),
                checked_by: None,
                date: "2024".to_string(),
                project_number: Some("001".to_string()),
                firm_lines: vec!["Firm LLC".to_string()],
            },
        }
    }

    #[test]
    fn sheet_layout_reserves_a_title_strip_on_the_right_edge() {
        let layout = sheet_layout(&sample_sheet(), PaperUnit::In);
        assert!(layout.title_rect.x > layout.draw_area.x);
        assert!(layout.title_rect.w > 0.0);
        assert!(layout.draw_area.w > 0.0);
    }

    #[test]
    fn fit_projector_centers_the_bounds_in_the_rect() {
        let rect = RectPt {
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
        let projector = fit_projector(rect, bounds, 0.0);
        let p = projector.project(Point::new(5.0, 5.0));
        assert!((p.x - 50.0).abs() < 1e-6);
        assert!((p.y - 50.0).abs() < 1e-6);
    }

    #[test]
    fn build_frame_produces_two_rectangles() {
        let layout = sheet_layout(&sample_sheet(), PaperUnit::In);
        let prims = build_frame(&layout);
        assert_eq!(prims.len(), 2);
    }

    #[test]
    fn build_title_block_falls_back_to_set_firm_lines_without_an_override() {
        let sheet = sample_sheet();
        let set = sample_set(sheet.clone());
        let layout = sheet_layout(&sheet, PaperUnit::In);
        let prims = build_title_block(&set, &sheet, None, &layout, "1/4\"=1'-0\"");
        let has_firm_line = prims
            .iter()
            .any(|p| matches!(p, SheetPrimitive::Text { text, .. } if text == "Firm LLC"));
        assert!(has_firm_line);
    }

    #[test]
    fn build_title_block_prefers_the_override_over_set_defaults() {
        let sheet = sample_sheet();
        let set = sample_set(sheet.clone());
        let layout = sheet_layout(&sheet, PaperUnit::In);
        let override_lines = vec!["Plugin Firm".to_string()];
        let prims = build_title_block(&set, &sheet, Some(&override_lines), &layout, "1/4\"=1'-0\"");
        let has_override = prims
            .iter()
            .any(|p| matches!(p, SheetPrimitive::Text { text, .. } if text == "Plugin Firm"));
        let has_default = prims
            .iter()
            .any(|p| matches!(p, SheetPrimitive::Text { text, .. } if text == "Firm LLC"));
        assert!(has_override);
        assert!(!has_default);
    }

    #[test]
    fn build_revision_block_is_empty_without_revisions() {
        let sheet = sample_sheet();
        let layout = sheet_layout(&sheet, PaperUnit::In);
        assert!(build_revision_block(&sheet, &layout).is_empty());
    }

    #[test]
    fn build_revision_block_draws_one_bubble_per_revision() {
        let mut sheet = sample_sheet();
        sheet.revisions = vec![
            Revision {
                id: "r1".to_string(),
                delta: 1,
                date: "2024-01-01".to_string(),
                description: "Issued for permit".to_string(),
                by: None,
            },
            Revision {
                id: "r2".to_string(),
                delta: 2,
                date: "2024-02-01".to_string(),
                description: "Revised per owner".to_string(),
                by: None,
            },
        ];
        let layout = sheet_layout(&sheet, PaperUnit::In);
        let prims = build_revision_block(&sheet, &layout);
        let bubble_count = prims
            .iter()
            .filter(|p| matches!(p, SheetPrimitive::Circle { .. }))
            .count();
        assert_eq!(bubble_count, 2);
    }

    #[test]
    fn draw_dimensions_projects_a_linear_dimension_into_line_and_text_primitives() {
        let dims = vec![Dimension::Aligned(crate::dimension::AlignedDimension {
            id: "d1".to_string(),
            style_id: "arch-tick".to_string(),
            text_override: None,
            a: Point::new(0.0, 0.0),
            b: Point::new(10.0, 0.0),
            offset: 2.0,
        })];
        let spatial = SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: thoth_spatial::Unit::Feet,
            scale: 1.0,
        };
        let prims = draw_dimensions(&dims, &spatial, |p| Pt::new(p.x, p.y));
        assert!(prims
            .iter()
            .any(|p| matches!(p, SheetPrimitive::Text { .. })));
        assert!(prims
            .iter()
            .any(|p| matches!(p, SheetPrimitive::Line { .. })));
    }

    #[test]
    fn draw_grid_bubbles_draws_a_line_and_two_bubbles_for_a_both_ended_gridline() {
        let lines = vec![GridLine {
            id: "g1".to_string(),
            label: "A".to_string(),
            kind: crate::annotation::GridAxisKind::Letter,
            from: Point::new(0.0, 0.0),
            to: Point::new(10.0, 0.0),
            bubbles: None,
        }];
        let prims = draw_grid_bubbles(&lines, |p| Pt::new(p.x, p.y));
        let circles = prims
            .iter()
            .filter(|p| matches!(p, SheetPrimitive::Circle { .. }))
            .count();
        assert_eq!(circles, 2);
    }

    #[test]
    fn draw_marks_of_empty_marks_is_empty() {
        let marks = SheetMarks::default();
        assert!(draw_marks(&marks, |p| Pt::new(p.x, p.y)).is_empty());
    }

    #[test]
    fn viewport_title_includes_a_numbered_bubble_when_requested() {
        let rect = RectPt {
            x: 0.0,
            y: 0.0,
            w: 200.0,
            h: 100.0,
        };
        let with_num = viewport_title(rect, Some(3), "Floor Plan", "1/4\"=1'-0\"");
        let without_num = viewport_title(rect, None, "Floor Plan", "1/4\"=1'-0\"");
        assert!(with_num.len() > without_num.len());
    }

    #[test]
    fn draw_schedule_table_produces_a_header_row_per_column_and_a_row_per_record() {
        let table = crate::schedule::curve_schedule(&[crate::platset::SiteCurve {
            label: "C1".to_string(),
            source: "Boundary".to_string(),
            radius: 100.0,
            arc_length: 50.0,
            delta_deg: 28.6,
            chord: 49.5,
            chord_bearing: "N45°E".to_string(),
            tangent: 25.0,
            direction: None,
        }]);
        let (prims, height) = draw_schedule_table(&table, 0.0, 0.0, 400.0);
        assert!(!prims.is_empty());
        assert!(height > 0.0);
    }
}
