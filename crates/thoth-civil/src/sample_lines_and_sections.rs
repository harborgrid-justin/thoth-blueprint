//! Cross-section sample line groups & section-sheet plotting — REQ-081
//! through REQ-088, REQ-154 through REQ-160.
//!
//! Port of `packages/domain/src/civil/sampleLinesAndSections.ts`. The TS
//! source imports `Point2D` from
//! `packages/domain/src/survey/transparentCommands` (here:
//! `thoth_spatial::Point`) and `SheetSet` from
//! `./sheetsAndDataRefs` (here: [`crate::sheets_and_data_refs::SheetSet`],
//! another module ported within this crate — no cross-crate dependency).

use thoth_spatial::Point;

use crate::error::{CivilError, CivilResult};
use crate::sheets_and_data_refs::{LayoutSheet, SheetSet, ViewAlignmentSetting};

/// Default swath widths and increments for a new sample line group
/// (mirrors the TS default parameters).
pub const DEFAULT_SWATH_WIDTH_FT: f64 = 50.0;
pub const DEFAULT_TANGENT_INCREMENT_FT: f64 = 50.0;
pub const DEFAULT_CURVE_INCREMENT_FT: f64 = 25.0;
pub const DEFAULT_SPIRAL_INCREMENT_FT: f64 = 25.0;

/// Section views generated per sheet before a new sheet is started
/// (mirrors the TS `Math.ceil(views.length / 6)`).
pub const SECTION_VIEWS_PER_SHEET: usize = 6;

/// A single sample line (station cut) across an alignment.
#[derive(Debug, Clone, PartialEq)]
pub struct CivilSampleLine {
    pub id: String,
    pub name: String,
    pub station: f64,
    pub left_swath_width_ft: f64,
    pub right_swath_width_ft: f64,
    pub center_point: Point,
}

/// A named group of sample lines along one alignment.
#[derive(Debug, Clone, PartialEq)]
pub struct CivilSampleLineGroup {
    pub id: String,
    pub name: String,
    pub alignment_id: String,
    pub sample_lines: Vec<CivilSampleLine>,
    pub tangent_increment_ft: f64,
    pub curve_increment_ft: f64,
    pub spiral_increment_ft: f64,
}

/// How a group of section views is arrayed on a sheet grid (REQ-155,
/// REQ-156).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SectionPlotArrayOrder {
    ByRows,
    ByColumns,
}

/// Which grid corner a section-view array starts filling from (REQ-158).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SectionPlotStartingCorner {
    UpperLeft,
    UpperRight,
    LowerLeft,
    LowerRight,
}

/// A named section-view grid layout style.
#[derive(Debug, Clone, PartialEq)]
pub struct GroupPlotStyle {
    pub id: String,
    pub name: String,
    pub plot_layout: SectionPlotArrayOrder,
    pub starting_corner: SectionPlotStartingCorner,
    /// REQ-160.
    pub buffer_space_ft: f64,
    /// REQ-159.
    pub column_spacing_ft: f64,
    /// REQ-159.
    pub row_spacing_ft: f64,
    pub max_columns: usize,
    /// REQ-157.
    pub align_centerline: bool,
    /// REQ-154: draft mode plots directly in model space without requiring
    /// a Section-type layout viewport.
    pub is_draft_mode: bool,
}

impl Default for GroupPlotStyle {
    fn default() -> Self {
        GroupPlotStyle {
            id: "gps-std".to_string(),
            name: "Standard Grid".to_string(),
            plot_layout: SectionPlotArrayOrder::ByRows,
            starting_corner: SectionPlotStartingCorner::UpperLeft,
            buffer_space_ft: 20.0,
            column_spacing_ft: 100.0,
            row_spacing_ft: 80.0,
            max_columns: 4,
            align_centerline: true,
            is_draft_mode: false,
        }
    }
}

/// A generated model-space section view for one sample line.
#[derive(Debug, Clone, PartialEq)]
pub struct CivilSectionView {
    pub id: String,
    pub sample_line_id: String,
    pub station: f64,
    pub elevation_min: f64,
    pub elevation_max: f64,
    pub offset_min: f64,
    pub offset_max: f64,
    pub grid_row: usize,
    pub grid_column: usize,
    pub model_space_position: Point,
}

/// A caller-provided offset/elevation window override for
/// [`create_multiple_section_views`].
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Range {
    pub min: f64,
    pub max: f64,
}

/// REQ-081, REQ-082, REQ-083: sample lines along an alignment by station
/// range and swath widths.
#[allow(clippy::too_many_arguments)]
pub fn create_sample_line_group(
    name: impl Into<String>,
    alignment_id: impl Into<String>,
    station_start: f64,
    station_end: f64,
    left_swath_width_ft: f64,
    right_swath_width_ft: f64,
    tangent_increment_ft: f64,
    curve_increment_ft: f64,
    spiral_increment_ft: f64,
) -> CivilResult<CivilSampleLineGroup> {
    if tangent_increment_ft <= 0.0 {
        return Err(CivilError::NonPositiveInterval {
            value: tangent_increment_ft,
        });
    }

    let mut sample_lines = Vec::new();
    let mut current_station = station_start;
    let mut index = 1;

    while current_station <= station_end {
        sample_lines.push(CivilSampleLine {
            id: format!("sl-{index}"),
            name: format!("SL - {current_station:.0}"),
            station: current_station,
            left_swath_width_ft,
            right_swath_width_ft,
            center_point: Point::new(current_station * 0.95, current_station * 0.1),
        });

        index += 1;
        current_station += tangent_increment_ft;
    }

    Ok(CivilSampleLineGroup {
        id: thoth_spatial::create_id("slg"),
        name: name.into(),
        alignment_id: alignment_id.into(),
        sample_lines,
        tangent_increment_ft,
        curve_increment_ft,
        spiral_increment_ft,
    })
}

/// REQ-084 through REQ-087: create a section view per sample line, arrayed
/// into a model-space grid per `group_plot_style` (or the standard grid,
/// [`GroupPlotStyle::default`], if none is given).
pub fn create_multiple_section_views(
    sample_line_group: &CivilSampleLineGroup,
    template_contains_section_viewport: bool,
    group_plot_style: Option<&GroupPlotStyle>,
    custom_offset_range: Option<Range>,
    custom_elevation_range: Option<Range>,
) -> CivilResult<Vec<CivilSectionView>> {
    let owned_default;
    let plot_style = match group_plot_style {
        Some(style) => style,
        None => {
            owned_default = GroupPlotStyle::default();
            &owned_default
        }
    };

    if !template_contains_section_viewport && !plot_style.is_draft_mode {
        return Err(CivilError::PrerequisiteViolation {
            reason: "REQ-085 Prerequisite Violation: Layout template must contain a Section-type viewport for section sheet generation.".to_string(),
        });
    }

    let col_spacing = plot_style.column_spacing_ft + plot_style.buffer_space_ft;
    let row_spacing = plot_style.row_spacing_ft + plot_style.buffer_space_ft;

    let views = sample_line_group
        .sample_lines
        .iter()
        .enumerate()
        .map(|(idx, sl)| {
            let (row, col) = match plot_style.plot_layout {
                SectionPlotArrayOrder::ByRows => {
                    (idx / plot_style.max_columns, idx % plot_style.max_columns)
                }
                SectionPlotArrayOrder::ByColumns => {
                    (idx % plot_style.max_columns, idx / plot_style.max_columns)
                }
            };

            let mut pos_x = col as f64 * col_spacing;
            let mut pos_y = -(row as f64) * row_spacing;

            match plot_style.starting_corner {
                SectionPlotStartingCorner::UpperRight => pos_x = -(col as f64) * col_spacing,
                SectionPlotStartingCorner::LowerLeft => pos_y = row as f64 * row_spacing,
                _ => {}
            }

            CivilSectionView {
                id: format!("secview-{}", sl.id),
                sample_line_id: sl.id.clone(),
                station: sl.station,
                elevation_min: custom_elevation_range.map(|r| r.min).unwrap_or(100.0),
                elevation_max: custom_elevation_range.map(|r| r.max).unwrap_or(150.0),
                offset_min: custom_offset_range
                    .map(|r| r.min)
                    .unwrap_or(-sl.left_swath_width_ft),
                offset_max: custom_offset_range
                    .map(|r| r.max)
                    .unwrap_or(sl.right_swath_width_ft),
                grid_row: row,
                grid_column: col,
                model_space_position: Point::new(pos_x, pos_y),
            }
        })
        .collect();

    Ok(views)
}

/// REQ-088: convert section view arrays into paper-space plot layouts
/// integrated with a Sheet Set.
pub fn create_section_sheets(
    views: &[CivilSectionView],
    sheet_set_name: impl Into<String>,
) -> SheetSet {
    let sheet_set_name = sheet_set_name.into();
    let sheet_count = views.len().div_ceil(SECTION_VIEWS_PER_SHEET);

    let sheets = (0..sheet_count)
        .map(|i| LayoutSheet {
            id: format!("sec-sheet-{}", i + 1),
            name: format!("Sec Sheet {}", i + 1),
            dwg_file_name: format!("CrossSections_{}.dwg", i + 1),
            view_frame_id: format!("vf-sec-{}", i + 1),
            north_arrow_rotation_deg: 0.0,
            view_alignment: ViewAlignmentSetting::Center,
        })
        .collect();

    SheetSet {
        id: thoth_spatial::create_id("ss-sec"),
        file_path: sheet_set_name.clone(),
        name: sheet_set_name,
        sheets,
        is_open_in_palette: true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_group() -> CivilSampleLineGroup {
        create_sample_line_group(
            "SLG-1",
            "align-1",
            0.0,
            500.0,
            DEFAULT_SWATH_WIDTH_FT,
            DEFAULT_SWATH_WIDTH_FT,
            DEFAULT_TANGENT_INCREMENT_FT,
            DEFAULT_CURVE_INCREMENT_FT,
            DEFAULT_SPIRAL_INCREMENT_FT,
        )
        .unwrap()
    }

    #[test]
    fn create_sample_line_group_steps_by_tangent_increment() {
        let group = sample_group();
        assert_eq!(group.sample_lines.len(), 11); // 0, 50, ..., 500
        assert_eq!(group.sample_lines[0].station, 0.0);
        assert_eq!(group.sample_lines.last().unwrap().station, 500.0);
    }

    #[test]
    fn create_sample_line_group_rejects_non_positive_increment() {
        let err =
            create_sample_line_group("SLG", "align-1", 0.0, 500.0, 50.0, 50.0, 0.0, 25.0, 25.0)
                .unwrap_err();
        assert_eq!(err, CivilError::NonPositiveInterval { value: 0.0 });
    }

    #[test]
    fn create_multiple_section_views_grids_by_rows() {
        let group = sample_group();
        let views = create_multiple_section_views(&group, true, None, None, None).unwrap();
        assert_eq!(views.len(), group.sample_lines.len());
        assert_eq!(views[0].grid_row, 0);
        assert_eq!(views[0].grid_column, 0);
        assert_eq!(views[4].grid_row, 1); // max_columns defaults to 4
    }

    #[test]
    fn create_multiple_section_views_requires_section_viewport_unless_draft() {
        let group = sample_group();
        let err = create_multiple_section_views(&group, false, None, None, None).unwrap_err();
        assert!(matches!(err, CivilError::PrerequisiteViolation { .. }));

        let draft_style = GroupPlotStyle {
            is_draft_mode: true,
            ..GroupPlotStyle::default()
        };
        let views =
            create_multiple_section_views(&group, false, Some(&draft_style), None, None).unwrap();
        assert_eq!(views.len(), group.sample_lines.len());
    }

    #[test]
    fn create_multiple_section_views_honors_custom_ranges() {
        let group = sample_group();
        let views = create_multiple_section_views(
            &group,
            true,
            None,
            Some(Range {
                min: -75.0,
                max: 75.0,
            }),
            Some(Range {
                min: 90.0,
                max: 140.0,
            }),
        )
        .unwrap();
        assert_eq!(views[0].offset_min, -75.0);
        assert_eq!(views[0].offset_max, 75.0);
        assert_eq!(views[0].elevation_min, 90.0);
        assert_eq!(views[0].elevation_max, 140.0);
    }

    #[test]
    fn create_section_sheets_batches_six_per_sheet() {
        let group = sample_group();
        let views = create_multiple_section_views(&group, true, None, None, None).unwrap();
        let sheet_set = create_section_sheets(&views, "CrossSections.dst");
        assert_eq!(
            sheet_set.sheets.len(),
            views.len().div_ceil(SECTION_VIEWS_PER_SHEET)
        );
        assert!(sheet_set.is_open_in_palette);
    }
}
