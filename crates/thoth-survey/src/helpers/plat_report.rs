//! Text/CSV formatting for a [`crate::survey::SurveyReport`] — the export
//! half of the plat pipeline (signed deltas, DMS text, CSV cell quoting,
//! and the course-table CSV itself). Direct port of
//! `packages/domain/src/survey/helpers/platReportHelpers.ts`.

use crate::fmt_utils::locale_fixed;
use crate::survey::{format_dms, SurveyReport};

/// Format a signed value with a leading `+`/`−` (U+2212 MINUS SIGN, not the
/// ASCII hyphen — matching the TS original's literal `` `−${s}` ``) and
/// thousands-grouped fixed decimals.
pub fn signed(value: f64, digits: usize) -> String {
    let factor = 10f64.powi(digits as i32);
    let rounded = (value * factor).round() / factor;
    let magnitude = locale_fixed(rounded.abs(), digits);
    if rounded < 0.0 {
        format!("\u{2212}{magnitude}")
    } else {
        format!("+{magnitude}")
    }
}

/// Format a degrees/minutes/seconds triple as e.g. `90°00′00″` — identical
/// to [`crate::survey::format_dms`]; re-exported under this module's name
/// for parity with the TS file's own local `dmsText` helper.
pub fn dms_text(a: &crate::bearing::Dms) -> String {
    format_dms(a)
}

/// Quote a CSV cell if it contains a comma, quote, or newline (doubling any
/// embedded quotes), per RFC 4180.
pub fn csv_cell(value: &str) -> String {
    if value.contains(['"', ',', '\n']) {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

/// A safe filename slug, falling back to `"tract"` — identical helper to
/// [`crate::helpers::plat_drawing::slug`], duplicated here because the TS
/// original defines its own local copy in this file too.
pub fn slug(name: &str) -> String {
    crate::helpers::plat_drawing::slug(name)
}

/// Generate the course table as CSV text: course, from/to labels, bearing,
/// distance, latitude, departure — one row per course, header included.
pub fn generate_courses_csv(report: &SurveyReport, unit_label: &str) -> String {
    let mut rows: Vec<Vec<String>> = vec![vec![
        "Course".to_string(),
        "From".to_string(),
        "To".to_string(),
        "Bearing".to_string(),
        format!("Distance ({unit_label})"),
        format!("Latitude ({unit_label})"),
        format!("Departure ({unit_label})"),
    ]];
    for c in &report.courses {
        rows.push(vec![
            c.index.to_string(),
            c.from_label.clone(),
            c.to_label.clone(),
            c.bearing_text.clone(),
            format!("{:.2}", c.distance),
            format!("{:.2}", c.latitude),
            format!("{:.2}", c.departure),
        ]);
    }
    rows.iter()
        .map(|row| {
            row.iter()
                .map(|cell| csv_cell(cell))
                .collect::<Vec<_>>()
                .join(",")
        })
        .collect::<Vec<_>>()
        .join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_spatial::{Point, SpatialContext, Unit};

    #[test]
    fn signed_prefixes_with_unicode_minus_or_plus() {
        assert_eq!(signed(5.0, 2), "+5.00");
        assert_eq!(signed(-5.0, 2), "\u{2212}5.00");
        assert_eq!(signed(0.0, 2), "+0.00");
    }

    #[test]
    fn csv_cell_quotes_special_characters() {
        assert_eq!(csv_cell("plain"), "plain");
        assert_eq!(csv_cell("a,b"), "\"a,b\"");
        assert_eq!(csv_cell("a\"b"), "\"a\"\"b\"");
        assert_eq!(csv_cell("a\nb"), "\"a\nb\"");
    }

    #[test]
    fn slug_matches_plat_drawing_variant() {
        assert_eq!(slug("Lot 7!"), "lot-7");
        assert_eq!(slug(""), "tract");
    }

    #[test]
    fn generates_a_course_csv_with_header_and_one_row_per_course() {
        let spatial = SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: Unit::Meters,
            scale: 1.0,
        };
        let square = vec![
            Point::new(0.0, 0.0),
            Point::new(100.0, 0.0),
            Point::new(100.0, 100.0),
            Point::new(0.0, 100.0),
        ];
        let report = crate::survey::survey_report(&square, &spatial, None);
        let csv = generate_courses_csv(&report, "m");
        let lines: Vec<&str> = csv.lines().collect();
        assert_eq!(lines.len(), 5); // header + 4 courses
        assert!(lines[0].starts_with("Course,From,To,Bearing"));
    }
}
