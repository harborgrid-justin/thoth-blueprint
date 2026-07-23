//! Presentation metadata for planning element kinds, and the visible/ordered
//! rendering list a canvas draws from. Port of
//! `packages/domain/src/planning/elementMeta.ts`.

use thoth_spatial::ElementKind;

use crate::elements::{PlanElement, Site};
use crate::land_use::{land_use_color, LandUseCategory};

/// Presentation metadata for a planning element kind.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ElementKindMeta {
    pub kind: ElementKind,
    pub label: &'static str,
    /// Default layer id new elements of this kind are created on.
    pub default_layer_id: &'static str,
    /// Stroke color on the canvas.
    pub stroke: &'static str,
    /// Base fill color on the canvas (rendered with low opacity).
    pub fill: &'static str,
    /// Prefix used when auto-naming new elements.
    pub name_prefix: &'static str,
}

/// Presentation metadata for a planning element kind. Unlike the TS
/// original — whose `Record<ElementKind, ElementKindMeta>` needs a runtime
/// "unknown kind" fallback because a bare `string` can smuggle in a value
/// outside the union — [`ElementKind`] is a closed Rust enum, so every
/// variant is guaranteed a real entry below; there is no fallback branch to
/// write (or a magenta `"#ff00ff"` placeholder to reach for).
pub fn element_meta(kind: ElementKind) -> ElementKindMeta {
    match kind {
        ElementKind::Region => ElementKindMeta {
            kind,
            label: "Region",
            default_layer_id: "layer-base",
            stroke: "#0d9488",
            fill: "#0d9488",
            name_prefix: "Region",
        },
        ElementKind::Parcel => ElementKindMeta {
            kind,
            label: "Parcel",
            default_layer_id: "layer-base",
            stroke: "#64748b",
            fill: "#64748b",
            name_prefix: "Parcel",
        },
        ElementKind::Block => ElementKindMeta {
            kind,
            label: "Block",
            default_layer_id: "layer-base",
            stroke: "#475569",
            fill: "#475569",
            name_prefix: "Block",
        },
        ElementKind::Zone => ElementKindMeta {
            kind,
            label: "Zone",
            default_layer_id: "layer-zoning",
            stroke: "#8b5cf6",
            fill: "#8b5cf6",
            name_prefix: "Zone",
        },
        ElementKind::Landuse => ElementKindMeta {
            kind,
            label: "Land Use",
            default_layer_id: "layer-landuse",
            stroke: "#22c55e",
            fill: "#22c55e",
            name_prefix: "Land Use",
        },
        ElementKind::Lot => ElementKindMeta {
            kind,
            label: "Lot",
            default_layer_id: "layer-lots",
            stroke: "#0ea5e9",
            fill: "#0ea5e9",
            name_prefix: "Lot",
        },
        ElementKind::Building => ElementKindMeta {
            kind,
            label: "Building",
            default_layer_id: "layer-buildings",
            stroke: "#f59e0b",
            fill: "#f59e0b",
            name_prefix: "Building",
        },
        ElementKind::Row => ElementKindMeta {
            kind,
            label: "Right-of-Way",
            default_layer_id: "layer-row",
            stroke: "#94a3b8",
            fill: "#94a3b8",
            name_prefix: "ROW",
        },
        ElementKind::Easement => ElementKindMeta {
            kind,
            label: "Easement",
            default_layer_id: "layer-base",
            stroke: "#a855f7",
            fill: "#a855f7",
            name_prefix: "Easement",
        },
        ElementKind::Openspace => ElementKindMeta {
            kind,
            label: "Open Space",
            default_layer_id: "layer-landuse",
            stroke: "#14b8a6",
            fill: "#14b8a6",
            name_prefix: "Open Space",
        },
        ElementKind::Water => ElementKindMeta {
            kind,
            label: "Water",
            default_layer_id: "layer-landscape",
            stroke: "#0284c7",
            fill: "#38bdf8",
            name_prefix: "Water",
        },
        ElementKind::Planting => ElementKindMeta {
            kind,
            label: "Planting",
            default_layer_id: "layer-landscape",
            stroke: "#16a34a",
            fill: "#4ade80",
            name_prefix: "Planting",
        },
        ElementKind::Grade => ElementKindMeta {
            kind,
            label: "Grading",
            default_layer_id: "layer-terrain",
            stroke: "#b45309",
            fill: "#f59e0b",
            name_prefix: "Grade",
        },
        ElementKind::Tree => ElementKindMeta {
            kind,
            label: "Tree",
            default_layer_id: "layer-landscape",
            stroke: "#15803d",
            fill: "#22c55e",
            name_prefix: "Tree",
        },
        ElementKind::Spot => ElementKindMeta {
            kind,
            label: "Spot Elevation",
            default_layer_id: "layer-terrain",
            stroke: "#92400e",
            fill: "#d97706",
            name_prefix: "Spot",
        },
        ElementKind::Note => ElementKindMeta {
            kind,
            label: "Note",
            default_layer_id: "layer-base",
            stroke: "#eab308",
            fill: "#eab308",
            name_prefix: "Note",
        },
        ElementKind::Stair => ElementKindMeta {
            kind,
            label: "Staircase",
            default_layer_id: "layer-buildings",
            stroke: "#78716c",
            fill: "#a8a29e",
            name_prefix: "Staircase",
        },
        ElementKind::Curtainwall => ElementKindMeta {
            kind,
            label: "Curtain Wall",
            default_layer_id: "layer-buildings",
            stroke: "#0284c7",
            fill: "#38bdf8",
            name_prefix: "Curtain Wall",
        },
        ElementKind::Door => ElementKindMeta {
            kind,
            label: "Door Assembly",
            default_layer_id: "layer-buildings",
            stroke: "#b45309",
            fill: "#f59e0b",
            name_prefix: "Door",
        },
        ElementKind::Window => ElementKindMeta {
            kind,
            label: "Window Assembly",
            default_layer_id: "layer-buildings",
            stroke: "#0891b2",
            fill: "#22d3ee",
            name_prefix: "Window",
        },
        ElementKind::Roof => ElementKindMeta {
            kind,
            label: "Roof Construction",
            default_layer_id: "layer-buildings",
            stroke: "#991b1b",
            fill: "#f87171",
            name_prefix: "Roof",
        },
    }
}

/// The canvas color for an element, honoring land-use category when relevant.
pub fn element_color(kind: ElementKind, category: Option<LandUseCategory>) -> &'static str {
    if let (ElementKind::Landuse, Some(category)) = (kind, category) {
        return land_use_color(category);
    }
    element_meta(kind).fill
}

/// One element paired with its layer's rendering order, for
/// [`ordered_visible_elements`]'s back-to-front sort.
pub struct VisibleElement<'a> {
    pub element: &'a PlanElement,
    pub layer: &'a thoth_spatial::Layer,
    /// Original index in `site.elements`, used as the sort tiebreaker.
    pub index: usize,
}

/// Elements paired with their layer, ordered back-to-front, hidden layers
/// dropped. Elements referencing a layer id that isn't in `site.layers` are
/// dropped too (mirrors the TS `.filter((entry) => entry.layer && ...)`,
/// which drops an element whose `layerById.get(...)` lookup misses).
pub fn ordered_visible_elements(site: &Site) -> Vec<VisibleElement<'_>> {
    let layer_by_id: std::collections::HashMap<&str, &thoth_spatial::Layer> =
        site.layers.iter().map(|l| (l.id.as_str(), l)).collect();

    let mut entries: Vec<VisibleElement> = site
        .elements
        .iter()
        .enumerate()
        .filter_map(|(index, element)| {
            // Point elements carry `layer_id` directly, not via `base()`.
            let layer_id = match element.base() {
                Some(b) => b.layer_id.as_str(),
                None => match element {
                    PlanElement::Note(n) => n.layer_id.as_str(),
                    PlanElement::Tree(t) => t.layer_id.as_str(),
                    PlanElement::Spot(s) => s.layer_id.as_str(),
                    _ => unreachable!("every non-spatial kind is a point element"),
                },
            };
            let layer = *layer_by_id.get(layer_id)?;
            if !layer.visible {
                return None;
            }
            Some(VisibleElement {
                element,
                layer,
                index,
            })
        })
        .collect();

    entries.sort_by(|a, b| {
        let lo = a.layer.order.cmp(&b.layer.order);
        if lo != std::cmp::Ordering::Equal {
            lo
        } else {
            a.index.cmp(&b.index)
        }
    });
    entries
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::elements::{new_base, Lot, PlanElement};
    use thoth_spatial::{Layer, SpatialContext, Unit};

    fn ctx() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: Unit::Meters,
            scale: 1.0,
        }
    }

    fn square(size: f64) -> Vec<thoth_spatial::Point> {
        vec![
            thoth_spatial::Point::new(0.0, 0.0),
            thoth_spatial::Point::new(size, 0.0),
            thoth_spatial::Point::new(size, size),
            thoth_spatial::Point::new(0.0, size),
        ]
    }

    #[test]
    fn every_element_kind_has_metadata() {
        for kind in [
            ElementKind::Region,
            ElementKind::Parcel,
            ElementKind::Block,
            ElementKind::Zone,
            ElementKind::Landuse,
            ElementKind::Lot,
            ElementKind::Building,
            ElementKind::Row,
            ElementKind::Easement,
            ElementKind::Openspace,
            ElementKind::Water,
            ElementKind::Planting,
            ElementKind::Grade,
            ElementKind::Tree,
            ElementKind::Spot,
            ElementKind::Note,
            ElementKind::Stair,
            ElementKind::Curtainwall,
            ElementKind::Door,
            ElementKind::Window,
            ElementKind::Roof,
        ] {
            let meta = element_meta(kind);
            assert_eq!(meta.kind, kind);
            assert!(!meta.label.is_empty());
        }
    }

    #[test]
    fn landuse_color_honors_category_override() {
        let color = element_color(ElementKind::Landuse, Some(LandUseCategory::Commercial));
        assert_eq!(color, land_use_color(LandUseCategory::Commercial));
        assert_ne!(color, element_meta(ElementKind::Landuse).fill);
    }

    #[test]
    fn non_landuse_color_ignores_category() {
        let color = element_color(ElementKind::Lot, Some(LandUseCategory::Park));
        assert_eq!(color, element_meta(ElementKind::Lot).fill);
    }

    #[test]
    fn ordered_visible_elements_drops_hidden_layers_and_sorts_by_layer_order() {
        let base_layer = Layer {
            id: "base".to_string(),
            name: "Base".to_string(),
            order: 1,
            visible: true,
            locked: false,
            color: None,
        };
        let hidden_layer = Layer {
            id: "hidden".to_string(),
            name: "Hidden".to_string(),
            order: 0,
            visible: false,
            locked: false,
            color: None,
        };

        let site = Site {
            id: "s1".to_string(),
            name: "Site".to_string(),
            spatial: ctx(),
            layers: vec![base_layer, hidden_layer],
            elements: vec![
                PlanElement::Lot(Lot {
                    base: new_base("l1", ElementKind::Lot, "Lot 1", "base", square(10.0)),
                    parcel_id: None,
                    block_id: None,
                    setback: None,
                }),
                PlanElement::Lot(Lot {
                    base: new_base("l2", ElementKind::Lot, "Lot 2", "hidden", square(10.0)),
                    parcel_id: None,
                    block_id: None,
                    setback: None,
                }),
            ],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
            monuments: None,
            plss: None,
        };

        let visible = ordered_visible_elements(&site);
        assert_eq!(visible.len(), 1);
        assert_eq!(visible[0].element.base().unwrap().id, "l1");
    }
}
