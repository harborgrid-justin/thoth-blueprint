//! Plan-revision redline diff (competitive gap-analysis Theme 5, item 60).
//!
//! A **structured geometry/attribute diff** between two versions of the same
//! sheet or site's elements — added/removed/moved/resized/other-geometry-
//! change/attribute-change — not a pixel image diff.
//!
//! [`DiffableElement`] is a local, minimal, generic element shape (an id, a
//! free-form kind label, an ordered vertex list, and a string-keyed
//! attribute map) rather than `thoth-planning`'s full `PlanElement`
//! hierarchy, which this crate does not depend on (see `STATUS.md`/
//! `GAPS.md`'s cross-crate boundary notes). Any element that can be
//! flattened to that shape — a lot boundary, a building footprint, a pipe
//! run — can be diffed with this module.

use std::collections::{BTreeMap, HashMap};

use thoth_spatial::{area, distance, Point};

/// A minimal, generic diffable plan element: an id, a free-form kind label,
/// an ordered vertex list (a polygon/polyline; empty for a point-like
/// element with no boundary), and a string-keyed attribute snapshot.
#[derive(Debug, Clone, PartialEq)]
pub struct DiffableElement {
    pub id: String,
    pub kind: String,
    pub geometry: Vec<Point>,
    pub attributes: BTreeMap<String, String>,
}

/// One structured change detected between two versions of an element (or
/// the element's presence itself).
#[derive(Debug, Clone, PartialEq)]
pub enum ElementChange {
    /// Present in `after` but not `before`.
    Added { id: String },
    /// Present in `before` but not `after`.
    Removed { id: String },
    /// The same vertex count, shifted by a single uniform translation.
    Moved { id: String, translation: Point, distance: f64 },
    /// The polygon's area changed beyond tolerance without being a pure
    /// translation (a resize/reshape that changed enclosed area).
    Resized {
        id: String,
        area_before: f64,
        area_after: f64,
        percent_change: f64,
    },
    /// The geometry changed in some way that isn't a pure translation or a
    /// significant area change (e.g. a reshape at constant area, or a
    /// vertex-count change on a non-polygon element).
    GeometryChanged { id: String },
    /// One attribute's value changed (or was added/removed) between
    /// versions. One entry is emitted per changed key.
    AttributeChanged {
        id: String,
        key: String,
        before: Option<String>,
        after: Option<String>,
    },
    /// The element exists in both versions with identical geometry and
    /// attributes.
    Unchanged { id: String },
}

/// Relative/absolute tolerance below which two coordinates or areas are
/// treated as identical (accounts for floating-point round-trip noise in
/// stored plan geometry, not a meaningful design tolerance).
const EPSILON: f64 = 1e-6;

fn geometry_translation(before: &[Point], after: &[Point]) -> Option<Point> {
    if before.len() != after.len() || before.is_empty() {
        return None;
    }
    let first_delta = Point::new(after[0].x - before[0].x, after[0].y - before[0].y);
    let is_uniform = before.iter().zip(after.iter()).all(|(b, a)| {
        ((a.x - b.x) - first_delta.x).abs() < EPSILON && ((a.y - b.y) - first_delta.y).abs() < EPSILON
    });
    is_uniform.then_some(first_delta)
}

fn geometry_identical(before: &[Point], after: &[Point]) -> bool {
    before.len() == after.len()
        && before
            .iter()
            .zip(after.iter())
            .all(|(b, a)| (a.x - b.x).abs() < EPSILON && (a.y - b.y).abs() < EPSILON)
}

/// Classify how one element's geometry changed, if at all.
fn diff_geometry(id: &str, before: &[Point], after: &[Point]) -> Option<ElementChange> {
    if geometry_identical(before, after) {
        return None;
    }
    if let Some(translation) = geometry_translation(before, after) {
        let d = distance(Point::new(0.0, 0.0), translation);
        if d >= EPSILON {
            return Some(ElementChange::Moved {
                id: id.to_string(),
                translation,
                distance: d,
            });
        }
    }
    if before.len() >= 3 && after.len() >= 3 {
        let area_before = area(before);
        let area_after = area(after);
        let denom = area_before.abs().max(EPSILON);
        let percent_change = (area_after - area_before) / denom * 100.0;
        if percent_change.abs() > 0.01 {
            return Some(ElementChange::Resized {
                id: id.to_string(),
                area_before,
                area_after,
                percent_change,
            });
        }
    }
    Some(ElementChange::GeometryChanged { id: id.to_string() })
}

/// Diff every attribute key present in either version, emitting one
/// [`ElementChange::AttributeChanged`] per key whose value differs (or was
/// added/removed).
fn diff_attributes(
    id: &str,
    before: &BTreeMap<String, String>,
    after: &BTreeMap<String, String>,
) -> Vec<ElementChange> {
    let mut changes = Vec::new();
    for (key, after_value) in after {
        match before.get(key) {
            Some(before_value) if before_value == after_value => {}
            other => changes.push(ElementChange::AttributeChanged {
                id: id.to_string(),
                key: key.clone(),
                before: other.cloned(),
                after: Some(after_value.clone()),
            }),
        }
    }
    for (key, before_value) in before {
        if !after.contains_key(key) {
            changes.push(ElementChange::AttributeChanged {
                id: id.to_string(),
                key: key.clone(),
                before: Some(before_value.clone()),
                after: None,
            });
        }
    }
    changes
}

/// A complete redline diff: every change detected between two versions of
/// the same plan/sheet's elements.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct RedlineDiff {
    pub changes: Vec<ElementChange>,
}

impl RedlineDiff {
    /// The ids of elements with at least one non-[`ElementChange::Unchanged`]
    /// change.
    pub fn changed_ids(&self) -> Vec<&str> {
        self.changes
            .iter()
            .filter_map(|c| match c {
                ElementChange::Unchanged { .. } => None,
                ElementChange::Added { id }
                | ElementChange::Removed { id }
                | ElementChange::Moved { id, .. }
                | ElementChange::Resized { id, .. }
                | ElementChange::GeometryChanged { id }
                | ElementChange::AttributeChanged { id, .. } => Some(id.as_str()),
            })
            .collect()
    }
}

/// Compute a structured redline diff between two versions of the same
/// element set, matched by [`DiffableElement::id`].
pub fn diff_elements(before: &[DiffableElement], after: &[DiffableElement]) -> RedlineDiff {
    let before_by_id: HashMap<&str, &DiffableElement> =
        before.iter().map(|e| (e.id.as_str(), e)).collect();
    let after_by_id: HashMap<&str, &DiffableElement> =
        after.iter().map(|e| (e.id.as_str(), e)).collect();

    let mut changes = Vec::new();

    for e in before {
        if !after_by_id.contains_key(e.id.as_str()) {
            changes.push(ElementChange::Removed { id: e.id.clone() });
        }
    }
    for e in after {
        if !before_by_id.contains_key(e.id.as_str()) {
            changes.push(ElementChange::Added { id: e.id.clone() });
        }
    }

    for e_after in after {
        let Some(e_before) = before_by_id.get(e_after.id.as_str()) else {
            continue;
        };
        let mut element_changes = Vec::new();
        if let Some(geo_change) = diff_geometry(&e_after.id, &e_before.geometry, &e_after.geometry) {
            element_changes.push(geo_change);
        }
        element_changes.extend(diff_attributes(
            &e_after.id,
            &e_before.attributes,
            &e_after.attributes,
        ));

        if element_changes.is_empty() {
            changes.push(ElementChange::Unchanged {
                id: e_after.id.clone(),
            });
        } else {
            changes.extend(element_changes);
        }
    }

    RedlineDiff { changes }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn element(id: &str, geometry: Vec<Point>, attrs: &[(&str, &str)]) -> DiffableElement {
        DiffableElement {
            id: id.to_string(),
            kind: "lot".to_string(),
            geometry,
            attributes: attrs
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect(),
        }
    }

    fn square(x: f64, y: f64, side: f64) -> Vec<Point> {
        vec![
            Point::new(x, y),
            Point::new(x + side, y),
            Point::new(x + side, y + side),
            Point::new(x, y + side),
        ]
    }

    #[test]
    fn diff_elements_detects_added_and_removed() {
        let before = vec![element("a", square(0.0, 0.0, 10.0), &[])];
        let after = vec![element("b", square(0.0, 0.0, 10.0), &[])];
        let diff = diff_elements(&before, &after);
        assert!(diff
            .changes
            .iter()
            .any(|c| matches!(c, ElementChange::Removed { id } if id == "a")));
        assert!(diff
            .changes
            .iter()
            .any(|c| matches!(c, ElementChange::Added { id } if id == "b")));
    }

    #[test]
    fn diff_elements_detects_a_pure_translation_as_moved() {
        let before = vec![element("a", square(0.0, 0.0, 10.0), &[])];
        let after = vec![element("a", square(5.0, 3.0, 10.0), &[])];
        let diff = diff_elements(&before, &after);
        assert_eq!(diff.changes.len(), 1);
        match &diff.changes[0] {
            ElementChange::Moved { id, translation, distance } => {
                assert_eq!(id, "a");
                assert!((translation.x - 5.0).abs() < 1e-9);
                assert!((translation.y - 3.0).abs() < 1e-9);
                assert!((*distance - (34f64).sqrt()).abs() < 1e-6);
            }
            other => panic!("expected Moved, got {other:?}"),
        }
    }

    #[test]
    fn diff_elements_detects_an_area_change_as_resized() {
        let before = vec![element("a", square(0.0, 0.0, 10.0), &[])];
        let after = vec![element("a", square(0.0, 0.0, 20.0), &[])];
        let diff = diff_elements(&before, &after);
        assert_eq!(diff.changes.len(), 1);
        match &diff.changes[0] {
            ElementChange::Resized {
                id,
                area_before,
                area_after,
                ..
            } => {
                assert_eq!(id, "a");
                assert!((*area_before - 100.0).abs() < 1e-6);
                assert!((*area_after - 400.0).abs() < 1e-6);
            }
            other => panic!("expected Resized, got {other:?}"),
        }
    }

    #[test]
    fn diff_elements_detects_an_attribute_change() {
        let before = vec![element("a", square(0.0, 0.0, 10.0), &[("zone", "R1")])];
        let after = vec![element("a", square(0.0, 0.0, 10.0), &[("zone", "R2")])];
        let diff = diff_elements(&before, &after);
        assert_eq!(diff.changes.len(), 1);
        assert!(matches!(
            &diff.changes[0],
            ElementChange::AttributeChanged { key, before, after, .. }
                if key == "zone" && before.as_deref() == Some("R1") && after.as_deref() == Some("R2")
        ));
    }

    #[test]
    fn diff_elements_reports_unchanged_for_identical_elements() {
        let before = vec![element("a", square(0.0, 0.0, 10.0), &[("zone", "R1")])];
        let after = vec![element("a", square(0.0, 0.0, 10.0), &[("zone", "R1")])];
        let diff = diff_elements(&before, &after);
        assert_eq!(diff.changes, vec![ElementChange::Unchanged { id: "a".to_string() }]);
    }

    #[test]
    fn diff_elements_can_report_both_a_move_and_an_attribute_change_for_one_element() {
        let before = vec![element("a", square(0.0, 0.0, 10.0), &[("zone", "R1")])];
        let after = vec![element("a", square(5.0, 0.0, 10.0), &[("zone", "R2")])];
        let diff = diff_elements(&before, &after);
        assert_eq!(diff.changes.len(), 2);
        assert!(diff.changes.iter().any(|c| matches!(c, ElementChange::Moved { .. })));
        assert!(diff
            .changes
            .iter()
            .any(|c| matches!(c, ElementChange::AttributeChanged { .. })));
    }

    #[test]
    fn changed_ids_excludes_unchanged_elements() {
        let before = vec![
            element("a", square(0.0, 0.0, 10.0), &[]),
            element("b", square(20.0, 0.0, 10.0), &[]),
        ];
        let after = vec![
            element("a", square(0.0, 0.0, 10.0), &[]),
            element("b", square(25.0, 0.0, 10.0), &[]),
        ];
        let diff = diff_elements(&before, &after);
        assert_eq!(diff.changed_ids(), vec!["b"]);
    }
}
