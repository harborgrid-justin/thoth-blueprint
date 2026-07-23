//! Free-text element search. Port of `packages/domain/src/planning/search.ts`.

use crate::elements::PlanElement;

/// Free-text haystack for an element: its kind plus name and the planning
/// attributes a planner would search by (APN, zoning designation, land-use
/// category, building use, etc.). Lower-cased for case-insensitive matching.
pub fn element_search_text(el: &PlanElement) -> String {
    let mut parts: Vec<String> = vec![kind_str(el)];

    match el {
        PlanElement::Note(n) => parts.push(n.text.clone()),
        PlanElement::Tree(t) => parts.push(t.species.clone().unwrap_or_default()),
        PlanElement::Spot(s) => parts.push(s.label.clone().unwrap_or_default()),
        PlanElement::Parcel(p) => {
            parts.push(p.base.name.clone());
            parts.push(p.apn.clone().unwrap_or_default());
        }
        PlanElement::Zone(z) => {
            parts.push(z.base.name.clone());
            parts.push(z.designation.clone());
            for u in &z.allowed_uses {
                parts.push(format!("{:?}", u).to_lowercase());
            }
        }
        PlanElement::LandUse(l) => {
            parts.push(l.base.name.clone());
            parts.push(format!("{:?}", l.category).to_lowercase());
        }
        PlanElement::Building(b) => {
            parts.push(b.base.name.clone());
            parts.push(
                b.use_
                    .map(|u| format!("{u:?}").to_lowercase())
                    .unwrap_or_default(),
            );
        }
        PlanElement::Region(r) => {
            parts.push(r.base.name.clone());
            parts.push(
                r.region_type
                    .map(|t| format!("{t:?}").to_lowercase())
                    .unwrap_or_default(),
            );
        }
        PlanElement::WaterBody(w) => {
            parts.push(w.base.name.clone());
            parts.push(
                w.water_type
                    .map(|t| format!("{t:?}").to_lowercase())
                    .unwrap_or_default(),
            );
        }
        PlanElement::PlantingArea(p) => {
            parts.push(p.base.name.clone());
            parts.push(
                p.planting_type
                    .map(|t| format!("{t:?}").to_lowercase())
                    .unwrap_or_default(),
            );
        }
        other => {
            if let Some(base) = other.base() {
                parts.push(base.name.clone());
            }
        }
    }

    parts.join(" ").to_lowercase()
}

/// The wire-format `"kind"` string tag for an element (matches
/// [`crate::elements::PlanElement`]'s serde tag exactly).
fn kind_str(el: &PlanElement) -> String {
    match serde_json::to_value(el.kind()) {
        Ok(serde_json::Value::String(s)) => s,
        _ => unreachable!("ElementKind always serializes to a JSON string"),
    }
}

/// Does an element match a free-text query and an optional kind filter?
/// `kind = None` matches every kind (the TS `"all"` sentinel).
pub fn element_matches(
    el: &PlanElement,
    query: &str,
    kind: Option<thoth_spatial::ElementKind>,
) -> bool {
    if let Some(kind) = kind {
        if el.kind() != kind {
            return false;
        }
    }
    let q = query.trim().to_lowercase();
    if q.is_empty() {
        return true;
    }
    element_search_text(el).contains(&q)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::elements::{new_base, Lot, Parcel, Zone};
    use crate::land_use::LandUseCategory;
    use thoth_spatial::{ElementKind, Point};

    fn square(size: f64) -> Vec<Point> {
        vec![
            Point::new(0.0, 0.0),
            Point::new(size, 0.0),
            Point::new(size, size),
            Point::new(0.0, size),
        ]
    }

    #[test]
    fn search_text_includes_the_kind_and_name() {
        let lot = PlanElement::Lot(Lot {
            base: new_base("l1", ElementKind::Lot, "Corner Lot", "layer", square(10.0)),
            parcel_id: None,
            block_id: None,
            setback: None,
        });
        let text = element_search_text(&lot);
        assert!(text.contains("lot"));
        assert!(text.contains("corner lot"));
    }

    #[test]
    fn search_text_includes_the_apn_for_a_parcel() {
        let parcel = PlanElement::Parcel(Parcel {
            base: new_base("p1", ElementKind::Parcel, "Parcel A", "layer", square(10.0)),
            apn: Some("123-45-678".to_string()),
        });
        assert!(element_search_text(&parcel).contains("123-45-678"));
    }

    #[test]
    fn search_text_includes_zoning_designation_and_allowed_uses() {
        let zone = PlanElement::Zone(Zone {
            base: new_base("z1", ElementKind::Zone, "Downtown", "layer", square(10.0)),
            designation: "MU-1".to_string(),
            allowed_uses: vec![LandUseCategory::Commercial, LandUseCategory::MixedUse],
            max_coverage: None,
            max_far: None,
            max_height: None,
            min_setback: None,
        });
        let text = element_search_text(&zone);
        assert!(text.contains("mu-1"));
        assert!(text.contains("commercial"));
    }

    #[test]
    fn element_matches_filters_by_kind_and_query() {
        let lot = PlanElement::Lot(Lot {
            base: new_base("l1", ElementKind::Lot, "Corner Lot", "layer", square(10.0)),
            parcel_id: None,
            block_id: None,
            setback: None,
        });
        assert!(element_matches(&lot, "corner", Some(ElementKind::Lot)));
        assert!(!element_matches(&lot, "corner", Some(ElementKind::Zone)));
        assert!(!element_matches(&lot, "nonexistent", None));
        assert!(element_matches(&lot, "", None));
    }
}
