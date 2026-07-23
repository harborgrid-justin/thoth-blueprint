//! Built-in GEOID plugins — standard state/county/county-subdivision
//! presets. Port of `packages/domain/src/planning/geoid/presets.ts` and its
//! `geoid/data/**/*.json` payloads.
//!
//! Demonstrates hierarchical inheritance: state (2) → county (5) → county
//! subdivision (10). Each preset is embedded at compile time via
//! `include_str!`, matching `thoth-drawing::parts::data`'s convention for
//! its own JSON parts catalog (see `crates/thoth-drawing/src/parts/data.rs`)
//! — the data stays data, editable without touching Rust source, but is no
//! longer read from disk at runtime.
//!
//! The nested `state/county/cousub` directory layout the TS source uses
//! (`geoid/data/48/_state/index.json`, `geoid/data/48/201/_county/index.json`,
//! …) is flattened here into descriptively-named files
//! (`tx_state.json`, `tx_harris_county.json`, …) under `geoid/data/` — Rust
//! has no need for that nesting to convey the GEOID hierarchy, which is
//! data (the `geoid` field itself), not a file-path convention.

use super::registry::GeoidPluginRegistry;
use super::types::LocalCodePlugin;

const TX_STATE_JSON: &str = include_str!("data/tx_state.json");
const TX_HARRIS_COUNTY_JSON: &str = include_str!("data/tx_harris_county.json");
const TX_HARRIS_PASADENA_COUSUB_JSON: &str = include_str!("data/tx_harris_pasadena_cousub.json");
const GA_STATE_JSON: &str = include_str!("data/ga_state.json");
const GA_NEWTON_COUNTY_JSON: &str = include_str!("data/ga_newton_county.json");
const CA_STATE_JSON: &str = include_str!("data/ca_state.json");
const CA_LA_COUNTY_JSON: &str = include_str!("data/ca_la_county.json");
const VA_STATE_JSON: &str = include_str!("data/va_state.json");
const VA_PWC_COUNTY_JSON: &str = include_str!("data/va_pwc_county.json");

fn parse(label: &str, json: &str) -> LocalCodePlugin {
    serde_json::from_str(json)
        .unwrap_or_else(|e| panic!("embedded GEOID preset {label} is malformed JSON: {e}"))
}

/// Texas state GEOID plugin (GEOID: `48`).
pub fn texas_state_plugin() -> LocalCodePlugin {
    parse("tx_state.json", TX_STATE_JSON)
}

/// Harris County, TX GEOID plugin (GEOID: `48201`).
pub fn harris_county_plugin() -> LocalCodePlugin {
    parse("tx_harris_county.json", TX_HARRIS_COUNTY_JSON)
}

/// Pasadena CCD, Harris County, TX GEOID plugin (GEOID: `4820192975`).
pub fn pasadena_ccd_plugin() -> LocalCodePlugin {
    parse(
        "tx_harris_pasadena_cousub.json",
        TX_HARRIS_PASADENA_COUSUB_JSON,
    )
}

/// Georgia state GEOID plugin (GEOID: `13`).
pub fn georgia_state_plugin() -> LocalCodePlugin {
    parse("ga_state.json", GA_STATE_JSON)
}

/// Newton County, GA GEOID plugin (GEOID: `13217`).
pub fn newton_county_geoid_plugin() -> LocalCodePlugin {
    parse("ga_newton_county.json", GA_NEWTON_COUNTY_JSON)
}

/// California state GEOID plugin (GEOID: `06`).
pub fn california_state_plugin() -> LocalCodePlugin {
    parse("ca_state.json", CA_STATE_JSON)
}

/// Los Angeles County, CA GEOID plugin (GEOID: `06037`).
pub fn los_angeles_county_plugin() -> LocalCodePlugin {
    parse("ca_la_county.json", CA_LA_COUNTY_JSON)
}

/// Virginia state GEOID plugin (GEOID: `51`).
pub fn virginia_state_plugin() -> LocalCodePlugin {
    parse("va_state.json", VA_STATE_JSON)
}

/// Prince William County, VA GEOID plugin (GEOID: `51153`).
pub fn prince_william_county_geoid_plugin() -> LocalCodePlugin {
    parse("va_pwc_county.json", VA_PWC_COUNTY_JSON)
}

/// Every standard built-in preset plugin, in the same order as the TS
/// `PRESET_GEOID_PLUGINS` array.
pub fn preset_geoid_plugins() -> Vec<LocalCodePlugin> {
    vec![
        texas_state_plugin(),
        harris_county_plugin(),
        pasadena_ccd_plugin(),
        georgia_state_plugin(),
        newton_county_geoid_plugin(),
        california_state_plugin(),
        los_angeles_county_plugin(),
        virginia_state_plugin(),
        prince_william_county_geoid_plugin(),
    ]
}

/// Register every standard built-in preset plugin into `registry`.
pub fn register_default_geoid_plugins(registry: &mut GeoidPluginRegistry) {
    for plugin in preset_geoid_plugins() {
        registry.register(plugin);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::geoid::types::GeoidAreaType;
    use crate::geoid::utils::GeoidInput;

    #[test]
    fn every_embedded_preset_parses() {
        assert_eq!(preset_geoid_plugins().len(), 9);
    }

    #[test]
    fn texas_state_preset_has_the_expected_geoid_and_area_type() {
        let tx = texas_state_plugin();
        assert_eq!(tx.geoid, "48");
        assert_eq!(tx.area_type, GeoidAreaType::State);
        assert_eq!(tx.name, "Texas");
        let zoning = tx.standards.zoning.expect("zoning override");
        assert_eq!(zoning.max_height, Some(40.0));
    }

    #[test]
    fn harris_county_preset_cascades_over_the_texas_baseline_when_registered() {
        let mut registry = GeoidPluginRegistry::new();
        register_default_geoid_plugins(&mut registry);
        let resolved = registry.resolve(GeoidInput::Str("48201"), None);
        assert_eq!(resolved.name, "Harris County, TX");
        // Harris County overrides frontSetback to 30; Texas's maxHeight (40)
        // survives untouched.
        assert_eq!(resolved.standards.zoning.front_setback, Some(30.0));
        assert_eq!(resolved.standards.zoning.max_height, Some(40.0));
    }

    #[test]
    fn pasadena_cousub_cascades_over_both_county_and_state() {
        let mut registry = GeoidPluginRegistry::new();
        register_default_geoid_plugins(&mut registry);
        let resolved = registry.resolve(GeoidInput::Str("4820192975"), None);
        assert_eq!(resolved.name, "Pasadena CCD, Harris County, TX");
        // Pasadena's own override.
        assert_eq!(resolved.standards.zoning.max_far, Some(2.0));
        // Harris County's minRowWidth survives (Pasadena doesn't touch it).
        assert_eq!(resolved.standards.zoning.min_row_width, Some(60.0));
    }

    #[test]
    fn all_nine_geoids_resolve_to_a_named_non_baseline_jurisdiction() {
        let mut registry = GeoidPluginRegistry::new();
        register_default_geoid_plugins(&mut registry);
        for geoid in [
            "48",
            "48201",
            "4820192975",
            "13",
            "13217",
            "06",
            "06037",
            "51",
            "51153",
        ] {
            let resolved = registry.resolve(GeoidInput::Str(geoid), None);
            assert_ne!(
                resolved.name, "Default National Standard",
                "geoid {geoid} did not resolve"
            );
        }
    }
}
