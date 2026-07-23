//! GEOID adapter — integration layer between [`crate::regions::RegionPlugin`]
//! and [`super::types::LocalCodePlugin`]. Port of
//! `packages/domain/src/planning/geoid/adapter.ts`.
//!
//! Lets an existing `RegionPlugin` definition (from [`crate::regions`]) be
//! registered as a GEOID location plugin, so a jurisdiction's zoning
//! defaults and GEOID standards stay in sync without maintaining two
//! parallel data sets.
//!
//! **Not ported**: TS's `attachGeoidToRegion` is a one-line object spread
//! (`{ ...region, geoid }`) that doesn't type-check meaningfully in Rust —
//! `RegionPlugin` has no `geoid` field to attach one to, so the spread only
//! ever produced an ad hoc, differently-shaped object the rest of the TS
//! codebase never consumes by that shape. Not a real port target.

use serde_json::{Map, Value};

use crate::regions::RegionPlugin;

use super::types::{LocalCodePlugin, LocalCodeStandardsOverride, ZoningStandards};
use super::utils::{parse_geoid, GeoidInput};

/// Convert a [`RegionPlugin`] into a GEOID [`LocalCodePlugin`].
///
/// * `region` — the region plug-in (e.g. Newton County, GA).
/// * `geoid` — the numerical Census GEOID identifier (e.g. `"13217"`).
pub fn region_to_geoid_plugin(region: &RegionPlugin, geoid: GeoidInput) -> LocalCodePlugin {
    let parsed = parse_geoid(geoid);
    let min_lot_area_sq_ft = region
        .standards
        .and_then(|s| s.min_lot_area_acres)
        .map(|acres| acres * 43_560.0);

    let mut metadata = Map::new();
    metadata.insert(
        "regionPluginId".to_string(),
        Value::String(region.id.clone()),
    );
    metadata.insert("country".to_string(), Value::String(region.country.clone()));

    let mut custom = Map::new();
    custom.insert(
        "surveyFramework".to_string(),
        Value::String(format!("{:?}", region.survey_framework)),
    );
    custom.insert(
        "certificatesCount".to_string(),
        Value::Number((region.certificates.len() as u64).into()),
    );

    LocalCodePlugin {
        geoid: if parsed.raw.is_empty() {
            match geoid {
                GeoidInput::Str(s) => s.to_string(),
                GeoidInput::Num(n) => n.to_string(),
            }
        } else {
            parsed.raw
        },
        area_type: parsed.area_type,
        name: region.name.clone(),
        state_name: region.state.clone(),
        county_name: region.county.clone(),
        cousub_name: None,
        effective_date: None,
        jurisdiction_url: None,
        standards: LocalCodeStandardsOverride {
            zoning: Some(ZoningStandards {
                front_setback: region.standards.and_then(|s| s.front_setback),
                side_setback: region.standards.and_then(|s| s.side_setback),
                rear_setback: region.standards.and_then(|s| s.rear_setback),
                min_lot_area: min_lot_area_sq_ft,
                min_row_width: region.standards.and_then(|s| s.min_row_width),
                ..Default::default()
            }),
            custom: Some(custom),
            ..Default::default()
        },
        custom_rules: vec![],
        survey_framework: None,
        metadata,
    }
}

#[cfg(test)]
mod tests {
    use super::super::types::GeoidAreaType;
    use super::*;
    use crate::regions::newton_county_ga;

    #[test]
    fn converts_a_region_plugin_into_a_geoid_plugin_with_matching_zoning() {
        let region = newton_county_ga();
        let plugin = region_to_geoid_plugin(&region, GeoidInput::Str("13217"));
        assert_eq!(plugin.geoid, "13217");
        assert_eq!(plugin.name, region.name);
        assert_eq!(plugin.area_type, GeoidAreaType::County);
        let zoning = plugin.standards.zoning.expect("zoning override");
        assert_eq!(
            zoning.front_setback,
            region.standards.and_then(|s| s.front_setback)
        );
    }

    #[test]
    fn min_lot_area_acres_converts_to_square_feet() {
        let region = newton_county_ga();
        let plugin = region_to_geoid_plugin(&region, GeoidInput::Str("13217"));
        let zoning = plugin.standards.zoning.expect("zoning override");
        if let Some(acres) = region.standards.and_then(|s| s.min_lot_area_acres) {
            assert_eq!(zoning.min_lot_area, Some(acres * 43_560.0));
        }
    }
}
