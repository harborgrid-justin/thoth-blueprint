//! Planning rules: buildable envelopes from setbacks, a pragmatic grid
//! subdivision, and compliance checks against zoning constraints. These share
//! the geometry/metric functions so results are consistent everywhere the
//! model runs.
//!
//! Port of `packages/domain/src/planning/rules.ts`.

use thoth_spatial::{
    area as polygon_area, bounds, centroid, offset_polygon, point_in_polygon, ComplianceFinding,
    ComplianceSeverity, ElementKind, Point, Polygon,
};

use crate::elements::{new_base, Building, Lot, Site, Zone};
use crate::erosion::audit_erosion_compliance;

/// Options controlling a simple grid subdivision of a parcel-like boundary.
pub struct SubdivisionOptions<'a> {
    /// Number of columns of lots.
    pub columns: u32,
    /// Number of rows of lots.
    pub rows: u32,
    /// Gap between lots in plan units (interpreted as internal ROW/spacing).
    pub gap: f64,
    /// Layer the produced lots are placed on.
    pub layer_id: String,
    /// Generator for new lot ids.
    pub make_id: Box<dyn FnMut() -> String + 'a>,
    /// Optional setback stamped onto each produced lot.
    pub setback: Option<f64>,
}

/// The buildable envelope of a lot: its boundary inset by the lot's setback.
/// Returns `None` if the setback consumes the whole lot.
pub fn buildable_envelope(lot: &Lot) -> Option<Polygon> {
    let setback = lot.setback.unwrap_or(0.0);
    if setback <= 0.0 {
        return Some(lot.base.boundary.clone());
    }
    offset_polygon(&lot.base.boundary, setback)
}

/// Buildable area of a lot in plan units² after applying its setback.
pub fn buildable_area(lot: &Lot) -> f64 {
    buildable_envelope(lot)
        .map(|env| polygon_area(&env))
        .unwrap_or(0.0)
}

/// Divide a boundary into a grid of lots. This is a pragmatic first-pass
/// subdivision (bounding-box grid clipped to the boundary by a centroid
/// test), not a survey-grade metes-and-bounds subdivision — adequate for
/// early feasibility sketches. Returns an empty list for a nonsensical grid
/// (fewer than one row/column, or cells too small/large to fit) rather than
/// erroring, matching the TS original.
pub fn subdivide_grid(boundary: &Polygon, mut options: SubdivisionOptions) -> Vec<Lot> {
    if options.columns < 1 || options.rows < 1 {
        return Vec::new();
    }

    let box_ = bounds(boundary);
    let total_w = box_.max_x - box_.min_x;
    let total_h = box_.max_y - box_.min_y;
    let columns = options.columns as f64;
    let rows = options.rows as f64;
    let cell_w = (total_w - options.gap * (columns - 1.0)) / columns;
    let cell_h = (total_h - options.gap * (rows - 1.0)) / rows;
    if cell_w <= 0.0 || cell_h <= 0.0 {
        return Vec::new();
    }

    let mut lots: Vec<Lot> = Vec::new();
    for r in 0..options.rows {
        for c in 0..options.columns {
            let x0 = box_.min_x + c as f64 * (cell_w + options.gap);
            let y0 = box_.min_y + r as f64 * (cell_h + options.gap);
            let cell: Polygon = vec![
                Point::new(x0, y0),
                Point::new(x0 + cell_w, y0),
                Point::new(x0 + cell_w, y0 + cell_h),
                Point::new(x0, y0 + cell_h),
            ];
            let center = Point::new(x0 + cell_w / 2.0, y0 + cell_h / 2.0);
            if !point_in_polygon(center, boundary) {
                continue;
            }
            lots.push(Lot {
                base: new_base(
                    (options.make_id)(),
                    ElementKind::Lot,
                    format!("Lot {}", lots.len() + 1),
                    options.layer_id.clone(),
                    cell,
                ),
                parcel_id: None,
                block_id: None,
                setback: options.setback,
            });
        }
    }
    lots
}

/// Check buildings against the coverage/FAR/height limits of the zones that
/// contain them. A building is attributed to a zone when its centroid lies
/// within the zone boundary. Also runs the erosion-control compliance audit
/// and appends its findings.
pub fn check_compliance(site: &Site) -> Vec<ComplianceFinding> {
    let mut findings: Vec<ComplianceFinding> = Vec::new();

    let zones: Vec<&Zone> = site
        .elements
        .iter()
        .filter_map(|e| match e {
            crate::elements::PlanElement::Zone(z) => Some(z),
            _ => None,
        })
        .collect();
    let buildings: Vec<&Building> = site
        .elements
        .iter()
        .filter_map(|e| match e {
            crate::elements::PlanElement::Building(b) => Some(b),
            _ => None,
        })
        .collect();
    let lots: Vec<&Lot> = site
        .elements
        .iter()
        .filter_map(|e| match e {
            crate::elements::PlanElement::Lot(l) => Some(l),
            _ => None,
        })
        .collect();

    for building in &buildings {
        let footprint = polygon_area(&building.base.boundary);
        let center = centroid(&building.base.boundary);

        let Some(zone) = zones
            .iter()
            .find(|z| point_in_polygon(center, &z.base.boundary))
        else {
            continue;
        };

        let lot = lots
            .iter()
            .find(|l| point_in_polygon(center, &l.base.boundary));
        let lot_area = lot.map(|l| polygon_area(&l.base.boundary));

        if let (Some(max_coverage), Some(lot_area)) = (zone.max_coverage, lot_area) {
            if lot_area > 0.0 {
                let cov = footprint / lot_area;
                if cov > max_coverage + 1e-6 {
                    findings.push(ComplianceFinding {
                        severity: ComplianceSeverity::Error,
                        code: "coverage.exceeded".to_string(),
                        message: format!(
                            "{} covers {:.0}% of its lot; zone {} allows {:.0}%.",
                            building.base.name,
                            cov * 100.0,
                            zone.designation,
                            max_coverage * 100.0
                        ),
                        element_id: Some(building.base.id.clone()),
                    });
                }
            }
        }

        if let (Some(max_far), Some(lot_area)) = (zone.max_far, lot_area) {
            if lot_area > 0.0 {
                let far = (footprint * building.storeys.max(1.0)) / lot_area;
                if far > max_far + 1e-6 {
                    findings.push(ComplianceFinding {
                        severity: ComplianceSeverity::Error,
                        code: "far.exceeded".to_string(),
                        message: format!(
                            "{} FAR {:.2} exceeds zone {} limit of {:.2}.",
                            building.base.name, far, zone.designation, max_far
                        ),
                        element_id: Some(building.base.id.clone()),
                    });
                }
            }
        }

        if let (Some(max_height), Some(height)) = (zone.max_height, building.height) {
            if height > max_height {
                findings.push(ComplianceFinding {
                    severity: ComplianceSeverity::Error,
                    code: "height.exceeded".to_string(),
                    message: format!(
                        "{} height {} exceeds zone {} limit of {}.",
                        building.base.name, height, zone.designation, max_height
                    ),
                    element_id: Some(building.base.id.clone()),
                });
            }
        }

        if !zone.allowed_uses.is_empty() {
            if let Some(use_) = building.use_ {
                if !zone.allowed_uses.contains(&use_) {
                    findings.push(ComplianceFinding {
                        severity: ComplianceSeverity::Warning,
                        code: "use.disallowed".to_string(),
                        message: format!(
                            "{} use \"{:?}\" is not permitted in zone {}.",
                            building.base.name, use_, zone.designation
                        ),
                        element_id: Some(building.base.id.clone()),
                    });
                }
            }
        }
    }

    for lot in &lots {
        let envelope = buildable_envelope(lot);
        if lot.setback.is_some_and(|s| s > 0.0) && envelope.is_none() {
            findings.push(ComplianceFinding {
                severity: ComplianceSeverity::Warning,
                code: "setback.consumesLot".to_string(),
                message: format!(
                    "{} setback of {} leaves no buildable area.",
                    lot.base.name,
                    lot.setback.unwrap()
                ),
                element_id: Some(lot.base.id.clone()),
            });
        }
    }

    if findings.is_empty() {
        findings.push(ComplianceFinding {
            severity: ComplianceSeverity::Info,
            code: "compliant".to_string(),
            message: "No zoning conflicts detected.".to_string(),
            element_id: None,
        });
    }

    findings.extend(audit_erosion_compliance(site));

    findings
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::elements::PlanElement;
    use crate::land_use::LandUseCategory;
    use approx::assert_relative_eq;
    use thoth_spatial::{SpatialContext, Unit};

    fn square(size: f64) -> Polygon {
        vec![
            Point::new(0.0, 0.0),
            Point::new(size, 0.0),
            Point::new(size, size),
            Point::new(0.0, size),
        ]
    }

    fn ctx() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: Unit::Meters,
            scale: 1.0,
        }
    }

    fn lot_with_setback(setback: Option<f64>) -> Lot {
        Lot {
            base: new_base("l1", ElementKind::Lot, "Lot 1", "layer", square(20.0)),
            parcel_id: None,
            block_id: None,
            setback,
        }
    }

    #[test]
    fn buildable_envelope_is_full_boundary_without_setback() {
        let lot = lot_with_setback(None);
        let env = buildable_envelope(&lot).unwrap();
        assert_relative_eq!(polygon_area(&env), 400.0, epsilon = 1e-9);
    }

    #[test]
    fn buildable_envelope_insets_by_setback() {
        let lot = lot_with_setback(Some(2.0));
        let env = buildable_envelope(&lot).unwrap();
        assert_relative_eq!(polygon_area(&env), 16.0 * 16.0, epsilon = 1e-6);
    }

    #[test]
    fn buildable_envelope_is_none_when_setback_consumes_lot() {
        let lot = lot_with_setback(Some(15.0));
        assert!(buildable_envelope(&lot).is_none());
        assert_eq!(buildable_area(&lot), 0.0);
    }

    #[test]
    fn subdivide_grid_produces_expected_lot_count_and_naming() {
        let boundary = square(100.0);
        let lots = subdivide_grid(
            &boundary,
            SubdivisionOptions {
                columns: 2,
                rows: 2,
                gap: 0.0,
                layer_id: "l".to_string(),
                make_id: Box::new(|| "lot".to_string()),
                setback: None,
            },
        );
        assert_eq!(lots.len(), 4);
        for lot in &lots {
            assert_relative_eq!(polygon_area(&lot.base.boundary), 2500.0, epsilon = 1e-6);
        }
    }

    #[test]
    fn subdivide_grid_returns_empty_for_invalid_dimensions() {
        let boundary = square(100.0);
        let lots = subdivide_grid(
            &boundary,
            SubdivisionOptions {
                columns: 0,
                rows: 2,
                gap: 0.0,
                layer_id: "l".to_string(),
                make_id: Box::new(|| "lot".to_string()),
                setback: None,
            },
        );
        assert!(lots.is_empty());
    }

    #[test]
    fn check_compliance_reports_no_conflicts_on_an_empty_site() {
        let site = Site {
            id: "s".to_string(),
            name: "Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements: vec![],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
            monuments: None,
            plss: None,
        };
        let findings = check_compliance(&site);
        // Compliant + erosion audit's own default finding.
        assert!(findings.iter().any(|f| f.code == "compliant"));
    }

    #[test]
    fn check_compliance_flags_coverage_exceeded() {
        let zone = crate::elements::Zone {
            base: new_base("z1", ElementKind::Zone, "Zone 1", "l", square(100.0)),
            designation: "R-1".to_string(),
            allowed_uses: vec![],
            max_coverage: Some(0.2),
            max_far: None,
            max_height: None,
            min_setback: None,
        };
        let lot = Lot {
            base: new_base("lo1", ElementKind::Lot, "Lot 1", "l", square(100.0)),
            parcel_id: None,
            block_id: None,
            setback: None,
        };
        let building = Building {
            base: new_base("b1", ElementKind::Building, "Building 1", "l", square(50.0)),
            lot_id: None,
            storeys: 1.0,
            height: None,
            dwelling_units: None,
            use_: None,
        };
        let site = Site {
            id: "s".to_string(),
            name: "Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements: vec![
                PlanElement::Zone(zone),
                PlanElement::Lot(lot),
                PlanElement::Building(building),
            ],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
            monuments: None,
            plss: None,
        };
        let findings = check_compliance(&site);
        assert!(findings.iter().any(|f| f.code == "coverage.exceeded"));
    }

    #[test]
    fn check_compliance_flags_disallowed_use() {
        let zone = crate::elements::Zone {
            base: new_base("z1", ElementKind::Zone, "Zone 1", "l", square(100.0)),
            designation: "R-1".to_string(),
            allowed_uses: vec![LandUseCategory::Residential],
            max_coverage: None,
            max_far: None,
            max_height: None,
            min_setback: None,
        };
        let building = Building {
            base: new_base("b1", ElementKind::Building, "Building 1", "l", square(50.0)),
            lot_id: None,
            storeys: 1.0,
            height: None,
            dwelling_units: None,
            use_: Some(LandUseCategory::Commercial),
        };
        let site = Site {
            id: "s".to_string(),
            name: "Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements: vec![PlanElement::Zone(zone), PlanElement::Building(building)],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
            monuments: None,
            plss: None,
        };
        let findings = check_compliance(&site);
        assert!(findings.iter().any(|f| f.code == "use.disallowed"));
    }
}
