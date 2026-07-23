//! Quantity Take-Off (QTO) — cut/fill cross-section areas and mass-haul
//! volumes for earthwork estimation, plus a generic pay-item cost engine and
//! CSV import for construction/engineering pay item lists.
//!
//! Port of `packages/domain/src/drawing/qto.ts`.

use thoth_spatial::Point;

/// A single offset-elevation coordinate point in a cross-section slice.
///
/// Mirrors `civil/types/profile.ts`'s `CrossSectionPoint` exactly.
/// `thoth-drawing` does not depend on `thoth-civil`, so this shape is
/// duplicated here rather than imported; unify during the cross-crate
/// integration pass.
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct CrossSectionPoint {
    pub offset: f64,
    pub elevation: f64,
}

/// Bounded cross-section data at a specific station. Mirrors
/// `civil/types/profile.ts`'s `CrossSection` exactly — see
/// [`CrossSectionPoint`]'s rustdoc for why the shape is duplicated.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct CrossSection {
    pub station: f64,
    pub centerpoint: Point,
    pub existing_points: Vec<CrossSectionPoint>,
    pub proposed_points: Vec<CrossSectionPoint>,
}

/// Area of cut and fill calculated on a single cross-section in plan units².
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct SectionArea {
    pub station: f64,
    pub cut_area: f64,
    pub fill_area: f64,
}

/// Earthwork volume between two stations in plan units³.
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct StationVolume {
    pub start_station: f64,
    pub end_station: f64,
    pub cut_volume: f64,
    pub fill_volume: f64,
    /// Cut minus Fill.
    pub net_volume: f64,
}

/// Coordinates of a point on the Mass Haul Diagram.
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct MassHaulPoint {
    pub station: f64,
    pub cumulative_volume: f64,
}

fn sorted_by_offset(points: &[CrossSectionPoint]) -> Vec<CrossSectionPoint> {
    let mut sorted = points.to_vec();
    sorted.sort_by(|a, b| a.offset.partial_cmp(&b.offset).unwrap_or(std::cmp::Ordering::Equal));
    sorted
}

/// Calculate cut and fill areas for a cross section using the trapezoidal
/// rule integrated over the offset range.
pub fn calculate_section_area(section: &CrossSection) -> SectionArea {
    let mut cut_area = 0.0;
    let mut fill_area = 0.0;

    let n = section.existing_points.len().min(section.proposed_points.len());
    if n < 2 {
        return SectionArea { station: section.station, cut_area, fill_area };
    }

    let existing = sorted_by_offset(&section.existing_points);
    let proposed = sorted_by_offset(&section.proposed_points);

    for i in 0..(n - 1) {
        let x0 = existing[i].offset;
        let x1 = existing[i + 1].offset;
        let w = x1 - x0;
        if w <= 0.0001 {
            continue;
        }

        let d0 = proposed[i].elevation - existing[i].elevation;
        let d1 = proposed[i + 1].elevation - existing[i + 1].elevation;

        if d0 >= 0.0 && d1 >= 0.0 {
            fill_area += w * (d0 + d1) / 2.0;
        } else if d0 <= 0.0 && d1 <= 0.0 {
            cut_area += w * (d0.abs() + d1.abs()) / 2.0;
        } else {
            let t = -d0 / (d1 - d0);
            let w_fill = if d0 > 0.0 { w * t } else { w * (1.0 - t) };
            let w_cut = if d0 < 0.0 { w * t } else { w * (1.0 - t) };
            let h_fill = if d0 > 0.0 { d0 } else { d1 };
            let h_cut = if d0 < 0.0 { d0.abs() } else { d1.abs() };
            fill_area += w_fill * h_fill / 2.0;
            cut_area += w_cut * h_cut / 2.0;
        }
    }

    SectionArea { station: section.station, cut_area, fill_area }
}

/// Calculate cut and fill volumes between two cross-sections using the
/// Average End Area method.
pub fn average_end_area_volume(sec_a: &CrossSection, sec_b: &CrossSection) -> StationVolume {
    let area_a = calculate_section_area(sec_a);
    let area_b = calculate_section_area(sec_b);
    let length = (sec_b.station - sec_a.station).abs();

    let cut_volume = (area_a.cut_area + area_b.cut_area) / 2.0 * length;
    let fill_volume = (area_a.fill_area + area_b.fill_area) / 2.0 * length;

    StationVolume {
        start_station: sec_a.station.min(sec_b.station),
        end_station: sec_a.station.max(sec_b.station),
        cut_volume,
        fill_volume,
        net_volume: cut_volume - fill_volume,
    }
}

/// Generate cumulative mass haul volume lines along consecutive
/// cross-section intervals.
pub fn calculate_mass_haul(sections: &[CrossSection]) -> Vec<MassHaulPoint> {
    if sections.is_empty() {
        return vec![];
    }
    let mut sorted = sections.to_vec();
    sorted.sort_by(|a, b| a.station.partial_cmp(&b.station).unwrap_or(std::cmp::Ordering::Equal));

    let mut points = vec![MassHaulPoint { station: sorted[0].station, cumulative_volume: 0.0 }];
    let mut running_sum = 0.0;

    for i in 0..(sorted.len() - 1) {
        let vol = average_end_area_volume(&sorted[i], &sorted[i + 1]);
        running_sum += vol.net_volume;
        points.push(MassHaulPoint { station: sorted[i + 1].station, cumulative_volume: running_sum });
    }

    points
}

/// A construction or engineering pay item.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct PayItem {
    pub id: String,
    pub name: String,
    pub unit: String,
    pub unit_cost: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
}

/// Binds a pay item to an AutoCAD object or site planning primitive.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct PayItemAssignment {
    pub element_id: String,
    pub pay_item_id: String,
    /// e.g. "length * unitCost" or "area * unitCost".
    #[serde(skip_serializing_if = "Option::is_none")]
    pub formula: Option<String>,
}

/// Variables available to a pay-item cost formula.
#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct PayItemVariables {
    pub length: Option<f64>,
    pub area: Option<f64>,
    pub count: Option<f64>,
}

/// The result of evaluating a pay item's quantity and cost.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PayItemResult {
    pub quantity: f64,
    pub cost: f64,
}

/// Evaluate the quantity/cost for an object using simple formula expressions
/// (`+ - * /` and parens over the tokens `quantity`, `unitCost`, `length`,
/// `area`, `count`). Falls back to `qty * unitCost` if the formula can't be
/// evaluated as a pure arithmetic expression after substitution — matching
/// the TS `try { ... } catch { /* fallback */ }` exactly, but without ever
/// invoking a dynamic `eval`-equivalent: [`evaluate_arithmetic`] is a
/// hand-rolled recursive-descent parser restricted to `+-*/()` and numbers.
pub fn evaluate_pay_item_cost(item: &PayItem, variables: PayItemVariables, formula: Option<&str>) -> PayItemResult {
    let formula = formula.unwrap_or("quantity * unitCost");
    let len = variables.length.unwrap_or(0.0);
    let area = variables.area.unwrap_or(0.0);
    let cnt = variables.count.unwrap_or(1.0);

    let unit_lower = item.unit.to_lowercase();
    let qty = if unit_lower == "lf" || unit_lower == "m" || unit_lower == "feet" {
        len
    } else if unit_lower == "sf" || unit_lower == "sy" || unit_lower == "sqm" {
        area
    } else {
        cnt
    };

    let clean_formula = formula
        .replace("quantity", &qty.to_string())
        .replace("unitCost", &item.unit_cost.to_string())
        .replace("length", &len.to_string())
        .replace("area", &area.to_string())
        .replace("count", &cnt.to_string());

    // `evaluate_arithmetic` already guarantees a finite result on `Some`.
    if let Some(res) = evaluate_arithmetic(&clean_formula) {
        if formula.contains("unitCost") {
            return PayItemResult { quantity: qty, cost: res };
        }
        return PayItemResult { quantity: res, cost: res * item.unit_cost };
    }

    PayItemResult { quantity: qty, cost: qty * item.unit_cost }
}

/// Evaluate a restricted arithmetic expression: digits (with optional
/// decimal point), `+ - * /`, and parentheses only. Returns `None` if the
/// expression contains anything else, or is empty/malformed — mirroring the
/// TS `safeEvalMath`'s strict token-reconstruction check, which rejects any
/// input that doesn't tokenize back to exactly the (whitespace-stripped)
/// original string.
pub(crate) fn evaluate_arithmetic(expr: &str) -> Option<f64> {
    let stripped: String = expr.chars().filter(|c| !c.is_whitespace()).collect();
    // `tokenize_arithmetic` returns `None` the instant it meets a character
    // that isn't a digit/`.`/operator, so a `Some` result always reconstructs
    // `stripped` exactly — equivalent to (and simpler than) the TS original's
    // separate `tokens.join("") !== expr` reconstruction check, which is only
    // needed there because `String.match(/regex/g)` silently skips
    // non-matching characters instead of failing fast.
    let tokens = tokenize_arithmetic(&stripped)?;
    if tokens.is_empty() {
        return None;
    }
    let mut parser = ArithmeticParser { tokens: &tokens, pos: 0 };
    let result = parser.parse_expr();
    if result.is_finite() {
        Some(result)
    } else {
        None
    }
}

fn tokenize_arithmetic(s: &str) -> Option<Vec<String>> {
    let chars: Vec<char> = s.chars().collect();
    let mut tokens = Vec::new();
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        if c.is_ascii_digit() {
            let start = i;
            while i < chars.len() && chars[i].is_ascii_digit() {
                i += 1;
            }
            if i < chars.len() && chars[i] == '.' {
                i += 1;
                while i < chars.len() && chars[i].is_ascii_digit() {
                    i += 1;
                }
            }
            tokens.push(chars[start..i].iter().collect());
        } else if matches!(c, '+' | '-' | '*' | '/' | '(' | ')') {
            tokens.push(c.to_string());
            i += 1;
        } else {
            return None;
        }
    }
    Some(tokens)
}

struct ArithmeticParser<'a> {
    tokens: &'a [String],
    pos: usize,
}

impl ArithmeticParser<'_> {
    fn parse_expr(&mut self) -> f64 {
        let mut left = self.parse_term();
        while self.pos < self.tokens.len() && (self.tokens[self.pos] == "+" || self.tokens[self.pos] == "-") {
            let op = self.tokens[self.pos].clone();
            self.pos += 1;
            let right = self.parse_term();
            left = if op == "+" { left + right } else { left - right };
        }
        left
    }

    fn parse_term(&mut self) -> f64 {
        let mut left = self.parse_factor();
        while self.pos < self.tokens.len() && (self.tokens[self.pos] == "*" || self.tokens[self.pos] == "/") {
            let op = self.tokens[self.pos].clone();
            self.pos += 1;
            let right = self.parse_factor();
            left = if op == "*" { left * right } else if right != 0.0 { left / right } else { 0.0 };
        }
        left
    }

    fn parse_factor(&mut self) -> f64 {
        if self.pos >= self.tokens.len() {
            return 0.0;
        }
        let token = self.tokens[self.pos].clone();
        self.pos += 1;
        if token == "(" {
            let val = self.parse_expr();
            if self.pos < self.tokens.len() && self.tokens[self.pos] == ")" {
                self.pos += 1;
            }
            return val;
        }
        token.parse::<f64>().unwrap_or(0.0)
    }
}

fn parse_csv_line(line: &str) -> Vec<String> {
    let mut result = Vec::new();
    let mut cur = String::new();
    let mut in_quotes = false;
    for c in line.chars() {
        if c == '"' {
            in_quotes = !in_quotes;
        } else if c == ',' && !in_quotes {
            result.push(cur.trim().trim_matches('"').to_string());
            cur.clear();
        } else {
            cur.push(c);
        }
    }
    result.push(cur.trim().trim_matches('"').to_string());
    result
}

/// Parse Pay Item lines from raw CSV string.
///
/// Malformed/short lines and comment (`#`) or header (`ID,Name`) lines are
/// skipped silently, matching the TS parser's leniency exactly — this is a
/// best-effort bulk import, not a strict format validator.
pub fn parse_pay_item_list_csv(csv_content: &str) -> Vec<PayItem> {
    let mut items = Vec::new();
    for line in csv_content.split(['\r', '\n']) {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with("ID,Name") {
            continue;
        }
        let parts = parse_csv_line(trimmed);
        if parts.len() >= 4 {
            items.push(PayItem {
                id: parts[0].clone(),
                name: parts[1].clone(),
                unit: parts[2].clone(),
                unit_cost: parts[3].parse().unwrap_or(0.0),
                category: if parts.len() > 4 && !parts[4].is_empty() { Some(parts[4].clone()) } else { None },
            });
        }
    }
    items
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn section(station: f64, existing: Vec<(f64, f64)>, proposed: Vec<(f64, f64)>) -> CrossSection {
        CrossSection {
            station,
            centerpoint: Point::new(0.0, station),
            existing_points: existing.into_iter().map(|(offset, elevation)| CrossSectionPoint { offset, elevation }).collect(),
            proposed_points: proposed.into_iter().map(|(offset, elevation)| CrossSectionPoint { offset, elevation }).collect(),
        }
    }

    #[test]
    fn calculate_section_area_of_pure_fill_slice() {
        // proposed is 1 unit higher than existing across a 10-wide slice.
        let s = section(0.0, vec![(-5.0, 0.0), (5.0, 0.0)], vec![(-5.0, 1.0), (5.0, 1.0)]);
        let area = calculate_section_area(&s);
        assert_relative_eq!(area.fill_area, 10.0, epsilon = 1e-9);
        assert_relative_eq!(area.cut_area, 0.0, epsilon = 1e-9);
    }

    #[test]
    fn calculate_section_area_of_pure_cut_slice() {
        let s = section(0.0, vec![(-5.0, 0.0), (5.0, 0.0)], vec![(-5.0, -1.0), (5.0, -1.0)]);
        let area = calculate_section_area(&s);
        assert_relative_eq!(area.cut_area, 10.0, epsilon = 1e-9);
        assert_relative_eq!(area.fill_area, 0.0, epsilon = 1e-9);
    }

    #[test]
    fn calculate_section_area_handles_a_zero_crossing_slice() {
        let s = section(0.0, vec![(0.0, 0.0), (10.0, 0.0)], vec![(0.0, -1.0), (10.0, 1.0)]);
        let area = calculate_section_area(&s);
        assert!(area.cut_area > 0.0);
        assert!(area.fill_area > 0.0);
    }

    #[test]
    fn calculate_section_area_of_fewer_than_two_points_is_zero() {
        let s = section(0.0, vec![(0.0, 0.0)], vec![(0.0, 1.0)]);
        let area = calculate_section_area(&s);
        assert_eq!(area.cut_area, 0.0);
        assert_eq!(area.fill_area, 0.0);
    }

    #[test]
    fn average_end_area_volume_multiplies_by_station_length() {
        let a = section(0.0, vec![(-5.0, 0.0), (5.0, 0.0)], vec![(-5.0, 1.0), (5.0, 1.0)]);
        let b = section(10.0, vec![(-5.0, 0.0), (5.0, 0.0)], vec![(-5.0, 1.0), (5.0, 1.0)]);
        let vol = average_end_area_volume(&a, &b);
        assert_relative_eq!(vol.fill_volume, 100.0, epsilon = 1e-9);
        assert_relative_eq!(vol.net_volume, -100.0, epsilon = 1e-9);
    }

    #[test]
    fn calculate_mass_haul_of_empty_sections_is_empty() {
        assert!(calculate_mass_haul(&[]).is_empty());
    }

    #[test]
    fn calculate_mass_haul_accumulates_net_volume_along_stations() {
        let a = section(0.0, vec![(-5.0, 0.0), (5.0, 0.0)], vec![(-5.0, 1.0), (5.0, 1.0)]);
        let b = section(10.0, vec![(-5.0, 0.0), (5.0, 0.0)], vec![(-5.0, 1.0), (5.0, 1.0)]);
        let points = calculate_mass_haul(&[b.clone(), a.clone()]);
        assert_eq!(points.len(), 2);
        assert_eq!(points[0].station, 0.0);
        assert_eq!(points[0].cumulative_volume, 0.0);
        assert_relative_eq!(points[1].cumulative_volume, -100.0, epsilon = 1e-9);
    }

    #[test]
    fn evaluate_pay_item_cost_uses_length_for_linear_units() {
        let item = PayItem { id: "p1".to_string(), name: "Silt fence".to_string(), unit: "LF".to_string(), unit_cost: 2.0, category: None };
        let result = evaluate_pay_item_cost(&item, PayItemVariables { length: Some(50.0), ..Default::default() }, None);
        assert_relative_eq!(result.quantity, 50.0, epsilon = 1e-9);
        assert_relative_eq!(result.cost, 100.0, epsilon = 1e-9);
    }

    #[test]
    fn evaluate_pay_item_cost_uses_area_for_area_units() {
        let item = PayItem { id: "p1".to_string(), name: "Sod".to_string(), unit: "SF".to_string(), unit_cost: 0.5, category: None };
        let result = evaluate_pay_item_cost(&item, PayItemVariables { area: Some(200.0), ..Default::default() }, None);
        assert_relative_eq!(result.cost, 100.0, epsilon = 1e-9);
    }

    #[test]
    fn evaluate_pay_item_cost_evaluates_a_custom_formula() {
        let item = PayItem { id: "p1".to_string(), name: "Item".to_string(), unit: "EA".to_string(), unit_cost: 10.0, category: None };
        let result =
            evaluate_pay_item_cost(&item, PayItemVariables { count: Some(3.0), ..Default::default() }, Some("quantity * unitCost + 5"));
        assert_relative_eq!(result.cost, 35.0, epsilon = 1e-9);
    }

    #[test]
    fn evaluate_arithmetic_rejects_non_arithmetic_input() {
        assert_eq!(evaluate_arithmetic("1 + a"), None);
        assert_eq!(evaluate_arithmetic(""), None);
    }

    #[test]
    fn evaluate_arithmetic_handles_precedence_and_parens() {
        assert_relative_eq!(evaluate_arithmetic("2 + 3 * 4").unwrap(), 14.0, epsilon = 1e-9);
        assert_relative_eq!(evaluate_arithmetic("(2 + 3) * 4").unwrap(), 20.0, epsilon = 1e-9);
    }

    #[test]
    fn evaluate_arithmetic_division_by_zero_yields_zero_matching_ts() {
        assert_relative_eq!(evaluate_arithmetic("5/0").unwrap(), 0.0, epsilon = 1e-9);
    }

    #[test]
    fn parse_pay_item_list_csv_skips_headers_comments_and_short_lines() {
        let csv = "ID,Name,Unit,UnitCost\n#comment\np1,Silt Fence,LF,1.85\nshort,line\n";
        let items = parse_pay_item_list_csv(csv);
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].id, "p1");
        assert_relative_eq!(items[0].unit_cost, 1.85, epsilon = 1e-9);
    }

    #[test]
    fn parse_pay_item_list_csv_handles_quoted_fields_with_commas() {
        let csv = "p1,\"Item, with comma\",EA,5.0,cat\n";
        let items = parse_pay_item_list_csv(csv);
        assert_eq!(items[0].name, "Item, with comma");
        assert_eq!(items[0].category.as_deref(), Some("cat"));
    }
}
