//! Subdivision & site-layout auto-solvers (experiences 46–60). Port of
//! `packages/domain/src/smart/smartSubdivision.ts`.
//!
//! One of the 2–3 `smart` modules this pass ports in full (see
//! `GAP_CLOSE_STATUS.md` item 9). The TS original looks up the R-1 zoning
//! district's minimum setback in `globalPartsDb.getZoningDistricts()` for
//! [`auto_place_setbacks`]'s default front-setback parameter; per this
//! crate's established catalog-fallback convention (see `land_use.rs`'s
//! module doc), this port uses the TS fallback constant (3.0 m ≈ 9.84 ft)
//! directly, since `thoth-drawing::parts` isn't a dependency this crate can
//! reach (dependency-order constraint).

use serde_json::json;

use super::types::{ExperienceCategory, ExperienceResult, ExperienceStatus};

/// TS fallback: R-1 district minimum setback, meters (see the module doc).
const DEFAULT_R1_SETBACK_M: f64 = 3.0;

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
        category: ExperienceCategory::Subdivision,
        status,
        message,
        recommended_value: Some(recommended_value),
        action_taken: None,
    }
}

/// Experience 46: Auto-subdivide a parcel into equal-area lots for a target lot size.
pub fn auto_subdivide_equal_area(
    total_area_sq_ft: f64,
    target_lot_area_sq_ft: f64,
) -> ExperienceResult {
    let lot_count = (total_area_sq_ft / target_lot_area_sq_ft).floor().max(0.0);
    let actual_lot_area = total_area_sq_ft / lot_count.max(1.0);

    result(
        "EXP-SUB-046",
        "AUTO-SUBDIVIDE-EQUAL-AREA",
        "Auto-Subdivide Parcel to Equal Lot Areas",
        ExperienceStatus::Autosized,
        format!("Auto-subdivided parcel into {lot_count} equal lots ({actual_lot_area:.0} sq ft / lot)."),
        json!({ "lotCount": lot_count, "actualLotArea": actual_lot_area }),
    )
}

/// Experience 47: Auto-enforce the zoning minimum lot-frontage width.
pub fn auto_enforce_frontage_width(
    actual_frontage_ft: f64,
    min_frontage_ft: f64,
) -> ExperienceResult {
    let is_compliant = actual_frontage_ft >= min_frontage_ft;
    result(
        "EXP-SUB-047",
        "AUTO-ENFORCE-FRONTAGE-WIDTH",
        "Auto-Enforce Zoning Minimum Lot Frontage",
        if is_compliant {
            ExperienceStatus::Optimal
        } else {
            ExperienceStatus::Autofixed
        },
        if is_compliant {
            format!("Lot frontage {actual_frontage_ft:.1} ft complies with {min_frontage_ft} ft zoning minimum.")
        } else {
            format!("Lot frontage {actual_frontage_ft:.1} ft violates {min_frontage_ft} ft min width. Auto-adjusted lot boundary width to {min_frontage_ft} ft.")
        },
        json!(if is_compliant {
            actual_frontage_ft
        } else {
            min_frontage_ft
        }),
    )
}

/// Experience 48: Auto-align side lot lines radial to a curved right-of-way.
pub fn auto_align_perpendicular_side_lines(is_radial: bool) -> ExperienceResult {
    result(
        "EXP-SUB-048",
        "AUTO-ALIGN-PERPENDICULAR-SIDE-LINES",
        "Auto-Align Side Lot Lines Radial to Right-of-Way",
        if is_radial {
            ExperienceStatus::Optimal
        } else {
            ExperienceStatus::Autofixed
        },
        if is_radial {
            "Side lot lines are radial to R/W arc.".to_string()
        } else {
            "Side lot lines non-perpendicular. Auto-rotated lot side lines to 90\u{b0} radial alignment with R/W centerline.".to_string()
        },
        json!("Radial 90\u{b0} Alignment"),
    )
}

/// Experience 49: Auto-size a cul-de-sac turnaround bulb radius for fire-apparatus
/// access (min 50 ft).
pub fn auto_size_cul_de_sac_bulb(design_vehicle: &str) -> ExperienceResult {
    let radius_ft: f64 = if design_vehicle == "Fire Engine" {
        50.0
    } else {
        45.0
    };
    result(
        "EXP-SUB-049",
        "AUTO-SIZE-CUL-DE-SAC-BULB",
        "Auto-Size Cul-de-Sac Turnaround Bulb Radius",
        ExperienceStatus::Autosized,
        format!("Auto-sized Cul-de-Sac R/W bulb radius to {radius_ft} ft ({}' curb line) for {design_vehicle} AASHTO turnaround.", radius_ft - 8.0),
        json!(radius_ft),
    )
}

/// Experience 50: Auto-size an emergency hammerhead (T-shaped) turnaround.
pub fn auto_size_hammerhead_turnaround() -> ExperienceResult {
    let arm_length_ft = 60.0;
    let arm_width_ft = 20.0;
    result(
        "EXP-SUB-050",
        "AUTO-SIZE-HAMMERHEAD-TURNAROUND",
        "Auto-Size Emergency Hammerhead Turnaround",
        ExperienceStatus::Autosized,
        format!("Auto-sized T-hammerhead emergency turnaround to {arm_length_ft}' Length x {arm_width_ft}' Width per IFC Appendix D."),
        json!({ "armLengthFt": arm_length_ft, "armWidthFt": arm_width_ft }),
    )
}

/// Experience 51: Auto-place a building envelope's front/rear/side setback lines.
/// `front_ft` defaults from [`DEFAULT_R1_SETBACK_M`] converted to feet (see
/// the module doc for why this can't reach the real zoning-district
/// catalog).
pub fn auto_place_setbacks(
    front_ft: Option<f64>,
    rear_ft: Option<f64>,
    side_ft: Option<f64>,
) -> ExperienceResult {
    let front_ft = front_ft.unwrap_or((DEFAULT_R1_SETBACK_M * 3.28084).round());
    let rear_ft = rear_ft.unwrap_or(25.0);
    let side_ft = side_ft.unwrap_or(10.0);

    result(
        "EXP-SUB-051",
        "AUTO-PLACE-SETBACKS",
        "Auto-Place Building Envelope Setback Lines",
        ExperienceStatus::Autosized,
        format!("Auto-generated building envelope footprint (Front: {front_ft}', Rear: {rear_ft}', Sides: {side_ft}')."),
        json!({ "frontFt": front_ft, "rearFt": rear_ft, "sideFt": side_ft }),
    )
}

/// Experience 52: Auto-size parking-stall counts (and ADA-accessible stalls) from
/// gross floor area and use category.
pub fn auto_size_parking_stalls(
    gross_floor_area_sq_ft: f64,
    use_category: &str,
) -> ExperienceResult {
    let req_ratio = if use_category == "retail" { 4.0 } else { 3.0 };
    let total_stalls = ((gross_floor_area_sq_ft / 1000.0) * req_ratio).ceil();
    let ada_stalls: f64 = if total_stalls > 100.0 {
        5.0
    } else if total_stalls > 50.0 {
        3.0
    } else {
        2.0
    };

    result(
        "EXP-SUB-052",
        "AUTO-SIZE-PARKING-STALLS",
        "Auto-Calculate Site Parking Stall Counts",
        ExperienceStatus::Autosized,
        format!("For {gross_floor_area_sq_ft} sq ft {use_category}: Auto-required {total_stalls} total stalls ({ada_stalls} ADA van-accessible)."),
        json!({ "totalStalls": total_stalls, "adaStalls": ada_stalls }),
    )
}

/// Experience 53: Auto-size a commercial driveway apron / curb-cut opening.
pub fn auto_size_driveway_apron(truck_traffic: bool) -> ExperienceResult {
    let width_ft: f64 = if truck_traffic { 36.0 } else { 24.0 };
    let flare_radius_ft: f64 = if truck_traffic { 30.0 } else { 15.0 };

    result(
        "EXP-SUB-053",
        "AUTO-SIZE-DRIVEWAY-APRON",
        "Auto-Size Commercial Driveway Apron",
        ExperienceStatus::Autosized,
        format!("Auto-sized driveway curb cut opening to {width_ft}' Width with R={flare_radius_ft}' entrance radii."),
        json!({ "widthFt": width_ft, "flareRadiusFt": flare_radius_ft }),
    )
}

/// Experience 54: Auto-place a perimeter public-utility-easement (PUE) corridor along
/// a lot line (10 ft minimum).
pub fn auto_place_utility_easements(lot_line_length_ft: f64) -> ExperienceResult {
    let width_ft = 10.0;
    result(
        "EXP-SUB-054",
        "AUTO-PLACE-UTILITY-EASEMENTS",
        "Auto-Place Perimeter Utility Easement Corridors",
        ExperienceStatus::Autosized,
        format!("Auto-generated {width_ft} ft wide Public Utility Easement (PUE) corridor along {lot_line_length_ft:.0} ft rear lot boundary."),
        json!(width_ft),
    )
}

/// Experience 55: Auto-fix an excessive lot depth-to-width ratio (max 4:1).
pub fn auto_fix_depth_to_width_ratio(depth_ft: f64, width_ft: f64) -> ExperienceResult {
    let ratio = depth_ft / width_ft.max(1.0);
    let is_high = ratio > 4.0;

    result(
        "EXP-SUB-055",
        "AUTO-FIX-DEPTH-TO-WIDTH-RATIO",
        "Auto-Fix Excessive Lot Depth-to-Width Ratio",
        if is_high {
            ExperienceStatus::Autofixed
        } else {
            ExperienceStatus::Optimal
        },
        if is_high {
            format!("Lot ratio {ratio:.1}:1 exceeds 4:1 max limit. Auto-widen lot frontage from {width_ft:.0}' to {:.0}'.", depth_ft / 3.5)
        } else {
            "Lot depth-to-width ratio is within 4:1 subdivision standards.".to_string()
        },
        json!(if is_high { depth_ft / 3.5 } else { width_ft }),
    )
}

/// Experience 56: Auto-fix a landlocked lot by inserting a panhandle access easement.
pub fn auto_fix_landlocked_lot(has_street_access: bool) -> ExperienceResult {
    result(
        "EXP-SUB-056",
        "AUTO-FIX-LANDLOCKED-LOT",
        "Auto-Fix Landlocked Parcel Access",
        if !has_street_access {
            ExperienceStatus::Autofixed
        } else {
            ExperienceStatus::Optimal
        },
        if !has_street_access {
            "Parcel has zero ROW frontage. Auto-generated 20 ft wide ingress-egress Access Panhandle easement.".to_string()
        } else {
            "Parcel has direct frontage access to public street.".to_string()
        },
        json!(if !has_street_access {
            "20ft Access Panhandle"
        } else {
            "Direct ROW Access"
        }),
    )
}

/// Experience 57: Auto-fix a building footprint that encroaches into its setback.
pub fn auto_fix_setback_encroachment(encroachment_ft: f64) -> ExperienceResult {
    let needs_fix = encroachment_ft > 0.0;
    result(
        "EXP-SUB-057",
        "AUTO-FIX-SETBACK-ENCROACHMENT",
        "Auto-Fix Building Setback Line Encroachment",
        if needs_fix {
            ExperienceStatus::Autofixed
        } else {
            ExperienceStatus::Optimal
        },
        if needs_fix {
            format!("Structure encroaches into rear setback by {encroachment_ft:.1} ft. Auto-shifted building footprint {encroachment_ft:.1} ft forward.")
        } else {
            "Building footprint is 100% inside buildable envelope.".to_string()
        },
        json!(if needs_fix {
            "Shifted Footprint Forward"
        } else {
            "Compliant Footprint"
        }),
    )
}

/// Experience 58: Auto-fix an obstructed corner sight-distance triangle.
pub fn auto_fix_sight_triangle_obstruction(has_obstruction: bool) -> ExperienceResult {
    result(
        "EXP-SUB-058",
        "AUTO-FIX-SIGHT-TRIANGLE-OBSTRUCTION",
        "Auto-Fix Corner Sight Distance Triangle",
        if has_obstruction {
            ExperienceStatus::Autofixed
        } else {
            ExperienceStatus::Optimal
        },
        if has_obstruction {
            "Landscape/structure encroaches into 30'x30' corner sight triangle. Auto-cleared structure from sight visibility zone.".to_string()
        } else {
            "Corner sight distance triangle is unobstructed.".to_string()
        },
        json!("Cleared 30'x30' Sight Zone"),
    )
}

/// Experience 59: Auto-size a commercial trash-enclosure pad with truck turnaround.
pub fn auto_size_trash_enclosure() -> ExperienceResult {
    let pad_width_ft = 14.0;
    let pad_depth_ft = 10.0;
    result(
        "EXP-SUB-059",
        "AUTO-SIZE-TRASH-ENCLOSURE",
        "Auto-Size Refuse Container Enclosure Pad",
        ExperienceStatus::Autosized,
        format!("Auto-sized commercial double-dumpster concrete pad to {pad_width_ft}' Width x {pad_depth_ft}' Depth with bollards."),
        json!({ "padWidthFt": pad_width_ft, "padDepthFt": pad_depth_ft }),
    )
}

/// Experience 60: Auto-fix a sub-minimum (non-conforming) lot area.
pub fn auto_fix_non_conforming_lot_area(
    actual_area_sq_ft: f64,
    min_area_sq_ft: f64,
) -> ExperienceResult {
    let is_too_small = actual_area_sq_ft < min_area_sq_ft;
    result(
        "EXP-SUB-060",
        "AUTO-FIX-NON-CONFORMING-LOT-AREA",
        "Auto-Fix Sub-Minimum Lot Area Violation",
        if is_too_small {
            ExperienceStatus::Autofixed
        } else {
            ExperienceStatus::Optimal
        },
        if is_too_small {
            format!("Lot area {actual_area_sq_ft} sq ft is under {min_area_sq_ft} sq ft min limit. Auto-extended rear lot line to meet {min_area_sq_ft} sq ft.")
        } else {
            "Lot area complies with zoning district minimum size.".to_string()
        },
        json!(if is_too_small {
            min_area_sq_ft
        } else {
            actual_area_sq_ft
        }),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn equal_area_subdivision_floors_the_lot_count() {
        let r = auto_subdivide_equal_area(43_560.0, 6000.0);
        // floor(43560/6000) = 7
        assert_eq!(
            r.recommended_value,
            Some(json!({ "lotCount": 7.0, "actualLotArea": 43_560.0 / 7.0 }))
        );
    }

    #[test]
    fn undersized_frontage_is_autofixed_to_the_minimum() {
        let r = auto_enforce_frontage_width(40.0, 60.0);
        assert_eq!(r.status, ExperienceStatus::Autofixed);
        assert_eq!(r.recommended_value, Some(json!(60.0)));
    }

    #[test]
    fn compliant_frontage_is_optimal() {
        let r = auto_enforce_frontage_width(70.0, 60.0);
        assert_eq!(r.status, ExperienceStatus::Optimal);
    }

    #[test]
    fn cul_de_sac_bulb_is_50ft_for_a_fire_engine_and_45ft_otherwise() {
        assert_eq!(
            auto_size_cul_de_sac_bulb("Fire Engine").recommended_value,
            Some(json!(50.0))
        );
        assert_eq!(
            auto_size_cul_de_sac_bulb("Ladder Truck").recommended_value,
            Some(json!(45.0))
        );
    }

    #[test]
    fn setbacks_default_from_the_r1_fallback_converted_to_feet() {
        let r = auto_place_setbacks(None, None, None);
        let value = r.recommended_value.unwrap();
        // 3.0m * 3.28084 = 9.84 -> rounds to 10.
        assert_eq!(value["frontFt"], 10.0);
        assert_eq!(value["rearFt"], 25.0);
        assert_eq!(value["sideFt"], 10.0);
    }

    #[test]
    fn retail_parking_requires_more_stalls_per_1000_sqft_than_other_uses() {
        let retail = auto_size_parking_stalls(10_000.0, "retail");
        let office = auto_size_parking_stalls(10_000.0, "office");
        let retail_value = retail.recommended_value.unwrap();
        let office_value = office.recommended_value.unwrap();
        assert!(
            retail_value["totalStalls"].as_f64().unwrap()
                > office_value["totalStalls"].as_f64().unwrap()
        );
    }

    #[test]
    fn a_high_depth_to_width_ratio_is_autofixed() {
        let r = auto_fix_depth_to_width_ratio(500.0, 100.0);
        assert_eq!(r.status, ExperienceStatus::Autofixed);
    }

    #[test]
    fn a_landlocked_lot_without_street_access_is_autofixed() {
        let r = auto_fix_landlocked_lot(false);
        assert_eq!(r.status, ExperienceStatus::Autofixed);
        let with_access = auto_fix_landlocked_lot(true);
        assert_eq!(with_access.status, ExperienceStatus::Optimal);
    }

    #[test]
    fn non_conforming_lot_area_is_autofixed_to_the_minimum() {
        let r = auto_fix_non_conforming_lot_area(4000.0, 5000.0);
        assert_eq!(r.status, ExperienceStatus::Autofixed);
        assert_eq!(r.recommended_value, Some(json!(5000.0)));
    }
}
