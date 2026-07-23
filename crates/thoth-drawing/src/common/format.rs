//! XML/COLLADA-safe string helpers. Port of `drawing/common/format.ts`.

/// Escape XML special characters using numeric character references, matching
/// the TS implementation's `<>&"'` replacement table exactly.
pub fn xml_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '<' | '>' | '&' | '"' | '\'' => {
                out.push_str(&format!("&#{};", c as u32));
            }
            _ => out.push(c),
        }
    }
    out
}

/// Format a safe XML/COLLADA ID string: non `[A-Za-z0-9_]` characters become
/// `_`, an empty result falls back to `"mesh"`, and the caller's index is
/// appended so ids stay unique across a document.
pub fn safe_id(name: &str, index: usize) -> String {
    let mapped: String = name
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let base = if mapped.is_empty() {
        "mesh".to_string()
    } else {
        mapped
    };
    format!("{base}_{index}")
}

/// Format a number with a fixed fraction-digit count and en-US thousands
/// grouping in the integer part, matching
/// `value.toLocaleString(undefined, { minimumFractionDigits: digits,
/// maximumFractionDigits: digits })` under the (en-US) default JS host
/// locale this codebase targets.
pub fn format_thousands_fixed(value: f64, digits: usize) -> String {
    let neg = value < 0.0;
    let rounded = format!("{:.*}", digits, value.abs());
    let (int_part, frac_part) = match rounded.split_once('.') {
        Some((i, f)) => (i, Some(f)),
        None => (rounded.as_str(), None),
    };

    let mut grouped = String::with_capacity(int_part.len() + int_part.len() / 3);
    let bytes = int_part.as_bytes();
    for (i, b) in bytes.iter().enumerate() {
        if i > 0 && (bytes.len() - i) % 3 == 0 {
            grouped.push(',');
        }
        grouped.push(*b as char);
    }

    let mut out = String::new();
    if neg {
        out.push('-');
    }
    out.push_str(&grouped);
    if let Some(f) = frac_part {
        out.push('.');
        out.push_str(f);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn xml_escape_replaces_all_special_characters() {
        assert_eq!(xml_escape("<a>&\"'"), "&#60;a&#62;&#38;&#34;&#39;");
    }

    #[test]
    fn xml_escape_leaves_ordinary_text_untouched() {
        assert_eq!(xml_escape("Test Mesh"), "Test Mesh");
    }

    #[test]
    fn safe_id_replaces_non_alnum_characters() {
        assert_eq!(safe_id("Bad <name> & stuff", 0), "Bad__name____stuff_0");
    }

    #[test]
    fn safe_id_falls_back_to_mesh_only_for_empty_input() {
        assert_eq!(safe_id("", 3), "mesh_3");
    }

    #[test]
    fn safe_id_maps_an_all_special_name_to_underscores_not_mesh() {
        // Matches the TS `name.replace(...) || "mesh"`: the replace of "***"
        // yields "___", which is truthy, so the "mesh" fallback does NOT fire.
        assert_eq!(safe_id("***", 1), "____1");
    }

    #[test]
    fn format_thousands_fixed_groups_by_three_and_pads_fraction_digits() {
        assert_eq!(format_thousands_fixed(5123.45, 3), "5,123.450");
        assert_eq!(format_thousands_fixed(5234.56, 3), "5,234.560");
        assert_eq!(format_thousands_fixed(999.0, 2), "999.00");
        assert_eq!(format_thousands_fixed(1_234_567.0, 0), "1,234,567");
    }

    #[test]
    fn format_thousands_fixed_handles_negative_values() {
        assert_eq!(format_thousands_fixed(-1234.5, 1), "-1,234.5");
    }
}
