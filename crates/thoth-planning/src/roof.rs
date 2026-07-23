//! Roof pitch/ridge/hip/valley/rafter geometry algorithm. Port of
//! `packages/domain/src/planning/roof.ts`'s `calculateRoofGeometry` and
//! `types/roof.ts`.
//!
//! [`crate::elements::RoofElement`]/[`crate::elements::Dormer`] are already
//! ported; this module is the geometry algorithm layered on top: slope
//! trigonometry, ridge/hip/valley plan lines, rafter layout, drainage
//! flow/gutter/downspout annotations, material take-offs, and an IRC R806.1
//! attic-ventilation compliance check. Like the TS original, this algorithm
//! does not process `RoofElement.dormers` (dormer geometry is a distinct,
//! unimplemented concern in the TS source too — there is no
//! `calculateDormerGeometry` anywhere in `packages/domain`).
//!
//! **Catalog fallback**: the TS original looks roofing-assembly properties
//! (sheathing thickness, unit weight, timber ratio) up in
//! `globalPartsDb.getRoofAssemblies()[0]`, falling back to hardcoded
//! defaults when no catalog entry exists. That catalog now lives in
//! `thoth-drawing::parts`, which this crate must not depend on (see
//! `GAP_CLOSE_STATUS.md`'s dependency-order note) — this port always uses
//! the TS fallback constants, exactly matching a site with no roof
//! assemblies registered (the same convention `land_use.rs` already
//! documents for its own catalog fallback).

use serde::{Deserialize, Serialize};
use thoth_spatial::{area, distance, Point, Polygon};

use crate::elements::{RoofElement, RoofType};

/// TS fallback: plywood/OSB sheathing thickness, meters (15mm).
const DEFAULT_SHEATHING_THICKNESS_M: f64 = 0.015;
/// TS fallback: roofing unit weight, kg/m² (typical asphalt shingle assembly).
const DEFAULT_UNIT_WEIGHT_KG_PER_SQM: f64 = 12.0;
/// TS fallback: rafter lumber estimate, board-feet per m² of true roof area.
const DEFAULT_TIMBER_BOARD_FEET_PER_SQM: f64 = 8.5;

/// Computed plan geometry, drainage layout, material take-offs, and
/// code-compliance warnings for a [`RoofElement`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RoofGeometryResults {
    pub pitch_angle_rad: f64,
    /// `sec(pitch angle)` — the true-area-to-plan-area multiplier.
    pub slope_factor: f64,
    pub plan_area_sqm: f64,
    pub true_area_sqm: f64,

    pub ridge_line: Vec<Point>,
    pub hip_lines: Vec<Vec<Point>>,
    pub valley_lines: Vec<Vec<Point>>,
    pub rafter_lines: Vec<Vec<Point>>,
    /// Arrow line segments pointing from ridge to eaves.
    pub drainage_flows: Vec<Vec<Point>>,
    /// Outlines along the low eaves.
    pub gutter_paths: Vec<Vec<Point>>,
    pub downspout_anchors: Vec<Point>,

    pub sheathing_vol_cu_m: f64,
    pub insulation_vol_cu_m: f64,
    pub shingle_weight_kg: f64,
    pub timber_board_feet: f64,

    /// IRC R806.1: net free vent area >= 1:300 of plan area (balanced
    /// ridge + soffit) or 1:150 (unbalanced).
    pub required_vent_area_sqm: f64,
    pub provided_vent_area_sqm: f64,
    pub ventilation_warnings: Vec<String>,

    pub warnings: Vec<String>,
}

/// Compute pitch/ridge/hip/valley/rafter plan geometry, drainage layout,
/// material take-offs, and code-compliance warnings for a [`RoofElement`].
///
/// Cites IRC R806.1 (attic net-free-ventilation-area ratio) for the
/// ventilation check.
pub fn calculate_roof_geometry(roof: &RoofElement) -> RoofGeometryResults {
    let mut warnings = Vec::new();
    let mut ventilation_warnings = Vec::new();

    // 1. Slope pitch math: `pitch` is rise per 12 horizontal units.
    let pitch_val = if roof.pitch != 0.0 { roof.pitch } else { 4.0 };
    let pitch_angle_rad = (pitch_val / 12.0).atan();
    let slope_factor = (1.0 + (pitch_val / 12.0).powi(2)).sqrt();

    let (boundary, plan_area_sqm): (Polygon, f64) = if roof.base.boundary.len() >= 3 {
        (roof.base.boundary.clone(), area(&roof.base.boundary).abs())
    } else {
        (
            vec![
                Point::new(0.0, 0.0),
                Point::new(12.0, 0.0),
                Point::new(12.0, 10.0),
                Point::new(0.0, 10.0),
            ],
            120.0,
        )
    };

    let true_area_sqm = plan_area_sqm * slope_factor;

    let mut min_x = f64::INFINITY;
    let mut max_x = f64::NEG_INFINITY;
    let mut min_y = f64::INFINITY;
    let mut max_y = f64::NEG_INFINITY;
    for pt in &boundary {
        min_x = min_x.min(pt.x);
        max_x = max_x.max(pt.x);
        min_y = min_y.min(pt.y);
        max_y = max_y.max(pt.y);
    }

    let width = max_x - min_x;
    let length = max_y - min_y;
    let mid_x = (min_x + max_x) / 2.0;
    let mid_y = (min_y + max_y) / 2.0;

    // 2. Ridge/hip/valley lines.
    let mut ridge_line = Vec::new();
    let mut hip_lines: Vec<Vec<Point>> = Vec::new();
    let valley_lines: Vec<Vec<Point>> = Vec::new();

    match roof.roof_type {
        RoofType::Gable => {
            ridge_line.push(Point::new(mid_x, min_y));
            ridge_line.push(Point::new(mid_x, max_y));
        }
        RoofType::Hip => {
            let hip_offset = width / 2.0;
            ridge_line.push(Point::new(mid_x, min_y + hip_offset));
            ridge_line.push(Point::new(mid_x, max_y - hip_offset));

            hip_lines.push(vec![
                Point::new(min_x, min_y),
                Point::new(mid_x, min_y + hip_offset),
            ]);
            hip_lines.push(vec![
                Point::new(max_x, min_y),
                Point::new(mid_x, min_y + hip_offset),
            ]);
            hip_lines.push(vec![
                Point::new(min_x, max_y),
                Point::new(mid_x, max_y - hip_offset),
            ]);
            hip_lines.push(vec![
                Point::new(max_x, max_y),
                Point::new(mid_x, max_y - hip_offset),
            ]);
        }
        RoofType::Shed => {
            ridge_line.push(Point::new(min_x, min_y));
            ridge_line.push(Point::new(max_x, min_y));
        }
        RoofType::Mansard | RoofType::Flat => {
            ridge_line.push(Point::new(min_x, mid_y));
            ridge_line.push(Point::new(max_x, mid_y));
        }
    }

    // 3. Rafter/joist spacing (24" / 0.6m O.C.).
    let mut rafter_lines = Vec::new();
    let spacing = 0.6;
    let rafter_count = (width / spacing).floor() as i64;
    for i in 1..rafter_count {
        let rx = min_x + i as f64 * spacing;
        rafter_lines.push(vec![Point::new(rx, mid_y), Point::new(rx, min_y)]);
        rafter_lines.push(vec![Point::new(rx, mid_y), Point::new(rx, max_y)]);
    }

    // 4. Drainage flow lines, gutters, downspouts.
    let mut drainage_flows = Vec::new();
    let mut gutter_paths = Vec::new();
    let mut downspout_anchors = Vec::new();
    let overhang = roof.overhang.unwrap_or(0.3);

    let steps = 5;
    for i in 1..steps {
        let rx = min_x + (i as f64 / steps as f64) * width;
        drainage_flows.push(vec![
            Point::new(rx, mid_y),
            Point::new(rx, min_y - overhang),
        ]);
        drainage_flows.push(vec![
            Point::new(rx, mid_y),
            Point::new(rx, max_y + overhang),
        ]);
    }

    if roof.gutters.unwrap_or(false) {
        gutter_paths.push(vec![
            Point::new(min_x - overhang, min_y - overhang),
            Point::new(max_x + overhang, min_y - overhang),
        ]);
        gutter_paths.push(vec![
            Point::new(min_x - overhang, max_y + overhang),
            Point::new(max_x + overhang, max_y + overhang),
        ]);
        downspout_anchors.push(Point::new(min_x - overhang, min_y - overhang));
        downspout_anchors.push(Point::new(max_x + overhang, min_y - overhang));
        downspout_anchors.push(Point::new(min_x - overhang, max_y + overhang));
        downspout_anchors.push(Point::new(max_x + overhang, max_y + overhang));
    }

    // 5. Material take-offs.
    let sheathing_vol_cu_m = true_area_sqm * DEFAULT_SHEATHING_THICKNESS_M;
    let insulation_vol_cu_m = true_area_sqm * 0.18;
    let shingle_weight_kg = true_area_sqm * DEFAULT_UNIT_WEIGHT_KG_PER_SQM;
    let timber_board_feet = true_area_sqm * DEFAULT_TIMBER_BOARD_FEET_PER_SQM;

    // 6. Ventilation area verification (IRC R806.1: net free vent area >= 1:300).
    let required_vent_area_sqm = plan_area_sqm / 300.0;

    let ridge_vent_area = if !matches!(roof.roof_type, RoofType::Flat) && ridge_line.len() >= 2 {
        distance(ridge_line[1], ridge_line[0]) * 0.05
    } else {
        0.0
    };
    let soffit_vent_area = if roof.soffit_vents.unwrap_or(false) {
        (width * 2.0 + length * 2.0) * 0.02
    } else {
        0.0
    };
    let provided_vent_area_sqm = ridge_vent_area + soffit_vent_area;

    if provided_vent_area_sqm < required_vent_area_sqm {
        ventilation_warnings.push(format!(
            "Provided vent area ({provided_vent_area_sqm:.3}m\u{b2}) is below building code requirements ({required_vent_area_sqm:.3}m\u{b2} / 1:300 ratio)."
        ));
    }

    // Heavy snow-load warning: pitch shallower than 3:12 needs ice/water membrane.
    if pitch_val < 3.0 {
        warnings.push(format!(
            "Low pitch slope ratio ({pitch_val}:12) requires special ice/water waterproofing membranes."
        ));
    }

    RoofGeometryResults {
        pitch_angle_rad,
        slope_factor,
        plan_area_sqm,
        true_area_sqm,
        ridge_line,
        hip_lines,
        valley_lines,
        rafter_lines,
        drainage_flows,
        gutter_paths,
        downspout_anchors,
        sheathing_vol_cu_m,
        insulation_vol_cu_m,
        shingle_weight_kg,
        timber_board_feet,
        required_vent_area_sqm,
        provided_vent_area_sqm,
        ventilation_warnings,
        warnings,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::elements::new_base;
    use thoth_spatial::ElementKind;

    fn fixture_roof(roof_type: RoofType, boundary: Polygon) -> RoofElement {
        RoofElement {
            base: new_base(
                "r1",
                ElementKind::Roof,
                "Roof 1",
                "layer-buildings",
                boundary,
            ),
            roof_type,
            pitch: 6.0,
            overhang: Some(0.3),
            soffit_width: Some(0.3),
            thickness: Some(0.2),
            shingle_material: None,
            gutters: Some(true),
            soffit_vents: Some(true),
            dormers: vec![],
        }
    }

    fn rect(w: f64, l: f64) -> Polygon {
        vec![
            Point::new(0.0, 0.0),
            Point::new(w, 0.0),
            Point::new(w, l),
            Point::new(0.0, l),
        ]
    }

    #[test]
    fn a_6_in_12_pitch_produces_the_correct_slope_factor() {
        let roof = fixture_roof(RoofType::Gable, rect(12.0, 10.0));
        let result = calculate_roof_geometry(&roof);
        // slopeFactor = sqrt(1 + (6/12)^2) = sqrt(1.25)
        assert!((result.slope_factor - 1.25_f64.sqrt()).abs() < 1e-9);
        assert!((result.plan_area_sqm - 120.0).abs() < 1e-9);
        assert!((result.true_area_sqm - 120.0 * 1.25_f64.sqrt()).abs() < 1e-6);
    }

    #[test]
    fn gable_roof_ridge_runs_the_full_ridge_axis() {
        let roof = fixture_roof(RoofType::Gable, rect(12.0, 10.0));
        let result = calculate_roof_geometry(&roof);
        assert_eq!(result.ridge_line.len(), 2);
        assert_eq!(result.ridge_line[0].x, 6.0);
        assert_eq!(result.ridge_line[0].y, 0.0);
        assert_eq!(result.ridge_line[1].y, 10.0);
        assert!(result.hip_lines.is_empty());
    }

    #[test]
    fn hip_roof_produces_four_hip_lines_and_a_shortened_ridge() {
        let roof = fixture_roof(RoofType::Hip, rect(12.0, 10.0));
        let result = calculate_roof_geometry(&roof);
        assert_eq!(result.hip_lines.len(), 4);
        assert_eq!(result.ridge_line.len(), 2);
    }

    #[test]
    fn low_pitch_triggers_the_ice_and_water_membrane_warning() {
        let mut roof = fixture_roof(RoofType::Gable, rect(12.0, 10.0));
        roof.pitch = 2.0;
        let result = calculate_roof_geometry(&roof);
        assert!(result
            .warnings
            .iter()
            .any(|w| w.contains("ice/water waterproofing")));
    }

    #[test]
    fn insufficient_ventilation_triggers_a_warning_when_soffit_vents_are_off() {
        // A long, narrow gable roof: the ridge (running along the short
        // axis) alone can't provide 1:300 net free vent area without soffit
        // vents contributing too.
        let mut roof = fixture_roof(RoofType::Gable, rect(60.0, 4.0));
        roof.soffit_vents = Some(false);
        let result = calculate_roof_geometry(&roof);
        assert!(result.provided_vent_area_sqm < result.required_vent_area_sqm);
        assert!(result
            .ventilation_warnings
            .iter()
            .any(|w| w.contains("below building code requirements")));
    }

    #[test]
    fn falls_back_to_a_default_boundary_when_none_is_given() {
        let roof = fixture_roof(RoofType::Gable, vec![]);
        let result = calculate_roof_geometry(&roof);
        assert!((result.plan_area_sqm - 120.0).abs() < 1e-9);
    }

    #[test]
    fn material_takeoffs_scale_with_true_roof_area() {
        let roof = fixture_roof(RoofType::Gable, rect(12.0, 10.0));
        let result = calculate_roof_geometry(&roof);
        assert!((result.sheathing_vol_cu_m - result.true_area_sqm * 0.015).abs() < 1e-9);
        assert!((result.shingle_weight_kg - result.true_area_sqm * 12.0).abs() < 1e-9);
        assert!((result.timber_board_feet - result.true_area_sqm * 8.5).abs() < 1e-9);
    }
}
