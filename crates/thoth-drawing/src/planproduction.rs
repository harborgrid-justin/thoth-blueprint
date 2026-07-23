//! Plan production sheets — automatically splitting a linear alignment
//! (a road, a corridor) into consecutive **View Frames** (sheet-sized plan
//! windows) with **Match Lines** at the page breaks, and composing a
//! [`crate::sheet::DrawingSet`] from them.
//!
//! Port of `packages/domain/src/drawing/planproduction.ts`.
//!
//! ## Scope note
//!
//! [`create_sheet_set_from_frames`] is fully ported — it only needs
//! [`ViewFrameGroup`] (this module) and [`crate::sheet`] types. `generateViewFrames`
//! from the TS source is **not-yet-ported**: it needs `ResolvedAlignment` and
//! `pointAtStation` from `thoth-civil`, which this crate does not depend on.
//! See `STATUS.md`.

use thoth_spatial::Point;

use crate::sheet::{DrawingSet, Sheet, SheetNumber, TitleBlockDefaults};
use crate::sheetsize::Orientation;

/// A single rectangular View Frame showing a station range along an alignment.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct ViewFrame {
    pub id: String,
    pub name: String,
    pub station_start: f64,
    pub station_end: f64,
    pub center: Point,
    /// Viewport width in model units.
    pub width: f64,
    /// Viewport height in model units.
    pub height: f64,
    /// Clockwise rotation angle in degrees to align the viewport.
    pub rotation_deg: f64,
}

/// A match line marking the page break boundary between two adjacent view frames.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct PlanMatchLine {
    pub id: String,
    pub station: f64,
    /// Left-to-right normal cut line segment in model coordinates.
    pub cut_line: [Point; 2],
    pub label: String,
}

/// A group organizing view frames and match lines along an alignment.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct ViewFrameGroup {
    pub id: String,
    pub name: String,
    pub alignment_id: String,
    pub frames: Vec<ViewFrame>,
    pub match_lines: Vec<PlanMatchLine>,
}

/// Create a Sheet Set ([`DrawingSet`]) from a View Frame Group.
///
/// The TS original stamps `titleBlockDefaults.date` with
/// `new Date().toLocaleDateString()` at call time — an impure, host-locale-
/// dependent side effect with no fixed cross-platform format. This port
/// takes `date` as an explicit parameter instead: the caller supplies an
/// already-formatted date string, keeping this function pure and its output
/// deterministic and testable.
pub fn create_sheet_set_from_frames(
    group: &ViewFrameGroup,
    drawing_set_name: &str,
    date: &str,
) -> DrawingSet {
    use crate::drafting::DisciplineCode;

    let sheets: Vec<Sheet> = group
        .frames
        .iter()
        .enumerate()
        .map(|(i, frame)| {
            let seq = (i + 1) as u32;
            Sheet {
                id: format!("sheet-{}", frame.id),
                number: SheetNumber {
                    discipline: DisciplineCode::C,
                    r#type: 1,
                    sequence: seq,
                },
                title: format!("ROAD PLAN SHEET - PART {seq}"),
                size: "arch-d".to_string(),
                orientation: Orientation::Landscape,
                scale_id: "1:500".to_string(),
                discipline: DisciplineCode::C,
                viewport_ids: vec![frame.id.clone()],
                revisions: vec![],
                notes: vec![],
                keynote_ids: vec![],
            }
        })
        .collect();

    DrawingSet {
        id: format!("set-{}", group.id),
        name: drawing_set_name.to_string(),
        sheets,
        title_block_defaults: TitleBlockDefaults {
            project_name: "BLUEPRINT CORRIDOR PLAN".to_string(),
            client: None,
            location: None,
            drawn_by: Some("Thoth AI".to_string()),
            checked_by: None,
            date: date.to_string(),
            project_number: None,
            firm_lines: vec![],
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_group() -> ViewFrameGroup {
        ViewFrameGroup {
            id: "vfg1".to_string(),
            name: "VFG".to_string(),
            alignment_id: "align1".to_string(),
            frames: vec![
                ViewFrame {
                    id: "frame-align1-1".to_string(),
                    name: "View Frame #1".to_string(),
                    station_start: 0.0,
                    station_end: 400.0,
                    center: Point::new(200.0, 0.0),
                    width: 400.0,
                    height: 250.0,
                    rotation_deg: 0.0,
                },
                ViewFrame {
                    id: "frame-align1-2".to_string(),
                    name: "View Frame #2".to_string(),
                    station_start: 340.0,
                    station_end: 740.0,
                    center: Point::new(540.0, 0.0),
                    width: 400.0,
                    height: 250.0,
                    rotation_deg: 0.0,
                },
            ],
            match_lines: vec![],
        }
    }

    #[test]
    fn create_sheet_set_from_frames_builds_one_sheet_per_frame() {
        let set = create_sheet_set_from_frames(&sample_group(), "Corridor Plan", "2024-01-01");
        assert_eq!(set.sheets.len(), 2);
        assert_eq!(
            set.sheets[0].viewport_ids,
            vec!["frame-align1-1".to_string()]
        );
        assert_eq!(set.sheets[1].number.sequence, 2);
        assert_eq!(set.name, "Corridor Plan");
    }

    #[test]
    fn create_sheet_set_from_frames_of_empty_group_has_no_sheets() {
        let group = ViewFrameGroup {
            id: "vfg2".to_string(),
            name: "Empty".to_string(),
            alignment_id: "a".to_string(),
            frames: vec![],
            match_lines: vec![],
        };
        let set = create_sheet_set_from_frames(&group, "Empty Set", "2024-01-01");
        assert!(set.sheets.is_empty());
    }
}
