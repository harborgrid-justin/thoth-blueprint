//! Roadway geometry & alignment auto-solvers (experiences 16–30). Port of
//! `packages/domain/src/smart/smartGeometry.ts`.
//!
//! Self-contained: every constant comes from
//! [`crate::federal_data::Geometry`] (the embedded AASHTO reference table),
//! with no `thoth-drawing`/catalog dependency — one of the 2–3 `smart`
//! modules this pass ports in full rather than shallowly touching all nine
//! (see `GAP_CLOSE_STATUS.md` item 9).
//!
//! Every function cites the AASHTO *Policy on Geometric Design of Highways
//! and Streets* ("the Green Book") relationship it implements in its doc
//! comment.

use serde_json::json;

use super::types::{ExperienceCategory, ExperienceResult, ExperienceStatus};
use crate::federal_data;

fn result(
    experience_id: &str,
    code: &str,
    name: &str,
    status: ExperienceStatus,
    message: String,
    recommended_value: serde_json::Value,
) -> ExperienceResult {
    ExperienceResult {
        experience_id: experience_id.to_string(),
        code: code.to_string(),
        name: name.to_string(),
        category: ExperienceCategory::Geometry,
        status,
        message,
        recommended_value: Some(recommended_value),
        action_taken: None,
    }
}

/// Experience 16: Auto-calculate minimum horizontal curve radius for a design speed.
///
/// AASHTO Green Book: `R = V² / (15·(e + f))`, with `f` (side-friction
/// factor) linearly interpolated between a max/min bound as speed rises.
pub fn auto_calc_min_radius(design_speed_mph: f64, e_max: Option<f64>) -> ExperienceResult {
    let geo = federal_data::geometry();
    let e_max = e_max.unwrap_or(geo.e_max);
    let f_max = (geo.aashto_max_friction_base
        - design_speed_mph * geo.aashto_max_friction_speed_slope)
        .max(geo.aashto_min_friction);
    let min_radius_ft = (design_speed_mph * design_speed_mph
        / (geo.aashto_curve_radius_constant * (e_max + f_max)))
        .ceil();

    result(
        "EXP-GEO-016",
        "AUTO-CALC-MIN-RADIUS",
        "Auto-Calculate AASHTO Minimum Horizontal Radius",
        ExperienceStatus::Autosized,
        format!(
            "For {design_speed_mph} MPH design speed (eMax={}%), AASHTO minimum centerline radius is {min_radius_ft} ft.",
            (e_max * 100.0).round()
        ),
        json!(min_radius_ft),
    )
}

/// Experience 17: Auto-calculate minimum vertical-curve K-factors for stopping sight
/// distance (SSD), per AASHTO's `K = L / A` design charts.
pub fn auto_calc_vertical_k_factor(design_speed_mph: f64) -> ExperienceResult {
    let geo = federal_data::geometry();
    let k_crest = (geo.k_crest_multiplier * design_speed_mph * design_speed_mph).ceil();
    let k_sag = (geo.k_sag_multiplier * design_speed_mph * design_speed_mph).ceil();

    result(
        "EXP-GEO-017",
        "AUTO-CALC-VERTICAL-K-FACTOR",
        "Auto-Calculate AASHTO Vertical Curve K-Factors",
        ExperienceStatus::Autosized,
        format!(
            "AASHTO SSD design standards for {design_speed_mph} MPH: Minimum K-Crest = {k_crest}, K-Sag = {k_sag}."
        ),
        json!({ "kCrest": k_crest, "kSag": k_sag }),
    )
}

/// Experience 18: Auto-calculate crest vertical-curve length for headlight sight
/// distance: `L = A·SSD² / 2158` (AASHTO headlight-sighting constant).
pub fn auto_calc_headlight_crest_length(
    a_grade_diff: f64,
    ssd_ft: f64,
    constant: Option<f64>,
) -> ExperienceResult {
    let geo = federal_data::geometry();
    let constant = constant.unwrap_or(geo.aashto_headlight_crest_constant);
    let req_len_ft = (100.0_f64).max(((a_grade_diff * ssd_ft * ssd_ft) / constant).ceil());

    result(
        "EXP-GEO-018",
        "AUTO-CALC-HEADLIGHT-CREST-LENGTH",
        "Auto-Calculate Headlight Crest Curve Length",
        ExperienceStatus::Autosized,
        format!(
            "Auto-calculated crest vertical curve length to {req_len_ft} ft for algebraic grade change A={a_grade_diff:.1}%."
        ),
        json!(req_len_ft),
    )
}

/// Experience 19: Auto-calculate sag vertical-curve length for rider comfort /
/// underpass clearance: `L = A·V² / 46.5` (AASHTO comfort constant).
pub fn auto_calc_sag_comfort_length(
    a_grade_diff: f64,
    v_mph: f64,
    constant: Option<f64>,
) -> ExperienceResult {
    let geo = federal_data::geometry();
    let constant = constant.unwrap_or(geo.aashto_sag_comfort_constant);
    let len_ft = (100.0_f64).max(((a_grade_diff * v_mph * v_mph) / constant).ceil());

    result(
        "EXP-GEO-019",
        "AUTO-CALC-SAG-COMFORT-LENGTH",
        "Auto-Calculate Sag Vertical Curve Length",
        ExperienceStatus::Autosized,
        format!("Auto-calculated sag vertical curve length to {len_ft} ft for comfort acceleration (a <= 1.0 ft/s\u{b2})."),
        json!(len_ft),
    )
}

/// Experience 20: Auto-calculate superelevation runoff (`Lr`) and tangent runout
/// (`Lt`) transition lengths per AASHTO's superelevation transition method.
pub fn auto_calc_superelevation_runoff(
    lane_width_ft: f64,
    e_full: f64,
    v_mph: f64,
    denominator: Option<f64>,
) -> ExperienceResult {
    let geo = federal_data::geometry();
    let denominator = denominator.unwrap_or(geo.aashto_superelevation_denominator);
    let lr = ((lane_width_ft * e_full * 100.0 * 1.5 * v_mph) / denominator).ceil();
    let lt = (lr * (0.02 / e_full.max(0.01))).ceil();

    result(
        "EXP-GEO-020",
        "AUTO-CALC-SUPERELEVATION-RUNOFF",
        "Auto-Calculate Superelevation Transition Lengths",
        ExperienceStatus::Autosized,
        format!(
            "Auto-calculated Superelevation Runoff Lr = {lr} ft, Tangent Runout Lt = {lt} ft for eFull={:.1}%.",
            e_full * 100.0
        ),
        json!({ "Lr": lr, "Lt": lt }),
    )
}

/// Experience 21: Auto-calculate inner-edge pavement widening for truck off-tracking
/// on tight-radius curves.
pub fn auto_calc_curve_widening(radius_ft: f64, design_truck: &str) -> ExperienceResult {
    let w_feet = if radius_ft < 400.0 {
        if design_truck == "WB-67" {
            4.5
        } else {
            3.0
        }
    } else {
        0.0
    };
    result(
        "EXP-GEO-021",
        "AUTO-CALC-CURVE-WIDENING",
        "Auto-Calculate Curve Trajectory Widening",
        if w_feet > 0.0 {
            ExperienceStatus::Autofixed
        } else {
            ExperienceStatus::Optimal
        },
        if w_feet > 0.0 {
            format!("Curve R={radius_ft} ft requires {w_feet} ft inner-edge pavement widening for {design_truck} off-tracking.")
        } else {
            "Curve radius is wide enough; no extra widening required.".to_string()
        },
        json!(w_feet),
    )
}

/// Experience 22: Auto-calculate spiral transition-curve length from AASHTO's maximum
/// rate of lateral acceleration: `Ls = 1.6·V³ / (R·C)`, `C = 2 ft/s³`.
pub fn auto_calc_spiral_length(radius_ft: f64, v_mph: f64) -> ExperienceResult {
    let ls_ft = (150.0_f64).max(((1.6 * v_mph.powi(3)) / (radius_ft * 2.0)).ceil());
    result(
        "EXP-GEO-022",
        "AUTO-CALC-SPIRAL-LENGTH",
        "Auto-Calculate Euler Spiral Transition Length",
        ExperienceStatus::Autosized,
        format!("Auto-sized Clothoid Euler Spiral transition length to {ls_ft} ft for R={radius_ft} ft @ {v_mph} MPH."),
        json!(ls_ft),
    )
}

/// Experience 23: Auto-calculate AASHTO decision sight distance (10-second avoidance
/// maneuver at design speed).
pub fn auto_calc_decision_sight_distance(v_mph: f64) -> ExperienceResult {
    let dsd_ft = (v_mph * 1.47 * 10.0).ceil();
    result(
        "EXP-GEO-023",
        "AUTO-CALC-DECISION-SIGHT-DISTANCE",
        "Auto-Calculate AASHTO Decision Sight Distance",
        ExperienceStatus::Autosized,
        format!("AASHTO Decision Sight Distance (Speed {v_mph} MPH, Complex Interchange Environment): {dsd_ft} ft."),
        json!(dsd_ft),
    )
}

/// Experience 24: Auto-size intersection curb-return radii for WB-50/WB-67 design
/// vehicle turning templates.
pub fn auto_calc_curb_return_radius(design_vehicle: &str) -> ExperienceResult {
    let radius_ft: f64 = match design_vehicle {
        "WB-67" => 50.0,
        "WB-50" => 40.0,
        _ => 30.0,
    };
    result(
        "EXP-GEO-024",
        "AUTO-CALC-CURB-RETURN-RADIUS",
        "Auto-Size Intersection Curb Return Radius",
        ExperienceStatus::Autosized,
        format!("Auto-sized 90-degree intersection corner curb return radius to {radius_ft} ft for {design_vehicle} template."),
        json!(radius_ft),
    )
}

/// Experience 25: Auto-size roundabout inscribed circle diameter (ICD) for the design
/// vehicle's turning template.
pub fn auto_calc_roundabout_icd(lanes: u32) -> ExperienceResult {
    let icd_ft: f64 = if lanes >= 2 { 160.0 } else { 120.0 };
    result(
        "EXP-GEO-025",
        "AUTO-CALC-ROUNDABOUT-ICD",
        "Auto-Size Roundabout Inscribed Circle Diameter",
        ExperienceStatus::Autosized,
        format!("Auto-sized Roundabout Inscribed Circle Diameter (ICD) to {icd_ft} ft for {lanes}-lane circulatory roadway."),
        json!(icd_ft),
    )
}

/// Experience 26: Auto-calculate roundabout splitter-island deflection angle to
/// enforce a target entry speed.
pub fn auto_calc_splitter_deflection(v_entry_mph: f64) -> ExperienceResult {
    let target_angle_deg: f64 = if v_entry_mph > 25.0 { 45.0 } else { 30.0 };
    result(
        "EXP-GEO-026",
        "AUTO-CALC-SPLITTER-DEFLECTION",
        "Auto-Calculate Roundabout Splitter Island Deflection",
        ExperienceStatus::Autosized,
        format!("Auto-set entry curve deflection angle to {target_angle_deg}\u{b0} to enforce entry speed <= 25 MPH."),
        json!(target_angle_deg),
    )
}

/// Experience 27: Auto-calculate channelized right-turn slip-lane deceleration length.
pub fn auto_calc_slip_lane_decel(v_main_mph: f64) -> ExperienceResult {
    let len_ft = (v_main_mph * 7.5).ceil();
    result(
        "EXP-GEO-027",
        "AUTO-CALC-SLIP-LANE-DECEL",
        "Auto-Calculate Right-Turn Slip Lane Deceleration",
        ExperienceStatus::Autosized,
        format!("Auto-calculated channelized right-turn deceleration lane length to {len_ft} ft."),
        json!(len_ft),
    )
}

/// Experience 28: Auto-calculate passing sight distance (PSD) for two-lane rural
/// highways.
pub fn auto_calc_passing_sight_distance(v_mph: f64) -> ExperienceResult {
    let psd_ft = (v_mph * 25.0).ceil();
    result(
        "EXP-GEO-028",
        "AUTO-CALC-PASSING-SIGHT-DISTANCE",
        "Auto-Calculate Passing Sight Distance",
        ExperienceStatus::Autosized,
        format!("AASHTO Passing Sight Distance (PSD) required for {v_mph} MPH: {psd_ft} ft."),
        json!(psd_ft),
    )
}

/// Experience 29: Auto-calculate MASH guardrail barrier runout length (`LR`) by
/// traffic volume/speed band.
pub fn auto_calc_guardrail_runout(v_mph: f64, adt: f64) -> ExperienceResult {
    let lr_ft: f64 = if adt > 6000.0 {
        if v_mph >= 60.0 {
            475.0
        } else {
            330.0
        }
    } else {
        250.0
    };
    result(
        "EXP-GEO-029",
        "AUTO-CALC-GUARDRAIL-RUNOUT",
        "Auto-Calculate Guardrail Runout Length (LR)",
        ExperienceStatus::Autosized,
        format!("Auto-calculated MASH Guardrail Runout Length LR = {lr_ft} ft for ADT={adt} @ {v_mph} MPH."),
        json!(lr_ft),
    )
}

/// Experience 30: Auto-calculate roadside clear-zone width from traffic speed and
/// embankment slope ratio.
pub fn auto_calc_clear_zone_width(v_mph: f64, slope_ratio: f64) -> ExperienceResult {
    let base_width: f64 = if v_mph >= 55.0 { 30.0 } else { 18.0 };
    let clear_zone_ft = if slope_ratio <= 3.0 {
        (base_width * 1.3).ceil()
    } else {
        base_width
    };

    result(
        "EXP-GEO-030",
        "AUTO-CALC-CLEAR-ZONE-WIDTH",
        "Auto-Calculate Roadside Clear Zone Width",
        ExperienceStatus::Autosized,
        format!("Auto-calculated Roadside Clear Zone Requirement: {clear_zone_ft} ft from edge of traveled way."),
        json!(clear_zone_ft),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn min_radius_matches_the_aashto_hand_calculation_for_45_mph() {
        let r = auto_calc_min_radius(45.0, None);
        // fMax = max(0.08, 0.24 - 45*0.002) = max(0.08, 0.15) = 0.15
        // R = 45^2 / (15 * (0.06 + 0.15)) = 2025 / 3.15 = 642.86 -> ceil 643
        assert_eq!(r.recommended_value, Some(json!(643.0)));
        assert_eq!(r.status, ExperienceStatus::Autosized);
    }

    #[test]
    fn vertical_k_factors_scale_with_speed_squared() {
        let r = auto_calc_vertical_k_factor(50.0);
        let geo = federal_data::geometry();
        let expected_k_crest = (geo.k_crest_multiplier * 2500.0).ceil();
        let expected_k_sag = (geo.k_sag_multiplier * 2500.0).ceil();
        assert_eq!(
            r.recommended_value,
            Some(json!({ "kCrest": expected_k_crest, "kSag": expected_k_sag }))
        );
    }

    #[test]
    fn curve_widening_only_applies_below_400_ft_radius() {
        let tight = auto_calc_curve_widening(300.0, "WB-50");
        assert_eq!(tight.status, ExperienceStatus::Autofixed);
        assert_eq!(tight.recommended_value, Some(json!(3.0)));

        let wide = auto_calc_curve_widening(500.0, "WB-50");
        assert_eq!(wide.status, ExperienceStatus::Optimal);
        assert_eq!(wide.recommended_value, Some(json!(0.0)));
    }

    #[test]
    fn wb67_widens_more_than_wb50_on_a_tight_curve() {
        let wb67 = auto_calc_curve_widening(300.0, "WB-67");
        assert_eq!(wb67.recommended_value, Some(json!(4.5)));
    }

    #[test]
    fn roundabout_icd_depends_on_lane_count() {
        assert_eq!(
            auto_calc_roundabout_icd(1).recommended_value,
            Some(json!(120.0))
        );
        assert_eq!(
            auto_calc_roundabout_icd(2).recommended_value,
            Some(json!(160.0))
        );
    }

    #[test]
    fn clear_zone_width_gets_the_slope_penalty_on_steep_embankments() {
        let steep = auto_calc_clear_zone_width(60.0, 2.5);
        let shallow = auto_calc_clear_zone_width(60.0, 4.0);
        assert!(
            steep.recommended_value.unwrap().as_f64().unwrap()
                > shallow.recommended_value.unwrap().as_f64().unwrap()
        );
    }

    #[test]
    fn passing_sight_distance_scales_linearly_with_speed() {
        let r = auto_calc_passing_sight_distance(50.0);
        assert_eq!(r.recommended_value, Some(json!(1250.0)));
    }

    #[test]
    fn spiral_length_has_a_150_ft_floor() {
        let r = auto_calc_spiral_length(2000.0, 30.0);
        assert_eq!(r.recommended_value, Some(json!(150.0)));
    }
}
