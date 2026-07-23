//! Stair riser/tread/stringer geometry algorithm. Port of
//! `packages/domain/src/planning/stairs.ts`'s `calculateStairGeometry` and
//! `types/stairs.ts`.
//!
//! [`crate::elements::Stair`] is already ported; this module is the geometry
//! algorithm layered on top: riser/tread counts and dimensions, stringer
//! centerlines for straight/spiral/U-shaped configurations, 2D plan
//! annotations (break line, direction arrow, baluster anchors), and a
//! concrete/timber material take-off, plus riser-height, tread-depth, and
//! overhead-clearance compliance warnings.
//!
//! **Governing convention**: riser/tread/headroom limits cite the
//! International Building Code (IBC) 2021, §1011 "Stairways" —
//! §1011.5.2 (riser height 4"–7" / 0.10–0.18 m, tread depth ≥ 11" / 0.28 m for
//! most occupancies; this port's fallback constants use the wider
//! commonly-cited residential/IRC envelope of max riser 7.75" / 0.197 m and
//! min tread 10" / 0.254 m the TS original's own federal-reference data
//! table specifies) and §1011.3 (minimum headroom 80" / 2.03 m / 6'8"). Every
//! numeric default below traces to
//! `crate::federal_data::Structural::ibc_max_riser_height_in` /
//! `ibc_min_tread_depth_in` / `ibc_min_headroom_in`, which embed exactly
//! those code values.
//!
//! **Catalog fallback**: the TS original first checks
//! `globalPartsDb.getStairAssemblies()[0]` for a jurisdiction/product
//! override of these three limits before falling back to the federal
//! defaults. That catalog now lives in `thoth-drawing::parts`, which this
//! crate must not depend on (see `GAP_CLOSE_STATUS.md`'s dependency-order
//! note) — this port always uses the federal fallback, exactly matching a
//! site with no stair assemblies registered.

use serde::{Deserialize, Serialize};
use thoth_spatial::{add, centroid, distance, scale, Point};

use crate::elements::Stair;
use crate::elements::StairType;
use crate::federal_data;

/// Computed riser/tread counts, stringer/annotation geometry, and material
/// take-offs for a [`Stair`] element.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StairGeometryResults {
    pub riser_count: u32,
    pub actual_riser_height: f64,
    pub tread_count: u32,
    pub actual_tread_depth: f64,

    /// Structural stringer centerlines (2 per flight: left/right or inner/outer).
    pub stringer_centerlines: Vec<Vec<Point>>,

    pub break_line: Vec<Point>,
    /// Directional flow arrow pointing "Down".
    pub arrow_path: Vec<Point>,
    pub baluster_anchors: Vec<Point>,
    pub tread_lines: Vec<Vec<Point>>,

    pub concrete_volume_cu_m: f64,
    pub timber_board_feet: f64,

    pub warnings: Vec<String>,
}

/// Compute riser/tread counts, stringer centerlines, 2D plan annotations,
/// and material take-offs for a [`Stair`] element.
///
/// Cites IBC §1011.5.2 (riser height / tread depth limits) and §1011.3
/// (minimum 80" / 6'8" headroom clearance) — see the module docs for the
/// exact numeric provenance.
pub fn calculate_stair_geometry(stair: &Stair) -> StairGeometryResults {
    let mut warnings = Vec::new();
    let structural = federal_data::structural();

    // 1. Riser & tread limit checking.
    let riser_height_limit = if stair.riser_height_limit != 0.0 {
        stair.riser_height_limit
    } else {
        structural.ibc_max_riser_height_in * 0.0254
    };
    let tread_depth_limit = if stair.tread_depth_limit != 0.0 {
        stair.tread_depth_limit
    } else {
        structural.ibc_min_tread_depth_in * 0.0254
    };

    if riser_height_limit > 0.21 {
        warnings.push(format!(
            "Warning: Riser height limit ({riser_height_limit}m) exceeds safe maximum (0.21m / 8.25\")."
        ));
    }
    if tread_depth_limit < 0.22 {
        warnings.push(format!(
            "Warning: Tread depth limit ({tread_depth_limit}m) is below safe minimum (0.22m / 9\")."
        ));
    }

    let height = stair.height.abs();
    let riser_count = ((height / riser_height_limit).ceil() as i64).max(1) as u32;
    let actual_riser_height = height / riser_count as f64;
    let safe_riser_h = actual_riser_height.max(0.01);

    let total_tread_count = (riser_count.saturating_sub(1)).max(1);

    let footprint_center = centroid(&stair.base.boundary);

    let mut footprint_length = 3.0_f64;
    if stair.base.boundary.len() >= 4 {
        let p0 = stair.base.boundary[0];
        let p1 = stair.base.boundary[1];
        let p2 = stair.base.boundary[2];
        let p3 = stair.base.boundary[3];
        let start_mid = scale(add(p0, p1), 0.5);
        let end_mid = scale(add(p2, p3), 0.5);
        footprint_length = distance(end_mid, start_mid);
    }

    let actual_tread_depth = footprint_length / total_tread_count.max(1) as f64;

    // 2. Overhead clearance.
    let overhead_limit = match stair.overhead_clearance_limit {
        Some(limit) if limit != 0.0 => limit,
        _ => structural.ibc_min_headroom_in * 0.0254,
    };
    if let Some(ceiling_elevation) = stair.ceiling_elevation {
        let critical_clearance = ceiling_elevation - height;
        if critical_clearance < overhead_limit {
            warnings.push(format!(
                "Violation: Overhead clearance height ({critical_clearance:.2}m) is less than standard minimum ({overhead_limit:.2}m / 6'8\")."
            ));
        }
    }

    let mut stringer_centerlines: Vec<Vec<Point>> = Vec::new();
    let mut break_line: Vec<Point> = Vec::new();
    let mut arrow_path: Vec<Point> = Vec::new();
    let mut baluster_anchors: Vec<Point> = Vec::new();
    let mut tread_lines: Vec<Vec<Point>> = Vec::new();

    match stair.stair_type {
        StairType::Spiral => {
            let total_rot_deg = stair.total_rotation.unwrap_or(270.0);
            let total_rot_rad = total_rot_deg.to_radians();
            let radius = stair.radius.unwrap_or(1.2);
            let w = stair.width;
            let w = if w != 0.0 { w } else { 0.9 };

            let inner_r = (radius - w / 2.0).max(0.1);
            let outer_r = radius + w / 2.0;

            let mut left_stringer = Vec::new();
            let mut right_stringer = Vec::new();

            for i in 0..=total_tread_count {
                let angle = (i as f64 / total_tread_count as f64) * total_rot_rad;
                let cos = angle.cos();
                let sin = angle.sin();

                let pt_inner = Point::new(
                    footprint_center.x + inner_r * cos,
                    footprint_center.y + inner_r * sin,
                );
                let pt_outer = Point::new(
                    footprint_center.x + outer_r * cos,
                    footprint_center.y + outer_r * sin,
                );

                left_stringer.push(pt_inner);
                right_stringer.push(pt_outer);

                if i < total_tread_count {
                    tread_lines.push(vec![pt_inner, pt_outer]);

                    let next_angle = ((i as f64 + 0.5) / total_tread_count as f64) * total_rot_rad;
                    baluster_anchors.push(Point::new(
                        footprint_center.x + (outer_r - 0.05) * next_angle.cos(),
                        footprint_center.y + (outer_r - 0.05) * next_angle.sin(),
                    ));
                }
            }
            stringer_centerlines.push(left_stringer);
            stringer_centerlines.push(right_stringer);

            for i in 0..=total_tread_count {
                let angle = (i as f64 / total_tread_count as f64) * total_rot_rad;
                arrow_path.push(Point::new(
                    footprint_center.x + radius * angle.cos(),
                    footprint_center.y + radius * angle.sin(),
                ));
            }

            let cut_idx =
                (total_tread_count.saturating_sub(1)).min((1.2 / safe_riser_h).floor() as u32);
            let cut_angle = (cut_idx as f64 / total_tread_count as f64) * total_rot_rad;
            break_line.push(Point::new(
                footprint_center.x + inner_r * cut_angle.cos(),
                footprint_center.y + inner_r * cut_angle.sin(),
            ));
            break_line.push(Point::new(
                footprint_center.x + outer_r * cut_angle.cos(),
                footprint_center.y + outer_r * cut_angle.sin(),
            ));
        }
        StairType::UShape => {
            let u_offset = stair.u_shape_offset.unwrap_or(0.15);
            let w = if stair.width != 0.0 { stair.width } else { 0.9 };
            let landing_len = stair.intermediate_landing_length.unwrap_or(w);

            let f_risers = (riser_count as f64 / 2.0).ceil() as u32;
            let s_risers = riser_count - f_risers;

            let f_treads = f_risers.saturating_sub(1).max(1);
            let s_treads = s_risers.saturating_sub(1).max(1);

            let start_pt = stair
                .base
                .boundary
                .first()
                .copied()
                .unwrap_or(Point::new(0.0, 0.0));
            let (dx, dy) = if stair.base.boundary.len() > 1 {
                (
                    stair.base.boundary[1].x - start_pt.x,
                    stair.base.boundary[1].y - start_pt.y,
                )
            } else {
                (w, 0.0)
            };
            let angle = dy.atan2(dx);
            let cos = angle.cos();
            let sin = angle.sin();

            let sep_x = -(w + u_offset) * sin;
            let sep_y = (w + u_offset) * cos;

            let mut flight1_left = Vec::new();
            let mut flight1_right = Vec::new();
            for i in 0..=f_treads {
                let progress = i as f64 * tread_depth_limit;
                let pt_l = Point::new(start_pt.x + progress * cos, start_pt.y + progress * sin);
                let pt_r = Point::new(pt_l.x + w * -sin, pt_l.y + w * cos);

                flight1_left.push(pt_l);
                flight1_right.push(pt_r);

                if i < f_treads {
                    tread_lines.push(vec![pt_l, pt_r]);
                    baluster_anchors
                        .push(Point::new((pt_l.x + pt_r.x) / 2.0, (pt_l.y + pt_r.y) / 2.0));
                }
            }
            stringer_centerlines.push(flight1_left.clone());
            stringer_centerlines.push(flight1_right.clone());

            let mut flight2_left = Vec::new();
            let mut flight2_right = Vec::new();
            let f2_start = Point::new(
                start_pt.x + (f_treads as f64 * tread_depth_limit + landing_len) * cos + sep_x,
                start_pt.y + (f_treads as f64 * tread_depth_limit + landing_len) * sin + sep_y,
            );

            for i in 0..=s_treads {
                let progress = i as f64 * -tread_depth_limit;
                let pt_l = Point::new(f2_start.x + progress * cos, f2_start.y + progress * sin);
                let pt_r = Point::new(pt_l.x + w * sin, pt_l.y + w * -cos);

                flight2_left.push(pt_l);
                flight2_right.push(pt_r);

                if i < s_treads {
                    tread_lines.push(vec![pt_l, pt_r]);
                    baluster_anchors
                        .push(Point::new((pt_l.x + pt_r.x) / 2.0, (pt_l.y + pt_r.y) / 2.0));
                }
            }
            stringer_centerlines.push(flight2_left);
            stringer_centerlines.push(flight2_right);

            arrow_path.push(Point::new(
                f2_start.x + (w / 2.0) * sin,
                f2_start.y + (w / 2.0) * -cos,
            ));
            arrow_path.push(Point::new(
                start_pt.x + sep_x / 2.0,
                start_pt.y + sep_y / 2.0,
            ));
            arrow_path.push(Point::new(
                start_pt.x + (w / 2.0) * -sin,
                start_pt.y + (w / 2.0) * cos,
            ));

            let cut_idx =
                (f_treads.saturating_sub(1)).min((1.2 / safe_riser_h).floor() as u32) as usize;
            let pt_cut_l = flight1_left.get(cut_idx).copied().unwrap_or(start_pt);
            let pt_cut_r = flight1_right.get(cut_idx).copied().unwrap_or(start_pt);
            break_line.push(pt_cut_l);
            break_line.push(pt_cut_r);
        }
        StairType::Straight => {
            let start_pt = stair
                .base
                .boundary
                .first()
                .copied()
                .unwrap_or(Point::new(0.0, 0.0));
            let p1 = stair
                .base
                .boundary
                .get(1)
                .copied()
                .unwrap_or(Point::new(start_pt.x + 3.0, start_pt.y));
            let w = if stair.width != 0.0 { stair.width } else { 1.0 };

            let dx = p1.x - start_pt.x;
            let dy = p1.y - start_pt.y;
            let angle = dy.atan2(dx);
            let cos = angle.cos();
            let sin = angle.sin();

            let mut left_stringer = Vec::new();
            let mut right_stringer = Vec::new();

            for i in 0..=total_tread_count {
                let progress = i as f64 * actual_tread_depth;
                let pt_l = Point::new(start_pt.x + progress * cos, start_pt.y + progress * sin);
                let pt_r = Point::new(pt_l.x + w * -sin, pt_l.y + w * cos);

                left_stringer.push(pt_l);
                right_stringer.push(pt_r);

                if i < total_tread_count {
                    tread_lines.push(vec![pt_l, pt_r]);
                    baluster_anchors.push(Point::new(
                        pt_l.x + (w / 2.0) * -sin + (actual_tread_depth / 2.0) * cos,
                        pt_l.y + (w / 2.0) * cos + (actual_tread_depth / 2.0) * sin,
                    ));
                }
            }
            stringer_centerlines.push(left_stringer.clone());
            stringer_centerlines.push(right_stringer.clone());

            let straight_cut_idx = (total_tread_count.saturating_sub(1))
                .min((1.2 / safe_riser_h).floor() as u32)
                as usize;
            let pt_cut_l = left_stringer
                .get(straight_cut_idx)
                .copied()
                .unwrap_or(start_pt);
            let pt_cut_r = right_stringer
                .get(straight_cut_idx)
                .copied()
                .unwrap_or(start_pt);
            break_line.push(pt_cut_l);
            break_line.push(pt_cut_r);

            arrow_path.push(Point::new(p1.x + (w / 2.0) * -sin, p1.y + (w / 2.0) * cos));
            arrow_path.push(Point::new(
                start_pt.x + (w / 2.0) * -sin,
                start_pt.y + (w / 2.0) * cos,
            ));
        }
    }

    // 3. Material take-offs.
    let landing_thick = stair.landing_slab_thickness.unwrap_or(0.15);
    let tread_thick = stair.tread_slab_thickness.unwrap_or(0.12);
    let w = if stair.width != 0.0 { stair.width } else { 1.0 };

    let single_tread_vol = w * actual_tread_depth * actual_riser_height * 0.5;
    let total_steps_vol = riser_count as f64 * single_tread_vol;

    let landing_area = if matches!(stair.stair_type, StairType::UShape) {
        w * w * 2.0
    } else {
        0.0
    };
    let landings_vol = landing_area * landing_thick;

    let stringer_w = stair.stringer_width.unwrap_or(0.05);
    let slope_len = footprint_length.hypot(height);
    let stringer_vol = 2.0 * (slope_len * 0.3 * stringer_w);

    let concrete_volume_cu_m = total_steps_vol + landings_vol + stringer_vol;

    let wood_treads_vol = riser_count as f64 * w * actual_tread_depth * tread_thick;
    let total_wood_vol = wood_treads_vol + landings_vol + stringer_vol;
    let board_foot_factor = 1.0 / 0.002_359_74;
    let timber_board_feet = total_wood_vol * board_foot_factor;

    StairGeometryResults {
        riser_count,
        actual_riser_height,
        tread_count: total_tread_count,
        actual_tread_depth,
        stringer_centerlines,
        break_line,
        arrow_path,
        baluster_anchors,
        tread_lines,
        concrete_volume_cu_m,
        timber_board_feet,
        warnings,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::elements::new_base;
    use thoth_spatial::ElementKind;

    /// An IBC-compliant straight stair: 9 risers @ 7" (0.1778 m) over a
    /// 63" (1.6002 m) total rise, 11" (0.2794 m) treads — both within
    /// IBC §1011.5.2 (max riser 7.75" / 0.197 m, min tread 10" / 0.254 m).
    fn compliant_straight_stair() -> Stair {
        Stair {
            base: new_base(
                "s1",
                ElementKind::Stair,
                "Stair 1",
                "layer-buildings",
                vec![Point::new(0.0, 0.0), Point::new(2.5146, 0.0)],
            ),
            stair_type: StairType::Straight,
            width: 1.0,
            height: 1.6002,
            radius: None,
            total_rotation: None,
            u_shape_offset: None,
            flight_count: None,
            intermediate_landing_length: None,
            tread_depth_limit: 0.2794,
            riser_height_limit: 0.1778,
            landing_slab_thickness: Some(0.15),
            tread_slab_thickness: Some(0.12),
            stringer_profile: None,
            stringer_width: Some(0.05),
            nosing_profile: None,
            nosing_overhang: None,
            slip_resistant_grooves: None,
            overhead_clearance_limit: None,
            ceiling_elevation: None,
        }
    }

    #[test]
    fn ibc_compliant_riser_and_tread_limits_produce_no_warnings() {
        let stair = compliant_straight_stair();
        let result = calculate_stair_geometry(&stair);
        assert!(result.warnings.is_empty());
    }

    #[test]
    fn riser_count_matches_total_rise_divided_by_riser_limit() {
        let stair = compliant_straight_stair();
        let result = calculate_stair_geometry(&stair);
        // 1.6002m / 0.1778m = 9.0 exactly -> 9 risers, 8 treads.
        assert_eq!(result.riser_count, 9);
        assert_eq!(result.tread_count, 8);
        assert!((result.actual_riser_height - 0.1778).abs() < 1e-6);
    }

    #[test]
    fn a_riser_limit_above_the_safe_maximum_warns() {
        let mut stair = compliant_straight_stair();
        stair.riser_height_limit = 0.22; // > 0.21m safe max
        let result = calculate_stair_geometry(&stair);
        assert!(result
            .warnings
            .iter()
            .any(|w| w.contains("exceeds safe maximum")));
    }

    #[test]
    fn a_tread_limit_below_the_safe_minimum_warns() {
        let mut stair = compliant_straight_stair();
        stair.tread_depth_limit = 0.20; // < 0.22m safe min
        let result = calculate_stair_geometry(&stair);
        assert!(result
            .warnings
            .iter()
            .any(|w| w.contains("below safe minimum")));
    }

    #[test]
    fn insufficient_ceiling_elevation_triggers_a_headroom_violation() {
        let mut stair = compliant_straight_stair();
        stair.ceiling_elevation = Some(stair.height + 1.5); // only 1.5m clearance, well under 2.03m (6'8")
        let result = calculate_stair_geometry(&stair);
        assert!(result
            .warnings
            .iter()
            .any(|w| w.contains("Overhead clearance")));
    }

    #[test]
    fn sufficient_ceiling_elevation_has_no_headroom_warning() {
        let mut stair = compliant_straight_stair();
        stair.ceiling_elevation = Some(stair.height + 2.5);
        let result = calculate_stair_geometry(&stair);
        assert!(!result
            .warnings
            .iter()
            .any(|w| w.contains("Overhead clearance")));
    }

    #[test]
    fn straight_stair_produces_two_parallel_stringers_and_a_tread_per_riser_minus_one() {
        let stair = compliant_straight_stair();
        let result = calculate_stair_geometry(&stair);
        assert_eq!(result.stringer_centerlines.len(), 2);
        assert_eq!(result.tread_lines.len(), result.tread_count as usize);
        assert_eq!(result.baluster_anchors.len(), result.tread_count as usize);
        // The break line and arrow path are each a 2-point annotation.
        assert_eq!(result.break_line.len(), 2);
        assert_eq!(result.arrow_path.len(), 2);
    }

    #[test]
    fn spiral_stair_stringers_stay_at_constant_inner_and_outer_radii() {
        let mut stair = compliant_straight_stair();
        stair.stair_type = StairType::Spiral;
        stair.radius = Some(1.2);
        stair.total_rotation = Some(270.0);
        let result = calculate_stair_geometry(&stair);
        assert_eq!(result.stringer_centerlines.len(), 2);
        let center = centroid(&stair.base.boundary);
        let inner_r = 1.2 - stair.width / 2.0;
        for pt in &result.stringer_centerlines[0] {
            assert!((distance(*pt, center) - inner_r).abs() < 1e-6);
        }
    }

    #[test]
    fn u_shape_stair_produces_two_flights_with_a_landing_between() {
        let mut stair = compliant_straight_stair();
        stair.stair_type = StairType::UShape;
        stair.base.boundary = vec![Point::new(0.0, 0.0), Point::new(0.0, 1.0)];
        let result = calculate_stair_geometry(&stair);
        // Two flights -> 4 stringer centerlines (left/right per flight).
        assert_eq!(result.stringer_centerlines.len(), 4);
        assert_eq!(result.arrow_path.len(), 3);
    }

    #[test]
    fn concrete_volume_is_positive_and_scales_with_width() {
        let stair = compliant_straight_stair();
        let mut wide_stair = stair.clone();
        wide_stair.width = 2.0;
        let narrow_result = calculate_stair_geometry(&stair);
        let wide_result = calculate_stair_geometry(&wide_stair);
        assert!(narrow_result.concrete_volume_cu_m > 0.0);
        assert!(wide_result.concrete_volume_cu_m > narrow_result.concrete_volume_cu_m);
    }

    #[test]
    fn falls_back_to_federal_ibc_defaults_when_the_stair_has_no_explicit_limits() {
        let mut stair = compliant_straight_stair();
        stair.riser_height_limit = 0.0;
        stair.tread_depth_limit = 0.0;
        let result = calculate_stair_geometry(&stair);
        let structural = federal_data::structural();
        let expected_riser_limit = structural.ibc_max_riser_height_in * 0.0254;
        let expected_riser_count = (stair.height / expected_riser_limit).ceil() as u32;
        assert_eq!(result.riser_count, expected_riser_count);
    }
}
