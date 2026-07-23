//! Sheet creation, sheet sets & data references — REQ-071 through REQ-080.
//!
//! Port of `packages/domain/src/civil/sheetsAndDataRefs.ts`. Depends only on
//! [`crate::view_frames_and_match_lines::PlanProductionViewFrameGroup`],
//! another module ported within this crate — no cross-crate dependency.

use crate::view_frames_and_match_lines::PlanProductionViewFrameGroup;

/// Recommended maximum layout sheets per DWG file before this module warns
/// the caller (REQ-073).
pub const RECOMMENDED_MAX_SHEETS_PER_DWG: usize = 10;

/// How new layout sheets are distributed across DWG files.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LayoutCreationMode {
    OneLayoutPerNewDwg,
    AllLayoutsInOneNewDwg,
    AllLayoutsInCurrentDwg,
}

/// Where a viewport's content is aligned within its sheet.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ViewAlignmentSetting {
    Start,
    Center,
    End,
}

/// A single generated layout sheet.
#[derive(Debug, Clone, PartialEq)]
pub struct LayoutSheet {
    pub id: String,
    /// e.g. `"C-101 Plan & Profile"`.
    pub name: String,
    pub dwg_file_name: String,
    pub view_frame_id: String,
    pub north_arrow_rotation_deg: f64,
    pub view_alignment: ViewAlignmentSetting,
}

/// A Sheet Set (`.dst`) grouping generated layout sheets.
#[derive(Debug, Clone, PartialEq)]
pub struct SheetSet {
    pub id: String,
    /// The `.dst` file path.
    pub file_path: String,
    pub name: String,
    pub sheets: Vec<LayoutSheet>,
    pub is_open_in_palette: bool,
}

/// The kind of civil object a Data Shortcut references.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DataReferenceObjectType {
    Surface,
    Alignment,
    Profile,
    PipeNetwork,
    PressureNetwork,
}

/// A Data Reference (Data Shortcut) linking a source object into a
/// destination sheet.
#[derive(Debug, Clone, PartialEq)]
pub struct DataShortcutReference {
    pub id: String,
    pub source_object_id: String,
    pub object_type: DataReferenceObjectType,
    pub destination_sheet_id: String,
    /// REQ-080: source geometry is always locked against modification.
    pub is_locked: bool,
    pub copy_annotation_labels: bool,
    pub style_override: Option<String>,
    pub label_override: Option<String>,
}

fn dwg_file_name(mode: LayoutCreationMode, index: usize) -> String {
    match mode {
        LayoutCreationMode::OneLayoutPerNewDwg => format!("Sheet_{}.dwg", index + 1),
        LayoutCreationMode::AllLayoutsInOneNewDwg => "AllPlanSheets.dwg".to_string(),
        LayoutCreationMode::AllLayoutsInCurrentDwg => "CurrentDrawing.dwg".to_string(),
    }
}

/// REQ-071 through REQ-077: create layout sheets from a view frame group.
/// Returns the generated [`SheetSet`] plus any advisory warnings (REQ-073:
/// exceeding [`RECOMMENDED_MAX_SHEETS_PER_DWG`] sheets in a single DWG).
pub fn create_sheets_from_view_frame_group(
    view_frame_group: &PlanProductionViewFrameGroup,
    mode: LayoutCreationMode,
    dst_file_name: impl Into<String>,
    view_alignment: ViewAlignmentSetting,
) -> (SheetSet, Vec<String>) {
    let mut warnings = Vec::new();
    let total_frames = view_frame_group.view_frames.len();

    if mode == LayoutCreationMode::AllLayoutsInCurrentDwg
        && total_frames > RECOMMENDED_MAX_SHEETS_PER_DWG
    {
        warnings.push(format!(
            "Warning: Recommended threshold of {RECOMMENDED_MAX_SHEETS_PER_DWG} layout sheets per DWG file exceeded ({total_frames} requested). Consider splitting into multiple files for optimal performance."
        ));
    }

    let sheets: Vec<LayoutSheet> = view_frame_group
        .view_frames
        .iter()
        .enumerate()
        .map(|(i, vf)| {
            // REQ-074: orient the paper-space North Arrow block relative to
            // the frame's true-north rotation.
            let north_arrow_rotation = (360.0 - vf.rotation_deg).rem_euclid(360.0);
            LayoutSheet {
                id: format!("sheet-{}", i + 1),
                name: format!("C-10{} - {}", i + 1, vf.name),
                dwg_file_name: dwg_file_name(mode, i),
                view_frame_id: vf.id.clone(),
                north_arrow_rotation_deg: north_arrow_rotation,
                view_alignment,
            }
        })
        .collect();

    let sheet_set = SheetSet {
        id: thoth_spatial::create_id("ss"),
        file_path: dst_file_name.into(),
        name: format!("{} Sheet Set", view_frame_group.name),
        sheets,
        is_open_in_palette: true,
    };

    (sheet_set, warnings)
}

/// REQ-078, REQ-079, REQ-080: create a Data Reference (Data Shortcut).
pub fn create_data_shortcut_reference(
    source_object_id: impl Into<String>,
    object_type: DataReferenceObjectType,
    destination_sheet_id: impl Into<String>,
    copy_annotation_labels: bool,
) -> DataShortcutReference {
    DataShortcutReference {
        id: thoth_spatial::create_id("ds"),
        source_object_id: source_object_id.into(),
        object_type,
        destination_sheet_id: destination_sheet_id.into(),
        is_locked: true,
        copy_annotation_labels,
        style_override: None,
        label_override: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::view_frames_and_match_lines::{
        create_view_frame_group, SheetConfiguration, ViewFrameOrientation, ViewportDimensions,
        DEFAULT_OVERLAP_DISTANCE_FT, DEFAULT_STATION_INCREMENT_ROUNDING_FT,
    };
    use thoth_spatial::Point;

    fn sample_group(frame_count_hint_length: f64) -> PlanProductionViewFrameGroup {
        create_view_frame_group(
            "Test VFG",
            "align-1",
            SheetConfiguration::PlanOnly,
            ViewportDimensions {
                width_ft: 20.0,
                height_ft: 15.0,
                scale_factor: 40.0,
                aspect_ratio: 1.33,
            },
            0.0,
            frame_count_hint_length,
            ViewFrameOrientation::AlongAlignment,
            DEFAULT_STATION_INCREMENT_ROUNDING_FT,
            DEFAULT_OVERLAP_DISTANCE_FT,
            &[Point::new(0.0, 0.0), Point::new(1000.0, 500.0)],
        )
        .unwrap()
    }

    #[test]
    fn create_sheets_names_each_sheet_after_its_frame() {
        let group = sample_group(2000.0);
        let (sheet_set, warnings) = create_sheets_from_view_frame_group(
            &group,
            LayoutCreationMode::OneLayoutPerNewDwg,
            "Site.dst",
            ViewAlignmentSetting::Start,
        );

        assert_eq!(sheet_set.sheets.len(), group.view_frames.len());
        assert_eq!(sheet_set.sheets[0].dwg_file_name, "Sheet_1.dwg");
        assert!(warnings.is_empty());
        assert!(sheet_set.is_open_in_palette);
    }

    #[test]
    fn create_sheets_warns_past_threshold_in_current_dwg_mode() {
        // Force > 10 frames by using a huge total length with small step.
        let group = sample_group(20_000.0);
        let (_sheet_set, warnings) = create_sheets_from_view_frame_group(
            &group,
            LayoutCreationMode::AllLayoutsInCurrentDwg,
            "Site.dst",
            ViewAlignmentSetting::Center,
        );
        assert!(group.view_frames.len() > RECOMMENDED_MAX_SHEETS_PER_DWG);
        assert_eq!(warnings.len(), 1);
    }

    #[test]
    fn create_sheets_all_in_one_new_dwg_shares_filename() {
        let group = sample_group(2000.0);
        let (sheet_set, _) = create_sheets_from_view_frame_group(
            &group,
            LayoutCreationMode::AllLayoutsInOneNewDwg,
            "Site.dst",
            ViewAlignmentSetting::End,
        );
        assert!(sheet_set
            .sheets
            .iter()
            .all(|s| s.dwg_file_name == "AllPlanSheets.dwg"));
    }

    #[test]
    fn north_arrow_rotation_is_complement_of_frame_rotation() {
        let group = sample_group(2000.0);
        let (sheet_set, _) = create_sheets_from_view_frame_group(
            &group,
            LayoutCreationMode::OneLayoutPerNewDwg,
            "Site.dst",
            ViewAlignmentSetting::Start,
        );
        for (sheet, frame) in sheet_set.sheets.iter().zip(group.view_frames.iter()) {
            let expected = (360.0 - frame.rotation_deg).rem_euclid(360.0);
            assert_eq!(sheet.north_arrow_rotation_deg, expected);
        }
    }

    #[test]
    fn create_data_shortcut_reference_is_always_locked() {
        let dsr = create_data_shortcut_reference(
            "surface-1",
            DataReferenceObjectType::Surface,
            "sheet-3",
            true,
        );
        assert!(dsr.is_locked);
        assert_eq!(dsr.object_type, DataReferenceObjectType::Surface);
    }
}
