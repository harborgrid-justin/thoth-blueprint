//! Renovation-mode takeoffs and design audit: separating material quantities
//! by renovation status, and flagging structural/zoning clashes between
//! existing, new, and demolished elements.
//!
//! Port of `packages/domain/src/planning/renovation.ts` +
//! `packages/domain/src/planning/types/renovation.ts`.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use thoth_spatial::{Bounds, Polygon, RenovationStatus};

use crate::curve::boundary_area;
use crate::elements::{PlanElement, Site};

/// Takeoff results separating quantities by renovation status.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct RenovationTakeoff {
    pub status: RenovationStatus,
    pub count: u32,
    pub total_area: f64,
}

/// The `Record<string, RenovationTakeoff>` key TS uses for each status
/// (`RenovationStatus` doesn't derive `Ord`/`Hash` in the frozen
/// `thoth-spatial` crate, so — matching the TS `Record<string, …>` return
/// type exactly — takeoffs are keyed by this string, not the enum itself).
pub fn status_key(status: RenovationStatus) -> &'static str {
    match status {
        RenovationStatus::Existing => "existing",
        RenovationStatus::New => "new",
        RenovationStatus::Demolished => "demolished",
    }
}

/// Compute material quantity takeoffs separated by renovation status.
pub fn compute_renovation_takeoffs(site: &Site) -> BTreeMap<&'static str, RenovationTakeoff> {
    let mut takeoffs = BTreeMap::new();
    for status in [
        RenovationStatus::Existing,
        RenovationStatus::New,
        RenovationStatus::Demolished,
    ] {
        takeoffs.insert(
            status_key(status),
            RenovationTakeoff {
                status,
                count: 0,
                total_area: 0.0,
            },
        );
    }

    for el in &site.elements {
        let status = renovation_status(el);
        let record = takeoffs
            .get_mut(status_key(status))
            .expect("all three statuses seeded above");
        record.count += 1;
        if let Some(base) = el.base() {
            record.total_area += boundary_area(&base.boundary, base.arcs.as_ref());
        }
    }

    takeoffs
}

fn renovation_status(el: &PlanElement) -> RenovationStatus {
    match el {
        PlanElement::Note(n) => n.renovation_status,
        PlanElement::Tree(t) => t.renovation_status,
        PlanElement::Spot(s) => s.renovation_status,
        _ => el.base().map(|b| b.renovation_status).unwrap_or_default(),
    }
}

fn bounds_of(poly: &Polygon) -> Bounds {
    let mut min_x = f64::INFINITY;
    let mut min_y = f64::INFINITY;
    let mut max_x = f64::NEG_INFINITY;
    let mut max_y = f64::NEG_INFINITY;
    for p in poly {
        min_x = min_x.min(p.x);
        max_x = max_x.max(p.x);
        min_y = min_y.min(p.y);
        max_y = max_y.max(p.y);
    }
    Bounds {
        min_x,
        min_y,
        max_x,
        max_y,
    }
}

/// Simple AABB overlap check — a pragmatic stand-in for exact polygon
/// intersection, matching the TS original's own bounding-box approximation.
fn polygons_intersect(poly_a: &Polygon, poly_b: &Polygon) -> bool {
    if poly_a.is_empty() || poly_b.is_empty() {
        return false;
    }
    let box_a = bounds_of(poly_a);
    let box_b = bounds_of(poly_b);
    box_a.min_x <= box_b.max_x
        && box_a.max_x >= box_b.min_x
        && box_a.min_y <= box_b.max_y
        && box_a.max_y >= box_b.min_y
}

/// Audit a renovation layout for structural and zoning-standard violations:
/// new buildings colliding with demolished parcels, protected parcels being
/// demolished, and new buildings clashing with existing ones.
pub fn run_renovation_audit(site: &Site) -> Vec<String> {
    let mut warnings = Vec::new();

    let new_buildings: Vec<&crate::elements::Building> = site
        .elements
        .iter()
        .filter_map(|e| match e {
            PlanElement::Building(b) if b.base.renovation_status == RenovationStatus::New => {
                Some(b)
            }
            _ => None,
        })
        .collect();
    let existing_buildings: Vec<&crate::elements::Building> = site
        .elements
        .iter()
        .filter_map(|e| match e {
            PlanElement::Building(b) if b.base.renovation_status == RenovationStatus::Existing => {
                Some(b)
            }
            _ => None,
        })
        .collect();
    let demolished_parcels: Vec<&crate::elements::Parcel> = site
        .elements
        .iter()
        .filter_map(|e| match e {
            PlanElement::Parcel(p) if p.base.renovation_status == RenovationStatus::Demolished => {
                Some(p)
            }
            _ => None,
        })
        .collect();

    // Rule 1: placing a new structure inside a demolished parcel.
    for new_b in &new_buildings {
        for demo_p in &demolished_parcels {
            if polygons_intersect(&new_b.base.boundary, &demo_p.base.boundary) {
                warnings.push(format!(
                    "Violation: New building \"{}\" intersects with demolished parcel \"{}\".",
                    new_b.base.name, demo_p.base.name
                ));
            }
        }
    }

    // Rule 2: demolishing a protected parcel.
    for el in &site.elements {
        if let PlanElement::Parcel(p) = el {
            if p.base.renovation_status == RenovationStatus::Demolished
                && p.apn.as_deref() == Some("PROTECTED")
            {
                warnings.push(format!(
                    "Violation: Cannot demolish protected parcel \"{}\".",
                    p.base.name
                ));
            }
        }
    }

    // Rule 3: new buildings overlapping existing buildings.
    for new_b in &new_buildings {
        for exist_b in &existing_buildings {
            if polygons_intersect(&new_b.base.boundary, &exist_b.base.boundary) {
                warnings.push(format!(
                    "Violation: New building \"{}\" overlaps with existing building \"{}\".",
                    new_b.base.name, exist_b.base.name
                ));
            }
        }
    }

    warnings
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::elements::{new_base, Building, Parcel};
    use thoth_spatial::{ElementKind, Point, SpatialContext, Unit};

    fn ctx() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: Unit::Meters,
            scale: 1.0,
        }
    }

    fn rect(x0: f64, y0: f64, x1: f64, y1: f64) -> Polygon {
        vec![
            Point::new(x0, y0),
            Point::new(x1, y0),
            Point::new(x1, y1),
            Point::new(x0, y1),
        ]
    }

    #[test]
    fn takeoffs_separate_areas_by_renovation_status() {
        let mut existing = Building {
            base: new_base(
                "b1",
                ElementKind::Building,
                "Existing Building",
                "l",
                rect(0.0, 0.0, 10.0, 10.0),
            ),
            lot_id: None,
            storeys: 1.0,
            height: None,
            dwelling_units: None,
            use_: None,
        };
        existing.base.renovation_status = RenovationStatus::Existing;

        let mut new_b = Building {
            base: new_base(
                "b2",
                ElementKind::Building,
                "New Building Extension",
                "l",
                rect(10.0, 0.0, 20.0, 10.0),
            ),
            lot_id: None,
            storeys: 1.0,
            height: None,
            dwelling_units: None,
            use_: None,
        };
        new_b.base.renovation_status = RenovationStatus::New;

        let mut demo = Building {
            base: new_base(
                "b3",
                ElementKind::Building,
                "Demolished Shed",
                "l",
                rect(30.0, 0.0, 35.0, 5.0),
            ),
            lot_id: None,
            storeys: 1.0,
            height: None,
            dwelling_units: None,
            use_: None,
        };
        demo.base.renovation_status = RenovationStatus::Demolished;

        let site = Site {
            id: "s1".to_string(),
            name: "Renovation Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements: vec![
                PlanElement::Building(existing),
                PlanElement::Building(new_b),
                PlanElement::Building(demo),
            ],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
        };

        let takeoffs = compute_renovation_takeoffs(&site);
        assert_eq!(takeoffs["existing"].count, 1);
        assert_eq!(takeoffs["existing"].total_area, 100.0);
        assert_eq!(takeoffs["new"].count, 1);
        assert_eq!(takeoffs["new"].total_area, 100.0);
        assert_eq!(takeoffs["demolished"].count, 1);
        assert_eq!(takeoffs["demolished"].total_area, 25.0);
    }

    #[test]
    fn audit_reports_intersection_and_protected_demolition_violations() {
        let mut demo_parcel = Parcel {
            base: new_base(
                "p1",
                ElementKind::Parcel,
                "Demolished Parcel",
                "l",
                rect(0.0, 0.0, 50.0, 50.0),
            ),
            apn: None,
        };
        demo_parcel.base.renovation_status = RenovationStatus::Demolished;

        let mut new_building = Building {
            base: new_base(
                "b1",
                ElementKind::Building,
                "New Window/Structure",
                "l",
                rect(10.0, 10.0, 20.0, 20.0),
            ),
            lot_id: None,
            storeys: 1.0,
            height: None,
            dwelling_units: None,
            use_: None,
        };
        new_building.base.renovation_status = RenovationStatus::New;

        let mut protected_parcel = Parcel {
            base: new_base(
                "p2",
                ElementKind::Parcel,
                "Protected Existing Parcel",
                "l",
                rect(100.0, 100.0, 150.0, 150.0),
            ),
            apn: Some("PROTECTED".to_string()),
        };
        protected_parcel.base.renovation_status = RenovationStatus::Demolished;

        let site = Site {
            id: "s1".to_string(),
            name: "Renovation Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements: vec![
                PlanElement::Parcel(demo_parcel),
                PlanElement::Building(new_building),
                PlanElement::Parcel(protected_parcel),
            ],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
        };

        let warnings = run_renovation_audit(&site);
        assert_eq!(warnings.len(), 2);
        assert!(warnings[0].contains("New building \"New Window/Structure\" intersects with demolished parcel \"Demolished Parcel\""));
        assert!(
            warnings[1].contains("Cannot demolish protected parcel \"Protected Existing Parcel\"")
        );
    }
}
