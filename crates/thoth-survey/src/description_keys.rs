//! Description keys — the AASHTO-style raw-description-to-symbology mapping
//! COGO points use to auto-assign a layer, display format, and element kind
//! from a field crew's shorthand code (e.g. `TR*` → a tree symbol on
//! `c-tree`). Direct port of `packages/domain/src/survey/descriptionKeys.ts`
//! and `types/descriptionKeys.ts`.
//!
//! **Workspace gap.** The TS `DEFAULT_DESCRIPTION_KEYS` prefers a live parts
//! catalog (`packages/domain/src/parts/registry.ts`'s `globalPartsDb`) and
//! only falls back to a hardcoded three-entry list when that catalog is
//! empty. The parts catalog is a different domain package, not a dependency
//! of this crate (see `../GAPS.md`), so [`DEFAULT_DESCRIPTION_KEYS`] here
//! always returns that hardcoded fallback list — the behavior the TS module
//! exhibits whenever no catalog has been loaded.

use serde::{Deserialize, Serialize};

/// The kind of planning element a description key resolves a point to.
/// Distinct from (and much narrower than) `thoth_spatial::ElementKind` — the
/// TS `DescriptionKey.elementKind` union is its own small, survey-local set.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DescriptionElementKind {
    Tree,
    Spot,
    CivilSymbol,
    Note,
}

/// A raw-description-matching rule that assigns a layer, display format,
/// and element kind (e.g. `code: "TR*"` → `format: "Tree $*"` on `c-tree`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DescriptionKey {
    /// e.g. `"TR*"` or `"MH*"`.
    pub code: String,
    /// e.g. `"c-tree"`, `"c-storm"`.
    pub layer_id: String,
    /// e.g. `"$*"` or `"Tree - $*"`.
    pub format: String,
    pub element_kind: DescriptionElementKind,
    pub symbol_name: Option<String>,
}

/// A named group of points selected by a wildcard query.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PointGroup {
    pub id: String,
    pub name: String,
    /// Wildcard query like `"TR*"` or `"*"`.
    pub query: String,
    pub point_ids: Vec<String>,
}

/// Check if a description matches a wildcard code (e.g. `TR*` matches
/// `TREE`). Only a single trailing `*` is meaningful here — this is a
/// deliberately simpler matcher than
/// [`crate::points::PointGroupManager`]'s full `*`/`?` glob; a pattern with
/// a `*` anywhere but the end (or a `?`) is compared for exact equality,
/// literal wildcard character included, exactly mirroring the TS original.
pub fn match_wildcard(value: &str, pattern: &str) -> bool {
    let clean_val = value.to_uppercase();
    let clean_val = clean_val.trim();
    let clean_pat = pattern.to_uppercase();
    let clean_pat = clean_pat.trim();
    if clean_pat == "*" {
        return true;
    }
    if let Some(prefix) = clean_pat.strip_suffix('*') {
        return clean_val.starts_with(prefix);
    }
    clean_val == clean_pat
}

/// Find the first description key whose `code` matches `raw_desc`.
pub fn find_matching_key<'a>(
    raw_desc: &str,
    keys: &'a [DescriptionKey],
) -> Option<&'a DescriptionKey> {
    keys.iter().find(|k| match_wildcard(raw_desc, &k.code))
}

/// Format a raw description per an AASHTO-style format spec (e.g. `"$*"`
/// copies the raw description verbatim; `"Tree - $*"` substitutes it in).
pub fn format_description(raw_desc: &str, format_spec: &str) -> String {
    if format_spec == "$*" {
        return raw_desc.to_string();
    }
    if format_spec.contains("$*") {
        return format_spec.replace("$*", raw_desc);
    }
    format_spec.to_string()
}

/// A minimal point view for [`evaluate_point_group`] — just enough to test
/// wildcard membership without depending on [`crate::points::CogoPoint`].
#[derive(Debug, Clone, Copy)]
pub struct PointGroupCandidate<'a> {
    pub id: &'a str,
    pub description: Option<&'a str>,
}

/// Evaluate point-group membership: the ids of every point whose
/// description matches `query`.
pub fn evaluate_point_group(points: &[PointGroupCandidate], query: &str) -> Vec<String> {
    points
        .iter()
        .filter(|pt| pt.description.is_some_and(|d| match_wildcard(d, query)))
        .map(|pt| pt.id.to_string())
        .collect()
}

/// Standard default description key set (see the module-level gap note —
/// this is always the TS fallback list, since the live parts catalog isn't
/// a dependency of this crate).
pub fn default_description_keys() -> Vec<DescriptionKey> {
    vec![
        DescriptionKey {
            code: "TR*".to_string(),
            layer_id: "c-tree".to_string(),
            format: "Tree $*".to_string(),
            element_kind: DescriptionElementKind::Tree,
            symbol_name: None,
        },
        DescriptionKey {
            code: "MH*".to_string(),
            layer_id: "c-storm".to_string(),
            format: "Manhole $*".to_string(),
            element_kind: DescriptionElementKind::CivilSymbol,
            symbol_name: Some("Inlet Protection".to_string()),
        },
        DescriptionKey {
            code: "BM*".to_string(),
            layer_id: "c-survey".to_string(),
            format: "Benchmark $*".to_string(),
            element_kind: DescriptionElementKind::Spot,
            symbol_name: None,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_trailing_star_wildcards_case_insensitively() {
        assert!(match_wildcard("tree", "TR*"));
        assert!(match_wildcard("TREE", "tr*"));
        assert!(!match_wildcard("monument", "TR*"));
        assert!(match_wildcard("anything", "*"));
    }

    #[test]
    fn non_trailing_star_is_compared_literally() {
        // No trailing '*': the TS original does a literal equality check,
        // asterisk character included.
        assert!(!match_wildcard("TREE", "TR*EE"));
        assert!(match_wildcard("TR*EE", "TR*EE"));
    }

    #[test]
    fn finds_the_first_matching_key() {
        let keys = default_description_keys();
        let found = find_matching_key("TREE OAK", &keys).expect("TR* should match");
        assert_eq!(found.layer_id, "c-tree");
    }

    #[test]
    fn formats_description_with_substitution() {
        assert_eq!(format_description("OAK", "$*"), "OAK");
        assert_eq!(format_description("OAK", "Tree - $*"), "Tree - OAK");
        assert_eq!(format_description("OAK", "Static Label"), "Static Label");
    }

    #[test]
    fn evaluates_point_group_membership_by_wildcard() {
        let points = vec![
            PointGroupCandidate {
                id: "p1",
                description: Some("TREE OAK"),
            },
            PointGroupCandidate {
                id: "p2",
                description: Some("MON IRON"),
            },
            PointGroupCandidate {
                id: "p3",
                description: None,
            },
        ];
        assert_eq!(evaluate_point_group(&points, "TR*"), vec!["p1".to_string()]);
        assert_eq!(
            evaluate_point_group(&points, "*"),
            vec!["p1".to_string(), "p2".to_string()]
        );
    }

    #[test]
    fn default_keys_cover_tree_manhole_and_benchmark() {
        let keys = default_description_keys();
        assert_eq!(keys.len(), 3);
        assert_eq!(keys[0].code, "TR*");
        assert_eq!(keys[1].code, "MH*");
        assert_eq!(keys[2].code, "BM*");
    }
}
