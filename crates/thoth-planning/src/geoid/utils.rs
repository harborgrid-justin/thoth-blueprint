//! GEOID helper utilities — parsing, validation, formatting, and hierarchy
//! resolution. Port of `packages/domain/src/planning/geoid/utils.ts`.
//!
//! Implements the US Census GEOID structure rules:
//! - State: 2 digits (e.g. `"48"` for Texas).
//! - County: 5 digits = state (2) + county (3) (e.g. `"48201"` for Harris County).
//! - County subdivision: 10 digits = state (2) + county (3) + COUSUB (5)
//!   (e.g. `"4820192975"` for Pasadena CCD).

use super::types::{GeoidAreaType, ParsedGeoid};

/// A GEOID input: either an already-numeric code or a numeral string.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum GeoidInput<'a> {
    Str(&'a str),
    Num(u64),
}

impl<'a> From<&'a str> for GeoidInput<'a> {
    fn from(s: &'a str) -> Self {
        GeoidInput::Str(s)
    }
}

impl From<u64> for GeoidInput<'_> {
    fn from(n: u64) -> Self {
        GeoidInput::Num(n)
    }
}

/// Clean and normalize a GEOID input (removes non-digit characters; pads a
/// leading zero for 1/4/9-digit inputs, e.g. `6037` → `"06037"` for LA
/// County).
pub fn normalize_geoid(raw: GeoidInput) -> String {
    let digits = match raw {
        GeoidInput::Num(n) => n.to_string(),
        GeoidInput::Str(s) => s.trim().chars().filter(|c| c.is_ascii_digit()).collect(),
    };
    if matches!(digits.len(), 1 | 4 | 9) {
        format!("0{digits}")
    } else {
        digits
    }
}

/// Determine the area classification from normalized GEOID digit length.
pub fn get_area_type(geoid: GeoidInput) -> GeoidAreaType {
    let norm = normalize_geoid(geoid);
    match norm.len() {
        2 => GeoidAreaType::State,
        5 => GeoidAreaType::County,
        7 | 10 => GeoidAreaType::Cousub,
        _ => GeoidAreaType::Unknown,
    }
}

/// Parse a GEOID into its component FIPS parts.
pub fn parse_geoid(raw_geoid: GeoidInput) -> ParsedGeoid {
    let raw = match raw_geoid {
        GeoidInput::Num(n) => n.to_string(),
        GeoidInput::Str(s) => s.to_string(),
    };
    let norm = normalize_geoid(raw_geoid);
    let area_type = get_area_type(raw_geoid);

    match area_type {
        GeoidAreaType::State => ParsedGeoid {
            raw,
            area_type,
            state_code: norm,
            county_code: None,
            cousub_code: None,
            full_county_geoid: None,
            full_cousub_geoid: None,
            is_valid: true,
        },
        GeoidAreaType::County => {
            let state_code = norm[0..2].to_string();
            let county_code = norm[2..5].to_string();
            ParsedGeoid {
                raw,
                area_type,
                state_code,
                county_code: Some(county_code),
                cousub_code: None,
                full_county_geoid: Some(norm),
                full_cousub_geoid: None,
                is_valid: true,
            }
        }
        GeoidAreaType::Cousub => {
            let state_code = norm[0..2].to_string();
            let county_code = norm[2..5].to_string();
            let cousub_code = norm[5..].to_string();
            ParsedGeoid {
                raw,
                area_type,
                state_code: state_code.clone(),
                county_code: Some(county_code.clone()),
                cousub_code: Some(cousub_code),
                full_county_geoid: Some(format!("{state_code}{county_code}")),
                full_cousub_geoid: Some(norm),
                is_valid: true,
            }
        }
        GeoidAreaType::Unknown => ParsedGeoid {
            raw,
            area_type,
            state_code: norm.get(0..2).unwrap_or(&norm).to_string(),
            county_code: None,
            cousub_code: None,
            full_county_geoid: None,
            full_cousub_geoid: None,
            is_valid: false,
        },
    }
}

/// The ordered lookup hierarchy for a target GEOID, from target to parent
/// state. E.g. for the 10-digit `"4820192975"`: `["4820192975", "48201",
/// "48"]`.
pub fn get_geoid_hierarchy(geoid: GeoidInput) -> Vec<String> {
    let parsed = parse_geoid(geoid);
    if !parsed.is_valid {
        let norm = normalize_geoid(geoid);
        return if norm.is_empty() { vec![] } else { vec![norm] };
    }

    let mut hierarchy = Vec::new();
    if let Some(full_cousub) = parsed.full_cousub_geoid {
        hierarchy.push(full_cousub);
    }
    if let Some(full_county) = parsed.full_county_geoid {
        hierarchy.push(full_county);
    }
    if !parsed.state_code.is_empty() {
        hierarchy.push(parsed.state_code);
    }
    hierarchy
}

/// Format a normalized GEOID into its hyphenated standard representation
/// (e.g. `"48-201-92975"`).
pub fn format_geoid(geoid: GeoidInput) -> String {
    let parsed = parse_geoid(geoid);
    if !parsed.is_valid {
        return parsed.raw;
    }
    match parsed.area_type {
        GeoidAreaType::State => parsed.state_code,
        GeoidAreaType::County => format!(
            "{}-{}",
            parsed.state_code,
            parsed.county_code.unwrap_or_default()
        ),
        GeoidAreaType::Cousub => format!(
            "{}-{}-{}",
            parsed.state_code,
            parsed.county_code.unwrap_or_default(),
            parsed.cousub_code.unwrap_or_default()
        ),
        GeoidAreaType::Unknown => parsed.raw,
    }
}

/// Whether a GEOID is a valid 2, 5, or 10-digit code.
pub fn is_valid_geoid(geoid: GeoidInput) -> bool {
    parse_geoid(geoid).is_valid
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_a_4_digit_county_code_with_a_leading_zero() {
        assert_eq!(normalize_geoid(GeoidInput::Str("6037")), "06037");
        assert_eq!(normalize_geoid(GeoidInput::Num(6037)), "06037");
    }

    #[test]
    fn classifies_state_county_and_cousub_by_digit_length() {
        assert_eq!(get_area_type(GeoidInput::Str("48")), GeoidAreaType::State);
        assert_eq!(
            get_area_type(GeoidInput::Str("48201")),
            GeoidAreaType::County
        );
        assert_eq!(
            get_area_type(GeoidInput::Str("4820192975")),
            GeoidAreaType::Cousub
        );
        assert_eq!(
            get_area_type(GeoidInput::Str("123")),
            GeoidAreaType::Unknown
        );
    }

    #[test]
    fn parses_a_cousub_geoid_into_its_fips_components() {
        let parsed = parse_geoid(GeoidInput::Str("4820192975"));
        assert!(parsed.is_valid);
        assert_eq!(parsed.state_code, "48");
        assert_eq!(parsed.county_code.as_deref(), Some("201"));
        assert_eq!(parsed.cousub_code.as_deref(), Some("92975"));
        assert_eq!(parsed.full_county_geoid.as_deref(), Some("48201"));
        assert_eq!(parsed.full_cousub_geoid.as_deref(), Some("4820192975"));
    }

    #[test]
    fn an_invalid_geoid_reports_not_valid() {
        let parsed = parse_geoid(GeoidInput::Str("123"));
        assert!(!parsed.is_valid);
    }

    #[test]
    fn hierarchy_is_ordered_from_narrowest_to_broadest() {
        let hierarchy = get_geoid_hierarchy(GeoidInput::Str("4820192975"));
        assert_eq!(hierarchy, vec!["4820192975", "48201", "48"]);

        let county_hierarchy = get_geoid_hierarchy(GeoidInput::Str("48201"));
        assert_eq!(county_hierarchy, vec!["48201", "48"]);

        let state_hierarchy = get_geoid_hierarchy(GeoidInput::Str("48"));
        assert_eq!(state_hierarchy, vec!["48"]);
    }

    #[test]
    fn formats_each_area_type_hyphenated() {
        assert_eq!(format_geoid(GeoidInput::Str("48")), "48");
        assert_eq!(format_geoid(GeoidInput::Str("48201")), "48-201");
        assert_eq!(format_geoid(GeoidInput::Str("4820192975")), "48-201-92975");
    }

    #[test]
    fn is_valid_geoid_rejects_malformed_codes() {
        assert!(is_valid_geoid(GeoidInput::Str("48")));
        // "4" is a single digit, so normalization pads it to "04" (a valid
        // 2-digit state code) — matching the TS original's own
        // `normalizeGeoid` padding behavior. A genuinely malformed length
        // (3 digits: not 1, 2, 4, 5, 7, 9, or 10) stays invalid.
        assert!(!is_valid_geoid(GeoidInput::Str("123")));
    }
}
