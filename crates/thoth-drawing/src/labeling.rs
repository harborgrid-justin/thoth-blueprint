//! Label styles composer and expression compiler. Supports parent-child
//! inheritance, property overrides, and text expression compilation.
//!
//! Port of `packages/domain/src/drawing/labeling.ts`.

use std::collections::HashMap;

/// General visibility/placement flags for a label style.
#[derive(Debug, Clone, Default, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct LabelStyleGeneral {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub layer: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub visible: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan_readable: Option<bool>,
}

/// Text template and layout for a label style.
#[derive(Debug, Clone, Default, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct LabelStyleLayout {
    /// e.g. `"STA: {Station}\nELEV: {Elevation}"`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text_template: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub font_size: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub font_color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub anchor_point: Option<String>,
}

/// Dragged/leader-line presentation state for a label style.
#[derive(Debug, Clone, Default, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct LabelStyleDraggedState {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub leader_visible: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stacked_text: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gap: Option<f64>,
}

/// A named label style, optionally inheriting from a parent.
#[derive(Debug, Clone, Default, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct LabelStyle {
    pub id: String,
    pub name: String,
    /// For child styles inheriting properties.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub general: Option<LabelStyleGeneral>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub layout: Option<LabelStyleLayout>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dragged_state: Option<LabelStyleDraggedState>,
}

/// A fully-resolved label style: every field folded from the parent chain
/// over the platform defaults.
#[derive(Debug, Clone, PartialEq)]
pub struct ResolvedLabelStyle {
    pub id: String,
    pub name: String,
    pub general: ResolvedGeneral,
    pub layout: ResolvedLayout,
    pub dragged_state: ResolvedDraggedState,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ResolvedGeneral {
    pub layer: String,
    pub visible: bool,
    pub plan_readable: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ResolvedLayout {
    pub text_template: String,
    pub font_size: f64,
    pub font_color: String,
    pub anchor_point: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ResolvedDraggedState {
    pub leader_visible: bool,
    pub stacked_text: bool,
    pub gap: f64,
}

/// Default annotation layer / font size / leader gap, reproduced from
/// `federalReference.json`'s `standards.drafting` (see `drafting.rs`'s
/// module rustdoc for why these are duplicated literals rather than shared
/// across crates).
const DEFAULT_ANNOTATION_LAYER: &str = "C-ANNO-LABL";
const DEFAULT_FONT_SIZE_PT: f64 = 8.0;
const DEFAULT_LEADER_GAP_MM: f64 = 2.0;

/// Merge a child style override with its resolved parent style, following
/// the `parent_id` chain (root ancestor first, requested style last).
pub fn resolve_label_style(
    style_id: &str,
    styles_list: &HashMap<String, LabelStyle>,
) -> ResolvedLabelStyle {
    let mut general = ResolvedGeneral {
        layer: DEFAULT_ANNOTATION_LAYER.to_string(),
        visible: true,
        plan_readable: true,
    };
    let mut layout = ResolvedLayout {
        text_template: "{Name}".to_string(),
        font_size: DEFAULT_FONT_SIZE_PT,
        font_color: "#000000".to_string(),
        anchor_point: "center".to_string(),
    };
    let mut dragged_state = ResolvedDraggedState {
        leader_visible: true,
        stacked_text: true,
        gap: DEFAULT_LEADER_GAP_MM,
    };

    // Walk the parent chain, then fold parent-first, child-last so a child's
    // explicit overrides win.
    let mut chain: Vec<&LabelStyle> = Vec::new();
    let mut current = styles_list.get(style_id);
    while let Some(style) = current {
        chain.push(style);
        current = style
            .parent_id
            .as_ref()
            .and_then(|pid| styles_list.get(pid));
    }
    chain.reverse();

    for s in chain {
        if let Some(g) = &s.general {
            if let Some(layer) = &g.layer {
                general.layer = layer.clone();
            }
            if let Some(v) = g.visible {
                general.visible = v;
            }
            if let Some(pr) = g.plan_readable {
                general.plan_readable = pr;
            }
        }
        if let Some(l) = &s.layout {
            if let Some(t) = &l.text_template {
                layout.text_template = t.clone();
            }
            if let Some(fs) = l.font_size {
                layout.font_size = fs;
            }
            if let Some(fc) = &l.font_color {
                layout.font_color = fc.clone();
            }
            if let Some(ap) = &l.anchor_point {
                layout.anchor_point = ap.clone();
            }
        }
        if let Some(d) = &s.dragged_state {
            if let Some(lv) = d.leader_visible {
                dragged_state.leader_visible = lv;
            }
            if let Some(st) = d.stacked_text {
                dragged_state.stacked_text = st;
            }
            if let Some(gap) = d.gap {
                dragged_state.gap = gap;
            }
        }
    }

    ResolvedLabelStyle {
        id: style_id.to_string(),
        name: styles_list
            .get(style_id)
            .map(|s| s.name.clone())
            .unwrap_or_else(|| "Resolved Style".to_string()),
        general,
        layout,
        dragged_state,
    }
}

/// Format a station value in engineer's notation, e.g. `176043.32` ->
/// `"1760+43.32"`. Mirrors `civil/common/units.ts`'s `formatStation` exactly
/// (`thoth-drawing` does not depend on `thoth-civil`, see the module rustdoc
/// pattern used elsewhere in this crate for why it's duplicated here).
fn format_station(value: f64, precision: usize) -> String {
    let neg = value < 0.0;
    let v = value.abs();
    let sta = (v / 100.0 + 1e-9).floor();
    let plus_raw = format!("{:.*}", precision, v - sta * 100.0);
    let width = precision + 3;
    let plus = format!("{plus_raw:0>width$}");
    format!("{}{}+{}", if neg { "-" } else { "" }, sta as i64, plus)
}

/// Format azimuth degrees as a quadrant bearing string, e.g. `N 45-30-00 E`.
pub fn format_quadrant_bearing(azimuth: f64) -> String {
    let normalized = ((azimuth % 360.0) + 360.0) % 360.0;

    let (quadrant, bearing_val, exit_dir) = if (0.0..90.0).contains(&normalized) {
        ("N", normalized, "E")
    } else if (90.0..180.0).contains(&normalized) {
        ("S", 180.0 - normalized, "E")
    } else if (180.0..270.0).contains(&normalized) {
        ("S", normalized - 180.0, "W")
    } else {
        ("N", 360.0 - normalized, "W")
    };

    let deg = bearing_val.floor();
    let min_float = (bearing_val - deg) * 60.0;
    let min = min_float.floor();
    let sec = ((min_float - min) * 60.0).round();

    format!(
        "{quadrant} {deg}\u{b0}{min:0>2}'{sec:0>2}\" {exit_dir}",
        deg = deg as i64,
        min = min as i64,
        sec = sec as i64
    )
}

/// Compile a text template with variables and evaluate basic math
/// expressions. Supports evaluating bracket tags `{Expression}` inside
/// strings, including a simple `{Elevation + 5.2}`-style arithmetic
/// substitution.
///
/// Never invokes a dynamic `eval`-equivalent: arithmetic is evaluated by
/// [`crate::qto`]'s hand-rolled recursive-descent parser (restricted to
/// `+-*/()` and numbers), matching the TS original's `Function(...)` path
/// only in the (equally restricted) inputs it accepts.
pub fn compile_label_template(
    template: &str,
    variables: &HashMap<String, LabelValue>,
    declination: f64,
) -> String {
    let mut result = template.to_string();

    // Pass 1: replace standard label variables via exact `{key}` substitution.
    for (key, val) in variables {
        let tag = format!("{{{key}}}");
        if !result.contains(&tag) {
            continue;
        }
        let replacement = match (key.as_str(), val) {
            ("Station", LabelValue::Number(n)) => format_station(*n, 2),
            ("Bearing", LabelValue::Number(n)) => {
                let corrected = (n + declination) % 360.0;
                format_quadrant_bearing(corrected)
            }
            (_, LabelValue::Number(n)) => format_number(*n),
            (_, LabelValue::Text(s)) => s.clone(),
        };
        result = result.replace(&tag, &replacement);
    }

    // Pass 2: scan remaining `{...}` groups that look like arithmetic
    // expressions (letters/digits/whitespace/`+-*/.`), substitute any
    // numeric variables referenced by whole-word name, and evaluate.
    result = substitute_arithmetic_tags(&result, variables);

    result
}

/// A value bound to a template variable — a number (for `Station`/`Bearing`/
/// arithmetic substitution) or arbitrary text.
#[derive(Debug, Clone, PartialEq)]
pub enum LabelValue {
    Number(f64),
    Text(String),
}

fn format_number(n: f64) -> String {
    // Rust's `f64` `Display` already omits a trailing `.0` for whole values
    // (matching JS `String(number)`'s shortest round-tripping form for the
    // magnitudes this crate's labels deal in).
    format!("{n}")
}

const TAG_EXPR_CHARS: fn(char) -> bool = |c: char| {
    c.is_ascii_alphanumeric()
        || c == '_'
        || c.is_whitespace()
        || matches!(c, '+' | '-' | '*' | '/' | '.')
};

fn is_ident_char(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '_'
}

/// Replace a variable name with its numeric value only at whole-word
/// boundaries (not inside a longer identifier), matching the TS `\b${key}\b`
/// regex substitution.
fn replace_whole_word(text: &str, name: &str, replacement: &str) -> String {
    if name.is_empty() {
        return text.to_string();
    }
    let chars: Vec<char> = text.chars().collect();
    let name_chars: Vec<char> = name.chars().collect();
    let mut out = String::new();
    let mut i = 0;
    while i < chars.len() {
        if chars[i..].starts_with(&name_chars[..]) {
            let before_ok = i == 0 || !is_ident_char(chars[i - 1]);
            let after_idx = i + name_chars.len();
            let after_ok = after_idx >= chars.len() || !is_ident_char(chars[after_idx]);
            if before_ok && after_ok {
                out.push_str(replacement);
                i = after_idx;
                continue;
            }
        }
        out.push(chars[i]);
        i += 1;
    }
    out
}

/// Scan `text` for `{...}` groups whose content matches the TS math-tag
/// character class, substitute numeric variables by whole-word name, and
/// evaluate the result as arithmetic if it reduces to a pure numeric
/// expression — replacing the whole `{...}` tag with the formatted result.
/// A tag that isn't pure arithmetic after substitution is left unresolved,
/// exactly as in the TS original.
fn substitute_arithmetic_tags(text: &str, variables: &HashMap<String, LabelValue>) -> String {
    let mut out = String::new();
    let chars: Vec<char> = text.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '{' {
            if let Some(close) = chars[i + 1..].iter().position(|&c| c == '}') {
                let end = i + 1 + close;
                let inner: String = chars[i + 1..end].iter().collect();
                if !inner.is_empty() && inner.chars().all(TAG_EXPR_CHARS) {
                    let mut expr = inner.clone();
                    for (key, val) in variables {
                        if let LabelValue::Number(n) = val {
                            expr = replace_whole_word(&expr, key, &format_number(*n));
                        }
                    }
                    let is_pure_arithmetic = !expr.is_empty()
                        && expr.chars().all(|c| {
                            c.is_ascii_digit()
                                || c.is_whitespace()
                                || matches!(c, '+' | '-' | '*' | '/' | '(' | ')' | '.')
                        });
                    if is_pure_arithmetic {
                        if let Some(value) = crate::qto::evaluate_arithmetic(&expr) {
                            out.push_str(&format!("{value:.2}"));
                            i = end + 1;
                            continue;
                        }
                    }
                    // Leave the tag unresolved (verbatim), matching the TS
                    // `catch { /* leave unresolved */ }` fallback.
                    out.push('{');
                    out.push_str(&inner);
                    out.push('}');
                    i = end + 1;
                    continue;
                }
            }
        }
        out.push(chars[i]);
        i += 1;
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_label_style_folds_parent_chain_over_defaults() {
        let mut styles = HashMap::new();
        styles.insert(
            "parent".to_string(),
            LabelStyle {
                id: "parent".to_string(),
                name: "Parent".to_string(),
                parent_id: None,
                general: Some(LabelStyleGeneral {
                    layer: Some("C-ANNO".to_string()),
                    visible: None,
                    plan_readable: None,
                }),
                layout: None,
                dragged_state: None,
            },
        );
        styles.insert(
            "child".to_string(),
            LabelStyle {
                id: "child".to_string(),
                name: "Child".to_string(),
                parent_id: Some("parent".to_string()),
                general: None,
                layout: Some(LabelStyleLayout {
                    text_template: Some("{Name}".to_string()),
                    font_size: Some(10.0),
                    font_color: None,
                    anchor_point: None,
                }),
                dragged_state: None,
            },
        );
        let resolved = resolve_label_style("child", &styles);
        assert_eq!(resolved.general.layer, "C-ANNO");
        assert_eq!(resolved.layout.font_size, 10.0);
        assert_eq!(resolved.layout.font_color, "#000000");
    }

    #[test]
    fn resolve_label_style_of_unknown_id_uses_platform_defaults() {
        let styles = HashMap::new();
        let resolved = resolve_label_style("nonexistent", &styles);
        assert_eq!(resolved.name, "Resolved Style");
        assert_eq!(resolved.general.layer, "C-ANNO-LABL");
    }

    #[test]
    fn format_station_matches_engineer_notation() {
        assert_eq!(format_station(176043.32, 2), "1760+43.32");
        assert_eq!(format_station(0.0, 2), "0+00.00");
    }

    #[test]
    fn format_quadrant_bearing_covers_all_four_quadrants() {
        assert_eq!(format_quadrant_bearing(45.0), "N 45°00'00\" E");
        assert_eq!(format_quadrant_bearing(135.0), "S 45°00'00\" E");
        assert_eq!(format_quadrant_bearing(225.0), "S 45°00'00\" W");
        assert_eq!(format_quadrant_bearing(315.0), "N 45°00'00\" W");
    }

    #[test]
    fn compile_label_template_substitutes_plain_variables() {
        let mut vars = HashMap::new();
        vars.insert("Name".to_string(), LabelValue::Text("Lot 5".to_string()));
        let out = compile_label_template("Parcel: {Name}", &vars, 0.0);
        assert_eq!(out, "Parcel: Lot 5");
    }

    #[test]
    fn compile_label_template_formats_station_and_bearing_specially() {
        let mut vars = HashMap::new();
        vars.insert("Station".to_string(), LabelValue::Number(176043.32));
        vars.insert("Bearing".to_string(), LabelValue::Number(45.0));
        let out = compile_label_template("STA {Station} BRG {Bearing}", &vars, 0.0);
        assert_eq!(out, "STA 1760+43.32 BRG N 45°00'00\" E");
    }

    #[test]
    fn compile_label_template_evaluates_an_arithmetic_expression_tag() {
        let mut vars = HashMap::new();
        vars.insert("Elevation".to_string(), LabelValue::Number(100.0));
        let out = compile_label_template("EL: {Elevation + 5.2}", &vars, 0.0);
        assert_eq!(out, "EL: 105.20");
    }

    #[test]
    fn compile_label_template_leaves_non_arithmetic_tags_unresolved() {
        let vars = HashMap::new();
        let out = compile_label_template("{NotAVariable}", &vars, 0.0);
        assert_eq!(out, "{NotAVariable}");
    }
}
