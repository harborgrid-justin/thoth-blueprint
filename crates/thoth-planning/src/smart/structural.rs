//! Architectural & structural auto-solvers (experiences 61–75). Port of
//! `packages/domain/src/smart/smartStructural.ts`.
//!
//! Self-contained: every constant comes from
//! [`crate::federal_data::Structural`]/[`crate::federal_data::Climate`] (the
//! embedded IBC/IRC/ASCE 7 reference table), with no `thoth-drawing`/
//! catalog dependency — one of the 2–3 `smart` modules this pass ports in
//! full (see `GAP_CLOSE_STATUS.md` item 9).

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
        category: ExperienceCategory::Structural,
        status,
        message,
        recommended_value: Some(recommended_value),
        action_taken: None,
    }
}

/// Experience 61: Auto-size floor joist/beam framing depth by clear span and live
/// load, per conventional span tables.
pub fn auto_size_floor_joist_span(span_ft: f64, live_load_psf: Option<f64>) -> ExperienceResult {
    let live_load_psf = live_load_psf.unwrap_or(federal_data::structural().floor_live_load_psf);
    let depth_in: u32 = if span_ft <= 12.0 {
        8
    } else if span_ft <= 16.0 {
        10
    } else if span_ft <= 20.0 {
        12
    } else {
        14
    };
    result(
        "EXP-STR-061",
        "AUTO-SIZE-FLOOR-JOIST-SPAN",
        "Auto-Size Floor Framing Member Depth",
        ExperienceStatus::Autosized,
        format!("For {span_ft} ft clear span @ {live_load_psf} PSF live load: Auto-sized floor framing to 2x{depth_in} @ 16\" O.C."),
        json!(format!("2x{depth_in} @ 16\" O.C.")),
    )
}

/// Experience 62: Auto-size continuous footing width from wall load and allowable soil
/// bearing pressure (`width = load / bearing`).
pub fn auto_size_foundation_footing(
    wall_load_plf: f64,
    soil_bearing_psf: Option<f64>,
) -> ExperienceResult {
    let soil_bearing_psf = soil_bearing_psf.unwrap_or(federal_data::climate().soil_bearing_psf);
    let req_width_ft = (wall_load_plf / soil_bearing_psf).max(1.5);
    let req_width_in = (req_width_ft * 12.0).ceil();

    result(
        "EXP-STR-062",
        "AUTO-SIZE-FOUNDATION-FOOTING",
        "Auto-Size Continuous Concrete Footing",
        ExperienceStatus::Autosized,
        format!("Wall load {wall_load_plf} PLF / Soil bearing {soil_bearing_psf} PSF: Auto-sized footing to {req_width_in}\" Width x 10\" Depth."),
        json!(req_width_in),
    )
}

/// Experience 63: Auto-size exterior shear-wall stud spacing and sheathing thickness
/// for wind zone / wall height.
pub fn auto_size_shear_wall(wall_height_ft: f64, wind_velocity_mph: f64) -> ExperienceResult {
    let severe = wind_velocity_mph > 115.0 || wall_height_ft > 12.0;
    let spacing_in: u32 = if severe { 12 } else { 16 };
    let plywood_thick_in: f64 = if severe { 0.5 } else { 0.375 };

    result(
        "EXP-STR-063",
        "AUTO-SIZE-SHEAR-WALL",
        "Auto-Size Wind Shear Wall Nailing & Sheathing",
        ExperienceStatus::Autosized,
        format!("For {wall_height_ft}' wall height @ {wind_velocity_mph} MPH wind zone: Auto-sized 2x6 studs @ {spacing_in}\" O.C. with {plywood_thick_in}\" OSB sheathing."),
        json!({ "spacingIn": spacing_in, "plywoodThickIn": plywood_thick_in }),
    )
}

/// Experience 64: Auto-select minimum roof pitch for rain/snow drainage from ground
/// snow load.
pub fn auto_size_roof_pitch(snow_load_psf: f64) -> ExperienceResult {
    let min_pitch: u32 = if snow_load_psf > 30.0 { 6 } else { 4 };
    result(
        "EXP-STR-064",
        "AUTO-SIZE-ROOF-PITCH",
        "Auto-Size Roof Slope Pitch",
        ExperienceStatus::Autosized,
        format!("Ground snow load {snow_load_psf} PSF: Auto-selected {min_pitch}:12 roof pitch for rapid drainage."),
        json!(format!("{min_pitch}:12")),
    )
}

/// Experience 65: Auto-size IBC §1011.5.2 stair riser/tread geometry (max 7" riser,
/// 11" tread) for a given total rise.
pub fn auto_size_stair_riser_tread(total_rise_in: f64) -> ExperienceResult {
    let riser_count = (total_rise_in / 7.0).ceil();
    let actual_riser_in = total_rise_in / riser_count;
    let actual_tread_in = 11.0;

    result(
        "EXP-STR-065",
        "AUTO-SIZE-STAIR-RISER-TREAD",
        "Auto-Size IBC Stair Riser & Tread Geometry",
        ExperienceStatus::Autosized,
        format!("Total rise {total_rise_in:.1}\": Auto-sized {riser_count} risers @ {actual_riser_in:.2}\" Riser x {actual_tread_in}\" Tread."),
        json!({ "riserCount": riser_count, "actualRiserIn": actual_riser_in, "actualTreadIn": actual_tread_in }),
    )
}

/// Experience 66: Auto-solve stair headroom against IBC §1011.3 (6'8" / 80" minimum).
pub fn auto_solve_stair_headroom(
    headroom_ft: f64,
    min_headroom_ft: Option<f64>,
) -> ExperienceResult {
    let min_headroom_ft =
        min_headroom_ft.unwrap_or(federal_data::structural().ibc_min_headroom_in / 12.0);
    let is_compliant = headroom_ft >= min_headroom_ft;

    result(
        "EXP-STR-066",
        "AUTO-SOLVE-STAIR-HEADROOM",
        "Auto-Solve Stair Overhead Clearance",
        if is_compliant {
            ExperienceStatus::Optimal
        } else {
            ExperienceStatus::Autofixed
        },
        if is_compliant {
            format!("Headroom clearance {headroom_ft:.2}' complies with IBC 1011.3 (6'8\" min).")
        } else {
            format!("Headroom clearance {headroom_ft:.2}' is under 6'8\" limit. Auto-extended floor opening by 2.0 ft.")
        },
        json!(if is_compliant {
            headroom_ft
        } else {
            min_headroom_ft
        }),
    )
}

/// Experience 67: Auto-size curtain-wall aluminum mullion depth for wind-load
/// deflection (max `L/175`).
pub fn auto_size_curtain_wall_mullion(span_ft: f64, wind_pressure_psf: f64) -> ExperienceResult {
    let depth_in: f64 = if span_ft > 12.0 {
        7.5
    } else if span_ft > 9.0 {
        6.0
    } else {
        4.5
    };
    result(
        "EXP-STR-067",
        "AUTO-SIZE-CURTAIN-WALL-MULLION",
        "Auto-Size Curtain Wall Aluminum Mullion Depth",
        ExperienceStatus::Autosized,
        format!("Span {span_ft}' @ {wind_pressure_psf} PSF wind load: Auto-sized aluminum tubular mullion depth to {depth_in}\" (Deflection < L/175)."),
        json!(depth_in),
    )
}

/// Experience 68: Auto-select glazing thickness/type for wind pressure.
pub fn auto_size_glazing_glass_thickness(wind_pressure_psf: f64) -> ExperienceResult {
    let thick_in = if wind_pressure_psf > 40.0 {
        "3/8\" Tempered"
    } else {
        "1/4\" Annealed"
    };
    result(
        "EXP-STR-068",
        "AUTO-SIZE-GLAZING-GLASS-THICKNESS",
        "Auto-Size Architectural Glazing Glass Thickness",
        ExperienceStatus::Autosized,
        format!("For wind pressure {wind_pressure_psf} PSF: Auto-selected {thick_in} insulated glass unit (IGU)."),
        json!(thick_in),
    )
}

/// Experience 69: Auto-size egress door width from occupant load (0.2"/occupant, IBC
/// §1005.1).
pub fn auto_size_egress_door_width(occupant_load: f64) -> ExperienceResult {
    let req_width_in = (occupant_load * 0.2).ceil().max(36.0);
    let door_type = if req_width_in > 48.0 {
        "Pair of 36\" Doors (72\" Total)"
    } else {
        "Single 36\" Door"
    };

    result(
        "EXP-STR-069",
        "AUTO-SIZE-EGRESS-DOOR-WIDTH",
        "Auto-Size Fire Egress Door Width",
        ExperienceStatus::Autosized,
        format!("For occupant load of {occupant_load}: Required egress width {req_width_in}\". Auto-selected {door_type}."),
        json!({ "reqWidthIn": req_width_in, "doorType": door_type }),
    )
}

/// Experience 70: Auto-size egress corridor width from occupant load (IBC §1020.2).
pub fn auto_size_corridor_width(occupant_load: f64) -> ExperienceResult {
    let min_width_in: f64 = if occupant_load > 50.0 { 72.0 } else { 44.0 };
    result(
        "EXP-STR-070",
        "AUTO-SIZE-CORRIDOR-WIDTH",
        "Auto-Size Egress Corridor Width",
        ExperienceStatus::Autosized,
        format!(
            "Auto-sized main egress corridor width to {min_width_in}\" ({:.1} ft) for IBC compliance.",
            min_width_in / 12.0
        ),
        json!(min_width_in),
    )
}

/// Experience 71: Auto-fix a detected stair headroom violation by shifting the header
/// beam back.
pub fn auto_fix_stair_headroom_violation(has_violation: bool) -> ExperienceResult {
    result(
        "EXP-STR-071",
        "AUTO-FIX-STAIR-HEADROOM-VIOLATION",
        "Auto-Fix Stair Ceiling Opening Geometry",
        if has_violation {
            ExperienceStatus::Autofixed
        } else {
            ExperienceStatus::Optimal
        },
        if has_violation {
            "Headroom obstruction detected. Auto-shifted upper floor header beam 18 inches back."
                .to_string()
        } else {
            "Stair well opening has full vertical headroom.".to_string()
        },
        json!("Header Shifted 18in"),
    )
}

/// Experience 72: Auto-fix a detected curtain-wall thermal bridge with a polyamide
/// thermal break.
pub fn auto_fix_curtain_wall_thermal_bridge(has_thermal_bridge: bool) -> ExperienceResult {
    result(
        "EXP-STR-072",
        "AUTO-FIX-CURTAIN-WALL-THERMAL-BRIDGE",
        "Auto-Fix Curtain Wall Thermal Bridging",
        if has_thermal_bridge {
            ExperienceStatus::Autofixed
        } else {
            ExperienceStatus::Optimal
        },
        if has_thermal_bridge {
            "Thermal bridge detected at slab edge. Auto-inserted Polyamide Thermal Break Insulator."
                .to_string()
        } else {
            "Curtain wall frame has continuous thermal break.".to_string()
        },
        json!("Polyamide Thermal Break"),
    )
}

/// Experience 73: Auto-fix ADA §404.2.4.4 door latch-side clearance (min 18").
pub fn auto_fix_door_ada_clearance(latch_clearance_in: f64) -> ExperienceResult {
    let is_compliant = latch_clearance_in >= 18.0;
    result(
        "EXP-STR-073",
        "AUTO-FIX-DOOR-ADA-CLEARANCE",
        "Auto-Fix Door Latch Side ADA Clearance",
        if is_compliant {
            ExperienceStatus::Optimal
        } else {
            ExperienceStatus::Autofixed
        },
        if is_compliant {
            format!("Latch clearance {latch_clearance_in}\" complies with ADA 404.2.4.")
        } else {
            format!("Latch clearance {latch_clearance_in}\" is under 18\" min. Auto-shifted door 6 inches away from wall corner.")
        },
        json!(if is_compliant {
            latch_clearance_in
        } else {
            18.0
        }),
    )
}

/// Experience 74: Auto-fix IRC attic net-free-vent-area ratio (1/150 of ceiling area).
pub fn auto_fix_attic_ventilation_ratio(
    ceiling_area_sq_ft: f64,
    vent_area_sq_ft: f64,
) -> ExperienceResult {
    let req_vent_sq_ft = ceiling_area_sq_ft / 150.0;
    let is_compliant = vent_area_sq_ft >= req_vent_sq_ft;

    result(
        "EXP-STR-074",
        "AUTO-FIX-ATTIC-VENTILATION-RATIO",
        "Auto-Fix IRC Attic Net Free Vent Area",
        if is_compliant {
            ExperienceStatus::Optimal
        } else {
            ExperienceStatus::Autofixed
        },
        if is_compliant {
            format!("Attic vent area {vent_area_sq_ft:.1} sq ft complies with 1/150 ratio.")
        } else {
            format!("Attic vent area {vent_area_sq_ft:.1} sq ft is deficient. Auto-added {req_vent_sq_ft:.1} sq ft continuous ridge and soffit vents.")
        },
        json!(req_vent_sq_ft),
    )
}

/// Experience 75: Auto-size a stretcher-compliant passenger elevator shaft enclosure.
pub fn auto_size_elevator_shaft(capacity_lbs: Option<f64>) -> ExperienceResult {
    let capacity_lbs = capacity_lbs.unwrap_or(3500.0);
    let width_ft = 8.5;
    let depth_ft = 7.5;
    result(
        "EXP-STR-075",
        "AUTO-SIZE-ELEVATOR-SHAFT",
        "Auto-Size Passenger Elevator Shaft Enclosure",
        ExperienceStatus::Autosized,
        format!("Auto-sized {capacity_lbs} lbs stretcher-compliant elevator shaft to {width_ft}' Width x {depth_ft}' Depth."),
        json!({ "widthFt": width_ft, "depthFt": depth_ft }),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn joist_depth_steps_up_with_span() {
        assert_eq!(
            auto_size_floor_joist_span(10.0, None).recommended_value,
            Some(json!("2x8 @ 16\" O.C."))
        );
        assert_eq!(
            auto_size_floor_joist_span(18.0, None).recommended_value,
            Some(json!("2x12 @ 16\" O.C."))
        );
        assert_eq!(
            auto_size_floor_joist_span(24.0, None).recommended_value,
            Some(json!("2x14 @ 16\" O.C."))
        );
    }

    #[test]
    fn footing_width_never_goes_below_the_1_5_ft_minimum() {
        let r = auto_size_foundation_footing(100.0, Some(2000.0));
        // 100/2000 = 0.05 ft -> floored to 1.5 ft -> 18"
        assert_eq!(r.recommended_value, Some(json!(18.0)));
    }

    #[test]
    fn footing_width_scales_with_load_over_bearing() {
        let r = auto_size_foundation_footing(4000.0, Some(2000.0));
        // 4000/2000 = 2.0 ft -> 24"
        assert_eq!(r.recommended_value, Some(json!(24.0)));
    }

    #[test]
    fn a_9_riser_stair_over_63_inches_matches_ibc_geometry() {
        let r = auto_size_stair_riser_tread(63.0);
        assert_eq!(
            r.recommended_value,
            Some(json!({ "riserCount": 9.0, "actualRiserIn": 7.0, "actualTreadIn": 11.0 }))
        );
    }

    #[test]
    fn insufficient_headroom_is_autofixed() {
        let r = auto_solve_stair_headroom(6.0, None);
        assert_eq!(r.status, ExperienceStatus::Autofixed);
    }

    #[test]
    fn sufficient_headroom_is_optimal() {
        let r = auto_solve_stair_headroom(7.5, None);
        assert_eq!(r.status, ExperienceStatus::Optimal);
    }

    #[test]
    fn ada_clearance_below_18_inches_is_autofixed_to_18() {
        let r = auto_fix_door_ada_clearance(12.0);
        assert_eq!(r.status, ExperienceStatus::Autofixed);
        assert_eq!(r.recommended_value, Some(json!(18.0)));
    }

    #[test]
    fn egress_door_width_never_goes_below_36_inches() {
        let r = auto_size_egress_door_width(10.0);
        assert_eq!(
            r.recommended_value,
            Some(json!({ "reqWidthIn": 36.0, "doorType": "Single 36\" Door" }))
        );
    }

    #[test]
    fn a_high_occupant_load_requires_a_paired_door() {
        let r = auto_size_egress_door_width(300.0);
        let value = r.recommended_value.unwrap();
        assert_eq!(value["doorType"], "Pair of 36\" Doors (72\" Total)");
    }
}
