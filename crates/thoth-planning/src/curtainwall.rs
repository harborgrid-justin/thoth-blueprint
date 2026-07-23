//! Curtain-wall panel/mullion grid-layout geometry. Port of
//! `packages/domain/src/planning/curtainwall.ts`'s
//! `calculateCurtainWallGeometry` and `types/curtainwall.ts`.
//!
//! The [`CurtainWall`]/[`CurtainWallGrid`] *element* type is ported in
//! [`crate::elements`] (`GAP_CLOSE_STATUS.md` calls it out as a must-have);
//! this module is the geometry algorithm layered on top of it: it walks the
//! wall's (possibly nested) division grid, produces a panel + mullion layout
//! in both plan (wall-baseline-relative) and elevation coordinates, and
//! rolls up a thermal (U-factor/R-value) and material-inventory take-off.
//!
//! **Not ported**: the TS original also looks panel infill materials up in
//! `globalPartsDb.getCurtainWallInfillPanels()` to override the
//! default glass/brick/insulation R-values with a catalog match. That
//! catalog now lives in `thoth-drawing::parts`, which this crate must not
//! depend on (dependency-order constraint — see `GAP_CLOSE_STATUS.md`).
//! This port always uses the [`crate::federal_data::Structural`] fallback
//! R-values the TS falls back to whenever no catalog entry matches — exactly
//! the behavior a site with no curtain-wall parts registered already gets in
//! the TS original.

use serde::{Deserialize, Serialize};
use thoth_spatial::{distance, Point};

use crate::elements::{CurtainWall, CurtainWallGrid, DivisionMode, InfillMaterial};
use crate::federal_data;

/// One infill panel in a curtain wall's grid.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CurtainWallPanel {
    /// `"row,col"` cell key (or `"parent/row,col"` inside a nested grid).
    pub key: String,
    pub x_start: f64,
    pub x_end: f64,
    pub y_start: f64,
    pub y_end: f64,
    pub width: f64,
    pub height: f64,
    pub material: InfillMaterial,
    /// `true` for door/window infill (a placeholder cell a real opening
    /// element overwrites in the drawing, not a glazed/opaque panel).
    pub is_overwritten: bool,
    /// The panel's plan-space glazing/infill polygon(s), one ring per pane.
    pub pane_polygons: Vec<Vec<Point>>,
    /// Structural-glazing clip anchor points along the panel.
    pub clip_anchors: Vec<Point>,
}

/// A vertical or horizontal mullion in a curtain wall's grid.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MullionDirection {
    Vertical,
    Horizontal,
}

/// A single mullion member.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CurtainWallMullion {
    pub direction: MullionDirection,
    pub index: usize,
    pub x_start: f64,
    pub y_start: f64,
    pub x_end: f64,
    pub y_end: f64,
    pub width: f64,
    /// Plan-space mullion polygon (a 2-point centerline pair for
    /// verticals; empty for horizontals, matching the TS original, which
    /// only builds a plan-projected polygon for the wall-parallel members).
    pub mullion_polygon: Vec<Point>,
}

/// One row of the panel-material inventory take-off.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct InventoryRow {
    pub material: InfillMaterial,
    pub width: f64,
    pub height: f64,
    pub count: u32,
}

/// The full computed geometry + take-off for a [`CurtainWall`] element.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CurtainWallGeometryResults {
    pub panels: Vec<CurtainWallPanel>,
    pub mullions: Vec<CurtainWallMullion>,
    /// Wall-perimeter frame outline, plan space (one ring).
    pub perimeter_frame: Vec<Vec<Point>>,
    /// The wall unrolled into elevation (width × height) space.
    pub elevation_outline: Vec<Point>,
    /// Structural tie anchor points along the wall.
    pub structural_ties: Vec<Point>,
    pub warnings: Vec<String>,
    pub overall_u_factor: f64,
    pub overall_r_value: f64,
    pub inventory: Vec<InventoryRow>,
}

/// Compute the grid split offsets (including `0` and `len`) along one axis.
fn splits(len: f64, mode: DivisionMode, offsets: &[f64]) -> Vec<f64> {
    let mut list = vec![0.0];
    match mode {
        DivisionMode::Manual if !offsets.is_empty() => {
            let mut sorted: Vec<f64> = offsets
                .iter()
                .copied()
                .filter(|&v| v > 0.0 && v < len)
                .collect();
            sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
            list.extend(sorted);
        }
        DivisionMode::Fixed => {
            let spacing = offsets
                .first()
                .copied()
                .filter(|&v| v != 0.0)
                .unwrap_or(1.2);
            let mut curr = spacing;
            while curr < len - 0.01 {
                list.push(curr);
                curr += spacing;
            }
        }
        _ => {
            let count = offsets
                .first()
                .copied()
                .filter(|&v| v != 0.0)
                .map(|v| (v.round() as i64).max(1))
                .unwrap_or(3);
            let spacing = len / count as f64;
            for i in 1..count {
                list.push(i as f64 * spacing);
            }
        }
    }
    list.push(len);
    list
}

/// Compute the panel/mullion grid layout, thermal roll-up, and material
/// take-off for a [`CurtainWall`] element.
///
/// Mirrors `calculateCurtainWallGeometry` exactly, including its
/// recursive descent into `nested_grids` for any cell key that has one.
pub fn calculate_curtain_wall_geometry(wall: &CurtainWall) -> CurtainWallGeometryResults {
    let mut warnings = Vec::new();
    let mut panels = Vec::new();
    let mut mullions = Vec::new();
    let mut structural_ties = Vec::new();
    // Keyed by `"{material:?}|{width:.2}x{height:.2}"` (mirrors the TS
    // `${material}|${width}x${height}` inventory key) rather than a
    // `(InfillMaterial, String)` tuple, since [`InfillMaterial`] doesn't
    // derive `Ord` (it only needs `PartialEq`/`Eq` for its own purposes
    // elsewhere in this crate).
    let mut inventory_map: std::collections::BTreeMap<String, (InfillMaterial, f64, f64, u32)> =
        std::collections::BTreeMap::new();

    let boundary = &wall.base.boundary;
    let (start_pt, end_pt) = if boundary.len() >= 2 {
        (boundary[0], boundary[1])
    } else {
        (Point::new(0.0, 0.0), Point::new(5.0, 0.0))
    };

    let dx = end_pt.x - start_pt.x;
    let dy = end_pt.y - start_pt.y;
    let plan_len = {
        let d = distance(end_pt, start_pt);
        if d == 0.0 {
            1.0
        } else {
            d
        }
    };
    let cos = dx / plan_len;
    let sin = dy / plan_len;

    let total_width = if wall.width != 0.0 {
        wall.width
    } else {
        plan_len
    };
    let total_height = if wall.height != 0.0 { wall.height } else { 3.0 };
    let frame_width = wall.frame_profile_width.unwrap_or(0.1);
    let gap = wall.expansion_gap.unwrap_or(0.01);
    let pane_offset = wall.pane_offset.unwrap_or(0.02);
    let clip_spacing = wall.clip_spacing.unwrap_or(0.6);
    let tie_spacing = wall.structural_tie_spacing.unwrap_or(1.2);

    let structural = federal_data::structural();

    #[allow(clippy::too_many_arguments)]
    fn process_grid(
        wall: &CurtainWall,
        grid: &CurtainWallGrid,
        parent_key: &str,
        x0: f64,
        x1: f64,
        y0: f64,
        y1: f64,
        start_pt: Point,
        cos: f64,
        sin: f64,
        gap: f64,
        pane_offset: f64,
        clip_spacing: f64,
        panels: &mut Vec<CurtainWallPanel>,
        mullions: &mut Vec<CurtainWallMullion>,
        inventory_map: &mut std::collections::BTreeMap<String, (InfillMaterial, f64, f64, u32)>,
        warnings: &mut Vec<String>,
    ) {
        let w = x1 - x0;
        let h = y1 - y0;

        let x_splits = splits(w, grid.vertical_divisions, &grid.vertical_offsets);
        let y_splits = splits(h, grid.horizontal_divisions, &grid.horizontal_offsets);

        for (i, &x_split) in x_splits
            .iter()
            .enumerate()
            .take(x_splits.len().saturating_sub(1))
            .skip(1)
        {
            let local_x = x0 + x_split;
            let m_width = grid
                .mullion_widths
                .get(&(i as u32))
                .copied()
                .unwrap_or(0.05);

            let wall_x = start_pt.x + local_x * cos;
            let wall_y = start_pt.y + local_x * sin;
            let ortho_l = Point::new(
                wall_x - (m_width / 2.0) * -sin,
                wall_y - (m_width / 2.0) * cos,
            );
            let ortho_r = Point::new(
                wall_x + (m_width / 2.0) * -sin,
                wall_y + (m_width / 2.0) * cos,
            );

            mullions.push(CurtainWallMullion {
                direction: MullionDirection::Vertical,
                index: i,
                x_start: local_x,
                y_start: y0,
                x_end: local_x,
                y_end: y1,
                width: m_width,
                mullion_polygon: vec![ortho_l, ortho_r],
            });
        }

        for (j, &y_split) in y_splits
            .iter()
            .enumerate()
            .take(y_splits.len().saturating_sub(1))
            .skip(1)
        {
            let local_y = y0 + y_split;
            mullions.push(CurtainWallMullion {
                direction: MullionDirection::Horizontal,
                index: j,
                x_start: x0,
                y_start: local_y,
                x_end: x1,
                y_end: local_y,
                width: 0.05,
                mullion_polygon: vec![],
            });
        }

        for i in 0..x_splits.len() - 1 {
            for j in 0..y_splits.len() - 1 {
                let cell_key = if parent_key.is_empty() {
                    format!("{i},{j}")
                } else {
                    format!("{parent_key}/{i},{j}")
                };
                let cx0 = x0 + x_splits[i];
                let cx1 = x0 + x_splits[i + 1];
                let cy0 = y0 + y_splits[j];
                let cy1 = y0 + y_splits[j + 1];

                let cell_w = cx1 - cx0;
                let cell_h = cy1 - cy0;

                if let Some(nest) = wall.nested_grids.get(&cell_key) {
                    process_grid(
                        wall,
                        nest,
                        &cell_key,
                        cx0,
                        cx1,
                        cy0,
                        cy1,
                        start_pt,
                        cos,
                        sin,
                        gap,
                        pane_offset,
                        clip_spacing,
                        panels,
                        mullions,
                        inventory_map,
                        warnings,
                    );
                    continue;
                }

                let mat = grid
                    .infill_materials
                    .get(&format!("{i},{j}"))
                    .copied()
                    .unwrap_or(InfillMaterial::Glazing);

                if matches!(mat, InfillMaterial::Glazing) && (cell_w > 2.0 || cell_h > 3.0) {
                    warnings.push(format!(
                        "Glazing panel {cell_key} exceeds safe wind load area limits (max 2.0m x 3.0m)."
                    ));
                }

                let p_start = cx0 + gap;
                let p_end = cx1 - gap;
                let p_width = p_end - p_start;
                let p_height = cell_h - 2.0 * gap;

                let wall_start_x = start_pt.x + p_start * cos;
                let wall_start_y = start_pt.y + p_start * sin;
                let wall_end_x = start_pt.x + p_end * cos;
                let wall_end_y = start_pt.y + p_end * sin;

                let offset_start_x = wall_start_x - pane_offset * -sin;
                let offset_start_y = wall_start_y - pane_offset * cos;
                let offset_end_x = wall_end_x - pane_offset * -sin;
                let offset_end_y = wall_end_y - pane_offset * cos;

                let thick = 0.02;
                let pane_polygons = vec![vec![
                    Point::new(
                        offset_start_x - (thick / 2.0) * cos,
                        offset_start_y - (thick / 2.0) * sin,
                    ),
                    Point::new(
                        offset_start_x + (thick / 2.0) * cos,
                        offset_start_y + (thick / 2.0) * sin,
                    ),
                    Point::new(
                        offset_end_x + (thick / 2.0) * cos,
                        offset_end_y + (thick / 2.0) * sin,
                    ),
                    Point::new(
                        offset_end_x - (thick / 2.0) * cos,
                        offset_end_y - (thick / 2.0) * sin,
                    ),
                ]];

                let mut clip_anchors = Vec::new();
                if matches!(mat, InfillMaterial::Glazing) {
                    let mut curr = p_start + clip_spacing;
                    while curr < p_end - 0.05 {
                        clip_anchors.push(Point::new(
                            start_pt.x + curr * cos - pane_offset * -sin,
                            start_pt.y + curr * sin - pane_offset * cos,
                        ));
                        curr += clip_spacing;
                    }
                }

                panels.push(CurtainWallPanel {
                    key: cell_key,
                    x_start: cx0,
                    x_end: cx1,
                    y_start: cy0,
                    y_end: cy1,
                    width: p_width,
                    height: p_height,
                    material: mat,
                    is_overwritten: matches!(mat, InfillMaterial::Door | InfillMaterial::Window),
                    pane_polygons,
                    clip_anchors,
                });

                let inv_key = format!("{mat:?}|{p_width:.2}x{p_height:.2}");
                inventory_map
                    .entry(inv_key)
                    .and_modify(|e| e.3 += 1)
                    .or_insert((mat, p_width, p_height, 1));
            }
        }
    }

    process_grid(
        wall,
        &wall.grid,
        "",
        0.0,
        total_width,
        0.0,
        total_height,
        start_pt,
        cos,
        sin,
        gap,
        pane_offset,
        clip_spacing,
        &mut panels,
        &mut mullions,
        &mut inventory_map,
        &mut warnings,
    );

    let perimeter_frame = {
        let wall_start_x = start_pt.x;
        let wall_start_y = start_pt.y;
        let wall_end_x = start_pt.x + total_width * cos;
        let wall_end_y = start_pt.y + total_width * sin;
        vec![vec![
            Point::new(
                wall_start_x - (frame_width / 2.0) * -sin,
                wall_start_y - (frame_width / 2.0) * cos,
            ),
            Point::new(
                wall_end_x - (frame_width / 2.0) * -sin,
                wall_end_y - (frame_width / 2.0) * cos,
            ),
            Point::new(
                wall_end_x + (frame_width / 2.0) * -sin,
                wall_end_y + (frame_width / 2.0) * cos,
            ),
            Point::new(
                wall_start_x + (frame_width / 2.0) * -sin,
                wall_start_y + (frame_width / 2.0) * cos,
            ),
        ]]
    };

    let mut structural_tie_curr = 0.0;
    while structural_tie_curr <= total_width + 0.01 {
        structural_ties.push(Point::new(
            start_pt.x + structural_tie_curr * cos,
            start_pt.y + structural_tie_curr * sin,
        ));
        structural_tie_curr += tie_spacing;
    }

    let elevation_outline = vec![
        Point::new(0.0, 0.0),
        Point::new(total_width, 0.0),
        Point::new(total_width, total_height),
        Point::new(0.0, total_height),
    ];

    let mut total_area = 0.0;
    let mut weighted_u = 0.0;
    for p in &panels {
        let area = p.width * p.height;
        total_area += area;

        let r = match p.material {
            InfillMaterial::Brick => structural.default_brick_r_value,
            InfillMaterial::Insulation => structural.default_insulation_r_value,
            InfillMaterial::Door => 3.0,
            InfillMaterial::Glazing | InfillMaterial::Window => structural.default_glass_r_value,
        };
        weighted_u += (1.0 / r) * area;
    }

    let overall_u_factor = if total_area > 0.0 {
        weighted_u / total_area
    } else {
        0.4
    };
    let overall_r_value = if overall_u_factor > 0.0 {
        1.0 / overall_u_factor
    } else {
        2.5
    };

    let mut inventory: Vec<InventoryRow> = inventory_map
        .into_values()
        .map(|(material, width, height, count)| InventoryRow {
            material,
            width,
            height,
            count,
        })
        .collect();
    inventory.sort_by(|a, b| b.count.cmp(&a.count));

    CurtainWallGeometryResults {
        panels,
        mullions,
        perimeter_frame,
        elevation_outline,
        structural_ties,
        warnings,
        overall_u_factor,
        overall_r_value,
        inventory,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::elements::{new_base, CornerStyle};
    use std::collections::BTreeMap;
    use thoth_spatial::ElementKind;

    fn fixture_wall() -> CurtainWall {
        let mut infill = BTreeMap::new();
        infill.insert("0,0".to_string(), InfillMaterial::Glazing);
        infill.insert("1,0".to_string(), InfillMaterial::Glazing);
        infill.insert("2,0".to_string(), InfillMaterial::Glazing);
        infill.insert("0,1".to_string(), InfillMaterial::Glazing);
        infill.insert("1,1".to_string(), InfillMaterial::Glazing);
        infill.insert("2,1".to_string(), InfillMaterial::Glazing);

        CurtainWall {
            base: new_base(
                "cw1",
                ElementKind::Curtainwall,
                "Curtain Wall 1",
                "layer-buildings",
                vec![Point::new(0.0, 0.0), Point::new(6.0, 0.0)],
            ),
            width: 6.0,
            height: 3.2,
            grid: CurtainWallGrid {
                vertical_divisions: DivisionMode::Uniform,
                vertical_offsets: vec![3.0],
                horizontal_divisions: DivisionMode::Uniform,
                horizontal_offsets: vec![2.0],
                mullion_widths: BTreeMap::new(),
                infill_materials: infill,
            },
            nested_grids: BTreeMap::new(),
            corner_style: Some(CornerStyle::Rectangular),
            frame_profile_width: Some(0.1),
            expansion_gap: Some(0.01),
            pane_offset: Some(0.02),
            clip_spacing: Some(0.6),
            structural_tie_spacing: Some(1.2),
            frame_r_value: Some(2.5),
        }
    }

    #[test]
    fn produces_a_panel_per_grid_cell() {
        let wall = fixture_wall();
        let result = calculate_curtain_wall_geometry(&wall);
        // 3 vertical divisions x 2 horizontal divisions = 6 cells.
        assert_eq!(result.panels.len(), 6);
        assert_eq!(result.mullions.len(), 3); // 2 vertical (uniform count=3 -> 2 internal splits) + 1 horizontal
    }

    #[test]
    fn flags_oversized_glazing_panels() {
        let mut wall = fixture_wall();
        // A single 6m x 3.2m panel (no internal divisions) trivially exceeds
        // the 2.0m x 3.0m safe wind-load area limit.
        wall.grid.vertical_offsets = vec![1.0];
        wall.grid.horizontal_offsets = vec![1.0];
        wall.grid.infill_materials = BTreeMap::from([("0,0".to_string(), InfillMaterial::Glazing)]);
        let result = calculate_curtain_wall_geometry(&wall);
        assert!(result
            .warnings
            .iter()
            .any(|w| w.contains("exceeds safe wind load")));
    }

    #[test]
    fn thermal_rollup_uses_federal_fallback_r_values_when_all_glazing() {
        let wall = fixture_wall();
        let result = calculate_curtain_wall_geometry(&wall);
        let structural = federal_data::structural();
        assert!((result.overall_r_value - structural.default_glass_r_value).abs() < 1e-6);
    }

    #[test]
    fn inventory_counts_match_panel_count() {
        let wall = fixture_wall();
        let result = calculate_curtain_wall_geometry(&wall);
        let total: u32 = result.inventory.iter().map(|r| r.count).sum();
        assert_eq!(total as usize, result.panels.len());
    }

    #[test]
    fn falls_back_to_default_geometry_for_a_degenerate_boundary() {
        let mut wall = fixture_wall();
        wall.base.boundary = vec![];
        wall.width = 0.0;
        let result = calculate_curtain_wall_geometry(&wall);
        // Falls back to a 5.0-unit plan length wall.
        assert!(!result.panels.is_empty());
    }

    #[test]
    fn nested_grid_cell_recurses_instead_of_producing_a_flat_panel() {
        let mut wall = fixture_wall();
        wall.grid.vertical_offsets = vec![1.0];
        wall.grid.horizontal_offsets = vec![1.0];
        wall.grid.infill_materials = BTreeMap::from([("0,0".to_string(), InfillMaterial::Glazing)]);

        let mut nested_infill = BTreeMap::new();
        nested_infill.insert("0,0".to_string(), InfillMaterial::Door);
        nested_infill.insert("1,0".to_string(), InfillMaterial::Glazing);
        wall.nested_grids.insert(
            "0,0".to_string(),
            CurtainWallGrid {
                vertical_divisions: DivisionMode::Uniform,
                vertical_offsets: vec![2.0],
                horizontal_divisions: DivisionMode::Uniform,
                horizontal_offsets: vec![1.0],
                mullion_widths: BTreeMap::new(),
                infill_materials: nested_infill,
            },
        );

        let result = calculate_curtain_wall_geometry(&wall);
        // The nested grid replaces the single "0,0" cell with its own 2 panels.
        assert_eq!(result.panels.len(), 2);
        assert!(result.panels.iter().any(|p| p.key == "0,0/0,0"));
    }
}
