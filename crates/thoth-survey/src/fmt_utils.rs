//! Locale-style number formatting shared by [`crate::survey`] and the
//! plat/report helpers.
//!
//! The TypeScript original leans on `Number.prototype.toLocaleString` for
//! thousands-grouped, fixed-decimal output (e.g. `"5,000.00"`). Rust has no
//! locale-aware formatter in `std`, and pulling in a full locale crate for
//! this narrow, always-`en-US`-grouping need would be disproportionate, so
//! this module reimplements exactly the grouping `toLocaleString(undefined,
//! {minimumFractionDigits, maximumFractionDigits})` produces under the
//! default (`en-US`) locale used throughout the source: a comma every three
//! integer digits, and a fixed number of fractional digits.

/// Group the integer digits of `s` (no sign, no decimal point) with commas
/// every three digits from the right, e.g. `"14200"` → `"14,200"`.
fn group_integer_digits(s: &str) -> String {
    let bytes = s.as_bytes();
    let n = bytes.len();
    let mut out = String::with_capacity(n + n / 3);
    for (i, b) in bytes.iter().enumerate() {
        if i > 0 && (n - i) % 3 == 0 {
            out.push(',');
        }
        out.push(*b as char);
    }
    out
}

/// Format `value` with thousands separators and exactly `digits` fractional
/// digits, e.g. `locale_fixed(5000.0, 2)` → `"5,000.00"`,
/// `locale_fixed(-3.5, 0)` → `"-4"`.
pub(crate) fn locale_fixed(value: f64, digits: usize) -> String {
    let negative = value < 0.0;
    let magnitude = value.abs();
    let fixed = format!("{magnitude:.digits$}");
    let (int_part, frac_part) = match fixed.split_once('.') {
        Some((i, f)) => (i, Some(f)),
        None => (fixed.as_str(), None),
    };
    let mut out = group_integer_digits(int_part);
    if let Some(f) = frac_part {
        out.push('.');
        out.push_str(f);
    }
    if negative && magnitude != 0.0 {
        format!("-{out}")
    } else {
        out
    }
}

/// Format a non-negative integer ratio denominator with thousands
/// separators, e.g. `group_thousands(14200)` → `"14,200"` (used for
/// `TraverseClosure::precision_text`).
pub(crate) fn group_thousands(n: i64) -> String {
    locale_fixed(n as f64, 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn groups_thousands_with_commas() {
        assert_eq!(group_thousands(14200), "14,200");
        assert_eq!(group_thousands(999), "999");
        assert_eq!(group_thousands(1_000_000), "1,000,000");
    }

    #[test]
    fn formats_fixed_decimals_with_grouping() {
        assert_eq!(locale_fixed(5000.0, 2), "5,000.00");
        assert_eq!(locale_fixed(1234.5, 2), "1,234.50");
        assert_eq!(locale_fixed(-3.5, 0), "-4");
    }
}
