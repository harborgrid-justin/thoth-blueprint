//! Plan-version comparison and (partial) merge: a structured diff across two
//! [`Site`] snapshots/checkpoints, and a conservative three-way merge built
//! on top of it.
//!
//! # Scope
//!
//! [`diff_sites`] answers "what changed between these two versions of the
//! same site": which elements were added, removed, or modified, and — for
//! modified elements — which top-level fields changed. It is a snapshot
//! comparison, not a replay of edit history; two checkpoints (or a
//! checkpoint and the live site) are compared directly by content.
//!
//! [`three_way_merge`] builds toward, but does not fully implement, a
//! general three-way merge: given a common ancestor (`base`) and two
//! divergent versions (`ours`, `theirs`), it classifies every element as
//! unchanged, changed-on-one-side (auto-applies that side), changed
//! identically on both sides (auto-applies, no conflict), or changed
//! differently on both sides / added-vs-deleted (a [`MergeConflict`] the
//! caller must resolve manually — this module does not attempt semantic
//! geometry merging, e.g. reconciling two different setback edits into a
//! third value). See that function's docs for exactly what it does and does
//! not resolve automatically.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use thoth_planning::elements::PlanElement;
use thoth_planning::Site;
use thoth_spatial::ElementKind;

/// The kind of change a [`diff_sites`] comparison found for one element.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ElementChangeKind {
    Added,
    Removed,
    Modified,
}

/// One top-level field that differs between the "before" and "after" JSON
/// representation of a modified element.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FieldChange {
    pub field: String,
    pub before: Value,
    pub after: Value,
}

/// What changed about a single element between two [`Site`] snapshots.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ElementDiff {
    pub element_id: String,
    pub kind: ElementKind,
    pub change: ElementChangeKind,
    /// Populated only for [`ElementChangeKind::Modified`]: every top-level
    /// field whose serialized value differs, each carrying its before/after
    /// value. Empty for `Added`/`Removed` (the whole element is the change).
    #[serde(default)]
    pub field_changes: Vec<FieldChange>,
}

/// A change to one of [`Site`]'s own top-level scalar fields (as opposed to
/// its `elements`), e.g. its `name` or `jurisdiction_id`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SiteMetadataChange {
    pub field: String,
    pub before: Value,
    pub after: Value,
}

/// The full result of comparing two [`Site`] snapshots.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SiteDiff {
    /// Changes to `Site::name`/`Site::jurisdiction_id`/`Site::geoid` — the
    /// site's own identity/classification fields, as distinct from its
    /// element content. Layers and civil-stub fields
    /// (`control_lines`/`civil_symbols`/`networks`) are intentionally out of
    /// scope for this pass — see the module docs.
    pub metadata_changes: Vec<SiteMetadataChange>,
    pub element_diffs: Vec<ElementDiff>,
}

impl SiteDiff {
    /// `true` if nothing changed at all (no metadata or element diffs).
    pub fn is_empty(&self) -> bool {
        self.metadata_changes.is_empty() && self.element_diffs.is_empty()
    }

    /// Elements present in "after" but not "before".
    pub fn added(&self) -> impl Iterator<Item = &ElementDiff> {
        self.element_diffs
            .iter()
            .filter(|d| d.change == ElementChangeKind::Added)
    }

    /// Elements present in "before" but not "after".
    pub fn removed(&self) -> impl Iterator<Item = &ElementDiff> {
        self.element_diffs
            .iter()
            .filter(|d| d.change == ElementChangeKind::Removed)
    }

    /// Elements present in both, with at least one field changed.
    pub fn modified(&self) -> impl Iterator<Item = &ElementDiff> {
        self.element_diffs
            .iter()
            .filter(|d| d.change == ElementChangeKind::Modified)
    }
}

/// The element's own id, regardless of whether it's a spatial element (id
/// lives on its flattened `ElementBase`) or a point element (`Note`/`Tree`/
/// `Spot`, which carry `id` directly).
fn element_id(element: &PlanElement) -> &str {
    match element {
        PlanElement::Note(n) => &n.id,
        PlanElement::Tree(t) => &t.id,
        PlanElement::Spot(s) => &s.id,
        other => &other.base().expect("every non-point element has a base").id,
    }
}

/// Serialize an element to a JSON object for field-level comparison. Panics
/// only if serialization itself fails, which would indicate a bug in
/// `PlanElement`'s `Serialize` impl (every variant is a plain struct with
/// derived/hand-written `Serialize`), not a caller error — matching how the
/// rest of this crate treats "the domain model failed to serialize itself"
/// as a programmer error rather than a recoverable one.
fn element_to_map(element: &PlanElement) -> serde_json::Map<String, Value> {
    match serde_json::to_value(element).expect("PlanElement always serializes") {
        Value::Object(map) => map,
        _ => unreachable!("PlanElement always serializes to a JSON object"),
    }
}

/// Compare `before` and `after` field-by-field, returning every field whose
/// value differs.
fn field_changes(
    before: &serde_json::Map<String, Value>,
    after: &serde_json::Map<String, Value>,
) -> Vec<FieldChange> {
    let mut fields: BTreeMap<&str, ()> = BTreeMap::new();
    for key in before.keys().chain(after.keys()) {
        fields.insert(key.as_str(), ());
    }
    let missing = Value::Null;
    fields
        .into_keys()
        .filter_map(|field| {
            let before_value = before.get(field).unwrap_or(&missing);
            let after_value = after.get(field).unwrap_or(&missing);
            if before_value != after_value {
                Some(FieldChange {
                    field: field.to_string(),
                    before: before_value.clone(),
                    after: after_value.clone(),
                })
            } else {
                None
            }
        })
        .collect()
}

/// Compare two [`Site`] snapshots (e.g. two checkpoints, or a checkpoint
/// against the live site), returning a structured [`SiteDiff`] of every
/// element added, removed, or modified (with per-field detail for
/// modifications), plus any change to the site's own metadata fields.
pub fn diff_sites(before: &Site, after: &Site) -> SiteDiff {
    let mut metadata_changes = Vec::new();
    if before.name != after.name {
        metadata_changes.push(SiteMetadataChange {
            field: "name".to_string(),
            before: Value::String(before.name.clone()),
            after: Value::String(after.name.clone()),
        });
    }
    if before.jurisdiction_id != after.jurisdiction_id {
        metadata_changes.push(SiteMetadataChange {
            field: "jurisdiction_id".to_string(),
            before: before
                .jurisdiction_id
                .clone()
                .map_or(Value::Null, Value::String),
            after: after
                .jurisdiction_id
                .clone()
                .map_or(Value::Null, Value::String),
        });
    }
    if before.geoid != after.geoid {
        metadata_changes.push(SiteMetadataChange {
            field: "geoid".to_string(),
            before: before.geoid.clone().map_or(Value::Null, Value::String),
            after: after.geoid.clone().map_or(Value::Null, Value::String),
        });
    }

    let before_index: BTreeMap<&str, &PlanElement> =
        before.elements.iter().map(|e| (element_id(e), e)).collect();
    let after_index: BTreeMap<&str, &PlanElement> =
        after.elements.iter().map(|e| (element_id(e), e)).collect();

    let mut ids: BTreeMap<&str, ()> = BTreeMap::new();
    for id in before_index.keys().chain(after_index.keys()) {
        ids.insert(id, ());
    }

    let mut element_diffs = Vec::new();
    for id in ids.into_keys() {
        match (before_index.get(id), after_index.get(id)) {
            (None, Some(after_el)) => element_diffs.push(ElementDiff {
                element_id: id.to_string(),
                kind: after_el.kind(),
                change: ElementChangeKind::Added,
                field_changes: Vec::new(),
            }),
            (Some(before_el), None) => element_diffs.push(ElementDiff {
                element_id: id.to_string(),
                kind: before_el.kind(),
                change: ElementChangeKind::Removed,
                field_changes: Vec::new(),
            }),
            (Some(before_el), Some(after_el)) => {
                let before_map = element_to_map(before_el);
                let after_map = element_to_map(after_el);
                let changes = field_changes(&before_map, &after_map);
                if !changes.is_empty() {
                    element_diffs.push(ElementDiff {
                        element_id: id.to_string(),
                        kind: after_el.kind(),
                        change: ElementChangeKind::Modified,
                        field_changes: changes,
                    });
                }
            }
            (None, None) => unreachable!("id came from one of the two indices"),
        }
    }

    SiteDiff {
        metadata_changes,
        element_diffs,
    }
}

/// Why a [`three_way_merge`] element (or metadata field) could not be
/// auto-merged and needs a human decision.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum MergeConflictReason {
    /// Both sides modified the same element, but to different content.
    ModifiedByBoth,
    /// One side modified the element; the other deleted it.
    ModifiedAndDeleted,
    /// Both sides added an element with the same id but different content
    /// (only possible if a caller reuses ids across independently-created
    /// elements — `thoth_spatial::create_id` makes this practically
    /// impossible in normal operation, but the merge still handles it
    /// explicitly rather than silently picking one).
    AddedByBothDifferently,
}

/// One element (or site-metadata field) that both sides changed in
/// incompatible ways.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MergeConflict {
    /// The element id, or a synthetic `"site.<field>"` id for a metadata
    /// conflict (e.g. `"site.name"`).
    pub subject_id: String,
    pub reason: MergeConflictReason,
}

/// The result of a [`three_way_merge`]: either every change applied cleanly,
/// or some did and the rest are listed as [`MergeConflict`]s the caller must
/// resolve (the returned `site` still reflects every non-conflicting change;
/// conflicting elements are left at their `base` content).
#[derive(Debug, Clone, PartialEq)]
pub struct MergeResult {
    pub site: Site,
    pub conflicts: Vec<MergeConflict>,
}

impl MergeResult {
    /// `true` if the merge produced no conflicts at all.
    pub fn is_clean(&self) -> bool {
        self.conflicts.is_empty()
    }
}

/// Attempt a three-way merge of `ours` and `theirs`, both descended from the
/// common ancestor `base`. See the module docs for exactly what this
/// resolves automatically (one-sided changes, and both-sides-identical
/// changes) versus what it reports as a [`MergeConflict`] for a human to
/// resolve (both sides changing the same element differently, or one side
/// modifying what the other deleted).
///
/// This is intentionally conservative: it never guesses at reconciling two
/// different geometric edits (e.g. averaging two different setback values)
/// — that would silently produce a plan nobody actually drew. It composes
/// with [`crate::rules`]: a caller should re-run compliance checks against
/// the merged site regardless of whether conflicts were reported, since a
/// clean merge can still be non-conforming.
pub fn three_way_merge(base: &Site, ours: &Site, theirs: &Site) -> MergeResult {
    let mut conflicts = Vec::new();

    let name = merge_scalar(
        "site.name",
        &base.name,
        &ours.name,
        &theirs.name,
        &mut conflicts,
    )
    .cloned()
    .unwrap_or_else(|| base.name.clone());

    let jurisdiction_id = merge_scalar(
        "site.jurisdiction_id",
        &base.jurisdiction_id,
        &ours.jurisdiction_id,
        &theirs.jurisdiction_id,
        &mut conflicts,
    )
    .cloned()
    .unwrap_or_else(|| base.jurisdiction_id.clone());

    let geoid = merge_scalar(
        "site.geoid",
        &base.geoid,
        &ours.geoid,
        &theirs.geoid,
        &mut conflicts,
    )
    .cloned()
    .unwrap_or_else(|| base.geoid.clone());

    let base_index: BTreeMap<&str, &PlanElement> =
        base.elements.iter().map(|e| (element_id(e), e)).collect();
    let ours_index: BTreeMap<&str, &PlanElement> =
        ours.elements.iter().map(|e| (element_id(e), e)).collect();
    let theirs_index: BTreeMap<&str, &PlanElement> =
        theirs.elements.iter().map(|e| (element_id(e), e)).collect();

    let mut ids: BTreeMap<&str, ()> = BTreeMap::new();
    for id in base_index
        .keys()
        .chain(ours_index.keys())
        .chain(theirs_index.keys())
    {
        ids.insert(id, ());
    }

    let mut merged_elements = Vec::new();
    for id in ids.into_keys() {
        let b = base_index.get(id).copied();
        let o = ours_index.get(id).copied();
        let t = theirs_index.get(id).copied();

        match (b, o, t) {
            // Present in all three, unmodified or modified on at most one
            // side: take whichever side actually changed it (or base if
            // neither did).
            (Some(base_el), Some(our_el), Some(their_el)) => {
                let our_changed = our_el != base_el;
                let their_changed = their_el != base_el;
                match (our_changed, their_changed) {
                    (false, false) => merged_elements.push((*base_el).clone()),
                    (true, false) => merged_elements.push((*our_el).clone()),
                    (false, true) => merged_elements.push((*their_el).clone()),
                    (true, true) => {
                        if our_el == their_el {
                            merged_elements.push((*our_el).clone());
                        } else {
                            conflicts.push(MergeConflict {
                                subject_id: id.to_string(),
                                reason: MergeConflictReason::ModifiedByBoth,
                            });
                            merged_elements.push((*base_el).clone());
                        }
                    }
                }
            }
            // Deleted on at least one side, present in base: only a real
            // deletion if the other side left it unchanged or also deleted
            // it; a deletion opposite a modification is a conflict.
            (Some(base_el), our, their) => {
                let our_changed = matches!(our, Some(e) if e != base_el);
                let their_changed = matches!(their, Some(e) if e != base_el);
                match (our.is_none(), their.is_none(), our_changed, their_changed) {
                    (true, true, _, _) => { /* deleted by both: omit */ }
                    (true, false, _, false) => { /* we deleted, they left unchanged: omit */ }
                    (false, true, false, _) => { /* they deleted, we left unchanged: omit */ }
                    (true, false, _, true) => {
                        conflicts.push(MergeConflict {
                            subject_id: id.to_string(),
                            reason: MergeConflictReason::ModifiedAndDeleted,
                        });
                        merged_elements.push((*base_el).clone());
                    }
                    (false, true, true, _) => {
                        conflicts.push(MergeConflict {
                            subject_id: id.to_string(),
                            reason: MergeConflictReason::ModifiedAndDeleted,
                        });
                        merged_elements.push((*base_el).clone());
                    }
                    (false, false, _, _) => {
                        unreachable!("both Some was handled by the previous match arm")
                    }
                }
            }
            // Added independently on one or both sides (not in base).
            (None, Some(our_el), Some(their_el)) => {
                if our_el == their_el {
                    merged_elements.push((*our_el).clone());
                } else {
                    conflicts.push(MergeConflict {
                        subject_id: id.to_string(),
                        reason: MergeConflictReason::AddedByBothDifferently,
                    });
                    // Neither side is authoritative; keep ours as a
                    // provisional placeholder alongside the reported
                    // conflict so the merge result stays usable pending
                    // manual resolution.
                    merged_elements.push((*our_el).clone());
                }
            }
            (None, Some(our_el), None) => merged_elements.push((*our_el).clone()),
            (None, None, Some(their_el)) => merged_elements.push((*their_el).clone()),
            (None, None, None) => unreachable!("id came from one of the three indices"),
        }
    }

    MergeResult {
        site: Site {
            id: base.id.clone(),
            name,
            spatial: base.spatial.clone(),
            layers: base.layers.clone(),
            elements: merged_elements,
            jurisdiction_id,
            geoid,
            control_lines: base.control_lines.clone(),
            civil_symbols: base.civil_symbols.clone(),
            networks: base.networks.clone(),
        },
        conflicts,
    }
}

/// Merge a single scalar field three ways: unanimous or one-sided changes
/// resolve automatically; both sides changing it to different values is a
/// conflict (recorded into `conflicts`, base kept). Returns `None` when the
/// caller should fall back to `base` (including the conflict case).
fn merge_scalar<'a, T: PartialEq + Clone>(
    subject_id: &str,
    base: &'a T,
    ours: &'a T,
    theirs: &'a T,
    conflicts: &mut Vec<MergeConflict>,
) -> Option<&'a T> {
    let our_changed = ours != base;
    let their_changed = theirs != base;
    match (our_changed, their_changed) {
        (false, false) => None,
        (true, false) => Some(ours),
        (false, true) => Some(theirs),
        (true, true) => {
            if ours == theirs {
                Some(ours)
            } else {
                conflicts.push(MergeConflict {
                    subject_id: subject_id.to_string(),
                    reason: MergeConflictReason::ModifiedByBoth,
                });
                None
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_planning::elements::{new_base, Building, Lot, Zone};
    use thoth_spatial::{Point, Polygon, SpatialContext, Unit};

    fn ctx() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: Unit::Meters,
            scale: 1.0,
        }
    }

    fn square(size: f64) -> Polygon {
        vec![
            Point::new(0.0, 0.0),
            Point::new(size, 0.0),
            Point::new(size, size),
            Point::new(0.0, size),
        ]
    }

    fn base_site(elements: Vec<PlanElement>) -> Site {
        Site {
            id: "s1".to_string(),
            name: "Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements,
            jurisdiction_id: Some("jur-1".to_string()),
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
        }
    }

    fn lot(id: &str, setback: Option<f64>) -> PlanElement {
        PlanElement::Lot(Lot {
            base: new_base(id, ElementKind::Lot, "Lot", "l", square(20.0)),
            parcel_id: None,
            block_id: None,
            setback,
        })
    }

    #[test]
    fn diff_detects_added_removed_and_modified_elements() {
        let before = base_site(vec![lot("l1", Some(2.0)), lot("l2", None)]);
        let after = base_site(vec![lot("l1", Some(5.0)), lot("l3", None)]);

        let diff = diff_sites(&before, &after);
        assert!(!diff.is_empty());
        assert_eq!(diff.added().count(), 1);
        assert_eq!(diff.removed().count(), 1);
        assert_eq!(diff.modified().count(), 1);

        let modified = diff.modified().next().unwrap();
        assert_eq!(modified.element_id, "l1");
        assert!(modified.field_changes.iter().any(|f| f.field == "setback"));
    }

    #[test]
    fn diff_reports_no_changes_for_identical_sites() {
        let site = base_site(vec![lot("l1", Some(2.0))]);
        let diff = diff_sites(&site, &site.clone());
        assert!(diff.is_empty());
    }

    #[test]
    fn diff_reports_site_metadata_changes() {
        let before = base_site(vec![]);
        let mut after = base_site(vec![]);
        after.name = "Renamed Site".to_string();
        after.jurisdiction_id = Some("jur-2".to_string());

        let diff = diff_sites(&before, &after);
        assert_eq!(diff.metadata_changes.len(), 2);
        assert!(diff.metadata_changes.iter().any(|c| c.field == "name"));
        assert!(diff
            .metadata_changes
            .iter()
            .any(|c| c.field == "jurisdiction_id"));
    }

    #[test]
    fn three_way_merge_applies_non_conflicting_changes_from_both_sides() {
        let base = base_site(vec![lot("l1", Some(2.0)), lot("l2", Some(3.0))]);
        let mut ours = base.clone();
        ours.elements[0] = lot("l1", Some(9.0)); // we change l1
        let mut theirs = base.clone();
        theirs.elements[1] = lot("l2", Some(7.0)); // they change l2

        let result = three_way_merge(&base, &ours, &theirs);
        assert!(result.is_clean());

        let merged_l1 = result
            .site
            .elements
            .iter()
            .find(|e| element_id(e) == "l1")
            .unwrap();
        let merged_l2 = result
            .site
            .elements
            .iter()
            .find(|e| element_id(e) == "l2")
            .unwrap();
        match merged_l1 {
            PlanElement::Lot(l) => assert_eq!(l.setback, Some(9.0)),
            _ => panic!("expected a Lot"),
        }
        match merged_l2 {
            PlanElement::Lot(l) => assert_eq!(l.setback, Some(7.0)),
            _ => panic!("expected a Lot"),
        }
    }

    #[test]
    fn three_way_merge_reports_a_conflict_when_both_sides_change_the_same_element_differently() {
        let base = base_site(vec![lot("l1", Some(2.0))]);
        let mut ours = base.clone();
        ours.elements[0] = lot("l1", Some(9.0));
        let mut theirs = base.clone();
        theirs.elements[0] = lot("l1", Some(11.0));

        let result = three_way_merge(&base, &ours, &theirs);
        assert!(!result.is_clean());
        assert_eq!(result.conflicts.len(), 1);
        assert_eq!(result.conflicts[0].subject_id, "l1");
        assert_eq!(
            result.conflicts[0].reason,
            MergeConflictReason::ModifiedByBoth
        );
        // The base version is kept pending manual resolution.
        match result
            .site
            .elements
            .iter()
            .find(|e| element_id(e) == "l1")
            .unwrap()
        {
            PlanElement::Lot(l) => assert_eq!(l.setback, Some(2.0)),
            _ => panic!("expected a Lot"),
        }
    }

    #[test]
    fn three_way_merge_reports_a_conflict_for_modify_vs_delete() {
        let base = base_site(vec![lot("l1", Some(2.0))]);
        let mut ours = base.clone();
        ours.elements[0] = lot("l1", Some(9.0));
        let mut theirs = base.clone();
        theirs.elements.clear(); // they deleted l1

        let result = three_way_merge(&base, &ours, &theirs);
        assert_eq!(result.conflicts.len(), 1);
        assert_eq!(
            result.conflicts[0].reason,
            MergeConflictReason::ModifiedAndDeleted
        );
    }

    #[test]
    fn three_way_merge_applies_a_clean_deletion() {
        let base = base_site(vec![lot("l1", Some(2.0)), lot("l2", None)]);
        let ours = base.clone(); // we left both alone
        let mut theirs = base.clone();
        theirs.elements.retain(|e| element_id(e) != "l2"); // they deleted l2

        let result = three_way_merge(&base, &ours, &theirs);
        assert!(result.is_clean());
        assert_eq!(result.site.elements.len(), 1);
        assert_eq!(element_id(&result.site.elements[0]), "l1");
    }

    #[test]
    fn three_way_merge_takes_the_one_side_that_changed_site_metadata() {
        let base = base_site(vec![]);
        let ours = base.clone();
        let mut theirs = base.clone();
        theirs.name = "Renamed".to_string();

        let result = three_way_merge(&base, &ours, &theirs);
        assert!(result.is_clean());
        assert_eq!(result.site.name, "Renamed");
    }

    #[test]
    fn three_way_merge_reports_a_conflict_for_divergent_metadata_edits() {
        let base = base_site(vec![]);
        let mut ours = base.clone();
        ours.name = "Ours".to_string();
        let mut theirs = base.clone();
        theirs.name = "Theirs".to_string();

        let result = three_way_merge(&base, &ours, &theirs);
        assert!(result.conflicts.iter().any(|c| c.subject_id == "site.name"));
        // Falls back to base pending resolution.
        assert_eq!(result.site.name, "Site");
    }

    #[test]
    fn unrelated_zone_and_building_changes_do_not_interfere_with_lot_merge() {
        let zone = PlanElement::Zone(Zone {
            base: new_base("z1", ElementKind::Zone, "Zone", "l", square(100.0)),
            designation: "R-1".to_string(),
            allowed_uses: vec![],
            max_coverage: None,
            max_far: None,
            max_height: None,
            min_setback: None,
        });
        let building = PlanElement::Building(Building {
            base: new_base("b1", ElementKind::Building, "House", "l", square(10.0)),
            lot_id: None,
            storeys: 1.0,
            height: Some(5.0),
            dwelling_units: None,
            use_: None,
        });
        let base = base_site(vec![zone, building, lot("l1", Some(2.0))]);
        let mut ours = base.clone();
        if let PlanElement::Building(b) = &mut ours.elements[1] {
            b.height = Some(8.0);
        }
        let mut theirs = base.clone();
        theirs.elements[2] = lot("l1", Some(6.0));

        let result = three_way_merge(&base, &ours, &theirs);
        assert!(result.is_clean());
        assert_eq!(result.site.elements.len(), 3);
    }
}
