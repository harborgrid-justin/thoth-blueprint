//! Imperial paper-space layout templates — REQ-130 through REQ-141,
//! REQ-148, REQ-149.
//!
//! Port of `packages/domain/src/civil/layoutTemplates.ts`. Depends only on
//! [`crate::view_frames_and_match_lines`], another module ported within
//! this crate — no cross-crate dependency.

use thoth_spatial::Point;

use crate::view_frames_and_match_lines::{PlanProductionViewFrame, PlanProductionViewFrameGroup};

/// A standard ANSI D (24"x36") imperial sheet layout family.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImperialTemplateType {
    PlanOnly,
    ProfileOnly,
    PlanOverPlan,
    Section,
}

/// One viewport's display lock and annotation scale.
#[derive(Debug, Clone, PartialEq)]
pub struct LayoutViewportConfig {
    pub id: String,
    pub name: String,
    /// REQ-134: viewport scale is locked against accidental zoom.
    pub display_locked: bool,
    /// REQ-135, e.g. `1"=40'`.
    pub annotation_scale: String,
    pub scale_factor: f64,
}

/// The kind of ribbon (title-block adjacent) layout element.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RibbonElementType {
    Legend,
    NorthArrow,
    ScaleBar,
}

/// REQ-136: a legend/north-arrow/scale-bar element placed on the sheet.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RibbonLayoutElement {
    pub element_type: RibbonElementType,
    pub position: Point,
    pub scale: f64,
}

/// REQ-139, REQ-140, REQ-141: profile-band title styling.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ProfileBandStyleConfig {
    pub textbox_width_ft: f64,
    pub textbox_offset_ft: f64,
    pub show_band_borders: bool,
    pub show_band_title_box: bool,
}

/// Sheet physical dimensions, in inches.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SheetDimensions {
    pub width_inches: f64,
    pub height_inches: f64,
}

/// A complete imperial layout template.
#[derive(Debug, Clone, PartialEq)]
pub struct ImperialLayoutTemplate {
    pub id: String,
    pub name: String,
    pub template_type: ImperialTemplateType,
    pub sheet_dimensions: SheetDimensions,
    pub viewports: Vec<LayoutViewportConfig>,
    pub ribbon_elements: Vec<RibbonLayoutElement>,
    pub profile_band_style: ProfileBandStyleConfig,
}

fn viewport(
    id: &str,
    name: &str,
    scale_factor: f64,
    annotation_scale: &str,
) -> LayoutViewportConfig {
    LayoutViewportConfig {
        id: id.to_string(),
        name: name.to_string(),
        display_locked: true,
        annotation_scale: annotation_scale.to_string(),
        scale_factor,
    }
}

/// REQ-130 through REQ-133: the standard ANSI D imperial template for a
/// given sheet configuration.
pub fn get_standard_imperial_template(
    template_type: ImperialTemplateType,
) -> ImperialLayoutTemplate {
    let (name, viewports) = match template_type {
        ImperialTemplateType::PlanOnly => (
            "ANSI D 24x36 Imperial Plan Only (REQ-130)",
            vec![viewport("vp-plan", "Plan Viewport", 40.0, "1\"=40'")],
        ),
        ImperialTemplateType::ProfileOnly => (
            "ANSI D 24x36 Imperial Profile Only (REQ-131)",
            vec![viewport("vp-prof", "Profile Viewport", 40.0, "1\"=40'")],
        ),
        ImperialTemplateType::PlanOverPlan => (
            "ANSI D 24x36 Imperial Plan over Plan (REQ-132)",
            vec![
                viewport("vp-plan-top", "Top Plan Viewport", 40.0, "1\"=40'"),
                viewport("vp-plan-bot", "Bottom Plan Viewport", 40.0, "1\"=40'"),
            ],
        ),
        ImperialTemplateType::Section => (
            "ANSI D 24x36 Imperial Section Viewport (REQ-133)",
            vec![viewport("vp-sec", "Section Viewport", 10.0, "1\"=10'")],
        ),
    };

    ImperialLayoutTemplate {
        id: format!("tmpl-{template_type:?}"),
        name: name.to_string(),
        template_type,
        sheet_dimensions: SheetDimensions {
            width_inches: 36.0,
            height_inches: 24.0,
        },
        viewports,
        ribbon_elements: vec![
            RibbonLayoutElement {
                element_type: RibbonElementType::NorthArrow,
                position: Point::new(34.0, 22.0),
                scale: 1.0,
            },
            RibbonLayoutElement {
                element_type: RibbonElementType::ScaleBar,
                position: Point::new(30.0, 2.0),
                scale: 1.0,
            },
            RibbonLayoutElement {
                element_type: RibbonElementType::Legend,
                position: Point::new(32.0, 10.0),
                scale: 1.0,
            },
        ],
        profile_band_style: ProfileBandStyleConfig {
            textbox_width_ft: 2.5,
            textbox_offset_ft: 0.5,
            show_band_borders: true,
            show_band_title_box: true,
        },
    }
}

/// REQ-139: shift required for a profile view within its viewport to
/// accommodate the profile band title.
pub fn calculate_profile_view_shift(band_title_width_ft: f64, title_offset_ft: f64) -> f64 {
    band_title_width_ft + title_offset_ft
}

/// REQ-149: manually select a subset of a view frame group's frames rather
/// than processing the entire group when creating sheets.
pub fn filter_selected_view_frames(
    group: &PlanProductionViewFrameGroup,
    selected_frame_ids: &[String],
) -> Vec<PlanProductionViewFrame> {
    group
        .view_frames
        .iter()
        .filter(|vf| selected_frame_ids.iter().any(|id| id == &vf.id))
        .cloned()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::view_frames_and_match_lines::{
        create_view_frame_group, SheetConfiguration, ViewFrameOrientation, ViewportDimensions,
        DEFAULT_OVERLAP_DISTANCE_FT, DEFAULT_STATION_INCREMENT_ROUNDING_FT,
    };

    #[test]
    fn plan_only_template_has_one_viewport() {
        let tmpl = get_standard_imperial_template(ImperialTemplateType::PlanOnly);
        assert_eq!(tmpl.viewports.len(), 1);
        assert_eq!(tmpl.sheet_dimensions.width_inches, 36.0);
        assert_eq!(tmpl.ribbon_elements.len(), 3);
    }

    #[test]
    fn plan_over_plan_template_has_two_viewports() {
        let tmpl = get_standard_imperial_template(ImperialTemplateType::PlanOverPlan);
        assert_eq!(tmpl.viewports.len(), 2);
    }

    #[test]
    fn section_template_uses_ten_scale() {
        let tmpl = get_standard_imperial_template(ImperialTemplateType::Section);
        assert_eq!(tmpl.viewports[0].scale_factor, 10.0);
    }

    #[test]
    fn calculate_profile_view_shift_sums_width_and_offset() {
        assert_eq!(calculate_profile_view_shift(2.5, 0.5), 3.0);
    }

    #[test]
    fn filter_selected_view_frames_keeps_only_selected_ids() {
        let group = create_view_frame_group(
            "VFG",
            "align-1",
            SheetConfiguration::PlanOnly,
            ViewportDimensions {
                width_ft: 20.0,
                height_ft: 15.0,
                scale_factor: 40.0,
                aspect_ratio: 1.33,
            },
            0.0,
            2000.0,
            ViewFrameOrientation::AlongAlignment,
            DEFAULT_STATION_INCREMENT_ROUNDING_FT,
            DEFAULT_OVERLAP_DISTANCE_FT,
            &[Point::new(0.0, 0.0), Point::new(1000.0, 500.0)],
        )
        .unwrap();

        let selected_id = group.view_frames[0].id.clone();
        let selected = filter_selected_view_frames(&group, std::slice::from_ref(&selected_id));

        assert_eq!(selected.len(), 1);
        assert_eq!(selected[0].id, selected_id);
    }
}
