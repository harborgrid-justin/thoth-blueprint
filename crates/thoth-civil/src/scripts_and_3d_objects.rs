//! Scripts, mapping rules & 3D objects — REQ-170 through REQ-180.
//!
//! Port of `packages/domain/src/civil/scriptsAnd3DObjects.ts`. Depends on
//! `Point2D`/`Point3D` (`thoth_spatial::Point`/[`crate::grading::Point3D`]),
//! [`crate::site_and_parcels::ParcelObject`], and
//! [`crate::gis_and_3d_visualization::SdfConversionResult`] — all local to
//! this crate, no cross-crate dependency.
//!
//! **Adapted**: `executeImportScript`'s TS implementation evaluates an
//! arbitrary user-supplied JavaScript string via `new Function(...)` to
//! compute the mapped id/description/scale, falling back to a fixed
//! default mapping if the script throws. Rust has no embedded JS engine —
//! executing arbitrary caller-supplied script text is not something this
//! crate can do, and adding one would be a far larger (and dubious, for a
//! systems-engineering domain crate) undertaking than this port's scope.
//! [`default_import_script_mapping`] below ports the *actual* mapping logic
//! every current call site's default script computes (the part every test
//! in this domain actually exercises); a caller that needs genuinely
//! dynamic, user-authored mapping rules should express them as a Rust
//! closure passed to [`execute_import_script`] instead of an interpreted
//! string.

use thoth_spatial::Point;

use crate::gis_and_3d_visualization::{SdfConversionResult, SdfGeometryType};
use crate::grading::Point3D;
use crate::site_and_parcels::ParcelObject;

/// REQ-176: default elevated buffer for a coverage asset card, in inches
/// (e.g. a tree canopy rendered 2" above grade).
pub const DEFAULT_ELEVATED_BUFFER_INCHES: f64 = 2.0;

/// A raw record to be mapped by an import script (REQ-170).
#[derive(Debug, Clone, PartialEq)]
pub struct RawImportRecord {
    pub external_id: String,
    pub raw_desc: String,
    pub trunk_diameter_inches: Option<f64>,
}

/// The result of mapping a [`RawImportRecord`] (REQ-170, REQ-171).
#[derive(Debug, Clone, PartialEq)]
pub struct DataMappingScriptResult {
    pub mapped_id: String,
    pub mapped_description: String,
    pub dynamic_3d_scale_factor: f64,
}

/// REQ-170, REQ-171: the default mapping every current call site's script
/// computes — `mappedId = "PT-" + externalId`, `mappedDescription =
/// rawDesc.toUpperCase()`, and a 3D scale factor proportional to trunk
/// diameter (defaulting to a nominal 6" trunk, i.e. scale `1.0`).
pub fn default_import_script_mapping(raw_record: &RawImportRecord) -> DataMappingScriptResult {
    DataMappingScriptResult {
        mapped_id: format!("PT-{}", raw_record.external_id),
        mapped_description: raw_record.raw_desc.to_uppercase(),
        dynamic_3d_scale_factor: raw_record.trunk_diameter_inches.unwrap_or(6.0) / 6.0,
    }
}

/// REQ-170, REQ-171: execute a data-mapping rule against a raw record. The
/// TS source's interpreted-script-with-fallback design becomes a plain
/// Rust closure parameter, with [`default_import_script_mapping`] as the
/// equivalent of its default script.
pub fn execute_import_script(
    raw_record: &RawImportRecord,
    mapper: impl Fn(&RawImportRecord) -> DataMappingScriptResult,
) -> DataMappingScriptResult {
    mapper(raw_record)
}

/// REQ-174 through REQ-177: Asset Card / SDF coverage-buffer configuration.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AssetCardConfig {
    pub display_contours_from_coverage: bool,
    /// REQ-173: linear strokes rather than solid polygon fills.
    pub render_as_strokes: bool,
    pub elevated_buffer_inches: f64,
    pub convert_closed_polylines_to_polygons: bool,
}

/// A block-placement record extracted for CSV export (REQ-178).
#[derive(Debug, Clone, PartialEq)]
pub struct BlockExtractionRecord {
    pub block_name: String,
    pub position: Point3D,
    pub attributes: Vec<(String, String)>,
}

/// How a 3D architectural model is anchored on insertion (REQ-179).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ModelInsertionMode {
    Center2D,
    Origin,
    UserPoint,
}

/// REQ-179, REQ-180: an interactively placed 3D architectural model.
#[derive(Debug, Clone, PartialEq)]
pub struct ArchitecturalModel3DPlacement {
    pub id: String,
    pub model_file_name: String,
    pub insertion_mode: ModelInsertionMode,
    pub position: Point3D,
    /// REQ-180: placed via double-click manual terrain placement.
    pub is_interactive_placed: bool,
    pub scale_factor: f64,
}

/// REQ-172, REQ-173: export parcel objects to SDF format with linear
/// stroke rendering.
pub fn export_parcels_to_sdf(
    parcels: &[ParcelObject],
    output_sdf_name: impl Into<String>,
) -> (SdfConversionResult, bool) {
    (
        SdfConversionResult {
            sdf_file_name: output_sdf_name.into(),
            record_count: parcels.len(),
            geometry_type: SdfGeometryType::Polygon,
        },
        true,
    )
}

/// REQ-174, REQ-175, REQ-176, REQ-177: configure a coverage Asset Card.
pub fn configure_coverage_asset_card(
    display_contours_from_coverage: bool,
    elevated_buffer_inches: f64,
    convert_closed_polylines_to_polygons: bool,
) -> AssetCardConfig {
    AssetCardConfig {
        display_contours_from_coverage,
        render_as_strokes: true,
        elevated_buffer_inches,
        convert_closed_polylines_to_polygons,
    }
}

/// REQ-178: export block placements (position + attributes) to CSV.
pub fn export_blocks_to_csv(blocks: &[BlockExtractionRecord]) -> (String, usize) {
    let mut csv = "BlockName,X,Y,Z,Attributes\n".to_string();
    let rows: Vec<String> = blocks
        .iter()
        .map(|b| {
            let attrs_json = format!(
                "{{{}}}",
                b.attributes
                    .iter()
                    .map(|(k, v)| format!("\"{k}\":\"{}\"", v.replace('"', "\\\"")))
                    .collect::<Vec<_>>()
                    .join(",")
            );
            format!(
                "{},{},{},{},\"{}\"",
                b.block_name,
                b.position.x,
                b.position.y,
                b.position.z,
                attrs_json.replace('"', "\"\"")
            )
        })
        .collect();
    csv.push_str(&rows.join("\n"));

    (csv, blocks.len())
}

/// REQ-179, REQ-180: place a 3D architectural model interactively at a
/// terrain click point (always `Center2D` insertion, matching the current
/// tool's only supported mode).
pub fn place_3d_model_interactive(
    model_file_name: impl Into<String>,
    terrain_click_point: Point,
    terrain_elevation: f64,
) -> ArchitecturalModel3DPlacement {
    ArchitecturalModel3DPlacement {
        id: thoth_spatial::create_id("3d"),
        model_file_name: model_file_name.into(),
        insertion_mode: ModelInsertionMode::Center2D,
        position: Point3D::new(
            terrain_click_point.x,
            terrain_click_point.y,
            terrain_elevation,
        ),
        is_interactive_placed: true,
        scale_factor: 1.0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::site_and_parcels::ParcelStyle;

    fn style() -> ParcelStyle {
        ParcelStyle {
            id: "s".to_string(),
            name: "s".to_string(),
            boundary_color: "#fff".to_string(),
            linetype: "CONTINUOUS".to_string(),
            layer: "C-PROP".to_string(),
        }
    }

    #[test]
    fn default_import_script_mapping_maps_id_and_uppercase_description() {
        let record = RawImportRecord {
            external_id: "42".to_string(),
            raw_desc: "red oak".to_string(),
            trunk_diameter_inches: Some(12.0),
        };
        let result = default_import_script_mapping(&record);
        assert_eq!(result.mapped_id, "PT-42");
        assert_eq!(result.mapped_description, "RED OAK");
        assert_eq!(result.dynamic_3d_scale_factor, 2.0);
    }

    #[test]
    fn default_import_script_mapping_falls_back_to_nominal_trunk_diameter() {
        let record = RawImportRecord {
            external_id: "1".to_string(),
            raw_desc: "sapling".to_string(),
            trunk_diameter_inches: None,
        };
        let result = default_import_script_mapping(&record);
        assert_eq!(result.dynamic_3d_scale_factor, 1.0);
    }

    #[test]
    fn execute_import_script_calls_the_supplied_mapper() {
        let record = RawImportRecord {
            external_id: "7".to_string(),
            raw_desc: "elm".to_string(),
            trunk_diameter_inches: None,
        };
        let result = execute_import_script(&record, |r| DataMappingScriptResult {
            mapped_id: format!("CUSTOM-{}", r.external_id),
            mapped_description: r.raw_desc.clone(),
            dynamic_3d_scale_factor: 1.0,
        });
        assert_eq!(result.mapped_id, "CUSTOM-7");
    }

    #[test]
    fn export_parcels_to_sdf_counts_records_and_forces_strokes() {
        let parcels = vec![ParcelObject {
            id: "p1".to_string(),
            name: "Lot 1".to_string(),
            number: 1,
            site_id: "site-1".to_string(),
            boundary_vertices: vec![],
            arcs: None,
            style: style(),
            area_sq_ft: 0.0,
            perimeter_ft: 0.0,
            elevation_ft: None,
            address: None,
            tax_id: None,
            user_classification: None,
        }];
        let (result, render_as_strokes) = export_parcels_to_sdf(&parcels, "Parcels.sdf");
        assert_eq!(result.record_count, 1);
        assert!(render_as_strokes);
    }

    #[test]
    fn configure_coverage_asset_card_always_renders_strokes() {
        let cfg = configure_coverage_asset_card(true, DEFAULT_ELEVATED_BUFFER_INCHES, false);
        assert!(cfg.render_as_strokes);
        assert_eq!(cfg.elevated_buffer_inches, 2.0);
    }

    #[test]
    fn export_blocks_to_csv_includes_header_and_one_row_per_block() {
        let blocks = vec![BlockExtractionRecord {
            block_name: "Tree-01".to_string(),
            position: Point3D::new(10.0, 20.0, 5.0),
            attributes: vec![("species".to_string(), "Oak".to_string())],
        }];
        let (csv, count) = export_blocks_to_csv(&blocks);
        assert_eq!(count, 1);
        assert!(csv.starts_with("BlockName,X,Y,Z,Attributes\n"));
        assert!(csv.contains("Tree-01,10,20,5"));
    }

    #[test]
    fn place_3d_model_interactive_uses_center_2d_mode() {
        let placement = place_3d_model_interactive("Tree.rvt", Point::new(50.0, 60.0), 102.5);
        assert_eq!(placement.insertion_mode, ModelInsertionMode::Center2D);
        assert_eq!(placement.position, Point3D::new(50.0, 60.0, 102.5));
        assert!(placement.is_interactive_placed);
    }
}
