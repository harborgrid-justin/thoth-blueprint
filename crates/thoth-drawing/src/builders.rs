//! Sheet builders — turn sheet/annotation data into `SheetPrimitive`
//! scenes (points), per `docs/ARCHITECTURE.md`'s render-agnostic
//! intermediate representation.
//!
//! Port of `packages/domain/src/drawing/builders.ts`.
//!
//! ## Scope note
//!
//! Now that this crate depends on `thoth-planning`, `thoth-survey`, and
//! `thoth-civil` (see `STATUS.md`), most of the `Site`-walking content
//! builders are ported: [`site_bounds`], [`draw_framework`],
//! [`draw_site_plan`], [`build_index_sheet`]. What remains
//! **not-yet-ported** is blocked on `thoth-planning` itself not yet having a
//! `BuildingModel`/interior-model type (its own `STATUS.md` confirms this):
//! `buildingBounds`, `drawFloorPlan`, `schedulesFor`'s door/window/room/
//! finish schedules, `buildBuildingViews`, and the top-level composer
//! `buildSheetScene`/`buildSheetPrimitives` (which dispatches to those same
//! building-model builders for architectural/elevation/section sheets) — see
//! `STATUS.md` for the exact per-function breakdown.
//!
//! Every ported function that only ever touched a couple of fields of the
//! big `Site`/`RegionPlugin` types (or a `Site` field this crate's scoped
//! `thoth_planning::Site` still doesn't carry — `landLot`, `alignments`,
//! `annotations.matchLines`; note `site.monuments`/`site.plss` *are* now
//! real `Site` fields and are read directly — see that crate's
//! `elements.rs` module rustdoc) takes exactly those missing fields as
//! parameters instead, so the real primitive-building logic (annotation
//! placement, title block layout, schedule table layout, site-plan
//! composition) is fully preserved without inventing a stand-in type:
//!
//! - `drawDimensions(site, project)` -> [`draw_dimensions`]`(dimensions, spatial, project)`
//! - `drawGridBubbles(site, project)` -> [`draw_grid_bubbles`]`(grid_lines, project)`
//! - `drawMarks(site, project)` -> [`draw_marks`]`(marks, project)`
//! - `buildTitleBlock(set, sheet, plugin, layout, scaleLabel)` ->
//!   [`build_title_block`]`(set, sheet, firm_lines_override, layout, scale_label)`
//!   (only `plugin.titleBlock.firmLines` was ever read)
//! - `drawFramework(site, project)` -> [`draw_framework`]`(site, ctx, project)`, and
//!   `drawSitePlan(site, project, _areaUnit)` -> [`draw_site_plan`]`(site, ctx, project)`
//!   (the TS `_areaUnit` parameter's own leading underscore already marks it
//!   unused in the original — it is not carried forward here), where `ctx` is
//!   a [`SitePlanContext`] bundling `site.landLot.nwCorner`/`site.alignments`
//! - `buildIndexSheet(set, site, layout)` ->
//!   [`build_index_sheet`]`(set, site, ctx, layout, match_lines)`

use crate::annotation::{grid_bubble_geometry, revision_cloud_bumps, GridLine, RevisionCloud};
use crate::dimension::{dimension_style, measure_dimension, DimArrow, Dimension};
use crate::hatch::{hatch_for_material, hatch_pattern};
use crate::scene::{
    arrow_head, dim_tick, hatch_lines, paper_to_points_for_sheet, Pt, SheetPrimitive, TextAnchor,
    INK, LIGHT, MUTED,
};
use crate::schedule::ScheduleTable;
use crate::sheet::{resolve_title_block, sheet_index, DrawingSet, Sheet};
use crate::sheetsize::{printable_area, sheet_dimensions, PaperUnit};
use crate::sheetview::{section_gaze, DetailMark, MatchLine, SectionMark};
use crate::DrawingError;

use thoth_civil::alignment::{
    full_stations, offset_alignment_path, point_at_station, resolve_alignment, AlignmentElement,
    HorizontalAlignment, OffsetKind,
};
use thoth_planning::elements::{PlanElement, Site};
use thoth_planning::land_use::{land_use_color, LandUseCategory};
use thoth_survey::curve::densify_boundary;
use thoth_survey::monument::{MonumentStatus, MonumentType};
use thoth_survey::plss::section_frame;

use thoth_spatial::{
    bounds, centroid, distance, union_bounds, Bounds, ElementKind, Point, SpatialContext,
};

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

// --- content bounds ---------------------------------------------------------

/// The overall extent of a site's spatial elements plus its survey
/// monuments. Adapted from `siteBounds(site)` — `site.monuments` is a real
/// field on this crate's `Site` port, so it's read directly.
pub fn site_bounds(site: &Site) -> Option<Bounds> {
    let mut boxes: Vec<Bounds> = site
        .elements
        .iter()
        .filter_map(|e| e.base().map(|b| bounds(&b.boundary)))
        .collect();
    for m in site.monuments.iter().flatten() {
        boxes.push(Bounds {
            min_x: m.position.x,
            min_y: m.position.y,
            max_x: m.position.x,
            max_y: m.position.y,
        });
    }
    if boxes.is_empty() {
        None
    } else {
        union_bounds(&boxes)
    }
}

// --- Site fields this crate's `Site` doesn't carry yet ----------------------

/// External inputs [`draw_framework`], [`draw_site_plan`], and
/// [`build_index_sheet`] need that today's scoped `thoth_planning::Site`
/// still doesn't carry — `site.landLot` (the Georgia Land Lot System frame;
/// `thoth_planning::Site` has no `land_lot` field even though it now has a
/// real `plss` field, see that crate's `elements.rs`/`GAPS.md`) and
/// `site.alignments`. Bundled so these functions don't grow an unwieldy
/// positional parameter list — the same "take exactly the missing fields"
/// adaptation already used for [`SheetMarks`] elsewhere in this module.
#[derive(Debug, Clone, Copy, Default)]
pub struct SitePlanContext<'a> {
    /// `site.landLot.nwCorner`, when the site uses the Georgia Land Lot System.
    pub land_lot_nw_corner: Option<Point>,
    pub alignments: &'a [HorizontalAlignment],
}

/// The section/land-lot framework outline, if the site carries one.
/// Adapted from `drawFramework(site, project)`: `site.plss` is read
/// directly (a real field on this crate's `Site` port); `ctx.land_lot_nw_corner`
/// stands in for `site.landLot?.nwCorner` — see [`SitePlanContext`].
pub fn draw_framework(
    site: &Site,
    ctx: &SitePlanContext<'_>,
    project: impl Fn(Point) -> Pt,
) -> Vec<SheetPrimitive> {
    let frame = if let Some(nw) = ctx.land_lot_nw_corner {
        let side = site
            .plss
            .as_ref()
            .and_then(|p| p.section_side)
            .unwrap_or(2640.0);
        Some(section_frame(nw, side))
    } else if let Some(plss) = &site.plss {
        match (plss.section_nw_corner, plss.section_side) {
            (Some(nw), Some(side)) => Some(section_frame(nw, side)),
            _ => None,
        }
    } else {
        None
    };
    let Some(frame) = frame else {
        return Vec::new();
    };
    vec![SheetPrimitive::Polygon {
        pts: vec![
            project(frame.nw),
            project(frame.ne),
            project(frame.se),
            project(frame.sw),
        ],
        w: Some(1.0),
        stroke: Some(MUTED.to_string()),
        fill: None,
        fill_opacity: None,
        dash: Some(vec![14.0, 4.0, 3.0, 4.0]),
    }]
}

// --- element presentation (local mirror of thoth-planning's elementMeta.ts) -

/// Fill color for a plain element kind (no land-use category override).
/// Local mirror of the `fill` column of `thoth-planning`'s not-yet-ported
/// `planning/elementMeta.ts` `META` table (that crate's own `STATUS.md`
/// confirms `elementMeta.ts` isn't ported yet — see the "duplicate now,
/// unify later" pattern documented in `GAPS.md`).
fn element_fill_color(kind: ElementKind) -> &'static str {
    match kind {
        ElementKind::Region => "#0d9488",
        ElementKind::Parcel => "#64748b",
        ElementKind::Block => "#475569",
        ElementKind::Zone => "#8b5cf6",
        ElementKind::Landuse => "#22c55e",
        ElementKind::Lot => "#0ea5e9",
        ElementKind::Building => "#f59e0b",
        ElementKind::Row => "#94a3b8",
        ElementKind::Easement => "#a855f7",
        ElementKind::Openspace => "#14b8a6",
        ElementKind::Water => "#38bdf8",
        ElementKind::Planting => "#4ade80",
        ElementKind::Grade => "#f59e0b",
        ElementKind::Tree => "#22c55e",
        ElementKind::Spot => "#d97706",
        ElementKind::Note => "#eab308",
        ElementKind::Stair => "#a8a29e",
        ElementKind::Curtainwall => "#38bdf8",
        ElementKind::Door => "#f59e0b",
        ElementKind::Window => "#22d3ee",
        ElementKind::Roof => "#f87171",
    }
}

/// The canvas color for an element, honoring land-use category when
/// relevant. Local port of `elementColor` (`planning/elementMeta.ts`) — see
/// [`element_fill_color`].
pub fn element_color(kind: ElementKind, category: Option<LandUseCategory>) -> &'static str {
    if kind == ElementKind::Landuse {
        if let Some(cat) = category {
            return land_use_color(cat);
        }
    }
    element_fill_color(kind)
}

/// The TS string spelling of an [`ElementKind`], used as a
/// [`crate::hatch::hatch_for_material`] lookup key — mirrors `ElementKind`'s
/// own `#[serde(rename_all = "lowercase")]` representation.
fn element_kind_hatch_key(kind: ElementKind) -> &'static str {
    match kind {
        ElementKind::Region => "region",
        ElementKind::Parcel => "parcel",
        ElementKind::Block => "block",
        ElementKind::Lot => "lot",
        ElementKind::Zone => "zone",
        ElementKind::Landuse => "landuse",
        ElementKind::Building => "building",
        ElementKind::Row => "row",
        ElementKind::Easement => "easement",
        ElementKind::Openspace => "openspace",
        ElementKind::Water => "water",
        ElementKind::Planting => "planting",
        ElementKind::Grade => "grade",
        ElementKind::Tree => "tree",
        ElementKind::Spot => "spot",
        ElementKind::Note => "note",
        ElementKind::Stair => "stair",
        ElementKind::Curtainwall => "curtainwall",
        ElementKind::Door => "door",
        ElementKind::Window => "window",
        ElementKind::Roof => "roof",
    }
}

/// The TS string spelling of a [`LandUseCategory`], used as a
/// [`crate::hatch::hatch_for_material`] lookup key — mirrors that type's own
/// `#[serde(rename_all = "kebab-case")]` representation.
fn land_use_hatch_key(category: LandUseCategory) -> &'static str {
    match category {
        LandUseCategory::Residential => "residential",
        LandUseCategory::Commercial => "commercial",
        LandUseCategory::MixedUse => "mixed-use",
        LandUseCategory::Civic => "civic",
        LandUseCategory::Industrial => "industrial",
        LandUseCategory::Park => "park",
        LandUseCategory::OpenSpace => "open-space",
        LandUseCategory::Agricultural => "agricultural",
        LandUseCategory::Infrastructure => "infrastructure",
        LandUseCategory::Unassigned => "unassigned",
    }
}

// --- site plan ---------------------------------------------------------------

/// Draw the full site plan: element fills/hatches, lot/parcel labels,
/// alignments (centerline + offsets + station ticks), and monument glyphs,
/// projected through `project`. Adapted from `drawSitePlan(site, project,
/// _areaUnit)` — see [`SitePlanContext`] for the parameter adaptation; the
/// TS `_areaUnit` parameter's own leading underscore already marks it
/// unused in the original, so it is not carried forward here.
///
/// # Errors
/// Propagates [`DrawingError`] from [`crate::scene::hatch_lines`] if a
/// hatch pattern's spacing is malformed or an element's densified boundary
/// has fewer than 3 vertices — a hardening over the TS original, which
/// would silently drop the hatch or hang (see that function's docs).
pub fn draw_site_plan(
    site: &Site,
    ctx: &SitePlanContext<'_>,
    project: impl Fn(Point) -> Pt,
) -> Result<Vec<SheetPrimitive>, DrawingError> {
    let mut out = draw_framework(site, ctx, &project);

    for el in &site.elements {
        let Some(base) = el.base() else { continue };
        let ring: Vec<Pt> = densify_boundary(&base.boundary, base.arcs.as_ref(), 2.0)
            .into_iter()
            .map(&project)
            .collect();
        let kind = el.kind();
        let category = match el {
            PlanElement::LandUse(lu) => Some(lu.category),
            _ => None,
        };
        let color = element_color(kind, category);
        let is_easement = kind == ElementKind::Easement;
        out.push(SheetPrimitive::Polygon {
            pts: ring.clone(),
            w: Some(if kind == ElementKind::Parcel {
                1.2
            } else {
                0.8
            }),
            stroke: Some(if is_easement { MUTED } else { INK }.to_string()),
            fill: Some(color.to_string()),
            fill_opacity: Some(if is_easement {
                0.05
            } else if kind == ElementKind::Building {
                0.5
            } else {
                0.14
            }),
            dash: if is_easement {
                Some(vec![6.0, 3.0, 2.0, 3.0])
            } else if kind == ElementKind::Zone {
                Some(vec![5.0, 3.0])
            } else {
                None
            },
        });

        let hatch_key = match category {
            Some(cat) => land_use_hatch_key(cat),
            None => element_kind_hatch_key(kind),
        };
        let hatch_id = base
            .hatch_id
            .clone()
            .or_else(|| hatch_for_material(Some(hatch_key)).map(str::to_string));
        if !is_easement {
            if let Some(hp) = hatch_id.and_then(|id| hatch_pattern(&id)) {
                out.extend(hatch_lines(&ring, &hp)?);
            }
        }
    }

    // Lot/parcel labels.
    for el in &site.elements {
        if !matches!(el.kind(), ElementKind::Lot | ElementKind::Parcel) {
            continue;
        }
        let Some(base) = el.base() else { continue };
        let c = project(centroid(&base.boundary));
        out.push(text_anchored(
            c.x,
            c.y,
            &base.name,
            6.0,
            INK,
            TextAnchor::Middle,
            Some(700.0),
        ));
    }

    // Alignments: offsets + centerline + station ticks.
    for a in ctx.alignments {
        let Ok(resolved) = resolve_alignment(a) else {
            continue;
        };
        for off in &a.offsets {
            let path: Vec<Pt> = offset_alignment_path(&resolved, off.distance, 120)
                .into_iter()
                .map(&project)
                .collect();
            let is_row = off.kind == OffsetKind::Row;
            out.push(SheetPrimitive::Polyline {
                pts: path,
                w: Some(0.7),
                color: Some(if is_row { "#7c3aed" } else { "#334155" }.to_string()),
                dash: if is_row {
                    Some(vec![8.0, 2.0, 2.0, 2.0])
                } else {
                    None
                },
                close: None,
            });
        }

        let mut cl: Vec<Pt> = Vec::new();
        for element in &resolved.elements {
            match element {
                AlignmentElement::Tangent { from, to, .. } => {
                    if cl.is_empty() {
                        cl.push(project(*from));
                    }
                    cl.push(project(*to));
                }
                AlignmentElement::Curve { curve, .. } => {
                    let steps = ((curve.delta_deg / 3.0).ceil() as i64).max(2);
                    for i in 0..=steps {
                        let ang = curve.start_angle + (curve.sweep * i as f64) / steps as f64;
                        cl.push(project(Point::new(
                            curve.center.x + curve.radius * ang.cos(),
                            curve.center.y + curve.radius * ang.sin(),
                        )));
                    }
                }
                AlignmentElement::Spiral { .. } => {}
            }
        }
        out.push(SheetPrimitive::Polyline {
            pts: cl,
            w: Some(1.1),
            color: Some("#b91c1c".to_string()),
            dash: Some(vec![12.0, 3.0, 3.0, 3.0]),
            close: None,
        });

        for st in full_stations(&resolved, 100.0) {
            let Ok(at) = point_at_station(&resolved, st) else {
                continue;
            };
            let s = project(at.point);
            out.push(SheetPrimitive::Circle {
                c: s,
                r: 1.2,
                sw: None,
                stroke: None,
                fill: Some("#b91c1c".to_string()),
                fill_opacity: None,
            });
        }
    }

    // Monuments (simple glyphs) + POB.
    for m in site.monuments.iter().flatten() {
        let s = project(m.position);
        let filled = matches!(m.status, MonumentStatus::Set);
        let fill_color = if filled { INK } else { "#ffffff" };
        match m.kind {
            MonumentType::IronRod | MonumentType::IronPipe | MonumentType::RebarCap => {
                out.push(SheetPrimitive::Circle {
                    c: s,
                    r: 2.0,
                    sw: Some(0.8),
                    stroke: Some(INK.to_string()),
                    fill: Some(fill_color.to_string()),
                    fill_opacity: None,
                });
            }
            _ => {
                out.push(SheetPrimitive::Rect {
                    x: s.x - 2.0,
                    y: s.y - 2.0,
                    w: 4.0,
                    h: 4.0,
                    sw: Some(0.8),
                    stroke: Some(INK.to_string()),
                    fill: Some(fill_color.to_string()),
                    fill_opacity: None,
                    dash: None,
                });
            }
        }
    }

    Ok(out)
}

// --- index sheet -------------------------------------------------------------

/// Build the cover/index sheet's content: the set title, a sheet-index
/// table, and a fitted key-map thumbnail of the whole site (with match-line
/// callouts). Adapted from `buildIndexSheet(set, site, layout)` — see
/// [`SitePlanContext`] for why `ctx`/`match_lines` are explicit parameters
/// (`site.annotations?.matchLines` isn't carried by this crate's scoped
/// `Site`).
///
/// # Errors
/// Propagates [`DrawingError`] from [`draw_site_plan`]'s key-map render.
pub fn build_index_sheet(
    set: &DrawingSet,
    site: &Site,
    ctx: &SitePlanContext<'_>,
    layout: &SheetLayout,
    match_lines: &[MatchLine],
) -> Result<Vec<SheetPrimitive>, DrawingError> {
    let mut out = Vec::new();
    let a = layout.draw_area;
    out.push(text(
        a.x + 12.0,
        a.y + 26.0,
        &set.name.to_uppercase(),
        18.0,
        INK,
        None,
        Some(700.0),
    ));
    out.push(text(
        a.x + 12.0,
        a.y + 44.0,
        set.title_block_defaults.location.as_deref().unwrap_or(""),
        9.0,
        MUTED,
        None,
        None,
    ));

    // Sheet index table (left half).
    let rows = sheet_index(set);
    let tbl_x = a.x + 12.0;
    let mut y = a.y + 74.0;
    out.push(text(
        tbl_x,
        y - 6.0,
        "SHEET INDEX",
        10.0,
        INK,
        None,
        Some(700.0),
    ));
    out.push(SheetPrimitive::Rect {
        x: tbl_x,
        y,
        w: a.w * 0.44,
        h: 16.0,
        sw: Some(0.6),
        stroke: Some(INK.to_string()),
        fill: Some("#e2e8f0".to_string()),
        fill_opacity: None,
        dash: None,
    });
    out.push(text(
        tbl_x + 4.0,
        y + 11.0,
        "NO.",
        6.5,
        INK,
        None,
        Some(700.0),
    ));
    out.push(text(
        tbl_x + 60.0,
        y + 11.0,
        "SHEET TITLE",
        6.5,
        INK,
        None,
        Some(700.0),
    ));
    y += 16.0;
    for r in &rows {
        out.push(SheetPrimitive::Rect {
            x: tbl_x,
            y,
            w: a.w * 0.44,
            h: 13.0,
            sw: Some(0.3),
            stroke: Some(LIGHT.to_string()),
            fill: None,
            fill_opacity: None,
            dash: None,
        });
        out.push(text(
            tbl_x + 4.0,
            y + 9.0,
            &r.number,
            6.5,
            INK,
            None,
            Some(600.0),
        ));
        out.push(text(tbl_x + 60.0, y + 9.0, &r.title, 6.5, INK, None, None));
        y += 13.0;
    }

    // Key map (right half): a fitted site thumbnail.
    if let Some(b) = site_bounds(site) {
        let km_rect = RectPt {
            x: a.x + a.w * 0.5,
            y: a.y + 74.0,
            w: a.w * 0.46,
            h: a.h * 0.6,
        };
        out.push(SheetPrimitive::Rect {
            x: km_rect.x,
            y: km_rect.y,
            w: km_rect.w,
            h: km_rect.h,
            sw: Some(0.8),
            stroke: Some(INK.to_string()),
            fill: None,
            fill_opacity: None,
            dash: None,
        });
        out.push(text(
            km_rect.x,
            km_rect.y - 6.0,
            "KEY MAP",
            10.0,
            INK,
            None,
            Some(700.0),
        ));
        let pr = fit_projector(km_rect, b, 0.08);
        out.extend(draw_site_plan(site, ctx, |p| pr.project(p))?);
        for ml in match_lines {
            let p = pr.project(ml.at_line[0]);
            let q = pr.project(ml.at_line[1]);
            out.push(SheetPrimitive::Line {
                a: p,
                b: q,
                w: Some(1.2),
                color: Some("#b91c1c".to_string()),
                dash: Some(vec![10.0, 3.0, 3.0, 3.0]),
            });
        }
    }

    Ok(out)
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

    // --- site-walking builders (site_bounds/draw_framework/draw_site_plan/
    // build_index_sheet) --------------------------------------------------

    use thoth_civil::alignment::AlignmentPi;
    use thoth_planning::elements::{new_base, Easement, LandUse, Lot, Parcel, PlssFrame};
    use thoth_survey::monument::SurveyMonument;
    use thoth_survey::plss::{RangeDirection, TownshipDirection, TownshipRange};

    fn spatial_ctx() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: thoth_spatial::Unit::Feet,
            scale: 1.0,
        }
    }

    fn square(min: f64, max: f64) -> Vec<Point> {
        vec![
            Point::new(min, min),
            Point::new(max, min),
            Point::new(max, max),
            Point::new(min, max),
        ]
    }

    fn empty_site() -> Site {
        Site {
            id: "s1".to_string(),
            name: "Site".to_string(),
            spatial: spatial_ctx(),
            layers: vec![],
            elements: vec![],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
            monuments: None,
            plss: None,
        }
    }

    fn empty_ctx() -> SitePlanContext<'static> {
        SitePlanContext::default()
    }

    #[test]
    fn element_color_uses_land_use_color_for_a_landuse_element_with_a_category() {
        let residential = element_color(ElementKind::Landuse, Some(LandUseCategory::Residential));
        let plain_landuse = element_color(ElementKind::Landuse, None);
        assert_ne!(residential, plain_landuse);
    }

    #[test]
    fn element_color_falls_back_to_the_kind_fill_for_non_landuse_kinds() {
        assert_eq!(element_color(ElementKind::Building, None), "#f59e0b");
        assert_eq!(element_color(ElementKind::Parcel, None), "#64748b");
    }

    #[test]
    fn site_bounds_of_an_empty_site_is_none() {
        assert!(site_bounds(&empty_site()).is_none());
    }

    #[test]
    fn site_bounds_unions_element_and_monument_extents() {
        let mut site = empty_site();
        site.elements = vec![PlanElement::Parcel(Parcel {
            base: new_base(
                "p1",
                ElementKind::Parcel,
                "Parcel 1",
                "l",
                square(0.0, 10.0),
            ),
            apn: None,
        })];
        site.monuments = Some(vec![SurveyMonument {
            id: "m1".to_string(),
            kind: MonumentType::IronRod,
            status: MonumentStatus::Set,
            position: Point::new(50.0, 50.0),
            label: None,
            note: None,
        }]);
        let b = site_bounds(&site).unwrap();
        assert_eq!(b.min_x, 0.0);
        assert_eq!(b.max_x, 50.0);
        assert_eq!(b.max_y, 50.0);
    }

    #[test]
    fn draw_framework_of_a_site_with_no_plss_or_land_lot_is_empty() {
        let site = empty_site();
        let ctx = empty_ctx();
        assert!(draw_framework(&site, &ctx, |p| Pt::new(p.x, p.y)).is_empty());
    }

    #[test]
    fn draw_framework_draws_a_plss_section_frame_when_present() {
        let mut site = empty_site();
        site.plss = Some(PlssFrame {
            township_range: TownshipRange::try_new(
                1,
                TownshipDirection::North,
                1,
                RangeDirection::East,
                None,
            )
            .unwrap(),
            section: 12,
            section_nw_corner: Some(Point::new(0.0, 0.0)),
            section_side: Some(2640.0),
        });
        let ctx = empty_ctx();
        let prims = draw_framework(&site, &ctx, |p| Pt::new(p.x, p.y));
        assert_eq!(prims.len(), 1);
        assert!(matches!(prims[0], SheetPrimitive::Polygon { .. }));
    }

    #[test]
    fn draw_framework_prefers_a_land_lot_frame_over_plss_when_both_are_present() {
        let mut site = empty_site();
        site.plss = Some(PlssFrame {
            township_range: TownshipRange::try_new(
                1,
                TownshipDirection::North,
                1,
                RangeDirection::East,
                None,
            )
            .unwrap(),
            section: 12,
            section_nw_corner: Some(Point::new(999.0, 999.0)),
            section_side: Some(100.0),
        });
        let alignments = [];
        let ctx = SitePlanContext {
            land_lot_nw_corner: Some(Point::new(0.0, 0.0)),
            alignments: &alignments,
        };
        let prims = draw_framework(&site, &ctx, |p| Pt::new(p.x, p.y));
        let SheetPrimitive::Polygon { pts, .. } = &prims[0] else {
            panic!("expected a polygon");
        };
        // The land-lot NW corner (0,0) wins, at the PLSS's own default side
        // (2640 ft) since `site.plss.sectionSide` is only read as a fallback
        // for the land-lot frame's side length, not overridden by it here.
        assert_eq!(pts[0], Pt::new(0.0, 0.0));
    }

    #[test]
    fn draw_site_plan_fills_elements_and_labels_lots_and_parcels() {
        let mut site = empty_site();
        site.elements = vec![
            PlanElement::Parcel(Parcel {
                base: new_base(
                    "p1",
                    ElementKind::Parcel,
                    "Parcel 1",
                    "l",
                    square(0.0, 100.0),
                ),
                apn: None,
            }),
            PlanElement::Lot(Lot {
                base: new_base("lo1", ElementKind::Lot, "Lot 1", "l", square(10.0, 40.0)),
                parcel_id: None,
                block_id: None,
                setback: None,
            }),
        ];
        let ctx = empty_ctx();
        let prims = draw_site_plan(&site, &ctx, |p| Pt::new(p.x, p.y)).unwrap();
        let polygons = prims
            .iter()
            .filter(|p| matches!(p, SheetPrimitive::Polygon { .. }))
            .count();
        assert_eq!(polygons, 2);
        let has_lot_label = prims
            .iter()
            .any(|p| matches!(p, SheetPrimitive::Text { text, .. } if text == "Lot 1"));
        assert!(has_lot_label);
    }

    #[test]
    fn draw_site_plan_hatches_a_landuse_element_by_category_but_not_an_easement() {
        let mut site = empty_site();
        site.elements = vec![
            PlanElement::LandUse(LandUse {
                base: new_base("lu1", ElementKind::Landuse, "Park", "l", square(0.0, 50.0)),
                category: LandUseCategory::Park,
            }),
            PlanElement::Easement(Easement {
                base: new_base(
                    "e1",
                    ElementKind::Easement,
                    "Easement 1",
                    "l",
                    square(0.0, 50.0),
                ),
                purpose: None,
            }),
        ];
        let ctx = empty_ctx();
        let prims = draw_site_plan(&site, &ctx, |p| Pt::new(p.x, p.y)).unwrap();
        // "park" resolves to the "grass" hatch pattern (a dots pattern, via
        // `hatchForMaterial`) and so contributes extra circle primitives on
        // top of its own boundary polygon; the easement never gets hatched
        // even though "easement" itself resolves to no `MATERIAL_HATCH` key.
        let landuse_polygon_fill_opacity = prims.iter().find_map(|p| match p {
            SheetPrimitive::Polygon {
                fill: Some(f),
                fill_opacity,
                ..
            } if f == thoth_planning::land_use::land_use_color(LandUseCategory::Park) => {
                *fill_opacity
            }
            _ => None,
        });
        assert!(landuse_polygon_fill_opacity.is_some());
        assert!(prims
            .iter()
            .any(|p| matches!(p, SheetPrimitive::Circle { .. })));
    }

    #[test]
    fn draw_site_plan_draws_a_glyph_per_monument() {
        let mut site = empty_site();
        site.monuments = Some(vec![
            SurveyMonument {
                id: "m1".to_string(),
                kind: MonumentType::IronRod,
                status: MonumentStatus::Set,
                position: Point::new(0.0, 0.0),
                label: None,
                note: None,
            },
            SurveyMonument {
                id: "m2".to_string(),
                kind: MonumentType::Concrete,
                status: MonumentStatus::Found,
                position: Point::new(10.0, 10.0),
                label: None,
                note: None,
            },
        ]);
        let ctx = empty_ctx();
        let prims = draw_site_plan(&site, &ctx, |p| Pt::new(p.x, p.y)).unwrap();
        assert!(prims
            .iter()
            .any(|p| matches!(p, SheetPrimitive::Circle { r, .. } if *r == 2.0)));
        assert!(prims
            .iter()
            .any(|p| matches!(p, SheetPrimitive::Rect { w, .. } if *w == 4.0)));
    }

    #[test]
    fn draw_site_plan_draws_an_alignment_centerline_and_offset() {
        let site = empty_site();
        let alignment = HorizontalAlignment::new(
            "a1",
            "Main Street",
            vec![
                AlignmentPi::simple(Point::new(0.0, 0.0)),
                AlignmentPi::simple(Point::new(0.0, 1000.0)),
            ],
            0.0,
        );
        let alignments = [alignment];
        let ctx = SitePlanContext {
            land_lot_nw_corner: None,
            alignments: &alignments,
        };
        let prims = draw_site_plan(&site, &ctx, |p| Pt::new(p.x, p.y)).unwrap();
        let polylines: Vec<_> = prims
            .iter()
            .filter(|p| matches!(p, SheetPrimitive::Polyline { .. }))
            .collect();
        // At least the red centerline itself (no offsets configured on this
        // alignment, so exactly one polyline).
        assert_eq!(polylines.len(), 1);
    }

    #[test]
    fn build_index_sheet_of_an_empty_site_has_no_key_map_but_has_the_index_table() {
        let set = sample_set(sample_sheet());
        let site = empty_site();
        let ctx = empty_ctx();
        let layout = sheet_layout(&sample_sheet(), PaperUnit::In);
        let prims = build_index_sheet(&set, &site, &ctx, &layout, &[]).unwrap();
        assert!(prims
            .iter()
            .any(|p| matches!(p, SheetPrimitive::Text { text, .. } if text == "SHEET INDEX")));
        assert!(!prims
            .iter()
            .any(|p| matches!(p, SheetPrimitive::Text { text, .. } if text == "KEY MAP")));
    }

    #[test]
    fn build_index_sheet_draws_a_key_map_when_the_site_has_bounds() {
        let set = sample_set(sample_sheet());
        let mut site = empty_site();
        site.elements = vec![PlanElement::Parcel(Parcel {
            base: new_base(
                "p1",
                ElementKind::Parcel,
                "Parcel 1",
                "l",
                square(0.0, 100.0),
            ),
            apn: None,
        })];
        let ctx = empty_ctx();
        let layout = sheet_layout(&sample_sheet(), PaperUnit::In);
        let match_line = MatchLine {
            id: "ml1".to_string(),
            at_line: [Point::new(0.0, 0.0), Point::new(100.0, 0.0)],
            adjoining_sheet: "C-102".to_string(),
            label: None,
        };
        let prims = build_index_sheet(&set, &site, &ctx, &layout, &[match_line]).unwrap();
        assert!(prims
            .iter()
            .any(|p| matches!(p, SheetPrimitive::Text { text, .. } if text == "KEY MAP")));
        assert!(prims
            .iter()
            .any(|p| matches!(p, SheetPrimitive::Line { color, .. } if color.as_deref() == Some("#b91c1c"))));
    }
}
