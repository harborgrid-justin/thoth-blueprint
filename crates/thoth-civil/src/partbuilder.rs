//! Structure part-family sizing: cylindrical manhole vertical layout, vault
//! wall-thickness validation, and default parts-catalog chapters.
//!
//! Port of `packages/domain/src/civil/partbuilder.ts` +
//! `packages/domain/src/civil/types/partBuilder.ts`.

/// A generic named parameter on a custom part.
#[derive(Debug, Clone, PartialEq)]
pub struct PartParam {
    pub name: String,
    pub param_type: PartParamType,
    pub value: PartParamValue,
    pub default_value: Option<PartParamValue>,
    pub description: Option<String>,
}

/// The kind of value a [`PartParam`] carries.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PartParamType {
    Length,
    Diameter,
    Angle,
    String,
}

/// A [`PartParam`]'s value, matching the TS `number | string` union.
#[derive(Debug, Clone, PartialEq)]
pub enum PartParamValue {
    Number(f64),
    Text(String),
}

/// Which broad domain a custom part belongs to.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PartDomain {
    Structure,
    Pipe,
}

/// The base solid a custom part is built from.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PartShape {
    Cylinder,
    Box,
    Custom,
}

/// A user-defined part (structure or pipe) with parametric dimensions.
#[derive(Debug, Clone, PartialEq)]
pub struct CustomPartDefinition {
    pub id: String,
    pub name: String,
    pub domain: PartDomain,
    pub shape: PartShape,
    pub params: Vec<PartParam>,
}

/// A named catalog of [`CustomPartDefinition`]s.
#[derive(Debug, Clone, PartialEq)]
pub struct CustomPartCatalog {
    pub catalog_id: String,
    pub catalog_name: String,
    pub parts: Vec<CustomPartDefinition>,
}

/// How a [`PartSizeParameter`]'s value is stored/selected.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SizeStorageType {
    Constant,
    List,
    Range,
}

/// A `min`/`max` bound for a [`SizeStorageType::Range`] parameter.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RangeLimit {
    pub min: f64,
    pub max: f64,
}

/// A sizeable structure parameter (frame height, barrel diameter, …).
#[derive(Debug, Clone, PartialEq)]
pub struct PartSizeParameter {
    pub name: String,
    pub description: String,
    pub storage_type: SizeStorageType,
    /// The nominal/default value (used directly for [`SizeStorageType::Constant`]).
    pub value: f64,
    pub list_values: Option<Vec<f64>>,
    pub range_limit: Option<RangeLimit>,
}

/// What structural role a [`PartFamily`] plays.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PartType {
    JunctionStructure,
    Inlet,
    Outlet,
}

/// The base solid shape of a [`PartFamily`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FamilyShape {
    Cylinder,
    Box,
}

/// A family of structure parts (e.g. "Cylindrical Manhole") with its named
/// size parameters.
#[derive(Debug, Clone, PartialEq)]
pub struct PartFamily {
    pub id: String,
    pub name: String,
    pub part_type: PartType,
    pub shape: FamilyShape,
    pub description: String,
    pub parameters: Vec<PartSizeParameter>,
}

/// A named grouping of [`PartFamily`] entries in a catalog.
#[derive(Debug, Clone, PartialEq)]
pub struct CatalogChapter {
    pub name: String,
    pub families: Vec<PartFamily>,
}

/// A full parts catalog, organized into chapters.
#[derive(Debug, Clone, PartialEq)]
pub struct PartsCatalog {
    pub chapters: Vec<CatalogChapter>,
}

/// Standard structure components layout relative to rim (elevation 0.0 =
/// rim), for a cylindrical manhole.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ResolvedStructureComponents {
    pub frame_top: f64,
    pub frame_bottom: f64,
    pub cone_top: f64,
    pub cone_bottom: f64,
    pub riser_top: f64,
    pub riser_bottom: f64,
    pub barrel_top: f64,
    pub barrel_bottom: f64,
    pub total_height: f64,
}

/// Resolves standard vertical components for a cylindrical manhole structure
/// relative to the rim elevation. `parameters` is a lookup of named overrides
/// (`"FRH"` = frame height, `"CNH"` = cone height); missing entries use the
/// TS defaults (`0.5`, `1.5`).
pub fn resolve_cylindrical_manhole(rim_elevation: f64, sump_elevation: f64, parameters: &std::collections::HashMap<String, f64>) -> ResolvedStructureComponents {
    let frame_height = parameters.get("FRH").copied().unwrap_or(0.5);
    let cone_height = parameters.get("CNH").copied().unwrap_or(1.5);

    let total_height = (rim_elevation - sump_elevation).max(0.1);

    // Distribute height into frame, cone, riser, and barrel.
    let frame_top = rim_elevation;
    let frame_bottom = rim_elevation - frame_height;

    // Cone sits below the frame.
    let cone_top = frame_bottom;
    let cone_bottom = sump_elevation.max(cone_top - cone_height);

    // Riser spans between cone and barrel, or is 0.
    let riser_top = cone_bottom;
    let barrel_height = 4.0_f64.min(cone_bottom - sump_elevation); // max barrel height 4 units
    let riser_bottom = sump_elevation + barrel_height;

    let barrel_top = riser_bottom;
    let barrel_bottom = sump_elevation;

    ResolvedStructureComponents { frame_top, frame_bottom, cone_top, cone_bottom, riser_top, riser_bottom, barrel_top, barrel_bottom, total_height }
}

/// Result of validating a vault (box-shape) wall's thickness.
#[derive(Debug, Clone, PartialEq)]
pub struct VaultWallValidation {
    pub is_valid: bool,
    pub minimum_required: f64,
    pub error_msg: Option<String>,
}

/// Validates vault (box shape) wall thickness constraints:
/// `thickness >= min_thickness_ratio * max(width, length)`.
pub fn validate_vault_box_wall(width: f64, length: f64, wall_thickness: f64, min_thickness_ratio: f64) -> VaultWallValidation {
    let max_span = width.max(length);
    let min_required = max_span * min_thickness_ratio;

    if wall_thickness < min_required {
        VaultWallValidation {
            is_valid: false,
            minimum_required: min_required,
            error_msg: Some(format!("Wall thickness of {:.2} is too thin for a vault spanning {} units. Minimum required thickness is {:.2} units.", wall_thickness, max_span, min_required)),
        }
    } else {
        VaultWallValidation { is_valid: true, minimum_required: min_required, error_msg: None }
    }
}

/// Generates factory default part-catalog chapters (cylindrical structures,
/// inlet/box structures), using the built-in fallback names/descriptions
/// (this crate does not depend on the parts-catalog registry the TS source
/// also consults for overrides — see `crates/thoth-civil/GAPS.md`).
pub fn get_default_parts_catalog() -> PartsCatalog {
    PartsCatalog {
        chapters: vec![
            CatalogChapter {
                name: "Cylindrical Structures".to_string(),
                families: vec![PartFamily {
                    id: "fam-cyl-manhole".to_string(),
                    name: "Cylindrical Manhole".to_string(),
                    part_type: PartType::JunctionStructure,
                    shape: FamilyShape::Cylinder,
                    description: "Standard precast concrete sewer or storm manhole".to_string(),
                    parameters: vec![
                        PartSizeParameter { name: "FRH".into(), description: "Frame Height".into(), storage_type: SizeStorageType::Constant, value: 0.5, list_values: None, range_limit: None },
                        PartSizeParameter { name: "CNH".into(), description: "Cone Height".into(), storage_type: SizeStorageType::Constant, value: 1.5, list_values: None, range_limit: None },
                        PartSizeParameter { name: "BDM".into(), description: "Barrel Diameter".into(), storage_type: SizeStorageType::List, value: 4.0, list_values: Some(vec![3.0, 4.0, 5.0, 6.0]), range_limit: None },
                        PartSizeParameter { name: "BDH".into(), description: "Barrel Height".into(), storage_type: SizeStorageType::Range, value: 4.0, list_values: None, range_limit: Some(RangeLimit { min: 2.0, max: 12.0 }) },
                    ],
                }],
            },
            CatalogChapter {
                name: "Inlet & Box Structures".to_string(),
                families: vec![PartFamily {
                    id: "fam-box-vault".to_string(),
                    name: "Concrete Utility Vault".to_string(),
                    part_type: PartType::JunctionStructure,
                    shape: FamilyShape::Box,
                    description: "Rectangular precast vault structure".to_string(),
                    parameters: vec![
                        PartSizeParameter { name: "VWD".into(), description: "Vault Width".into(), storage_type: SizeStorageType::List, value: 4.0, list_values: Some(vec![2.0, 3.0, 4.0, 6.0]), range_limit: None },
                        PartSizeParameter { name: "VLN".into(), description: "Vault Length".into(), storage_type: SizeStorageType::List, value: 6.0, list_values: Some(vec![4.0, 6.0, 8.0, 10.0]), range_limit: None },
                        PartSizeParameter { name: "WTH".into(), description: "Wall Thickness".into(), storage_type: SizeStorageType::Constant, value: 0.5, list_values: None, range_limit: None },
                    ],
                }],
            },
        ],
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn resolve_cylindrical_manhole_stacks_components_from_rim_down() {
        let params = std::collections::HashMap::from([("FRH".to_string(), 0.5), ("CNH".to_string(), 1.5)]);
        let comp = resolve_cylindrical_manhole(100.0, 90.0, &params);
        assert_relative_eq!(comp.frame_top, 100.0, epsilon = 1e-9);
        assert_relative_eq!(comp.frame_bottom, 99.5, epsilon = 1e-9);
        assert_relative_eq!(comp.cone_top, 99.5, epsilon = 1e-9);
        assert_relative_eq!(comp.cone_bottom, 98.0, epsilon = 1e-9);
        assert_relative_eq!(comp.barrel_bottom, 90.0, epsilon = 1e-9);
        assert_relative_eq!(comp.total_height, 10.0, epsilon = 1e-9);
    }

    #[test]
    fn resolve_cylindrical_manhole_uses_defaults_when_unspecified() {
        let comp = resolve_cylindrical_manhole(100.0, 95.0, &std::collections::HashMap::new());
        assert_relative_eq!(comp.frame_bottom, 99.5, epsilon = 1e-9);
        assert_relative_eq!(comp.cone_top, 99.5, epsilon = 1e-9);
    }

    #[test]
    fn validate_vault_box_wall_flags_too_thin_walls() {
        let res = validate_vault_box_wall(10.0, 6.0, 0.5, 0.08);
        assert!(!res.is_valid);
        assert_relative_eq!(res.minimum_required, 0.8, epsilon = 1e-9);
        assert!(res.error_msg.is_some());
    }

    #[test]
    fn validate_vault_box_wall_accepts_thick_enough_walls() {
        let res = validate_vault_box_wall(10.0, 6.0, 1.0, 0.08);
        assert!(res.is_valid);
        assert!(res.error_msg.is_none());
    }

    #[test]
    fn default_parts_catalog_has_two_chapters() {
        let catalog = get_default_parts_catalog();
        assert_eq!(catalog.chapters.len(), 2);
        assert_eq!(catalog.chapters[0].families[0].parameters.len(), 4);
    }
}
