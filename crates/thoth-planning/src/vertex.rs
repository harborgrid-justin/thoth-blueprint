//! Vertex/edge and copy-paste editing helpers. Port of
//! `packages/domain/src/planning/vertex.ts`.
//!
//! Small, but each helper depends on the `isPointElement`/`isSpatialElement`
//! predicates the TS original imports from `spatial/primitives` — this port
//! uses [`crate::elements::PlanElement::is_spatial`] and
//! [`crate::elements::PlanElement::base`]/[`crate::elements::PlanElement::base_mut`]
//! instead, which map onto exactly the same split (per the original
//! `STATUS.md` note flagging this as a good, quick follow-on pickup).

use thoth_spatial::{bounds, create_id, union_bounds, EdgeArcs, Point};

use crate::element_factory::kind_slug;
use crate::elements::PlanElement;

/// A "nice" paste offset derived from the copied elements' own extent: 5% of
/// the selection's larger bounding-box dimension (at least 1 plan unit),
/// applied equally in x and y. Falls back to a flat `(5, 5)` offset when no
/// spatial element is present to derive an extent from.
pub fn paste_offset(elements: &[PlanElement]) -> Point {
    let boxes: Vec<thoth_spatial::Bounds> = elements
        .iter()
        .filter(|e| e.is_spatial())
        .map(|e| bounds(&e.base().unwrap().boundary))
        .collect();

    match union_bounds(&boxes) {
        Some(b) => {
            let step = ((b.max_x - b.min_x).max(b.max_y - b.min_y) * 0.05).max(1.0);
            Point::new(step, step)
        }
        None => Point::new(5.0, 5.0),
    }
}

/// Re-key edge bulges after inserting a vertex following `after_index`. The
/// split edge's arc is dropped (a curve can't be split without
/// recomputation); edges after the insertion shift up by one.
pub fn reindex_arcs_after_insert(arcs: &EdgeArcs, after_index: usize) -> EdgeArcs {
    let mut out = EdgeArcs::new();
    for (k, v) in arcs {
        let i: usize = match k.parse() {
            Ok(i) => i,
            Err(_) => continue,
        };
        if i == after_index {
            continue;
        }
        let new_i = if i > after_index { i + 1 } else { i };
        out.insert(new_i.to_string(), *v);
    }
    out
}

/// Re-key edge bulges after deleting vertex `index` (out of `n` total
/// vertices before deletion). The two edges incident to the removed vertex
/// merge into one straight edge (their arcs are dropped); later edges shift
/// down by one.
pub fn reindex_arcs_after_delete(arcs: &EdgeArcs, index: usize, n: usize) -> EdgeArcs {
    let removed_prev = (index + n - 1) % n;
    let mut out = EdgeArcs::new();
    for (k, v) in arcs {
        let i: usize = match k.parse() {
            Ok(i) => i,
            Err(_) => continue,
        };
        if i == index || i == removed_prev {
            continue;
        }
        let new_i = if i > index { i - 1 } else { i };
        out.insert(new_i.to_string(), *v);
    }
    out
}

/// Clone an element with a fresh id, shifted by `(dx, dy)`, reparented to
/// `fallback_layer` if its original layer no longer exists.
pub fn offset_element(
    el: &PlanElement,
    dx: f64,
    dy: f64,
    layer_exists: impl Fn(&str) -> bool,
    fallback_layer: &str,
) -> PlanElement {
    let mut cloned = el.clone();
    let new_id = create_id(&kind_slug(cloned.kind()));

    if let Some(base) = cloned.base_mut() {
        base.id = new_id;
        if !layer_exists(&base.layer_id) {
            base.layer_id = fallback_layer.to_string();
        }
        for p in base.boundary.iter_mut() {
            p.x += dx;
            p.y += dy;
        }
    } else {
        match &mut cloned {
            PlanElement::Note(n) => {
                n.id = new_id;
                if !layer_exists(&n.layer_id) {
                    n.layer_id = fallback_layer.to_string();
                }
                n.position.x += dx;
                n.position.y += dy;
            }
            PlanElement::Tree(t) => {
                t.id = new_id;
                if !layer_exists(&t.layer_id) {
                    t.layer_id = fallback_layer.to_string();
                }
                t.position.x += dx;
                t.position.y += dy;
            }
            PlanElement::Spot(s) => {
                s.id = new_id;
                if !layer_exists(&s.layer_id) {
                    s.layer_id = fallback_layer.to_string();
                }
                s.position.x += dx;
                s.position.y += dy;
            }
            _ => unreachable!("every non-spatial kind is a point element"),
        }
    }

    cloned
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::elements::{new_base, Lot, Tree};
    use thoth_spatial::ElementKind;

    fn square(size: f64) -> Vec<Point> {
        vec![
            Point::new(0.0, 0.0),
            Point::new(size, 0.0),
            Point::new(size, size),
            Point::new(0.0, size),
        ]
    }

    #[test]
    fn paste_offset_scales_with_selection_extent() {
        let lot = PlanElement::Lot(Lot {
            base: new_base("l1", ElementKind::Lot, "Lot 1", "layer", square(100.0)),
            parcel_id: None,
            block_id: None,
            setback: None,
        });
        let offset = paste_offset(&[lot]);
        assert!((offset.x - 5.0).abs() < 1e-9); // 5% of 100.0
        assert_eq!(offset.x, offset.y);
    }

    #[test]
    fn paste_offset_falls_back_to_5_5_with_no_spatial_elements() {
        let tree = PlanElement::Tree(Tree {
            id: "t1".to_string(),
            kind: ElementKind::Tree,
            layer_id: "layer".to_string(),
            position: Point::new(0.0, 0.0),
            species: None,
            canopy_radius: 3.0,
            renovation_status: Default::default(),
        });
        let offset = paste_offset(&[tree]);
        assert_eq!(offset, Point::new(5.0, 5.0));
    }

    #[test]
    fn reindex_after_insert_drops_the_split_edge_and_shifts_later_ones() {
        let mut arcs = EdgeArcs::new();
        arcs.insert("0".to_string(), 0.5);
        arcs.insert("2".to_string(), 0.25);
        let reindexed = reindex_arcs_after_insert(&arcs, 0);
        // Edge 0 (split) is dropped; edge 2 shifts to 3.
        assert_eq!(reindexed.len(), 1);
        assert_eq!(reindexed.get("3"), Some(&0.25));
    }

    #[test]
    fn reindex_after_delete_merges_both_incident_edges_and_shifts_later_ones() {
        let mut arcs = EdgeArcs::new();
        arcs.insert("0".to_string(), 0.1); // incident to vertex 1 (prev edge)
        arcs.insert("1".to_string(), 0.2); // incident to vertex 1 (next edge, being deleted)
        arcs.insert("3".to_string(), 0.3); // unaffected, shifts down by 1
        let reindexed = reindex_arcs_after_delete(&arcs, 1, 4);
        assert_eq!(reindexed.len(), 1);
        assert_eq!(reindexed.get("2"), Some(&0.3));
    }

    #[test]
    fn offset_element_translates_a_spatial_boundary_and_assigns_a_new_id() {
        let lot = PlanElement::Lot(Lot {
            base: new_base("l1", ElementKind::Lot, "Lot 1", "layer-a", square(10.0)),
            parcel_id: None,
            block_id: None,
            setback: None,
        });
        let offset = offset_element(&lot, 5.0, 5.0, |l| l == "layer-a", "layer-fallback");
        let base = offset.base().unwrap();
        assert_ne!(base.id, "l1");
        assert_eq!(base.layer_id, "layer-a");
        assert_eq!(base.boundary[0], Point::new(5.0, 5.0));
    }

    #[test]
    fn offset_element_reparents_to_the_fallback_layer_when_the_original_is_gone() {
        let lot = PlanElement::Lot(Lot {
            base: new_base(
                "l1",
                ElementKind::Lot,
                "Lot 1",
                "layer-deleted",
                square(10.0),
            ),
            parcel_id: None,
            block_id: None,
            setback: None,
        });
        let offset = offset_element(&lot, 0.0, 0.0, |_| false, "layer-fallback");
        assert_eq!(offset.base().unwrap().layer_id, "layer-fallback");
    }

    #[test]
    fn offset_element_translates_a_point_elements_position() {
        let tree = PlanElement::Tree(Tree {
            id: "t1".to_string(),
            kind: ElementKind::Tree,
            layer_id: "layer-a".to_string(),
            position: Point::new(1.0, 1.0),
            species: None,
            canopy_radius: 3.0,
            renovation_status: Default::default(),
        });
        let offset = offset_element(&tree, 2.0, 3.0, |l| l == "layer-a", "layer-fallback");
        match offset {
            PlanElement::Tree(t) => {
                assert_ne!(t.id, "t1");
                assert_eq!(t.position, Point::new(3.0, 4.0));
            }
            _ => panic!("expected a Tree"),
        }
    }
}
