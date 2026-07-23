//! GEOID / PLSS jurisdiction compliance data and logic. Port of
//! `packages/domain/src/planning/geoid/**`.
//!
//! A GEOID (US Census Geographic Identifier) location-code plugin system:
//! register jurisdiction-specific zoning/stair/egress/civil/climate/road
//! standards keyed by state (2-digit), county (5-digit), or county
//! subdivision (10-digit) GEOID, resolve them by cascading from a national
//! baseline down to the most specific registered scope plus any project
//! overrides, and audit a [`crate::elements::Site`] against the resolved
//! standards.
//!
//! - [`types`] — the plugin/standards/resolution data model.
//! - [`utils`] — GEOID parsing/formatting/hierarchy helpers.
//! - [`registry`] — the plugin registry and cascading resolver.
//! - [`compliance`] — the site compliance audit.
//! - [`adapter`] — bridges [`crate::regions::RegionPlugin`] into this system.
//! - [`presets`] — the built-in state/county/cousub preset plugins.

pub mod adapter;
pub mod compliance;
pub mod presets;
pub mod registry;
pub mod types;
pub mod utils;

pub use compliance::audit_geoid_compliance;
pub use registry::{default_national_standards, GeoidPluginRegistry};
pub use types::{
    CivilErosionStandards, ClimateStandards, EgressStandards, GeoidAreaType, GeoidRuleEvaluator,
    LocalCodePlugin, LocalCodeStandards, LocalCodeStandardsOverride, ParsedGeoid,
    ResolvedLocalCode, RoadStandards, StairStandards, SurveyFrameworkId, ZoningStandards,
};
pub use utils::{
    format_geoid, get_area_type, get_geoid_hierarchy, is_valid_geoid, normalize_geoid, parse_geoid,
    GeoidInput,
};
