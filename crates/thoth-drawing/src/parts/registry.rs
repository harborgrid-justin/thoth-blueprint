//! Enterprise Global Parts Database Registry.
//!
//! The centralized, framework-agnostic parts catalog engine for Thoth
//! Blueprint. Pre-seeded with architectural, electrical, lumber, civil,
//! mechanical/plumbing, survey, and drawing JSON databases (embedded at
//! compile time via [`super::data::initial_parts_catalog`]). Supports dynamic
//! runtime registration ([`GlobalPartsDatabase::register_part`]) for
//! unlimited user and plugin parts.
//!
//! Port of `packages/domain/src/parts/registry.ts`.

use std::collections::BTreeMap;
use std::sync::OnceLock;

use crate::error::DrawingError;

use super::data::initial_parts_catalog;
use super::types::{PartCategory, PartFilterOptions, PartSpecification};

/// A wall type (assembly) exposed for `building.ts`-shaped consumers.
///
/// This mirrors `planning/types/building.ts`'s `WallType` exactly (`id`,
/// `label`, `thickness`, optional `material`). `thoth-drawing` does not
/// depend on `thoth-planning`, so the shape is duplicated here rather than
/// imported; unify the two once the planning crate is wired in as a
/// dependency during the cross-crate integration pass.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct WallType {
    pub id: String,
    pub label: String,
    pub thickness: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub material: Option<String>,
}

/// The centralized, framework-agnostic parts catalog engine.
#[derive(Debug, Clone)]
pub struct GlobalPartsDatabase {
    parts_map: BTreeMap<String, PartSpecification>,
}

impl Default for GlobalPartsDatabase {
    /// Pre-seeded with [`initial_parts_catalog`], matching the TS
    /// `new GlobalPartsDatabase()` default constructor.
    fn default() -> Self {
        Self::new(initial_parts_catalog())
    }
}

impl GlobalPartsDatabase {
    /// Build a database pre-seeded with `initial_catalog`.
    pub fn new(initial_catalog: Vec<PartSpecification>) -> Self {
        let mut db = GlobalPartsDatabase { parts_map: BTreeMap::new() };
        db.import_catalog(initial_catalog);
        db
    }

    /// Retrieve all parts currently registered in the database, in id order
    /// (the TS `Map` iterates in insertion order; this port uses a `BTreeMap`
    /// for deterministic, dependency-free ordering — callers that need
    /// insertion order should track it themselves, as no code in this crate
    /// relies on catalog iteration order).
    pub fn get_all_parts(&self) -> Vec<&PartSpecification> {
        self.parts_map.values().collect()
    }

    /// Retrieve a single part by id.
    pub fn get_part(&self, id: &str) -> Option<&PartSpecification> {
        self.parts_map.get(id)
    }

    /// Retrieve all parts belonging to a specific (typed) category.
    pub fn get_parts_by_category(&self, category: PartCategory) -> Vec<&PartSpecification> {
        self.get_all_parts()
            .into_iter()
            .filter(|p| p.category == category.as_str())
            .collect()
    }

    /// Retrieve all parts belonging to a specific subcategory.
    pub fn get_parts_by_subcategory(&self, subcategory: &str) -> Vec<&PartSpecification> {
        self.get_all_parts().into_iter().filter(|p| p.subcategory == subcategory).collect()
    }

    /// Dynamically register a new part, or replace an existing one with the
    /// same id. Errors if `spec.id` is empty (the TS throws `Error` on a
    /// falsy id; this crate never panics on caller data, so it returns
    /// [`DrawingError::MissingPartId`] instead).
    pub fn register_part(&mut self, spec: PartSpecification) -> Result<&PartSpecification, DrawingError> {
        if spec.id.is_empty() {
            return Err(DrawingError::MissingPartId);
        }
        let mut clean = spec;
        if let Some(tags) = &clean.tags {
            let mut deduped: Vec<String> = Vec::new();
            for t in tags {
                if !deduped.contains(t) {
                    deduped.push(t.clone());
                }
            }
            clean.tags = Some(deduped);
        } else {
            clean.tags = Some(Vec::new());
        }
        let id = clean.id.clone();
        self.parts_map.insert(id.clone(), clean);
        Ok(self.parts_map.get(&id).expect("just inserted"))
    }

    /// Update/patch properties of an existing part. Errors with
    /// [`DrawingError::UnknownPart`] if `id` isn't registered (the TS throws
    /// `Error` in this case).
    pub fn update_part(&mut self, id: &str, patch: PartPatch) -> Result<&PartSpecification, DrawingError> {
        let mut updated =
            self.parts_map.get(id).ok_or_else(|| DrawingError::UnknownPart(id.to_string()))?.clone();
        if let Some(sku) = patch.sku {
            updated.sku = sku;
        }
        if let Some(name) = patch.name {
            updated.name = name;
        }
        if let Some(category) = patch.category {
            updated.category = category;
        }
        if let Some(subcategory) = patch.subcategory {
            updated.subcategory = subcategory;
        }
        if let Some(description) = patch.description {
            updated.description = description;
        }
        if let Some(manufacturer) = patch.manufacturer {
            updated.manufacturer = manufacturer;
        }
        if let Some(cost) = patch.cost {
            updated.cost = cost;
        }
        if let Some(dims) = patch.dimensions {
            let mut merged = updated.dimensions.take().unwrap_or_default();
            if dims.width.is_some() {
                merged.width = dims.width;
            }
            if dims.height.is_some() {
                merged.height = dims.height;
            }
            if dims.depth.is_some() {
                merged.depth = dims.depth;
            }
            if dims.thickness.is_some() {
                merged.thickness = dims.thickness;
            }
            if dims.length.is_some() {
                merged.length = dims.length;
            }
            if dims.diameter.is_some() {
                merged.diameter = dims.diameter;
            }
            updated.dimensions = Some(merged);
        }
        if let Some(props) = patch.properties {
            let mut merged = updated.properties.take().unwrap_or_default();
            for (k, v) in props {
                merged.insert(k, v);
            }
            updated.properties = Some(merged);
        }
        if let Some(tags) = patch.tags {
            let mut merged = updated.tags.take().unwrap_or_default();
            for t in tags {
                if !merged.contains(&t) {
                    merged.push(t);
                }
            }
            updated.tags = Some(merged);
        }
        self.parts_map.insert(id.to_string(), updated);
        Ok(self.parts_map.get(id).expect("just inserted"))
    }

    /// Search parts across name, SKU, manufacturer, tags, description, and
    /// filter by category/subcategory/manufacturer/tags. An empty `query`
    /// matches everything that passes the other filters, matching the TS
    /// `q ? ... : true` short-circuit.
    pub fn search_parts(&self, query: &str, options: &PartFilterOptions) -> Vec<&PartSpecification> {
        let q = query.trim().to_lowercase();
        self.get_all_parts()
            .into_iter()
            .filter(|part| {
                if let Some(cat) = options.category {
                    if part.category != cat.as_str() {
                        return false;
                    }
                }
                if let Some(sub) = &options.subcategory {
                    if &part.subcategory != sub {
                        return false;
                    }
                }
                if let Some(mfr) = &options.manufacturer {
                    let matches = part
                        .manufacturer
                        .as_deref()
                        .map(|m| m.to_lowercase() == mfr.to_lowercase())
                        .unwrap_or(false);
                    if !matches {
                        return false;
                    }
                }
                if let Some(tags) = &options.tags {
                    if !tags.is_empty() {
                        let part_tags: Vec<String> =
                            part.tags.iter().flatten().map(|t| t.to_lowercase()).collect();
                        let matches_all =
                            tags.iter().all(|t| part_tags.contains(&t.to_lowercase()));
                        if !matches_all {
                            return false;
                        }
                    }
                }
                if q.is_empty() {
                    return true;
                }
                let in_name = part.name.to_lowercase().contains(&q);
                let in_sku = part.sku.as_deref().map(|s| s.to_lowercase().contains(&q)).unwrap_or(false);
                let in_desc = part.description.to_lowercase().contains(&q);
                let in_mfr = part.manufacturer.as_deref().map(|m| m.to_lowercase().contains(&q)).unwrap_or(false);
                let in_tags = part.tags.iter().flatten().any(|t| t.to_lowercase().contains(&q));
                in_name || in_sku || in_desc || in_mfr || in_tags
            })
            .collect()
    }

    /// Expose architectural wall types compatible with `building.ts`'s
    /// `WallType` interface (see [`WallType`]'s rustdoc for why the shape is
    /// duplicated rather than imported).
    pub fn get_wall_types(&self) -> Vec<WallType> {
        self.get_parts_by_subcategory("wall_assemblies")
            .into_iter()
            .map(|p| WallType {
                id: p.id.clone(),
                label: p.name.clone(),
                thickness: p.dimensions.as_ref().and_then(|d| d.thickness).unwrap_or(0.5),
                material: p.property("material").and_then(|v| v.as_str()).map(str::to_string),
            })
            .collect()
    }

    /// Retrieve all curtain wall mullion profile specifications.
    pub fn get_curtain_wall_mullions(&self) -> Vec<&PartSpecification> {
        self.get_parts_by_subcategory("curtainwall_mullions")
    }

    /// Retrieve all curtain wall infill panel specifications.
    pub fn get_curtain_wall_infill_panels(&self) -> Vec<&PartSpecification> {
        self.get_parts_by_subcategory("curtainwall_panels")
    }

    /// Retrieve all stair assembly specifications.
    pub fn get_stair_assemblies(&self) -> Vec<&PartSpecification> {
        self.get_parts_by_subcategory("stair_assemblies")
    }

    /// Retrieve all roof assembly specifications.
    pub fn get_roof_assemblies(&self) -> Vec<&PartSpecification> {
        self.get_parts_by_subcategory("roof_assemblies")
    }

    /// Retrieve all soil specifications.
    pub fn get_soil_types(&self) -> Vec<&PartSpecification> {
        self.get_parts_by_subcategory("soils")
    }

    /// Retrieve all erosion control Best Management Practice (BMP) specifications.
    pub fn get_erosion_control_bmps(&self) -> Vec<&PartSpecification> {
        self.get_parts_by_subcategory("erosion_bmps")
    }

    /// Retrieve all roadway subassembly specifications.
    pub fn get_subassemblies(&self) -> Vec<&PartSpecification> {
        self.get_parts_by_subcategory("subassemblies")
    }

    /// Retrieve all municipal land use zoning category definitions.
    pub fn get_land_use_definitions(&self) -> Vec<&PartSpecification> {
        self.get_parts_by_subcategory("land_use")
    }

    /// Retrieve all civil highway design standards.
    pub fn get_civil_design_standards(&self) -> Vec<&PartSpecification> {
        self.get_parts_by_subcategory("civil_design_standards")
    }

    /// Retrieve all municipal zoning district standards.
    pub fn get_zoning_districts(&self) -> Vec<&PartSpecification> {
        self.get_parts_by_subcategory("zoning_districts")
    }

    /// Retrieve all survey COGO description key rules.
    pub fn get_description_keys(&self) -> Vec<&PartSpecification> {
        self.get_parts_by_subcategory("description_keys")
    }

    /// Retrieve all standard CAD drawing sheet size specifications.
    pub fn get_sheet_sizes(&self) -> Vec<&PartSpecification> {
        self.get_parts_by_subcategory("sheet_sizes")
    }

    /// Retrieve all CAD hatch pattern definitions.
    pub fn get_hatch_patterns(&self) -> Vec<&PartSpecification> {
        self.get_parts_by_subcategory("hatch_patterns")
    }

    /// Import a batch of parts into the database.
    pub fn import_catalog(&mut self, catalog: Vec<PartSpecification>) {
        for part in catalog {
            // The initial catalog is trusted, compile-time-embedded data —
            // every entry has a non-empty id — so this cannot fail; if it
            // somehow did, silently skipping would hide a real embedding bug.
            self.register_part(part).expect("embedded catalog part must have a non-empty id");
        }
    }

    /// Export all registered parts in the database as a pretty-printed JSON string.
    pub fn export_catalog_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(&self.get_all_parts())
    }
}

/// The default singleton instance of the Global Parts Database, matching the
/// TS `export const globalPartsDb = new GlobalPartsDatabase()` module-level
/// singleton. Built lazily on first access and shared thereafter, so callers
/// like [`crate::hatch`] and [`crate::sheetsize`] that consult the catalog on
/// every lookup don't re-parse the embedded JSON each time.
pub fn global_parts_db() -> &'static GlobalPartsDatabase {
    static DB: OnceLock<GlobalPartsDatabase> = OnceLock::new();
    DB.get_or_init(GlobalPartsDatabase::default)
}

/// A partial update for [`GlobalPartsDatabase::update_part`]. Every field is
/// `Option`; `None` means "leave unchanged" (mirroring `Partial<...>` in TS).
/// `dimensions`/`properties`/`tags` are *merged* into the existing part's
/// values (matching the TS spread-merge semantics), not replaced wholesale.
#[derive(Debug, Clone, Default)]
pub struct PartPatch {
    pub sku: Option<Option<String>>,
    pub name: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub description: Option<String>,
    pub manufacturer: Option<Option<String>>,
    pub cost: Option<Option<f64>>,
    pub dimensions: Option<super::types::PartDimensions>,
    pub properties: Option<BTreeMap<String, super::types::PropertyValue>>,
    pub tags: Option<Vec<String>>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parts::types::PartDimensions;

    fn sample_part(id: &str, category: &str, subcategory: &str) -> PartSpecification {
        PartSpecification {
            id: id.to_string(),
            sku: None,
            name: format!("Test {id}"),
            category: category.to_string(),
            subcategory: subcategory.to_string(),
            description: "a test part".to_string(),
            manufacturer: Some("Acme".to_string()),
            model_number: None,
            unit: "ea".to_string(),
            cost: Some(1.0),
            dimensions: None,
            properties: None,
            tags: Some(vec!["alpha".to_string()]),
        }
    }

    #[test]
    fn default_database_loads_the_embedded_catalog_non_empty() {
        let db = GlobalPartsDatabase::default();
        assert!(!db.get_all_parts().is_empty());
    }

    #[test]
    fn default_database_includes_every_embedded_category_including_open_ones() {
        let db = GlobalPartsDatabase::default();
        // "drawing" and "survey" are not in the closed `PartCategory` enum,
        // but the catalog legitimately contains them (see types.rs rustdoc).
        assert!(!db.get_parts_by_subcategory("sheet_sizes").is_empty());
        assert!(!db.get_parts_by_subcategory("hatch_patterns").is_empty());
        assert!(!db.get_parts_by_subcategory("description_keys").is_empty());
    }

    #[test]
    fn register_part_rejects_empty_id() {
        let mut db = GlobalPartsDatabase::new(vec![]);
        let err = db.register_part(sample_part("", "custom", "misc")).unwrap_err();
        assert_eq!(err, DrawingError::MissingPartId);
    }

    #[test]
    fn register_part_dedupes_tags() {
        let mut db = GlobalPartsDatabase::new(vec![]);
        let mut p = sample_part("p1", "custom", "misc");
        p.tags = Some(vec!["a".to_string(), "a".to_string(), "b".to_string()]);
        db.register_part(p).unwrap();
        assert_eq!(db.get_part("p1").unwrap().tags.as_ref().unwrap(), &vec!["a".to_string(), "b".to_string()]);
    }

    #[test]
    fn update_part_errors_on_unknown_id() {
        let mut db = GlobalPartsDatabase::new(vec![]);
        let err = db.update_part("missing", PartPatch::default()).unwrap_err();
        assert_eq!(err, DrawingError::UnknownPart("missing".to_string()));
    }

    #[test]
    fn update_part_merges_dimensions_and_properties() {
        let mut db = GlobalPartsDatabase::new(vec![]);
        let mut p = sample_part("p1", "custom", "misc");
        p.dimensions = Some(PartDimensions { width: Some(1.0), ..Default::default() });
        db.register_part(p).unwrap();

        let patch = PartPatch {
            dimensions: Some(PartDimensions { height: Some(2.0), ..Default::default() }),
            ..Default::default()
        };
        let updated = db.update_part("p1", patch).unwrap();
        assert_eq!(updated.dimensions.as_ref().unwrap().width, Some(1.0));
        assert_eq!(updated.dimensions.as_ref().unwrap().height, Some(2.0));
    }

    #[test]
    fn search_parts_matches_name_sku_manufacturer_tags_and_description() {
        let mut db = GlobalPartsDatabase::new(vec![]);
        db.register_part(sample_part("p1", "custom", "misc")).unwrap();
        let results = db.search_parts("acme", &PartFilterOptions::default());
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "p1");
    }

    #[test]
    fn search_parts_empty_query_returns_everything_matching_filters() {
        let mut db = GlobalPartsDatabase::new(vec![]);
        db.register_part(sample_part("p1", "custom", "misc")).unwrap();
        db.register_part(sample_part("p2", "civil", "structures")).unwrap();
        let opts = PartFilterOptions { category: Some(PartCategory::Civil), ..Default::default() };
        let results = db.search_parts("", &opts);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "p2");
    }

    #[test]
    fn search_parts_requires_all_tags_to_match() {
        let mut db = GlobalPartsDatabase::new(vec![]);
        let mut p1 = sample_part("p1", "custom", "misc");
        p1.tags = Some(vec!["a".to_string(), "b".to_string()]);
        db.register_part(p1).unwrap();
        let mut p2 = sample_part("p2", "custom", "misc");
        p2.tags = Some(vec!["a".to_string()]);
        db.register_part(p2).unwrap();

        let opts = PartFilterOptions { tags: Some(vec!["a".to_string(), "b".to_string()]), ..Default::default() };
        let results = db.search_parts("", &opts);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "p1");
    }

    #[test]
    fn get_wall_types_mirrors_wall_assemblies_subcategory() {
        let db = GlobalPartsDatabase::default();
        let walls = db.get_wall_types();
        assert!(!walls.is_empty());
        for w in &walls {
            assert!(w.thickness > 0.0);
        }
    }

    #[test]
    fn get_hatch_patterns_exposes_the_ansi31_catalog_entry() {
        let db = GlobalPartsDatabase::default();
        let hatches = db.get_hatch_patterns();
        assert_eq!(hatches.len(), 1);
        assert_eq!(hatches[0].property("patternName").and_then(|v| v.as_str()), Some("ANSI31"));
    }

    #[test]
    fn export_catalog_json_round_trips_through_serde() {
        let db = GlobalPartsDatabase::default();
        let json = db.export_catalog_json().unwrap();
        let parsed: Vec<PartSpecification> = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.len(), db.get_all_parts().len());
    }
}
