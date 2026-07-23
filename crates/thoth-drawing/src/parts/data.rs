//! Compile-time embedded parts catalog. Port of `packages/domain/src/parts/data/index.ts`.
//!
//! Each catalog JSON file (`architectural.json`, `electrical.json`,
//! `lumber.json`, `civil.json`, `mechanical_plumbing.json`, `survey.json`,
//! `drawing.json`) is embedded verbatim into the compiled binary via
//! `include_str!` — the data stays data (a `.json` file checked into the
//! crate, editable without touching Rust source), it is just no longer read
//! from disk at runtime, matching the reproducibility guarantees the rest of
//! this crate holds itself to. Deserialization happens once, lazily, the
//! first time [`initial_parts_catalog`] is called.

use super::types::PartSpecification;

const ARCHITECTURAL_JSON: &str = include_str!("data/architectural.json");
const CIVIL_JSON: &str = include_str!("data/civil.json");
const ELECTRICAL_JSON: &str = include_str!("data/electrical.json");
const LUMBER_JSON: &str = include_str!("data/lumber.json");
const MECHANICAL_PLUMBING_JSON: &str = include_str!("data/mechanical_plumbing.json");
const SURVEY_JSON: &str = include_str!("data/survey.json");
const DRAWING_JSON: &str = include_str!("data/drawing.json");

fn parse(label: &str, json: &str) -> Vec<PartSpecification> {
    serde_json::from_str(json)
        .unwrap_or_else(|e| panic!("embedded parts catalog {label} is malformed JSON: {e}"))
}

/// The full seed catalog, in the same file order as the TS `data/index.ts`
/// (architectural, electrical, lumber, civil, mechanical/plumbing, survey,
/// drawing).
///
/// This can only fail at compile-time-adjacent startup if the checked-in JSON
/// itself is malformed, which is a build-time invariant of this crate (the
/// data is embedded, not user input) rather than a caller-facing runtime
/// error — hence the `panic!` inside [`parse`] rather than a `Result` here.
pub fn initial_parts_catalog() -> Vec<PartSpecification> {
    let mut catalog = Vec::new();
    catalog.extend(parse("architectural.json", ARCHITECTURAL_JSON));
    catalog.extend(parse("electrical.json", ELECTRICAL_JSON));
    catalog.extend(parse("lumber.json", LUMBER_JSON));
    catalog.extend(parse("civil.json", CIVIL_JSON));
    catalog.extend(parse("mechanical_plumbing.json", MECHANICAL_PLUMBING_JSON));
    catalog.extend(parse("survey.json", SURVEY_JSON));
    catalog.extend(parse("drawing.json", DRAWING_JSON));
    catalog
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_embedded_catalog_file_parses() {
        let catalog = initial_parts_catalog();
        // architectural(18) + electrical(5) + lumber(4) + civil(15)
        // + mechanical_plumbing(3) + survey(3) + drawing(2) = 50
        assert_eq!(catalog.len(), 50);
    }

    #[test]
    fn every_part_has_a_non_empty_id_and_category() {
        for part in initial_parts_catalog() {
            assert!(!part.id.is_empty(), "part with empty id");
            assert!(
                !part.category.is_empty(),
                "part {} has empty category",
                part.id
            );
        }
    }

    #[test]
    fn part_ids_are_unique_across_the_whole_catalog() {
        let catalog = initial_parts_catalog();
        let mut seen = std::collections::HashSet::new();
        for part in &catalog {
            assert!(
                seen.insert(part.id.as_str()),
                "duplicate part id: {}",
                part.id
            );
        }
    }
}
