//! GEOID Local Code Plugin System — type definitions. Port of
//! `packages/domain/src/planning/geoid/types.ts`.
//!
//! Supports geographical classification (State = 2 digits, County = 5
//! digits, County Subdivision = 10 digits, per the US Census GEOID
//! structure) and multi-domain local standards (zoning, stairs, egress,
//! civil/erosion, roads, and open key-value bags for domains this crate
//! doesn't otherwise model as first-class types).
//!
//! **`camelCase` JSON**: every type in this module that a preset payload
//! under `geoid/data/*.json` deserializes into is annotated
//! `#[serde(rename_all = "camelCase")]`. That is a deliberate, scoped
//! exception to this crate's usual snake_case JSON convention (see e.g.
//! [`crate::elements::Site`]): these types round-trip against fixed,
//! upstream jurisdiction data files this port embeds verbatim (mirroring
//! the TS field names exactly), not against this crate's own emitted JSON.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::elements::Site;

/// Area classifications corresponding to the US Census GEOID structure.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GeoidAreaType {
    State,
    County,
    Cousub,
    Unknown,
}

/// Parsed representation of a GEOID numerical code.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedGeoid {
    /// The normalized raw input string.
    pub raw: String,
    /// Recognized area classification based on digit length.
    pub area_type: GeoidAreaType,
    /// 2-digit FIPS state code (e.g. `"48"` for Texas).
    pub state_code: String,
    /// 3-digit FIPS county code. Present for county & cousub.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub county_code: Option<String>,
    /// 5-digit full county GEOID. Present for cousub.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cousub_code: Option<String>,
    /// 5-digit full county GEOID (`stateCode` + `countyCode`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub full_county_geoid: Option<String>,
    /// 10-digit full cousub GEOID (`stateCode` + `countyCode` + `cousubCode`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub full_cousub_geoid: Option<String>,
    /// Whether the GEOID string matches standard 2, 5, or 10 digit structure.
    pub is_valid: bool,
}

/// Local zoning & site-development standards.
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZoningStandards {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub front_setback: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rear_setback: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub side_setback: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub corner_setback: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_height: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_far: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_coverage: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_lot_area: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_row_width: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub allowed_uses: Option<Vec<String>>,
}

/// Architectural stair-design standards.
#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StairStandards {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_riser_height: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_tread_depth: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_stair_width: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_headroom: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub handrail_height_min: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub handrail_height_max: Option<f64>,
}

/// Building egress, door, and window standards.
#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EgressStandards {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_door_width: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_door_height: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_egress_window_area: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_window_sill_height: Option<f64>,
}

/// Civil, stormwater & erosion-control standards.
#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CivilErosionStandards {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_silt_fence_buffer: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_disturbed_slope_percent: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_runoff_coefficient: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream_buffer_distance: Option<f64>,
}

/// Climate design standards.
#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClimateStandards {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rainfall_intensity_100_yr: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wind_velocity_mph: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snow_load_psf: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub soil_bearing_psf: Option<f64>,
}

/// Roadway cross-section / drainage standards.
#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoadStandards {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub normal_crown: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub e_max: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transition_speed_multiplier: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_cover_ft: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_pipe_slope: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_pipe_slope: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_pipe_diameter_in: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_sump_depth_ft: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_lane_width_ft: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_shoulder_width_ft: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub degree_of_curve_const: Option<f64>,
}

/// Flexible dynamic standard container merged across the resolution
/// cascade (baseline → state → county → county-subdivision → project
/// overrides). The untyped sections (`hydraulics`/`geometry`/`grading`/
/// `subdivision`/`structural`/`erosion`/`plan_production`/`drafting`/
/// `electrical`/`mechanical`/`custom`) mirror the TS `Record<string,
/// unknown>` fields exactly — those domains aren't first-class types
/// anywhere in `packages/domain` either.
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalCodeStandards {
    pub zoning: ZoningStandards,
    pub stairs: StairStandards,
    pub egress: EgressStandards,
    pub civil: CivilErosionStandards,
    pub climate: ClimateStandards,
    #[serde(default)]
    pub hydraulics: Map<String, Value>,
    #[serde(default)]
    pub geometry: Map<String, Value>,
    #[serde(default)]
    pub grading: Map<String, Value>,
    #[serde(default)]
    pub subdivision: Map<String, Value>,
    #[serde(default)]
    pub structural: Map<String, Value>,
    #[serde(default)]
    pub erosion: Map<String, Value>,
    #[serde(default)]
    pub plan_production: Map<String, Value>,
    #[serde(default)]
    pub drafting: Map<String, Value>,
    pub roads: RoadStandards,
    #[serde(default)]
    pub electrical: Map<String, Value>,
    #[serde(default)]
    pub mechanical: Map<String, Value>,
    #[serde(default)]
    pub custom: Map<String, Value>,
}

/// Partial per-domain standards a [`LocalCodePlugin`] overrides or a caller
/// supplies as project-level overrides. Every field is optional at this
/// level (a plugin need not touch every domain); the sub-structs
/// themselves (e.g. [`ZoningStandards`]) are already all-`Option` fields,
/// matching the TS `Partial<ZoningStandards>` shape without a second,
/// separate "partial" type.
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalCodeStandardsOverride {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub zoning: Option<ZoningStandards>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stairs: Option<StairStandards>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub egress: Option<EgressStandards>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub civil: Option<CivilErosionStandards>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub climate: Option<ClimateStandards>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hydraulics: Option<Map<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub geometry: Option<Map<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub grading: Option<Map<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subdivision: Option<Map<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub structural: Option<Map<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub erosion: Option<Map<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan_production: Option<Map<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub drafting: Option<Map<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub roads: Option<RoadStandards>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub electrical: Option<Map<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mechanical: Option<Map<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom: Option<Map<String, Value>>,
}

/// The survey framework a jurisdiction plugin declares. A local copy
/// distinct from [`crate::regions::SurveyFramework`]: the TS
/// `LocalCodePlugin.surveyFramework` union additionally includes
/// `"texas-headright"`, which `crate::regions::SurveyFramework` doesn't
/// carry (no region plug-in defined there uses it) — adding it there would
/// ripple through that enum's exhaustive matches for no benefit to this
/// module, so this is its own small, self-contained enum instead.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SurveyFrameworkId {
    Plss,
    GeorgiaLandLot,
    MetesAndBounds,
    TexasHeadright,
}

/// Custom compliance evaluator a plugin can provide, executed against a
/// [`Site`] and its resolved standards. A plain `fn` pointer (not a boxed
/// closure/trait object): every use in this port is a stateless, top-level
/// evaluator function, matching how `packages/domain`'s built-in presets
/// declare `customRules` too (plain named functions, never closures
/// capturing external state).
pub type GeoidRuleEvaluator =
    fn(&Site, &ResolvedLocalCode) -> Vec<thoth_spatial::ComplianceFinding>;

/// Definition of a GEOID location plugin.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalCodePlugin {
    /// Numerical GEOID identifier (`"48"`, `"48201"`, `"4820192975"`).
    pub geoid: String,
    pub area_type: GeoidAreaType,
    /// Human-readable title (e.g. `"Harris County, TX"`).
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub county_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cousub_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub effective_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jurisdiction_url: Option<String>,
    /// Partial code standards defined or overridden by this plugin.
    #[serde(default)]
    pub standards: LocalCodeStandardsOverride,
    /// Executable rule evaluators provided by this plugin.
    #[serde(skip)]
    pub custom_rules: Vec<GeoidRuleEvaluator>,
    /// Survey framework used in this jurisdiction.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub survey_framework: Option<SurveyFrameworkId>,
    /// Arbitrary metadata.
    #[serde(default, skip_serializing_if = "Map::is_empty")]
    pub metadata: Map<String, Value>,
}

impl PartialEq for LocalCodePlugin {
    fn eq(&self, other: &Self) -> bool {
        // `custom_rules` (`fn` pointers) participate in equality by address;
        // every other field compares structurally. Declared manually rather
        // than derived only so this doc comment has somewhere to live —
        // the derived behavior would be identical.
        self.geoid == other.geoid
            && self.area_type == other.area_type
            && self.name == other.name
            && self.state_name == other.state_name
            && self.county_name == other.county_name
            && self.cousub_name == other.cousub_name
            && self.effective_date == other.effective_date
            && self.jurisdiction_url == other.jurisdiction_url
            && self.standards == other.standards
            && self.custom_rules == other.custom_rules
            && self.survey_framework == other.survey_framework
            && self.metadata == other.metadata
    }
}

/// Result of cascading resolution for a given GEOID.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedLocalCode {
    /// The target GEOID evaluated.
    pub target_geoid: String,
    pub parsed: ParsedGeoid,
    /// Human-readable title of the resolved jurisdiction context.
    pub name: String,
    /// Ordered resolution lineage (e.g. `["baseline", "48", "48201", ...]`).
    pub resolution_chain: Vec<String>,
    /// Plugins that contributed to the final resolved standards.
    pub applied_plugins: Vec<LocalCodePlugin>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub survey_framework: Option<SurveyFrameworkId>,
    /// Merged effective standards.
    pub standards: LocalCodeStandards,
}
