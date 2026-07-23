//! Unit conversion constants and engineer's-notation station formatting.
//!
//! Port of `packages/domain/src/civil/common/units.ts`.

/// Feet-to-meters conversion factor (US survey-adjacent, matches the rest of
/// the platform's `thoth_spatial::Unit::Feet::meters_per_unit`).
pub const FEET_TO_METERS: f64 = 0.3048;

/// Degrees a 100-unit arc subtends at radius R (the "arc definition" of
/// degree of curve): `DEGREE_OF_CURVE_CONST / R`.
pub const DEGREE_OF_CURVE_CONST: f64 = (100.0 * 180.0) / std::f64::consts::PI;

/// The two length systems a civil computation can be expressed in.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum LengthSystem {
    #[default]
    Feet,
    Meters,
}

/// Convert a length in plan units to meters based on the unit system. Mirrors
/// `toMeters` in the TS source, which defaults to `"feet"`.
pub fn to_meters(value: f64, units: LengthSystem) -> f64 {
    value
        * if units == LengthSystem::Feet {
            FEET_TO_METERS
        } else {
            1.0
        }
}

/// Format a station value in engineer's notation, e.g. `176043.32` →
/// `"1760+43.32"`. Negative stations are prefixed with `-`.
pub fn format_station(value: f64, precision: usize) -> String {
    let neg = value < 0.0;
    let v = value.abs();
    let sta = ((v / 100.0) + 1e-9).floor();
    let plus_value = v - sta * 100.0;
    let plus = format!("{:.*}", precision, plus_value);
    // Pad the "plus" part (e.g. "43.32") to at least `precision + 3` chars
    // (two whole digits + '.' + `precision` fraction digits), left-padding
    // with '0' — matches JS `String.prototype.padStart`.
    let target_len = precision + 3;
    let padded = if plus.len() < target_len {
        format!("{}{}", "0".repeat(target_len - plus.len()), plus)
    } else {
        plus
    };
    format!("{}{}+{}", if neg { "-" } else { "" }, sta as i64, padded)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn to_meters_defaults_to_feet() {
        assert!((to_meters(1.0, LengthSystem::Feet) - FEET_TO_METERS).abs() < 1e-12);
        assert_eq!(to_meters(1.0, LengthSystem::Meters), 1.0);
    }

    #[test]
    fn format_station_matches_engineer_notation() {
        assert_eq!(format_station(176_043.32, 2), "1760+43.32");
        assert_eq!(format_station(10_000.0, 2), "100+00.00");
        assert_eq!(format_station(10_500.0, 2), "105+00.00");
        assert_eq!(format_station(9282.35, 2), "92+82.35");
    }
}
