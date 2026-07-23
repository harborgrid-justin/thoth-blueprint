//! Coordinate system, unit, and scale primitives.
//!
//! Port of `packages/domain/src/spatial/types/index.ts` (leaf types only) and
//! `packages/domain/src/spatial/units.ts` (display formatting), minus the
//! survey-bearing helpers — those depend on `thoth-survey` and are re-homed
//! there as `thoth_survey::format_direction` to avoid a base-crate depending
//! on a higher-level one.

use serde::{Deserialize, Serialize};

/// Length units a plan can be expressed in. Attached explicitly — never implied.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Unit {
    Meters,
    Feet,
}

impl Unit {
    /// Meters-per-unit conversion factor, mirroring `METERS_PER_UNIT` in spatial.ts.
    pub const fn meters_per_unit(self) -> f64 {
        match self {
            Unit::Meters => 1.0,
            Unit::Feet => 0.3048,
        }
    }

    pub const fn label(self) -> &'static str {
        match self {
            Unit::Meters => "m",
            Unit::Feet => "ft",
        }
    }
}

/// Units in which an area metric can be reported.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AreaUnit {
    Sqm,
    Sqft,
    Acres,
    Hectares,
    Sqkm,
    Sqmi,
}

impl AreaUnit {
    pub const fn label(self) -> &'static str {
        match self {
            AreaUnit::Sqm => "m²",
            AreaUnit::Sqft => "ft²",
            AreaUnit::Acres => "ac",
            AreaUnit::Hectares => "ha",
            AreaUnit::Sqkm => "km²",
            AreaUnit::Sqmi => "mi²",
        }
    }

    /// Square meters per unit, used to convert an area metric to this unit.
    pub const fn sqm_per_unit(self) -> f64 {
        match self {
            AreaUnit::Sqm => 1.0,
            AreaUnit::Sqft => 0.092_903_04,
            AreaUnit::Acres => 4_046.856_422_4,
            AreaUnit::Hectares => 10_000.0,
            AreaUnit::Sqkm => 1_000_000.0,
            AreaUnit::Sqmi => 2_589_988.110_336,
        }
    }
}

/// A coordinate reference system identifier, typically an EPSG code such as
/// `"EPSG:3857"` (Web Mercator) or `"EPSG:4326"` (WGS84 lon/lat). Every plan
/// has one; geometry without a CRS is invalid.
pub type Crs = String;

/// The ratio of plan distance to real-world distance (e.g. 1 / 1000).
pub type Scale = f64;

/// The spatial reference attached to all geometry in a plan.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SpatialContext {
    pub crs: Crs,
    pub units: Unit,
    pub scale: Scale,
}

/// Length-unit display preference: follow the plan, or force meters/feet.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LengthUnitPref {
    Auto,
    Meters,
    Feet,
}

/// Resolve the concrete length unit a readout should use given the plan + pref.
pub fn resolve_length_unit(spatial: &SpatialContext, pref: LengthUnitPref) -> Unit {
    match pref {
        LengthUnitPref::Auto => spatial.units,
        LengthUnitPref::Meters => Unit::Meters,
        LengthUnitPref::Feet => Unit::Feet,
    }
}

/// Format a plan-unit length in the user's preferred display unit. `plan_length`
/// is in the plan's own units; it is converted through meters so the displayed
/// value is spatially correct regardless of the display unit chosen.
pub fn format_length(
    plan_length: f64,
    spatial: &SpatialContext,
    pref: LengthUnitPref,
    digits: usize,
) -> String {
    let meters = plan_length * spatial.units.meters_per_unit();
    let unit = resolve_length_unit(spatial, pref);
    let value = meters / unit.meters_per_unit();
    format!("{:.*} {}", digits, value, unit.label())
}

/// Format a number with fixed fractional digits (thousands separators are a
/// presentation concern left to callers/locale-aware formatters upstream).
pub fn format_number(value: f64, digits: usize) -> String {
    format!("{:.*}", digits, value)
}

/// Format an area value with its unit label, choosing digits by magnitude.
pub fn format_area(value: f64, unit: AreaUnit) -> String {
    let digits = matches!(unit, AreaUnit::Acres | AreaUnit::Hectares)
        .then_some(2)
        .unwrap_or(0);
    format!("{} {}", format_number(value, digits), unit.label())
}

/// Format a 0-1 fraction as a percentage.
pub fn format_percent(fraction: f64, digits: usize) -> String {
    format!("{}%", format_number(fraction * 100.0, digits))
}

/// Format a ratio like FAR to two decimals.
pub fn format_ratio(value: f64) -> String {
    format!("{:.2}", value)
}

/// A safe filename slug from a plan/element name.
pub fn slugify(name: &str) -> String {
    let lower = name.to_lowercase();
    let mut slug = String::with_capacity(lower.len());
    let mut last_was_dash = false;
    for c in lower.chars() {
        if c.is_ascii_alphanumeric() {
            slug.push(c);
            last_was_dash = false;
        } else if !last_was_dash {
            slug.push('-');
            last_was_dash = true;
        }
    }
    let trimmed = slug.trim_matches('-');
    if trimmed.is_empty() {
        "export".to_string()
    } else {
        trimmed.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn meters_per_unit_matches_ts_table() {
        assert_eq!(Unit::Meters.meters_per_unit(), 1.0);
        assert!((Unit::Feet.meters_per_unit() - 0.3048).abs() < 1e-12);
    }

    #[test]
    fn format_length_round_trips_through_meters() {
        let ctx = SpatialContext {
            crs: "EPSG:3857".into(),
            units: Unit::Feet,
            scale: 1.0,
        };
        let s = format_length(10.0, &ctx, LengthUnitPref::Meters, 2);
        assert_eq!(s, "3.05 m");
    }

    #[test]
    fn slugify_matches_ts_semantics() {
        assert_eq!(slugify("Main St. Parcel #12"), "main-st-parcel-12");
        assert_eq!(slugify("---"), "export");
        assert_eq!(slugify(""), "export");
    }

    #[test]
    fn format_area_uses_two_digits_for_acres_and_hectares() {
        assert_eq!(format_area(1.5, AreaUnit::Acres), "1.50 ac");
        assert_eq!(format_area(1200.0, AreaUnit::Sqft), "1200 ft²");
    }
}
