//! COGO (coordinate geometry) point management — ASCII import, point
//! groups, and their display-style resolution. Rust port of
//! `packages/domain/src/survey/points.ts` (REQ-001…REQ-012,
//! REQ-101…REQ-108).
//!
//! Note on parity with `types/points.ts`: that file declares a second,
//! slightly different `CogoPoint`/`PointGroupConfig` shape that is never
//! actually imported by `points.ts` itself (the working module defines its
//! own inline interfaces). This port follows `points.ts`'s real, exercised
//! shape — the one below — since that is the one every test and caller
//! actually uses.

use serde::{Deserialize, Serialize};

/// A single COGO point: a numbered survey point with northing/easting,
/// elevation, and description.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CogoPoint {
    pub id: String,
    pub point_number: i64,
    pub northing: f64,
    pub easting: f64,
    pub elevation: f64,
    pub raw_description: String,
    pub full_description: Option<String>,
    /// `"<none>"` or a custom point-style id.
    pub point_style: Option<String>,
    /// `"<none>"` or a custom label-style id.
    pub label_style: Option<String>,
    pub point_group_id: Option<String>,
    pub rgb_color: Option<RgbColor>,
    pub classification_tag: Option<String>,
}

/// An RGB color tag on an imported point (REQ-102, REQ-105).
///
/// Stored as signed integers so a malformed input token can fail to parse
/// without needing to represent `NaN` (unlike the TS `number`, which
/// propagates `NaN` for an unparsable channel); a channel that fails to
/// parse falls back to `255`, matching the fallback the parser already
/// applies to a *missing* channel token. This is a deliberate, documented
/// simplification — the fallback carries no surveying meaning either way.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct RgbColor {
    pub r: i32,
    pub g: i32,
    pub b: i32,
}

/// ASCII point-file column layouts (REQ-101, REQ-102).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PointFileFormat {
    /// Point, Northing, Easting, Elevation, Description.
    Pnezd,
    /// Point, Easting, Northing, Elevation, Description.
    Penzd,
    /// Easting, Northing, Elevation, Red, Green, Blue.
    XyzRgb,
    /// Point, Northing, Easting.
    Pne,
    /// Point, Northing, Easting, Elevation.
    Pnez,
}

impl PointFileFormat {
    fn code(self) -> &'static str {
        match self {
            PointFileFormat::Pnezd => "PNEZD",
            PointFileFormat::Penzd => "PENZD",
            PointFileFormat::XyzRgb => "XYZ_RGB",
            PointFileFormat::Pne => "PNE",
            PointFileFormat::Pnez => "PNEZ",
        }
    }
}

/// The field delimiter in an ASCII point file.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TextDelimiter {
    Comma,
    Space,
}

impl TextDelimiter {
    fn split(self, line: &str) -> Vec<&str> {
        match self {
            TextDelimiter::Space => line.split_whitespace().collect(),
            TextDelimiter::Comma => line.split(',').collect(),
        }
    }
}

/// Scale/rotate/translate transform applied to imported coordinates
/// (REQ-104). Rotation is applied before translation, matching the source.
#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
pub struct CoordinateTransformationOptions {
    pub scale_factor_x: Option<f64>,
    pub scale_factor_y: Option<f64>,
    pub rotation_angle_deg: Option<f64>,
    pub translation_x: Option<f64>,
    pub translation_y: Option<f64>,
}

/// Advanced point-import knobs layered on top of the base parse
/// (REQ-101…REQ-105).
#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
pub struct AdvancedPointImportOptions {
    pub elevation_adjustment_ft: Option<f64>,
    pub coordinate_transformation: Option<CoordinateTransformationOptions>,
    pub expand_attributes: bool,
    pub filter_format: Option<PointFileFormat>,
}

/// A preview of an about-to-be-imported ASCII point file.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ImportPreviewResult {
    pub format: PointFileFormat,
    pub delimiter: TextDelimiter,
    pub headers: Vec<String>,
    pub sample_rows: Vec<Vec<String>>,
    pub total_parsed: usize,
}

/// A query-builder rule for automatic point-group membership
/// (REQ-106…REQ-108).
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
pub struct PointGroupQueryRule {
    pub full_description_pattern: Option<String>,
    pub elevation_min: Option<f64>,
    pub elevation_max: Option<f64>,
    pub specific_elevations: Vec<f64>,
}

/// A named, styled, priority-ordered set of points.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CogoPointGroup {
    pub id: String,
    pub name: String,
    pub is_default: bool,
    pub is_deletable: bool,
    /// `"<none>"` or a style name.
    pub point_style: String,
    /// `"<none>"` or a style name.
    pub label_style: String,
    /// Wildcard patterns, e.g. `["TREE*", "MON*"]`.
    pub description_matching_wildcards: Vec<String>,
    pub manual_point_numbers: Vec<i64>,
    /// Range strings, e.g. `["1-100", "200-250"]`.
    pub point_ranges: Vec<String>,
    /// Lower number = higher priority.
    pub priority: i32,
    pub override_description_keys: bool,
    pub query_rules: Vec<PointGroupQueryRule>,
}

/// Parse a leading run of an optional sign then digits, JS `parseInt`
/// style: stops at (rather than rejects on) the first non-digit, and
/// returns `None` only when there is no leading digit at all (JS `NaN`).
fn js_parse_int(s: &str) -> Option<i64> {
    let s = s.trim_start();
    let mut chars = s.chars().peekable();
    let mut out = String::new();
    if let Some(&c) = chars.peek() {
        if c == '+' || c == '-' {
            out.push(c);
            chars.next();
        }
    }
    let mut any_digit = false;
    for c in chars {
        if c.is_ascii_digit() {
            out.push(c);
            any_digit = true;
        } else {
            break;
        }
    }
    if !any_digit {
        return None;
    }
    out.parse::<i64>().ok()
}

/// JS `parseFloat` style: leading sign, digits, optional `.digits`, optional
/// exponent; stops at the first character that doesn't extend the number.
/// Returns `None` when there is no leading numeric run at all (JS `NaN`).
fn js_parse_float(s: &str) -> Option<f64> {
    let s = s.trim_start();
    let chars: Vec<char> = s.chars().collect();
    let mut i = 0usize;
    if i < chars.len() && (chars[i] == '+' || chars[i] == '-') {
        i += 1;
    }
    let mut any_digit = false;
    while i < chars.len() && chars[i].is_ascii_digit() {
        i += 1;
        any_digit = true;
    }
    if i < chars.len() && chars[i] == '.' {
        i += 1;
        while i < chars.len() && chars[i].is_ascii_digit() {
            i += 1;
            any_digit = true;
        }
    }
    if !any_digit {
        return None;
    }
    let mut end = i;
    if end < chars.len() && (chars[end] == 'e' || chars[end] == 'E') {
        let mut k = end + 1;
        if k < chars.len() && (chars[k] == '+' || chars[k] == '-') {
            k += 1;
        }
        let exp_start = k;
        while k < chars.len() && chars[k].is_ascii_digit() {
            k += 1;
        }
        if k > exp_start {
            end = k;
        }
    }
    let slice: String = chars[0..end].iter().collect();
    slice.parse::<f64>().ok()
}

/// Parse an ASCII COGO point file (REQ-001…REQ-005, REQ-101…REQ-105).
///
/// Malformed rows (fewer than 3 fields, or a non-numeric leading point
/// number outside `XyzRgb`) are treated as header/noise lines and skipped —
/// mirroring the TypeScript original rather than failing the whole import.
pub fn parse_ascii_point_file(
    content: &str,
    format: PointFileFormat,
    delimiter: TextDelimiter,
    target_point_group_id: Option<&str>,
    options: Option<&AdvancedPointImportOptions>,
) -> Vec<CogoPoint> {
    let lines: Vec<&str> = content
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty())
        .collect();

    let mut points = Vec::new();
    let mut p_count: i64 = 1;

    for line in lines {
        let tokens = delimiter.split(line);
        if tokens.len() < 3 {
            continue;
        }

        let p_num = match js_parse_int(tokens[0]) {
            Some(n) => n,
            None => {
                if format == PointFileFormat::XyzRgb {
                    p_count
                } else {
                    continue; // header line
                }
            }
        };

        let mut northing;
        let mut easting;
        let mut elevation = 0.0;
        let mut raw_desc = String::new();
        let mut rgb_color = None;

        match format {
            PointFileFormat::Pnezd => {
                northing = tokens.get(1).and_then(|t| js_parse_float(t)).unwrap_or(0.0);
                easting = tokens.get(2).and_then(|t| js_parse_float(t)).unwrap_or(0.0);
                elevation = tokens.get(3).and_then(|t| js_parse_float(t)).unwrap_or(0.0);
                raw_desc = tokens.get(4..).unwrap_or(&[]).join(" ").trim().to_string();
            }
            PointFileFormat::Penzd => {
                easting = tokens.get(1).and_then(|t| js_parse_float(t)).unwrap_or(0.0);
                northing = tokens.get(2).and_then(|t| js_parse_float(t)).unwrap_or(0.0);
                elevation = tokens.get(3).and_then(|t| js_parse_float(t)).unwrap_or(0.0);
                raw_desc = tokens.get(4..).unwrap_or(&[]).join(" ").trim().to_string();
            }
            PointFileFormat::Pne => {
                northing = tokens.get(1).and_then(|t| js_parse_float(t)).unwrap_or(0.0);
                easting = tokens.get(2).and_then(|t| js_parse_float(t)).unwrap_or(0.0);
            }
            PointFileFormat::Pnez => {
                northing = tokens.get(1).and_then(|t| js_parse_float(t)).unwrap_or(0.0);
                easting = tokens.get(2).and_then(|t| js_parse_float(t)).unwrap_or(0.0);
                elevation = tokens.get(3).and_then(|t| js_parse_float(t)).unwrap_or(0.0);
            }
            PointFileFormat::XyzRgb => {
                easting = tokens
                    .first()
                    .and_then(|t| js_parse_float(t))
                    .unwrap_or(0.0);
                northing = tokens.get(1).and_then(|t| js_parse_float(t)).unwrap_or(0.0);
                elevation = tokens.get(2).and_then(|t| js_parse_float(t)).unwrap_or(0.0);
                let r = tokens.get(3).and_then(|t| js_parse_int(t)).unwrap_or(255) as i32;
                let g = tokens.get(4).and_then(|t| js_parse_int(t)).unwrap_or(255) as i32;
                let b = tokens.get(5).and_then(|t| js_parse_int(t)).unwrap_or(255) as i32;
                rgb_color = Some(RgbColor { r, g, b });
                raw_desc = format!("RGB({r},{g},{b})");
            }
        }

        if let Some(opts) = options {
            if let Some(adj) = opts.elevation_adjustment_ft {
                elevation += adj;
            }
            if let Some(t) = &opts.coordinate_transformation {
                let mut x = easting * t.scale_factor_x.unwrap_or(1.0);
                let mut y = northing * t.scale_factor_y.unwrap_or(1.0);
                if let Some(rot) = t.rotation_angle_deg {
                    if rot != 0.0 {
                        let rad = rot.to_radians();
                        let rx = x * rad.cos() - y * rad.sin();
                        let ry = x * rad.sin() + y * rad.cos();
                        x = rx;
                        y = ry;
                    }
                }
                x += t.translation_x.unwrap_or(0.0);
                y += t.translation_y.unwrap_or(0.0);
                easting = x;
                northing = y;
            }
        }

        let classification_tag = options
            .filter(|o| o.expand_attributes)
            .map(|_| format!("CLASS_{}_{p_num}", format.code()));

        points.push(CogoPoint {
            id: format!("pt-{p_num}"),
            point_number: p_num,
            northing,
            easting,
            elevation,
            raw_description: raw_desc.clone(),
            full_description: Some(raw_desc),
            point_style: None,
            label_style: None,
            point_group_id: target_point_group_id.map(str::to_string),
            rgb_color,
            classification_tag,
        });

        p_count += 1;
    }

    points
}

/// Generate a lightweight preview (headers + first 10 rows) of an
/// about-to-be-imported ASCII point file, without fully parsing it.
pub fn generate_import_preview(
    content: &str,
    format: PointFileFormat,
    delimiter: TextDelimiter,
) -> ImportPreviewResult {
    let lines: Vec<&str> = content
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty())
        .collect();
    let sample_rows: Vec<Vec<String>> = lines
        .iter()
        .take(10)
        .map(|line| {
            delimiter
                .split(line)
                .into_iter()
                .map(str::to_string)
                .collect()
        })
        .collect();

    let headers: Vec<String> = match format {
        PointFileFormat::Pnezd => vec![
            "Point Number",
            "Northing",
            "Easting",
            "Elevation",
            "Raw Description",
        ],
        PointFileFormat::Penzd => vec![
            "Point Number",
            "Easting",
            "Northing",
            "Elevation",
            "Raw Description",
        ],
        PointFileFormat::Pne => vec!["Point Number", "Northing", "Easting"],
        PointFileFormat::Pnez => vec!["Point Number", "Northing", "Easting", "Elevation"],
        PointFileFormat::XyzRgb => vec![
            "Easting (X)",
            "Northing (Y)",
            "Elevation (Z)",
            "Red",
            "Green",
            "Blue",
        ],
    }
    .into_iter()
    .map(str::to_string)
    .collect();

    ImportPreviewResult {
        format,
        delimiter,
        headers,
        sample_rows,
        total_parsed: lines.len(),
    }
}

/// Case-insensitive glob match supporting `*` (any run, including empty)
/// and `?` (any one character) anywhere in the pattern — the classic
/// two-pointer wildcard-matching algorithm, chosen as a dependency-free,
/// exactly-equivalent replacement for the TS original's
/// `new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i")`
/// for every pattern made only of literal characters, `*`, and `?` (the
/// wildcards point groups actually use, e.g. `"TR*"`, `"MON*"`, `"*"`). A
/// pattern containing a real regex metacharacter (e.g. `.` or `+`) would be
/// interpreted literally here but specially by `RegExp` in the original —
/// documented as a deliberate divergence in `../GAPS.md` since no shipped
/// pattern relies on that.
fn glob_match_case_insensitive(value: &str, pattern: &str) -> bool {
    let v: Vec<char> = value.to_uppercase().chars().collect();
    let p: Vec<char> = pattern.to_uppercase().chars().collect();

    let (vn, pn) = (v.len(), p.len());
    let mut vi = 0usize;
    let mut pi = 0usize;
    let mut star_pi: Option<usize> = None;
    let mut star_vi = 0usize;

    while vi < vn {
        if pi < pn && (p[pi] == '?' || p[pi] == v[vi]) {
            vi += 1;
            pi += 1;
        } else if pi < pn && p[pi] == '*' {
            star_pi = Some(pi);
            star_vi = vi;
            pi += 1;
        } else if let Some(sp) = star_pi {
            pi = sp + 1;
            star_vi += 1;
            vi = star_vi;
        } else {
            return false;
        }
    }
    while pi < pn && p[pi] == '*' {
        pi += 1;
    }
    pi == pn
}

/// Manages the priority-ordered set of [`CogoPointGroup`]s a project
/// defines, including the built-in `_All Points` and `ALL OFF` groups.
#[derive(Debug, Clone, PartialEq)]
pub struct PointGroupManager {
    groups: Vec<CogoPointGroup>,
}

impl Default for PointGroupManager {
    fn default() -> Self {
        Self::new()
    }
}

impl PointGroupManager {
    /// A manager seeded with the two built-in groups every project has.
    pub fn new() -> Self {
        Self {
            groups: vec![
                CogoPointGroup {
                    id: "grp-all-points".to_string(),
                    name: "_All Points".to_string(),
                    is_default: true,
                    is_deletable: false,
                    point_style: "Standard".to_string(),
                    label_style: "Point-Elevation-Description".to_string(),
                    description_matching_wildcards: vec!["*".to_string()],
                    manual_point_numbers: Vec::new(),
                    point_ranges: Vec::new(),
                    priority: 999,
                    override_description_keys: false,
                    query_rules: Vec::new(),
                },
                CogoPointGroup {
                    id: "grp-all-off".to_string(),
                    name: "ALL OFF".to_string(),
                    is_default: false,
                    is_deletable: true,
                    point_style: "<none>".to_string(),
                    label_style: "<none>".to_string(),
                    description_matching_wildcards: Vec::new(),
                    manual_point_numbers: Vec::new(),
                    point_ranges: Vec::new(),
                    priority: 0,
                    override_description_keys: true,
                    query_rules: Vec::new(),
                },
            ],
        }
    }

    /// All groups, ascending by [`CogoPointGroup::priority`] (lower =
    /// higher priority).
    pub fn groups(&self) -> Vec<CogoPointGroup> {
        let mut sorted = self.groups.clone();
        sorted.sort_by_key(|g| g.priority);
        sorted
    }

    /// Add a new group, forcing it deletable (the two built-ins never are).
    pub fn add_group(&mut self, group: CogoPointGroup) -> CogoPointGroup {
        let new_group = CogoPointGroup {
            is_deletable: true,
            ..group
        };
        self.groups.push(new_group.clone());
        new_group
    }

    /// `true` if `point` belongs to `group` by manual number, a point-number
    /// range, a description wildcard, or a query-builder rule.
    pub fn is_point_in_group(&self, point: &CogoPoint, group: &CogoPointGroup) -> bool {
        if group.manual_point_numbers.contains(&point.point_number) {
            return true;
        }
        for range_str in &group.point_ranges {
            if Self::matches_range(point.point_number, range_str) {
                return true;
            }
        }
        for wildcard in &group.description_matching_wildcards {
            if Self::match_wildcard(&point.raw_description, wildcard) {
                return true;
            }
        }
        for rule in &group.query_rules {
            let mut rule_matches = true;
            if let (Some(pattern), Some(full)) =
                (&rule.full_description_pattern, &point.full_description)
            {
                if !Self::match_wildcard(full, pattern) {
                    rule_matches = false;
                }
            }
            if let Some(min) = rule.elevation_min {
                if point.elevation < min {
                    rule_matches = false;
                }
            }
            if let Some(max) = rule.elevation_max {
                if point.elevation > max {
                    rule_matches = false;
                }
            }
            if !rule.specific_elevations.is_empty()
                && !rule
                    .specific_elevations
                    .iter()
                    .any(|e| (e - point.elevation).abs() < 1e-3)
            {
                rule_matches = false;
            }
            if rule_matches {
                return true;
            }
        }
        false
    }

    /// The effective point/label style for `point`: the highest-priority
    /// matching group's style, unless that group defers to description-key
    /// defaults (`override_description_keys == false`) and defaults were
    /// supplied.
    pub fn effective_styles(
        &self,
        point: &CogoPoint,
        description_key_default_styles: Option<(&str, &str)>,
    ) -> (String, String) {
        for grp in self.groups() {
            if self.is_point_in_group(point, &grp) {
                return match description_key_default_styles {
                    Some((p, l)) if !grp.override_description_keys => {
                        (p.to_string(), l.to_string())
                    }
                    _ => (grp.point_style, grp.label_style),
                };
            }
        }
        match description_key_default_styles {
            Some((p, l)) => (p.to_string(), l.to_string()),
            None => ("Standard".to_string(), "Standard".to_string()),
        }
    }

    fn matches_range(p_num: i64, range_str: &str) -> bool {
        for part in range_str.split(',').map(str::trim) {
            if let Some((start, end)) = part.split_once('-') {
                if let (Ok(s), Ok(e)) = (start.trim().parse::<i64>(), end.trim().parse::<i64>()) {
                    if p_num >= s && p_num <= e {
                        return true;
                    }
                }
            } else if let Ok(v) = part.parse::<i64>() {
                if v == p_num {
                    return true;
                }
            }
        }
        false
    }

    /// Case-insensitive glob match (`*`, `?`); see
    /// [`glob_match_case_insensitive`]. Distinct from — and more permissive
    /// than — [`crate::description_keys::match_wildcard`], which only
    /// supports a single trailing `*`.
    fn match_wildcard(value: &str, pattern: &str) -> bool {
        if pattern == "*" {
            return true;
        }
        glob_match_case_insensitive(value, pattern)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_point(desc: &str, elevation: f64) -> CogoPoint {
        CogoPoint {
            id: "pt-1".to_string(),
            point_number: 1,
            northing: 0.0,
            easting: 0.0,
            elevation,
            raw_description: desc.to_string(),
            full_description: Some(desc.to_string()),
            point_style: None,
            label_style: None,
            point_group_id: None,
            rgb_color: None,
            classification_tag: None,
        }
    }

    #[test]
    fn parses_pnezd_rows_with_descriptions() {
        let pts = parse_ascii_point_file(
            "1,100.0,200.0,10.5,TREE OAK\n2,150.0,250.0,11.0,MON IRON",
            PointFileFormat::Pnezd,
            TextDelimiter::Comma,
            None,
            None,
        );
        assert_eq!(pts.len(), 2);
        assert_eq!(pts[0].northing, 100.0);
        assert_eq!(pts[0].easting, 200.0);
        assert_eq!(pts[0].elevation, 10.5);
        assert_eq!(pts[0].raw_description, "TREE OAK");
    }

    #[test]
    fn skips_header_lines_and_short_rows() {
        let pts = parse_ascii_point_file(
            "PNT,N,E,Z,DESC\n1,100.0,200.0,10.5,TREE\ntoo,short",
            PointFileFormat::Pnezd,
            TextDelimiter::Comma,
            None,
            None,
        );
        assert_eq!(pts.len(), 1);
    }

    #[test]
    fn xyz_rgb_parses_color_and_uses_the_leading_column_as_easting() {
        // XYZ_RGB's first column doubles as the point-number probe *and*
        // (moments later, unconditionally) the easting value — an ordinary
        // numeric-looking token like "100.0" parses fine as a leading
        // integer (`100`), so it becomes the point number too. This is the
        // TS original's actual (slightly odd) behavior, not a bug.
        let pts = parse_ascii_point_file(
            "100.0,200.0,10.0,255,0,0\n110.0,210.0,11.0,0,255,0",
            PointFileFormat::XyzRgb,
            TextDelimiter::Comma,
            None,
            None,
        );
        assert_eq!(pts.len(), 2);
        assert_eq!(pts[0].point_number, 100);
        assert_eq!(pts[0].easting, 100.0);
        assert_eq!(pts[1].point_number, 110);
        assert_eq!(pts[0].rgb_color, Some(RgbColor { r: 255, g: 0, b: 0 }));
    }

    #[test]
    fn xyz_rgb_falls_back_to_sequential_numbering_for_a_non_numeric_leading_column() {
        // Only when the leading column can't be parsed as an integer at all
        // (a genuinely malformed/non-numeric X value) does the sequential
        // `p_count` fallback kick in.
        let pts = parse_ascii_point_file(
            "abc,200.0,10.0,255,0,0",
            PointFileFormat::XyzRgb,
            TextDelimiter::Comma,
            None,
            None,
        );
        assert_eq!(pts.len(), 1);
        assert_eq!(pts[0].point_number, 1);
        assert_eq!(pts[0].easting, 0.0); // "abc" also fails parseFloat, defaults to 0.
    }

    #[test]
    fn applies_elevation_adjustment_and_coordinate_transformation() {
        let options = AdvancedPointImportOptions {
            elevation_adjustment_ft: Some(5.0),
            coordinate_transformation: Some(CoordinateTransformationOptions {
                translation_x: Some(1000.0),
                translation_y: Some(2000.0),
                ..Default::default()
            }),
            ..Default::default()
        };
        let pts = parse_ascii_point_file(
            "1,100.0,200.0,10.0,TREE",
            PointFileFormat::Pnezd,
            TextDelimiter::Comma,
            None,
            Some(&options),
        );
        assert_eq!(pts[0].elevation, 15.0);
        assert_eq!(pts[0].easting, 1200.0);
        assert_eq!(pts[0].northing, 2100.0);
    }

    #[test]
    fn space_delimited_pne_parses_three_fields() {
        let pts = parse_ascii_point_file(
            "1 100.0 200.0",
            PointFileFormat::Pne,
            TextDelimiter::Space,
            None,
            None,
        );
        assert_eq!(pts.len(), 1);
        assert_eq!(pts[0].elevation, 0.0);
    }

    #[test]
    fn import_preview_reports_headers_and_sample_rows() {
        let preview = generate_import_preview(
            "1,100.0,200.0,10.0,TREE\n2,110.0,210.0,11.0,MON",
            PointFileFormat::Pnezd,
            TextDelimiter::Comma,
        );
        assert_eq!(preview.total_parsed, 2);
        assert_eq!(preview.headers.len(), 5);
        assert_eq!(preview.sample_rows.len(), 2);
    }

    #[test]
    fn default_groups_seed_all_points_and_all_off() {
        let mgr = PointGroupManager::new();
        let groups = mgr.groups();
        assert_eq!(groups.len(), 2);
        // ALL OFF has priority 0, so it sorts first.
        assert_eq!(groups[0].name, "ALL OFF");
        assert_eq!(groups[1].name, "_All Points");
    }

    #[test]
    fn wildcard_glob_matches_prefix_and_single_char() {
        assert!(glob_match_case_insensitive("TREE-OAK", "TR*"));
        assert!(glob_match_case_insensitive("tree-oak", "TR*"));
        assert!(!glob_match_case_insensitive("MON-IRON", "TR*"));
        assert!(glob_match_case_insensitive("MH1", "MH?"));
        assert!(!glob_match_case_insensitive("MH12", "MH?"));
    }

    #[test]
    fn point_matches_group_by_manual_number_range_or_wildcard() {
        let mgr = PointGroupManager::new();
        let by_number = CogoPointGroup {
            manual_point_numbers: vec![7],
            ..blank_group()
        };
        let mut p = sample_point("ANYTHING", 0.0);
        p.point_number = 7;
        assert!(mgr.is_point_in_group(&p, &by_number));

        let by_range = CogoPointGroup {
            point_ranges: vec!["1-10".to_string()],
            ..blank_group()
        };
        assert!(mgr.is_point_in_group(&p, &by_range));

        let by_wildcard = CogoPointGroup {
            description_matching_wildcards: vec!["TREE*".to_string()],
            ..blank_group()
        };
        let tree = sample_point("TREE OAK", 0.0);
        assert!(mgr.is_point_in_group(&tree, &by_wildcard));
    }

    #[test]
    fn query_rule_filters_by_elevation_band() {
        let mgr = PointGroupManager::new();
        let rule_group = CogoPointGroup {
            query_rules: vec![PointGroupQueryRule {
                elevation_min: Some(10.0),
                elevation_max: Some(20.0),
                ..Default::default()
            }],
            ..blank_group()
        };
        assert!(mgr.is_point_in_group(&sample_point("X", 15.0), &rule_group));
        assert!(!mgr.is_point_in_group(&sample_point("X", 25.0), &rule_group));
    }

    #[test]
    fn effective_styles_defers_to_description_keys_when_group_allows() {
        let mut mgr = PointGroupManager::new();
        mgr.add_group(CogoPointGroup {
            id: "grp-tree".to_string(),
            override_description_keys: false,
            description_matching_wildcards: vec!["TREE*".to_string()],
            priority: 5,
            ..blank_group()
        });
        let tree = sample_point("TREE OAK", 0.0);
        let (point_style, label_style) =
            mgr.effective_styles(&tree, Some(("KeyStyle", "KeyLabel")));
        assert_eq!(point_style, "KeyStyle");
        assert_eq!(label_style, "KeyLabel");
    }

    fn blank_group() -> CogoPointGroup {
        CogoPointGroup {
            id: "grp-test".to_string(),
            name: "Test".to_string(),
            is_default: false,
            is_deletable: true,
            point_style: "Standard".to_string(),
            label_style: "Standard".to_string(),
            description_matching_wildcards: Vec::new(),
            manual_point_numbers: Vec::new(),
            point_ranges: Vec::new(),
            priority: 500,
            override_description_keys: true,
            query_rules: Vec::new(),
        }
    }
}
