//! GEOID plugin registry & cascading resolution engine. Port of
//! `packages/domain/src/planning/geoid/registry.ts`.
//!
//! Implements the standard resolution order: baseline national standard →
//! state (2-digit) → county (5-digit) → county subdivision (10-digit) →
//! project overrides. Each stage that has a registered plugin (or, at the
//! end, caller-supplied overrides) overlays only the fields it sets onto
//! the running merge — earlier, broader-scope values survive untouched
//! where a narrower plugin doesn't override them.
//!
//! **Not a global singleton**: the TS original exposes one
//! `geoidRegistry` module-level instance. This port instead has callers own
//! a [`GeoidPluginRegistry`] value explicitly (construct one, register
//! presets into it, pass it to [`GeoidPluginRegistry::resolve`] or
//! [`crate::geoid::compliance::audit_geoid_compliance`]) — a mutable global
//! would need a `static` behind a `Mutex`/`OnceLock` for no real benefit
//! here, and explicit ownership is easier to test and reason about.

use std::collections::BTreeMap;

use super::types::{
    CivilErosionStandards, ClimateStandards, EgressStandards, LocalCodePlugin, LocalCodeStandards,
    LocalCodeStandardsOverride, ResolvedLocalCode, RoadStandards, StairStandards, ZoningStandards,
};
use super::utils::{get_geoid_hierarchy, normalize_geoid, parse_geoid, GeoidInput};
use crate::federal_data;

/// Default national baseline code standards (sensible IRC/IBC defaults,
/// matching the TS `DEFAULT_NATIONAL_STANDARDS` constant exactly). The
/// zoning/stairs/egress/civil literals below are the TS original's own
/// hardcoded fallbacks; climate/roads and the untyped domain bags are
/// sourced from the embedded federal reference table
/// ([`crate::federal_data`]), exactly like the TS spreads
/// `...federalData.standards.X`.
pub fn default_national_standards() -> LocalCodeStandards {
    let climate_ref = federal_data::climate();
    let roads_ref = federal_data::roads();
    LocalCodeStandards {
        zoning: ZoningStandards {
            front_setback: Some(25.0),
            rear_setback: Some(20.0),
            side_setback: Some(10.0),
            corner_setback: Some(15.0),
            max_height: Some(35.0),
            max_far: Some(1.5),
            max_coverage: Some(0.5),
            min_lot_area: Some(5000.0),
            min_row_width: Some(50.0),
            allowed_uses: Some(vec![
                "residential".to_string(),
                "commercial".to_string(),
                "industrial".to_string(),
                "mixed-use".to_string(),
            ]),
        },
        stairs: StairStandards {
            max_riser_height: Some(7.75),
            min_tread_depth: Some(10.0),
            min_stair_width: Some(36.0),
            min_headroom: Some(80.0),
            handrail_height_min: Some(34.0),
            handrail_height_max: Some(38.0),
        },
        egress: EgressStandards {
            min_door_width: Some(32.0),
            min_door_height: Some(80.0),
            min_egress_window_area: Some(5.7),
            max_window_sill_height: Some(44.0),
        },
        civil: CivilErosionStandards {
            min_silt_fence_buffer: Some(10.0),
            max_disturbed_slope_percent: Some(30.0),
            max_runoff_coefficient: Some(0.8),
            stream_buffer_distance: Some(25.0),
        },
        climate: ClimateStandards {
            rainfall_intensity_100_yr: Some(climate_ref.rainfall_intensity_100_yr),
            wind_velocity_mph: Some(climate_ref.wind_velocity_mph),
            snow_load_psf: Some(climate_ref.snow_load_psf),
            soil_bearing_psf: Some(climate_ref.soil_bearing_psf),
        },
        hydraulics: federal_data::hydraulics_map(),
        geometry: {
            // `Geometry` is a typed struct in `federal_data` (only the
            // fields `crate::smart::geometry` needs); the geoid baseline
            // needs the *whole* untyped `geometry` section, so re-parse the
            // embedded federal reference's raw JSON for this one section
            // rather than adding every field to `federal_data::Geometry`.
            federal_data_geometry_map()
        },
        grading: federal_data::grading_map(),
        subdivision: federal_data::subdivision_map(),
        structural: federal_data_structural_map(),
        erosion: federal_data::erosion_map(),
        plan_production: federal_data::plan_production_map(),
        drafting: federal_data::drafting_map(),
        roads: RoadStandards {
            normal_crown: Some(roads_ref.normal_crown),
            e_max: Some(roads_ref.e_max),
            transition_speed_multiplier: Some(roads_ref.transition_speed_multiplier),
            min_cover_ft: Some(roads_ref.min_cover_ft),
            min_pipe_slope: Some(roads_ref.min_pipe_slope),
            max_pipe_slope: Some(roads_ref.max_pipe_slope),
            min_pipe_diameter_in: Some(roads_ref.min_pipe_diameter_in),
            default_sump_depth_ft: Some(roads_ref.default_sump_depth_ft),
            default_lane_width_ft: Some(roads_ref.default_lane_width_ft),
            default_shoulder_width_ft: Some(roads_ref.default_shoulder_width_ft),
            degree_of_curve_const: Some(roads_ref.degree_of_curve_const),
        },
        electrical: serde_json::Map::new(),
        mechanical: serde_json::Map::new(),
        custom: serde_json::Map::new(),
    }
}

/// The full `geometry` standards section as an untyped map (the
/// `LocalCodeStandards.geometry` baseline needs every key the federal
/// reference table declares, not just the subset `federal_data::Geometry`
/// types for `smart::geometry`'s own use).
fn federal_data_geometry_map() -> serde_json::Map<String, serde_json::Value> {
    federal_data::raw_section_map("geometry")
}

/// The full `structural` standards section as an untyped map, for the same
/// reason as [`federal_data_geometry_map`].
fn federal_data_structural_map() -> serde_json::Map<String, serde_json::Value> {
    federal_data::raw_section_map("structural")
}

fn overlay_zoning(base: &mut ZoningStandards, over: &ZoningStandards) {
    if over.front_setback.is_some() {
        base.front_setback = over.front_setback;
    }
    if over.rear_setback.is_some() {
        base.rear_setback = over.rear_setback;
    }
    if over.side_setback.is_some() {
        base.side_setback = over.side_setback;
    }
    if over.corner_setback.is_some() {
        base.corner_setback = over.corner_setback;
    }
    if over.max_height.is_some() {
        base.max_height = over.max_height;
    }
    if over.max_far.is_some() {
        base.max_far = over.max_far;
    }
    if over.max_coverage.is_some() {
        base.max_coverage = over.max_coverage;
    }
    if over.min_lot_area.is_some() {
        base.min_lot_area = over.min_lot_area;
    }
    if over.min_row_width.is_some() {
        base.min_row_width = over.min_row_width;
    }
    if over.allowed_uses.is_some() {
        base.allowed_uses = over.allowed_uses.clone();
    }
}

fn overlay_stairs(base: &mut StairStandards, over: &StairStandards) {
    if over.max_riser_height.is_some() {
        base.max_riser_height = over.max_riser_height;
    }
    if over.min_tread_depth.is_some() {
        base.min_tread_depth = over.min_tread_depth;
    }
    if over.min_stair_width.is_some() {
        base.min_stair_width = over.min_stair_width;
    }
    if over.min_headroom.is_some() {
        base.min_headroom = over.min_headroom;
    }
    if over.handrail_height_min.is_some() {
        base.handrail_height_min = over.handrail_height_min;
    }
    if over.handrail_height_max.is_some() {
        base.handrail_height_max = over.handrail_height_max;
    }
}

fn overlay_egress(base: &mut EgressStandards, over: &EgressStandards) {
    if over.min_door_width.is_some() {
        base.min_door_width = over.min_door_width;
    }
    if over.min_door_height.is_some() {
        base.min_door_height = over.min_door_height;
    }
    if over.min_egress_window_area.is_some() {
        base.min_egress_window_area = over.min_egress_window_area;
    }
    if over.max_window_sill_height.is_some() {
        base.max_window_sill_height = over.max_window_sill_height;
    }
}

fn overlay_civil(base: &mut CivilErosionStandards, over: &CivilErosionStandards) {
    if over.min_silt_fence_buffer.is_some() {
        base.min_silt_fence_buffer = over.min_silt_fence_buffer;
    }
    if over.max_disturbed_slope_percent.is_some() {
        base.max_disturbed_slope_percent = over.max_disturbed_slope_percent;
    }
    if over.max_runoff_coefficient.is_some() {
        base.max_runoff_coefficient = over.max_runoff_coefficient;
    }
    if over.stream_buffer_distance.is_some() {
        base.stream_buffer_distance = over.stream_buffer_distance;
    }
}

fn overlay_climate(base: &mut ClimateStandards, over: &ClimateStandards) {
    if over.rainfall_intensity_100_yr.is_some() {
        base.rainfall_intensity_100_yr = over.rainfall_intensity_100_yr;
    }
    if over.wind_velocity_mph.is_some() {
        base.wind_velocity_mph = over.wind_velocity_mph;
    }
    if over.snow_load_psf.is_some() {
        base.snow_load_psf = over.snow_load_psf;
    }
    if over.soil_bearing_psf.is_some() {
        base.soil_bearing_psf = over.soil_bearing_psf;
    }
}

fn overlay_roads(base: &mut RoadStandards, over: &RoadStandards) {
    if over.normal_crown.is_some() {
        base.normal_crown = over.normal_crown;
    }
    if over.e_max.is_some() {
        base.e_max = over.e_max;
    }
    if over.transition_speed_multiplier.is_some() {
        base.transition_speed_multiplier = over.transition_speed_multiplier;
    }
    if over.min_cover_ft.is_some() {
        base.min_cover_ft = over.min_cover_ft;
    }
    if over.min_pipe_slope.is_some() {
        base.min_pipe_slope = over.min_pipe_slope;
    }
    if over.max_pipe_slope.is_some() {
        base.max_pipe_slope = over.max_pipe_slope;
    }
    if over.min_pipe_diameter_in.is_some() {
        base.min_pipe_diameter_in = over.min_pipe_diameter_in;
    }
    if over.default_sump_depth_ft.is_some() {
        base.default_sump_depth_ft = over.default_sump_depth_ft;
    }
    if over.default_lane_width_ft.is_some() {
        base.default_lane_width_ft = over.default_lane_width_ft;
    }
    if over.default_shoulder_width_ft.is_some() {
        base.default_shoulder_width_ft = over.default_shoulder_width_ft;
    }
    if over.degree_of_curve_const.is_some() {
        base.degree_of_curve_const = over.degree_of_curve_const;
    }
}

/// Overlay one override bag onto a running merge (mirrors the TS
/// `Object.assign(merged.X, override.X)` cascade for every domain).
fn overlay_standards(merged: &mut LocalCodeStandards, over: &LocalCodeStandardsOverride) {
    if let Some(z) = &over.zoning {
        overlay_zoning(&mut merged.zoning, z);
    }
    if let Some(s) = &over.stairs {
        overlay_stairs(&mut merged.stairs, s);
    }
    if let Some(e) = &over.egress {
        overlay_egress(&mut merged.egress, e);
    }
    if let Some(c) = &over.civil {
        overlay_civil(&mut merged.civil, c);
    }
    if let Some(c) = &over.climate {
        overlay_climate(&mut merged.climate, c);
    }
    if let Some(m) = &over.hydraulics {
        merged.hydraulics.extend(m.clone());
    }
    if let Some(m) = &over.geometry {
        merged.geometry.extend(m.clone());
    }
    if let Some(m) = &over.grading {
        merged.grading.extend(m.clone());
    }
    if let Some(m) = &over.subdivision {
        merged.subdivision.extend(m.clone());
    }
    if let Some(m) = &over.structural {
        merged.structural.extend(m.clone());
    }
    if let Some(m) = &over.erosion {
        merged.erosion.extend(m.clone());
    }
    if let Some(m) = &over.plan_production {
        merged.plan_production.extend(m.clone());
    }
    if let Some(m) = &over.drafting {
        merged.drafting.extend(m.clone());
    }
    if let Some(r) = &over.roads {
        overlay_roads(&mut merged.roads, r);
    }
    if let Some(m) = &over.electrical {
        merged.electrical.extend(m.clone());
    }
    if let Some(m) = &over.mechanical {
        merged.mechanical.extend(m.clone());
    }
    if let Some(m) = &over.custom {
        merged.custom.extend(m.clone());
    }
}

/// Registry managing GEOID plugins and resolving hierarchical local
/// requirements.
#[derive(Debug, Clone, Default)]
pub struct GeoidPluginRegistry {
    plugins: BTreeMap<String, LocalCodePlugin>,
}

impl GeoidPluginRegistry {
    /// A fresh, empty registry.
    pub fn new() -> Self {
        Self::default()
    }

    /// Register a location-code plugin, keyed by its normalized GEOID.
    pub fn register(&mut self, plugin: LocalCodePlugin) {
        let key = normalize_geoid(GeoidInput::Str(&plugin.geoid));
        let mut plugin = plugin;
        plugin.geoid = key.clone();
        self.plugins.insert(key, plugin);
    }

    /// Unregister a plugin by GEOID. Returns whether one was removed.
    pub fn unregister(&mut self, geoid: GeoidInput) -> bool {
        let key = normalize_geoid(geoid);
        self.plugins.remove(&key).is_some()
    }

    /// Look up a specific plugin by exact GEOID.
    pub fn get_plugin(&self, geoid: GeoidInput) -> Option<&LocalCodePlugin> {
        let key = normalize_geoid(geoid);
        self.plugins.get(&key)
    }

    /// Clear all registered plugins.
    pub fn clear(&mut self) {
        self.plugins.clear();
    }

    /// List all registered plugins.
    pub fn list_plugins(&self) -> Vec<&LocalCodePlugin> {
        self.plugins.values().collect()
    }

    /// All plugins belonging to a given state GEOID (2 digits).
    pub fn get_plugins_by_state(&self, state_geoid: GeoidInput) -> Vec<&LocalCodePlugin> {
        let target_state = parse_geoid(state_geoid).state_code;
        self.list_plugins()
            .into_iter()
            .filter(|p| parse_geoid(GeoidInput::Str(&p.geoid)).state_code == target_state)
            .collect()
    }

    /// Resolve local code standards for a target GEOID by cascading:
    /// baseline → state (2) → county (5) → cousub (10) → custom overrides.
    pub fn resolve(
        &self,
        geoid: GeoidInput,
        custom_overrides: Option<&LocalCodeStandardsOverride>,
    ) -> ResolvedLocalCode {
        let parsed = parse_geoid(geoid);
        let hierarchy = get_geoid_hierarchy(geoid);
        // Reverse so the broadest scope (state) applies first, narrowest
        // (cousub) last.
        let asc_chain: Vec<&String> = hierarchy.iter().rev().collect();

        let mut merged = default_national_standards();
        let mut resolution_chain = vec!["baseline".to_string()];
        let mut applied_plugins: Vec<LocalCodePlugin> = Vec::new();
        let mut resolved_name = "Default National Standard".to_string();

        for key in &asc_chain {
            if let Some(plugin) = self.plugins.get(*key) {
                applied_plugins.push(plugin.clone());
                resolution_chain.push((*key).clone());
                resolved_name = plugin.name.clone();
            }
        }

        let mut survey_framework = None;
        for plugin in &applied_plugins {
            if plugin.survey_framework.is_some() {
                survey_framework = plugin.survey_framework;
            }
            overlay_standards(&mut merged, &plugin.standards);
        }

        if let Some(overrides) = custom_overrides {
            resolution_chain.push("project-overrides".to_string());
            overlay_standards(&mut merged, overrides);
        }

        ResolvedLocalCode {
            target_geoid: if parsed.raw.is_empty() {
                match geoid {
                    GeoidInput::Str(s) => s.to_string(),
                    GeoidInput::Num(n) => n.to_string(),
                }
            } else {
                parsed.raw.clone()
            },
            parsed,
            name: resolved_name,
            resolution_chain,
            applied_plugins,
            survey_framework,
            standards: merged,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::geoid::types::{GeoidAreaType, LocalCodeStandardsOverride};

    fn texas_plugin() -> LocalCodePlugin {
        LocalCodePlugin {
            geoid: "48".to_string(),
            area_type: GeoidAreaType::State,
            name: "Texas".to_string(),
            state_name: Some("Texas".to_string()),
            county_name: None,
            cousub_name: None,
            effective_date: None,
            jurisdiction_url: None,
            standards: LocalCodeStandardsOverride {
                zoning: Some(ZoningStandards {
                    front_setback: Some(25.0),
                    side_setback: Some(10.0),
                    rear_setback: Some(20.0),
                    max_height: Some(40.0),
                    max_coverage: Some(0.55),
                    min_lot_area: Some(5000.0),
                    ..Default::default()
                }),
                ..Default::default()
            },
            custom_rules: vec![],
            survey_framework: None,
            metadata: Default::default(),
        }
    }

    fn harris_county_plugin() -> LocalCodePlugin {
        LocalCodePlugin {
            geoid: "48201".to_string(),
            area_type: GeoidAreaType::County,
            name: "Harris County, TX".to_string(),
            state_name: Some("Texas".to_string()),
            county_name: Some("Harris County".to_string()),
            cousub_name: None,
            effective_date: None,
            jurisdiction_url: None,
            standards: LocalCodeStandardsOverride {
                zoning: Some(ZoningStandards {
                    front_setback: Some(30.0),
                    min_row_width: Some(60.0),
                    ..Default::default()
                }),
                ..Default::default()
            },
            custom_rules: vec![],
            survey_framework: None,
            metadata: Default::default(),
        }
    }

    #[test]
    fn resolves_baseline_standards_for_an_unregistered_geoid() {
        let registry = GeoidPluginRegistry::new();
        let resolved = registry.resolve(GeoidInput::Str("99"), None);
        assert_eq!(resolved.name, "Default National Standard");
        assert_eq!(resolved.resolution_chain, vec!["baseline".to_string()]);
        assert_eq!(resolved.standards.zoning.front_setback, Some(25.0));
    }

    #[test]
    fn state_plugin_overlays_baseline_zoning() {
        let mut registry = GeoidPluginRegistry::new();
        registry.register(texas_plugin());
        let resolved = registry.resolve(GeoidInput::Str("48"), None);
        assert_eq!(resolved.name, "Texas");
        assert_eq!(resolved.standards.zoning.max_height, Some(40.0));
        // Untouched by the TX override, still the baseline value.
        assert_eq!(resolved.standards.zoning.corner_setback, Some(15.0));
    }

    #[test]
    fn county_plugin_cascades_over_state_plugin() {
        let mut registry = GeoidPluginRegistry::new();
        registry.register(texas_plugin());
        registry.register(harris_county_plugin());
        let resolved = registry.resolve(GeoidInput::Str("48201"), None);
        assert_eq!(resolved.name, "Harris County, TX");
        // County overrides frontSetback.
        assert_eq!(resolved.standards.zoning.front_setback, Some(30.0));
        // State's maxHeight survives (county doesn't touch it).
        assert_eq!(resolved.standards.zoning.max_height, Some(40.0));
        assert_eq!(
            resolved.resolution_chain,
            vec![
                "baseline".to_string(),
                "48".to_string(),
                "48201".to_string()
            ]
        );
    }

    #[test]
    fn project_overrides_apply_last_and_win() {
        let mut registry = GeoidPluginRegistry::new();
        registry.register(texas_plugin());
        let overrides = LocalCodeStandardsOverride {
            zoning: Some(ZoningStandards {
                max_height: Some(999.0),
                ..Default::default()
            }),
            ..Default::default()
        };
        let resolved = registry.resolve(GeoidInput::Str("48"), Some(&overrides));
        assert_eq!(resolved.standards.zoning.max_height, Some(999.0));
        assert!(resolved
            .resolution_chain
            .contains(&"project-overrides".to_string()));
    }

    #[test]
    fn get_plugins_by_state_filters_correctly() {
        let mut registry = GeoidPluginRegistry::new();
        registry.register(texas_plugin());
        registry.register(harris_county_plugin());
        let tx_plugins = registry.get_plugins_by_state(GeoidInput::Str("48"));
        assert_eq!(tx_plugins.len(), 2);
    }

    #[test]
    fn unregister_removes_a_plugin() {
        let mut registry = GeoidPluginRegistry::new();
        registry.register(texas_plugin());
        assert!(registry.get_plugin(GeoidInput::Str("48")).is_some());
        assert!(registry.unregister(GeoidInput::Str("48")));
        assert!(registry.get_plugin(GeoidInput::Str("48")).is_none());
    }
}
