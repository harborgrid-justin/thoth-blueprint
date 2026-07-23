//! Land-use categories and their presentation. The set of categories is a
//! domain concern (they drive allocation metrics and compliance), so the
//! canonical registry lives here rather than in the UI.
//!
//! Port of `packages/domain/src/planning/landuse.ts` +
//! `packages/domain/src/planning/types/landuse.ts`.
//!
//! **Scoping note**: the TS registry looks up `residential`'s label/color from
//! a `globalPartsDb` catalog first, falling back to a hardcoded default. The
//! Global Parts Database (`packages/domain/src/parts`) is an editable-catalog
//! system outside this crate's scope (subdivision/setback/metrics engine), so
//! this port always uses the hardcoded fallback values directly — which are
//! also what the TS falls back to whenever the catalog has no override.

use serde::{Deserialize, Serialize};

/// The designated-purpose categories a land-use area can carry.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum LandUseCategory {
    Residential,
    Commercial,
    MixedUse,
    Civic,
    Industrial,
    Park,
    OpenSpace,
    Agricultural,
    Infrastructure,
    Unassigned,
}

/// Descriptive metadata for a land-use category, shared by model and UI.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LandUseDefinition {
    pub category: LandUseCategory,
    pub label: &'static str,
    /// A stable hex color used consistently across canvas, legend, and charts.
    pub color: &'static str,
    /// Whether the category counts as impervious for coverage/GSI metrics.
    pub impervious: bool,
    /// Whether the category counts as open space for OSR metrics.
    pub open_space: bool,
    pub description: &'static str,
}

/// The canonical, ordered registry of land-use categories.
pub const LAND_USE_DEFINITIONS: &[LandUseDefinition] = &[
    LandUseDefinition {
        category: LandUseCategory::Residential,
        label: "Residential",
        color: "#f59e0b",
        impervious: true,
        open_space: false,
        description: "Housing: single-family, multifamily, and mixed residential.",
    },
    LandUseDefinition {
        category: LandUseCategory::Commercial,
        label: "Commercial",
        color: "#ef4444",
        impervious: true,
        open_space: false,
        description: "Retail, office, and services.",
    },
    LandUseDefinition {
        category: LandUseCategory::MixedUse,
        label: "Mixed-Use",
        color: "#ec4899",
        impervious: true,
        open_space: false,
        description: "Combined residential and commercial in one area.",
    },
    LandUseDefinition {
        category: LandUseCategory::Civic,
        label: "Civic",
        color: "#8b5cf6",
        impervious: true,
        open_space: false,
        description: "Schools, government, cultural, and institutional uses.",
    },
    LandUseDefinition {
        category: LandUseCategory::Industrial,
        label: "Industrial",
        color: "#6b7280",
        impervious: true,
        open_space: false,
        description: "Manufacturing, warehousing, and utilities.",
    },
    LandUseDefinition {
        category: LandUseCategory::Park,
        label: "Park",
        color: "#22c55e",
        impervious: false,
        open_space: true,
        description: "Public parks and recreation as a designated land use.",
    },
    LandUseDefinition {
        category: LandUseCategory::OpenSpace,
        label: "Open Space",
        color: "#14b8a6",
        impervious: false,
        open_space: true,
        description: "Unbuilt reserved land and common areas.",
    },
    LandUseDefinition {
        category: LandUseCategory::Agricultural,
        label: "Agricultural",
        color: "#84cc16",
        impervious: false,
        open_space: true,
        description: "Farmland and cultivated open land.",
    },
    LandUseDefinition {
        category: LandUseCategory::Infrastructure,
        label: "Infrastructure",
        color: "#0ea5e9",
        impervious: true,
        open_space: false,
        description: "Rights-of-way, streets, and utility corridors.",
    },
    LandUseDefinition {
        category: LandUseCategory::Unassigned,
        label: "Unassigned",
        color: "#94a3b8",
        impervious: false,
        open_space: false,
        description: "Land with no designated use yet.",
    },
];

/// Look up the definition for a category. Every `LandUseCategory` variant has
/// an entry in [`LAND_USE_DEFINITIONS`], so this never falls through to
/// `Unassigned` in practice — the `expect` documents that invariant.
pub fn land_use_definition(category: LandUseCategory) -> &'static LandUseDefinition {
    LAND_USE_DEFINITIONS
        .iter()
        .find(|d| d.category == category)
        .expect("every LandUseCategory variant has a LAND_USE_DEFINITIONS entry")
}

/// The stable color for a land-use category.
pub fn land_use_color(category: LandUseCategory) -> &'static str {
    land_use_definition(category).color
}

/// The display label for a land-use category.
pub fn land_use_label(category: LandUseCategory) -> &'static str {
    land_use_definition(category).label
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_category_resolves_a_definition() {
        for def in LAND_USE_DEFINITIONS {
            assert_eq!(land_use_definition(def.category).category, def.category);
        }
    }

    #[test]
    fn park_is_open_space_and_not_impervious() {
        let def = land_use_definition(LandUseCategory::Park);
        assert!(def.open_space);
        assert!(!def.impervious);
    }

    #[test]
    fn residential_label_and_color_match_fallback() {
        assert_eq!(land_use_label(LandUseCategory::Residential), "Residential");
        assert_eq!(land_use_color(LandUseCategory::Residential), "#f59e0b");
    }
}
