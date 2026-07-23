//! Door swing-path and window glazing-polygon geometry algorithms. Port of
//! `packages/domain/src/planning/doorwindow.ts`'s `calculateDoorGeometry` and
//! `calculateWindowGeometry`, and `types/doorwindow.ts`.
//!
//! [`crate::elements::DoorElement`]/[`crate::elements::WindowElement`] are
//! already ported; this module is the geometry algorithm layered on top:
//! swing arcs (IBC 1010.1.1 egress-width and ADA 404.2.4.4 threshold-height
//! compliance warnings included), sill/threshold/glazing polygons, and a
//! hardware anchor point.
//!
//! **Not ported**: `compileUnitSchedule` (a door/window schedule builder that
//! looks hardware/fire-rating up in `globalPartsDb.searchParts`) stays
//! **not-yet-ported** for the same dependency-order reason as this crate's
//! other catalog-backed helpers — see `GAP_CLOSE_STATUS.md` item 3.

use serde::{Deserialize, Serialize};
use thoth_spatial::{distance, Point};

use crate::elements::{DoorElement, DoorOperation, WindowElement};
use crate::federal_data;

/// Computed swing/sill/threshold geometry + code-compliance warnings for a
/// [`DoorElement`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DoorGeometryResults {
    pub swing_path: Vec<Point>,
    pub door_panel_polygon: Vec<Point>,
    pub sill_polygon: Vec<Point>,
    pub threshold_polygon: Vec<Point>,
    pub hardware_anchor: Point,
    pub warnings: Vec<String>,
}

/// Computed sill/glazing/sash geometry + a natural-light warning for a
/// [`WindowElement`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WindowGeometryResults {
    pub glazing_polygons: Vec<Vec<Point>>,
    pub sill_polygon: Vec<Point>,
    pub sash_polygons: Vec<Vec<Point>>,
    pub warnings: Vec<String>,
}

/// The door's plan-space centerline endpoints and wall-slot thickness,
/// derived from its boundary polygon (falling back to sensible defaults for
/// a boundary that isn't a well-formed 4-point opening rectangle).
fn centerline(boundary: &[Point], depth_fallback: f64) -> (Point, Point, f64) {
    if boundary.len() >= 4 {
        let p_left = Point::new(
            (boundary[0].x + boundary[3].x) / 2.0,
            (boundary[0].y + boundary[3].y) / 2.0,
        );
        let p_right = Point::new(
            (boundary[1].x + boundary[2].x) / 2.0,
            (boundary[1].y + boundary[2].y) / 2.0,
        );
        let wall_thickness = {
            let d = distance(boundary[3], boundary[0]);
            if d == 0.0 {
                depth_fallback
            } else {
                d
            }
        };
        (p_left, p_right, wall_thickness)
    } else if boundary.len() >= 2 {
        (boundary[0], boundary[1], depth_fallback)
    } else {
        (Point::new(0.0, 0.0), Point::new(1.0, 0.0), depth_fallback)
    }
}

/// Compute swing-path, panel, sill/threshold, and hardware-anchor geometry
/// for a [`DoorElement`], plus IBC/ADA compliance warnings.
///
/// Cites IBC 1010.1.1 (minimum 32" / 0.81 m clear egress width) and ADA
/// 404.2.4.4 (maximum 0.5" / 12.7 mm threshold height).
pub fn calculate_door_geometry(door: &DoorElement) -> DoorGeometryResults {
    let mut warnings = Vec::new();
    let depth_fallback = if door.depth != 0.0 { door.depth } else { 0.15 };
    let (p_left, p_right, wall_thickness) = centerline(&door.base.boundary, depth_fallback);

    let dx = p_right.x - p_left.x;
    let dy = p_right.y - p_left.y;
    let width = if door.width != 0.0 {
        door.width
    } else {
        let d = distance(p_right, p_left);
        if d == 0.0 {
            0.9
        } else {
            d
        }
    };
    let cos = dx / if width != 0.0 { width } else { 1.0 };
    let sin = dy / if width != 0.0 { width } else { 1.0 };
    let normal_x = -sin;
    let normal_y = cos;

    // 1. Swing path arc(s).
    let angle_deg = door.swing_angle.unwrap_or(90.0);
    let angle_rad = angle_deg.to_radians();
    let mut swing_path = Vec::new();

    match door.door_operation {
        DoorOperation::Swing => {
            let steps = 18;
            for i in 0..=steps {
                let phi = (i as f64 / steps as f64) * angle_rad;
                let x = p_left.x + width * (phi.cos() * cos - phi.sin() * normal_x);
                let y = p_left.y + width * (phi.cos() * sin - phi.sin() * normal_y);
                swing_path.push(Point::new(x, y));
            }
        }
        DoorOperation::DoubleSwing => {
            let half_w = width / 2.0;
            let steps = 10;
            for i in 0..=steps {
                let phi = (i as f64 / steps as f64) * angle_rad;
                let x = p_left.x + half_w * (phi.cos() * cos - phi.sin() * normal_x);
                let y = p_left.y + half_w * (phi.cos() * sin - phi.sin() * normal_y);
                swing_path.push(Point::new(x, y));
            }
            for i in 0..=steps {
                let phi = (i as f64 / steps as f64) * angle_rad;
                let x = p_right.x - half_w * (phi.cos() * cos + phi.sin() * normal_x);
                let y = p_right.y - half_w * (phi.cos() * sin + phi.sin() * normal_y);
                swing_path.push(Point::new(x, y));
            }
        }
        DoorOperation::Folding => {
            swing_path.push(p_left);
            swing_path.push(Point::new(
                p_left.x + (width / 4.0) * cos + (width / 6.0) * normal_x,
                p_left.y + (width / 4.0) * sin + (width / 6.0) * normal_y,
            ));
            swing_path.push(Point::new(
                p_left.x + (width / 2.0) * cos,
                p_left.y + (width / 2.0) * sin,
            ));
        }
        DoorOperation::Slide | DoorOperation::Pocket | DoorOperation::Overhead => {
            // No swing path for sliding/pocket/overhead operation, matching
            // the TS original's uncovered `else` branch.
        }
    }

    // 2. Door panel outline, rotated by the swing angle for a hinged swing.
    let p_angle_rad = if matches!(door.door_operation, DoorOperation::Swing) {
        angle_rad
    } else {
        0.0
    };
    let panel_x_start = p_left.x;
    let panel_y_start = p_left.y;
    let panel_x_end = p_left.x + width * (p_angle_rad.cos() * cos - p_angle_rad.sin() * normal_x);
    let panel_y_end = p_left.y + width * (p_angle_rad.cos() * sin - p_angle_rad.sin() * normal_y);
    let thick = 0.04;

    let door_panel_polygon = vec![
        Point::new(
            panel_x_start - (thick / 2.0) * normal_x,
            panel_y_start - (thick / 2.0) * normal_y,
        ),
        Point::new(
            panel_x_start + (thick / 2.0) * normal_x,
            panel_y_start + (thick / 2.0) * normal_y,
        ),
        Point::new(
            panel_x_end + (thick / 2.0) * normal_x,
            panel_y_end + (thick / 2.0) * normal_y,
        ),
        Point::new(
            panel_x_end - (thick / 2.0) * normal_x,
            panel_y_end - (thick / 2.0) * normal_y,
        ),
    ];

    // 3. Sill and threshold.
    let sill_thick = door.sill_thickness.unwrap_or(0.05);
    let sill_over = door.sill_overhang.unwrap_or(0.03);
    let thresh_h = door.threshold_height.unwrap_or(0.015);

    let sill_polygon = vec![
        Point::new(
            p_left.x - sill_over * cos + (wall_thickness / 2.0) * normal_x,
            p_left.y - sill_over * sin + (wall_thickness / 2.0) * normal_y,
        ),
        Point::new(
            p_right.x + sill_over * cos + (wall_thickness / 2.0) * normal_x,
            p_right.y + sill_over * sin + (wall_thickness / 2.0) * normal_y,
        ),
        Point::new(
            p_right.x + sill_over * cos + (wall_thickness / 2.0 + sill_thick) * normal_x,
            p_right.y + sill_over * sin + (wall_thickness / 2.0 + sill_thick) * normal_y,
        ),
        Point::new(
            p_left.x - sill_over * cos + (wall_thickness / 2.0 + sill_thick) * normal_x,
            p_left.y - sill_over * sin + (wall_thickness / 2.0 + sill_thick) * normal_y,
        ),
    ];

    let threshold_polygon = vec![
        Point::new(
            p_left.x - (wall_thickness / 2.0) * normal_x,
            p_left.y - (wall_thickness / 2.0) * normal_y,
        ),
        Point::new(
            p_right.x - (wall_thickness / 2.0) * normal_x,
            p_right.y - (wall_thickness / 2.0) * normal_y,
        ),
        Point::new(
            p_right.x + (wall_thickness / 2.0) * normal_x,
            p_right.y + (wall_thickness / 2.0) * normal_y,
        ),
        Point::new(
            p_left.x + (wall_thickness / 2.0) * normal_x,
            p_left.y + (wall_thickness / 2.0) * normal_y,
        ),
    ];

    // 4. Hardware anchor, 90% along the panel from the hinge.
    let hardware_anchor = Point::new(
        p_left.x + width * 0.9 * (p_angle_rad.cos() * cos - p_angle_rad.sin() * normal_x),
        p_left.y + width * 0.9 * (p_angle_rad.cos() * sin - p_angle_rad.sin() * normal_y),
    );

    // IBC 1010.1.1: minimum door clear width 32 inches / 0.81 m.
    if width < 0.81 {
        warnings.push(format!(
            "Door width {width:.2}m is below minimum building egress code clear width limit (0.81m / 32 inches)."
        ));
    }
    // ADA 404.2.4.4: max threshold height 0.5 inches / 12.7mm.
    if thresh_h > 0.0127 {
        warnings.push(format!(
            "Threshold height {:.1}mm exceeds ADA compliance limit (12.7mm / 0.5 inches).",
            thresh_h * 1000.0
        ));
    }

    DoorGeometryResults {
        swing_path,
        door_panel_polygon,
        sill_polygon,
        threshold_polygon,
        hardware_anchor,
        warnings,
    }
}

/// Compute sill, glazing, and sash geometry for a [`WindowElement`], plus a
/// natural-lighting compliance warning against the IBC/IRC glazing-to-room
/// area minimum (default 8% — [`crate::federal_data::Structural::ibc_min_natural_light_ratio`]).
pub fn calculate_window_geometry(win: &WindowElement) -> WindowGeometryResults {
    let mut warnings = Vec::new();
    let depth_fallback = if win.depth != 0.0 { win.depth } else { 0.15 };
    let (p_left, p_right, wall_thickness) = centerline(&win.base.boundary, depth_fallback);

    let dx = p_right.x - p_left.x;
    let dy = p_right.y - p_left.y;
    let width = if win.width != 0.0 {
        win.width
    } else {
        let d = distance(p_right, p_left);
        if d == 0.0 {
            1.2
        } else {
            d
        }
    };
    let cos = dx / if width != 0.0 { width } else { 1.0 };
    let sin = dy / if width != 0.0 { width } else { 1.0 };
    let normal_x = -sin;
    let normal_y = cos;

    // 1. Sill.
    let sill_thick = win.sill_thickness.unwrap_or(0.06);
    let sill_over = win.sill_overhang.unwrap_or(0.04);

    let sill_polygon = vec![
        Point::new(
            p_left.x - sill_over * cos + (wall_thickness / 2.0) * normal_x,
            p_left.y - sill_over * sin + (wall_thickness / 2.0) * normal_y,
        ),
        Point::new(
            p_right.x + sill_over * cos + (wall_thickness / 2.0) * normal_x,
            p_right.y + sill_over * sin + (wall_thickness / 2.0) * normal_y,
        ),
        Point::new(
            p_right.x + sill_over * cos + (wall_thickness / 2.0 + sill_thick) * normal_x,
            p_right.y + sill_over * sin + (wall_thickness / 2.0 + sill_thick) * normal_y,
        ),
        Point::new(
            p_left.x - sill_over * cos + (wall_thickness / 2.0 + sill_thick) * normal_x,
            p_left.y - sill_over * sin + (wall_thickness / 2.0 + sill_thick) * normal_y,
        ),
    ];

    // 2. Glazing panel outline (standard 0.05m frame border, double-glazing
    // thickness representation).
    let border = 0.05;
    let glass_w = width - 2.0 * border;
    let thick = 0.016;

    let g_start_x = p_left.x + border * cos;
    let g_start_y = p_left.y + border * sin;
    let g_end_x = p_right.x - border * cos;
    let g_end_y = p_right.y - border * sin;

    let glazing_polygons = vec![vec![
        Point::new(
            g_start_x - (thick / 2.0) * normal_x,
            g_start_y - (thick / 2.0) * normal_y,
        ),
        Point::new(
            g_start_x + (thick / 2.0) * normal_x,
            g_start_y + (thick / 2.0) * normal_y,
        ),
        Point::new(
            g_end_x + (thick / 2.0) * normal_x,
            g_end_y + (thick / 2.0) * normal_y,
        ),
        Point::new(
            g_end_x - (thick / 2.0) * normal_x,
            g_end_y - (thick / 2.0) * normal_y,
        ),
    ]];

    // 3. Sash divisions for awning/casement operable frames.
    let mut sash_polygons = Vec::new();
    if matches!(
        win.window_type,
        crate::elements::WindowType::Awning | crate::elements::WindowType::Casement
    ) {
        let s_border = 0.02;
        let s_start_x = g_start_x + s_border * cos;
        let s_start_y = g_start_y + s_border * sin;
        let s_end_x = g_end_x - s_border * cos;
        let s_end_y = g_end_y - s_border * sin;

        sash_polygons.push(vec![
            Point::new(s_start_x - thick * normal_x, s_start_y - thick * normal_y),
            Point::new(s_start_x + thick * normal_x, s_start_y + thick * normal_y),
            Point::new(s_end_x + thick * normal_x, s_end_y + thick * normal_y),
            Point::new(s_end_x - thick * normal_x, s_end_y - thick * normal_y),
        ]);
    }

    // Natural-lighting compliance check (IRC/IBC glazing-area ratio).
    let structural = federal_data::structural();
    let glazing_area = glass_w * win.height * 0.9;
    let default_room_area = structural.default_room_area_sqm;
    let ratio = glazing_area / default_room_area;
    let min_ratio = structural.ibc_min_natural_light_ratio;

    if ratio < min_ratio {
        warnings.push(format!(
            "Natural lighting area ratio ({:.1}%) is below standard building code compliance limit ({:.1}% of served room area).",
            ratio * 100.0,
            min_ratio * 100.0
        ));
    }

    WindowGeometryResults {
        glazing_polygons,
        sill_polygon,
        sash_polygons,
        warnings,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::elements::{new_base, FrameProfile, HardwareTrim, SafetyGlazing, WindowType};
    use thoth_spatial::ElementKind;

    fn fixture_door(width: f64, boundary: Vec<Point>) -> DoorElement {
        DoorElement {
            base: new_base(
                "d1",
                ElementKind::Door,
                "Door 1",
                "layer-buildings",
                boundary,
            ),
            width,
            height: 2.1,
            depth: 0.15,
            door_operation: DoorOperation::Swing,
            swing_angle: Some(90.0),
            sill_thickness: Some(0.05),
            sill_overhang: Some(0.03),
            threshold_height: Some(0.01),
            weatherstripping: Some(true),
            hardware_trim: Some(HardwareTrim::Lever),
            fire_rating: None,
            stc_rating: Some(32.0),
            safety_glazing: Some(SafetyGlazing::None),
            frame_profile: Some(FrameProfile::Wood),
        }
    }

    fn fixture_window(width: f64, height: f64, boundary: Vec<Point>) -> WindowElement {
        WindowElement {
            base: new_base(
                "w1",
                ElementKind::Window,
                "Window 1",
                "layer-buildings",
                boundary,
            ),
            width,
            height,
            depth: 0.15,
            window_type: WindowType::SingleHung,
            sill_thickness: Some(0.06),
            sill_overhang: Some(0.04),
            threshold_height: None,
            weatherstripping: Some(true),
            fire_rating: None,
            stc_rating: Some(35.0),
            safety_glazing: Some(SafetyGlazing::Tempered),
            frame_profile: Some(FrameProfile::Vinyl),
        }
    }

    #[test]
    fn a_compliant_swing_door_produces_a_full_arc_with_no_warnings() {
        let door = fixture_door(0.9, vec![Point::new(0.0, 0.0), Point::new(0.9, 0.0)]);
        let result = calculate_door_geometry(&door);
        assert_eq!(result.swing_path.len(), 19); // 18 steps -> 19 sample points
        assert!(result.warnings.is_empty());
        // The swing radius from the hinge (p_left) equals the door width.
        for pt in &result.swing_path {
            assert!((distance(*pt, Point::new(0.0, 0.0)) - 0.9).abs() < 1e-9);
        }
    }

    #[test]
    fn a_narrow_door_triggers_the_ibc_egress_width_warning() {
        let door = fixture_door(0.7, vec![Point::new(0.0, 0.0), Point::new(0.7, 0.0)]);
        let result = calculate_door_geometry(&door);
        assert!(result
            .warnings
            .iter()
            .any(|w| w.contains("egress code clear width")));
    }

    #[test]
    fn a_tall_threshold_triggers_the_ada_warning() {
        let mut door = fixture_door(0.9, vec![Point::new(0.0, 0.0), Point::new(0.9, 0.0)]);
        door.threshold_height = Some(0.02); // 20mm > 12.7mm ADA limit
        let result = calculate_door_geometry(&door);
        assert!(result
            .warnings
            .iter()
            .any(|w| w.contains("ADA compliance limit")));
    }

    #[test]
    fn double_swing_produces_two_arcs_from_both_jambs() {
        let mut door = fixture_door(1.8, vec![Point::new(0.0, 0.0), Point::new(1.8, 0.0)]);
        door.door_operation = DoorOperation::DoubleSwing;
        let result = calculate_door_geometry(&door);
        assert_eq!(result.swing_path.len(), 22); // 2 * (10 steps + 1)
    }

    #[test]
    fn a_sliding_door_has_no_swing_path() {
        let mut door = fixture_door(0.9, vec![Point::new(0.0, 0.0), Point::new(0.9, 0.0)]);
        door.door_operation = DoorOperation::Slide;
        let result = calculate_door_geometry(&door);
        assert!(result.swing_path.is_empty());
    }

    #[test]
    fn window_glazing_area_below_ratio_triggers_a_warning() {
        // A tiny window: far below the 8% natural-light ratio of a 12 sqm room.
        let win = fixture_window(0.3, 0.3, vec![Point::new(0.0, 0.0), Point::new(0.3, 0.0)]);
        let result = calculate_window_geometry(&win);
        assert!(result
            .warnings
            .iter()
            .any(|w| w.contains("Natural lighting area ratio")));
    }

    #[test]
    fn a_large_window_meets_the_natural_light_ratio() {
        let win = fixture_window(3.0, 1.5, vec![Point::new(0.0, 0.0), Point::new(3.0, 0.0)]);
        let result = calculate_window_geometry(&win);
        assert!(result.warnings.is_empty());
    }

    #[test]
    fn casement_windows_get_a_sash_frame_and_others_do_not() {
        let mut win = fixture_window(3.0, 1.5, vec![Point::new(0.0, 0.0), Point::new(3.0, 0.0)]);
        win.window_type = WindowType::Casement;
        let result = calculate_window_geometry(&win);
        assert_eq!(result.sash_polygons.len(), 1);

        let hung = fixture_window(3.0, 1.5, vec![Point::new(0.0, 0.0), Point::new(3.0, 0.0)]);
        let result_hung = calculate_window_geometry(&hung);
        assert!(result_hung.sash_polygons.is_empty());
    }
}
