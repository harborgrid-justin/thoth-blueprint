//! Compile-time embedded federal engineering/building reference constants.
//! Port of `packages/domain/src/planning/geoid/data/federalReference.json`'s
//! *consumption side* — the handful of AASHTO/IBC/IRC/ADA sensible-default
//! numbers several modules in this crate fall back to when no
//! jurisdiction-specific or catalog value overrides them (curtain-wall
//! thermal defaults, stair riser/tread/headroom limits, door/window egress
//! and natural-light minimums, and the AASHTO geometric-design constants the
//! `smart` auto-solvers use).
//!
//! Follows the same embedding convention `thoth-drawing::parts::data`
//! established for its parts catalog: the JSON stays data (checked into this
//! crate, editable without touching Rust source) but is embedded via
//! `include_str!` rather than read from disk at runtime. Parsed once, lazily,
//! behind a [`std::sync::OnceLock`].
//!
//! Only the fields this crate's ported modules actually read are given typed
//! structs ([`Climate`], [`Geometry`], [`Structural`], [`Roads`]); the
//! remaining top-level sections (`hydraulics`, `grading`, `subdivision`,
//! `erosion`, `planProduction`, `drafting`) are untyped `Record<string,
//! unknown>` bags in the TS original too (see
//! `packages/domain/src/planning/geoid/types.ts`'s `LocalCodeStandards`), so
//! [`crate::geoid`] consumes them as raw [`serde_json::Map`]s rather than
//! this module declaring exhaustive structs no caller needs.

use serde::Deserialize;
use serde_json::{Map, Value};
use std::sync::OnceLock;

const FEDERAL_REFERENCE_JSON: &str = include_str!("geoid/data/federal_reference.json");

/// AASHTO/ASCE 7 climate design constants.
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Climate {
    pub rainfall_intensity_100_yr: f64,
    pub wind_velocity_mph: f64,
    pub snow_load_psf: f64,
    pub soil_bearing_psf: f64,
}

/// AASHTO roadway-geometry design constants (the subset this crate's
/// `smart::geometry` auto-solvers need).
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Geometry {
    pub e_max: f64,
    pub aashto_min_friction: f64,
    pub aashto_max_friction_base: f64,
    pub aashto_max_friction_speed_slope: f64,
    pub aashto_curve_radius_constant: f64,
    pub k_crest_multiplier: f64,
    pub k_sag_multiplier: f64,
    pub aashto_headlight_crest_constant: f64,
    pub aashto_sag_comfort_constant: f64,
    pub aashto_superelevation_denominator: f64,
}

/// IBC/IRC/ADA structural & architectural default constants.
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Structural {
    pub floor_live_load_psf: f64,
    /// IBC 1011.5.2 maximum riser height, inches (7.75").
    pub ibc_max_riser_height_in: f64,
    /// IBC 1011.5.2 minimum tread depth, inches (10.0").
    pub ibc_min_tread_depth_in: f64,
    /// IBC 1011.3 minimum stairway headroom, inches (80.0" / 6'8").
    pub ibc_min_headroom_in: f64,
    /// IBC 1010.1.1 minimum egress door clear width, inches (32.0").
    pub ibc_door_width_min_in: f64,
    pub ibc_door_height_min_in: f64,
    /// IRC/IBC minimum glazing-to-floor-area ratio for natural light (0.08 = 8%).
    pub ibc_min_natural_light_ratio: f64,
    pub default_room_area_sqm: f64,
    pub default_glass_r_value: f64,
    pub default_insulation_r_value: f64,
    pub default_brick_r_value: f64,
}

/// AASHTO/municipal roadway cross-section defaults.
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Roads {
    pub normal_crown: f64,
    pub e_max: f64,
    pub transition_speed_multiplier: f64,
    pub min_cover_ft: f64,
    pub min_pipe_slope: f64,
    pub max_pipe_slope: f64,
    pub min_pipe_diameter_in: f64,
    pub default_sump_depth_ft: f64,
    pub default_lane_width_ft: f64,
    pub default_shoulder_width_ft: f64,
    pub degree_of_curve_const: f64,
}

#[derive(Debug, Clone, Deserialize)]
struct Standards {
    climate: Climate,
    geometry: Geometry,
    structural: Structural,
    roads: Roads,
    #[serde(default)]
    hydraulics: Map<String, Value>,
    #[serde(default)]
    grading: Map<String, Value>,
    #[serde(default)]
    subdivision: Map<String, Value>,
    #[serde(default)]
    erosion: Map<String, Value>,
    #[serde(rename = "planProduction", default)]
    plan_production: Map<String, Value>,
    #[serde(default)]
    drafting: Map<String, Value>,
}

#[derive(Debug, Clone, Deserialize)]
struct FederalReference {
    standards: Standards,
}

fn federal() -> &'static FederalReference {
    static CELL: OnceLock<FederalReference> = OnceLock::new();
    CELL.get_or_init(|| {
        serde_json::from_str(FEDERAL_REFERENCE_JSON)
            .unwrap_or_else(|e| panic!("embedded federal_reference.json is malformed JSON: {e}"))
    })
}

/// AASHTO/ASCE 7 climate design constants.
pub fn climate() -> Climate {
    federal().standards.climate
}

/// AASHTO roadway-geometry design constants.
pub fn geometry() -> Geometry {
    federal().standards.geometry
}

/// IBC/IRC/ADA structural & architectural default constants.
pub fn structural() -> Structural {
    federal().standards.structural
}

/// AASHTO/municipal roadway cross-section defaults.
pub fn roads() -> Roads {
    federal().standards.roads
}

/// The untyped `hydraulics` standards bag, for [`crate::geoid`]'s
/// `LocalCodeStandards.hydraulics` baseline.
pub fn hydraulics_map() -> Map<String, Value> {
    federal().standards.hydraulics.clone()
}

/// The untyped `grading` standards bag.
pub fn grading_map() -> Map<String, Value> {
    federal().standards.grading.clone()
}

/// The untyped `subdivision` standards bag.
pub fn subdivision_map() -> Map<String, Value> {
    federal().standards.subdivision.clone()
}

/// The untyped `erosion` standards bag.
pub fn erosion_map() -> Map<String, Value> {
    federal().standards.erosion.clone()
}

/// The untyped `planProduction` standards bag.
pub fn plan_production_map() -> Map<String, Value> {
    federal().standards.plan_production.clone()
}

/// The untyped `drafting` standards bag.
pub fn drafting_map() -> Map<String, Value> {
    federal().standards.drafting.clone()
}

/// Any top-level `standards.<section>` as a raw JSON map — an escape hatch
/// for [`crate::geoid::registry`], which needs the *entire* `geometry` and
/// `structural` sections (every key the federal reference table declares)
/// for its `LocalCodeStandards` baseline, not just the typed subset
/// [`Geometry`]/[`Structural`] declare for this crate's own geometry/stair
/// algorithms.
pub fn raw_section_map(section: &str) -> Map<String, Value> {
    let raw: Value = serde_json::from_str(FEDERAL_REFERENCE_JSON)
        .unwrap_or_else(|e| panic!("embedded federal_reference.json is malformed JSON: {e}"));
    raw.get("standards")
        .and_then(|s| s.get(section))
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_federal_reference_parses_and_has_expected_values() {
        let s = structural();
        assert!((s.ibc_max_riser_height_in - 7.75).abs() < 1e-9);
        assert!((s.ibc_min_tread_depth_in - 10.0).abs() < 1e-9);
        assert!((s.ibc_min_headroom_in - 80.0).abs() < 1e-9);

        let c = climate();
        assert!((c.wind_velocity_mph - 120.0).abs() < 1e-9);

        let g = geometry();
        assert!((g.e_max - 0.06).abs() < 1e-9);

        let r = roads();
        assert!((r.min_pipe_diameter_in - 12.0).abs() < 1e-9);
    }

    #[test]
    fn untyped_standards_bags_carry_their_documented_keys() {
        let hydraulics = hydraulics_map();
        assert!(hydraulics.contains_key("cPre"));
        let grading = grading_map();
        assert!(grading.contains_key("padSlopePercent"));
        let erosion = erosion_map();
        assert!(erosion.contains_key("soilErodibilitySand"));
    }
}
