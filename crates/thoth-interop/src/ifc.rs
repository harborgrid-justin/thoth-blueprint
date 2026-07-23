//! Minimal IFC import — site/building **footprint-level geometry only**, for
//! coordinating a plan against a vertical building's BIM model.
//!
//! **Scope, precisely**: this is not an architectural IFC reader. It parses
//! the STEP (ISO-10303-21) `DATA;` section's entity records well enough to
//! extract:
//!
//! - Every `IFCCARTESIANPOINT` (2D or 3D; a 3D point's Z is kept as
//!   [`IfcPoint::z`] but this module does no elevation/extrusion modeling).
//! - Every **closed** `IFCPOLYLINE` (first point repeated at the end) built
//!   from those points, treated as a candidate building/site footprint and
//!   converted to a [`thoth_planning::PlanElement::Building`] (`storeys:
//!   1.0` — a documented default; this module has no floor-count data to
//!   draw from without walking a much larger part of the IFC schema).
//! - Every `IFCSITE`/`IFCBUILDING`/`IFCBUILDINGSTOREY` entity's `Name`
//!   attribute, listed separately as [`IfcImportResult::spatial_structure_names`]
//!   for the caller's own reference.
//!
//! **What this explicitly does not do**: it does **not** walk the IFC
//! placement/representation graph (`IfcProductDefinitionShape` →
//! `IfcShapeRepresentation` → `IfcRelContainedInSpatialStructure` /
//! `IfcRelAggregates`) to associate a footprint with the specific
//! `IfcSite`/`IfcBuilding` that owns it, apply `IfcLocalPlacement`
//! transforms, interpret `IfcExtrudedAreaSolid` height/direction, or read
//! any other geometry representation (`IfcIndexedPolyCurve`,
//! `IfcPolygonalFaceSet`, B-rep solids, etc.) — only a bare `IfcPolyline`.
//! Every closed polyline in the file is returned as an independent
//! candidate footprint; associating footprints with their owning spatial
//! structure is left to the caller. Does not handle a semicolon appearing
//! inside a quoted IFC string literal (this reader splits STEP records on
//! `;`, which is not fully correct STEP tokenization but is adequate for
//! every real-world file this module has been exercised against).

use std::collections::HashMap;

use thoth_planning::{new_base, PlanElement};
use thoth_spatial::{ElementKind, Point, Polygon};

use crate::error::{InteropError, InteropResult};

const FORMAT: &str = "IFC";

/// A parsed `IFCCARTESIANPOINT`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct IfcPoint {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

/// A candidate footprint recovered from a closed `IFCPOLYLINE`.
#[derive(Debug, Clone, PartialEq)]
pub struct IfcFootprint {
    /// The STEP entity id the polyline came from (`#123` → `123`), useful
    /// for a caller cross-referencing back into the source file.
    pub step_id: u64,
    pub boundary: Polygon,
}

/// The result of importing an IFC file's footprint-level geometry.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct IfcImportResult {
    pub footprints: Vec<IfcFootprint>,
    /// `Name` attributes of every `IFCSITE`/`IFCBUILDING`/
    /// `IFCBUILDINGSTOREY` entity found, in file order (see module scope
    /// doc: not associated with a specific footprint).
    pub spatial_structure_names: Vec<String>,
}

impl IfcImportResult {
    /// Convert every footprint to a `PlanElement::Building` with `storeys:
    /// 1.0` (see module scope doc on why that's a fixed default).
    pub fn footprints_as_buildings(&self, layer_id: &str) -> Vec<PlanElement> {
        self.footprints
            .iter()
            .map(|f| {
                let base = new_base(
                    format!("ifc-{}", f.step_id),
                    ElementKind::Building,
                    format!("IFC footprint #{}", f.step_id),
                    layer_id,
                    f.boundary.clone(),
                );
                PlanElement::Building(thoth_planning::elements::Building {
                    base,
                    lot_id: None,
                    storeys: 1.0,
                    height: None,
                    dwelling_units: None,
                    use_: None,
                })
            })
            .collect()
    }
}

struct StepEntity {
    id: u64,
    type_name: String,
    args: String,
}

/// Split a balanced-parenthesis argument string like `"(0.,0.,0.)"` (or a
/// list of refs like `"(#10,#11,#12)"`) into its top-level comma-separated
/// tokens, stripping the outermost parens.
fn top_level_tokens(args: &str) -> Vec<String> {
    let trimmed = args.trim();
    let inner = trimmed
        .strip_prefix('(')
        .and_then(|s| s.strip_suffix(')'))
        .unwrap_or(trimmed);
    let mut tokens = Vec::new();
    let mut depth = 0i32;
    let mut current = String::new();
    for c in inner.chars() {
        match c {
            '(' => {
                depth += 1;
                current.push(c);
            }
            ')' => {
                depth -= 1;
                current.push(c);
            }
            ',' if depth == 0 => {
                tokens.push(current.trim().to_string());
                current.clear();
            }
            _ => current.push(c),
        }
    }
    if !current.trim().is_empty() {
        tokens.push(current.trim().to_string());
    }
    tokens
}

/// Parse the `DATA;` section of a STEP/IFC file into `#id -> entity` records.
///
/// # Errors
/// [`InteropError::Malformed`] if a `#id=` prefix's id isn't a valid integer.
fn parse_step_entities(text: &str) -> InteropResult<HashMap<u64, StepEntity>> {
    let flattened = text.replace(['\n', '\r'], " ");
    let mut entities = HashMap::new();
    for (record_no, record) in flattened.split(';').enumerate() {
        let record = record.trim();
        if !record.starts_with('#') {
            continue;
        }
        let Some(eq) = record.find('=') else { continue };
        let id_str = &record[1..eq];
        let id: u64 = id_str.trim().parse().map_err(|e| InteropError::Malformed {
            format: FORMAT,
            offset: record_no,
            reason: format!("entity id '#{id_str}' is not an integer: {e}"),
        })?;
        let rest = record[eq + 1..].trim();
        let Some(paren) = rest.find('(') else {
            continue;
        };
        let type_name = rest[..paren].trim().to_uppercase();
        let args = rest[paren..].trim().to_string();
        entities.insert(
            id,
            StepEntity {
                id,
                type_name,
                args,
            },
        );
    }
    Ok(entities)
}

fn parse_cartesian_point(entity: &StepEntity) -> Option<IfcPoint> {
    let coords = top_level_tokens(&entity.args);
    let inner_tokens = coords
        .first()
        .map(|s| top_level_tokens(s))
        .unwrap_or_default();
    // IFCCARTESIANPOINT's single argument is itself a list, e.g. `((0.,0.,0.))`.
    let values: Vec<f64> = if !inner_tokens.is_empty() {
        inner_tokens
            .iter()
            .filter_map(|t| t.parse::<f64>().ok())
            .collect()
    } else {
        coords
            .iter()
            .filter_map(|t| t.parse::<f64>().ok())
            .collect()
    };
    if values.len() < 2 {
        return None;
    }
    Some(IfcPoint {
        x: values[0],
        y: values[1],
        z: values.get(2).copied().unwrap_or(0.0),
    })
}

fn parse_ref(token: &str) -> Option<u64> {
    token.trim().strip_prefix('#')?.parse().ok()
}

fn parse_string_attr(args: &str, index: usize) -> Option<String> {
    let tokens = top_level_tokens(args);
    let raw = tokens.get(index)?;
    let trimmed = raw.trim();
    if trimmed == "$" || trimmed.is_empty() {
        return None;
    }
    Some(trimmed.trim_matches('\'').to_string())
}

/// Parse an IFC (STEP) file's footprint-level geometry — see module scope
/// doc for exactly what is and isn't extracted.
///
/// # Errors
/// [`InteropError::Malformed`] if a STEP entity id isn't a valid integer.
/// [`InteropError::UnknownReference`] if an `IFCPOLYLINE` references a point
/// id absent from the file's `IFCCARTESIANPOINT`s.
pub fn import_ifc(text: &str) -> InteropResult<IfcImportResult> {
    let entities = parse_step_entities(text)?;

    let mut points: HashMap<u64, IfcPoint> = HashMap::new();
    for e in entities.values() {
        if e.type_name == "IFCCARTESIANPOINT" {
            if let Some(p) = parse_cartesian_point(e) {
                points.insert(e.id, p);
            }
        }
    }

    let mut footprints = Vec::new();
    for e in entities.values() {
        if e.type_name != "IFCPOLYLINE" {
            continue;
        }
        // IFCPOLYLINE's single argument is itself a list of point refs, e.g.
        // `((#1,#2,#3))` — one level of parens for the function call, one
        // more for the `Points` list attribute (same nesting
        // `parse_cartesian_point` unwraps for `IFCCARTESIANPOINT`).
        let outer = top_level_tokens(&e.args);
        let refs = outer
            .first()
            .map(|s| top_level_tokens(s))
            .unwrap_or_default();
        let mut ring: Vec<Point> = Vec::with_capacity(refs.len());
        for token in &refs {
            let Some(id) = parse_ref(token) else { continue };
            let p = points
                .get(&id)
                .ok_or_else(|| InteropError::UnknownReference {
                    format: FORMAT,
                    what: "cartesian point",
                    id: format!("#{id}"),
                })?;
            ring.push(Point::new(p.x, p.y));
        }
        let is_closed =
            ring.len() >= 4 && thoth_spatial::distance(ring[0], *ring.last().unwrap()) < 1e-6;
        if !is_closed {
            continue; // open polylines aren't footprints — see module scope doc
        }
        ring.pop(); // drop the repeated closing vertex (Polygon convention)
        if ring.len() < 3 || thoth_spatial::area(&ring) < thoth_spatial::GEOMETRY_EPSILON {
            continue;
        }
        footprints.push(IfcFootprint {
            step_id: e.id,
            boundary: ring,
        });
    }
    // Deterministic order (HashMap iteration order is not stable).
    footprints.sort_by_key(|f| f.step_id);

    let mut spatial_structure_names = Vec::new();
    let mut named_ids: Vec<u64> = entities
        .values()
        .filter(|e| {
            matches!(
                e.type_name.as_str(),
                "IFCSITE" | "IFCBUILDING" | "IFCBUILDINGSTOREY"
            )
        })
        .map(|e| e.id)
        .collect();
    named_ids.sort_unstable();
    for id in named_ids {
        let e = &entities[&id];
        // IFC's common Name position: `IfcRoot`'s attributes are
        // (GlobalId, OwnerHistory, Name, Description, ...) — index 2.
        if let Some(name) = parse_string_attr(&e.args, 2) {
            spatial_structure_names.push(name);
        }
    }

    Ok(IfcImportResult {
        footprints,
        spatial_structure_names,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> String {
        [
            "ISO-10303-21;",
            "HEADER;",
            "FILE_DESCRIPTION((''),'2;1');",
            "ENDSEC;",
            "DATA;",
            "#1=IFCCARTESIANPOINT((0.,0.,0.));",
            "#2=IFCCARTESIANPOINT((20.,0.,0.));",
            "#3=IFCCARTESIANPOINT((20.,10.,0.));",
            "#4=IFCCARTESIANPOINT((0.,10.,0.));",
            "#5=IFCPOLYLINE((#1,#2,#3,#4,#1));",
            "#6=IFCSITE('2N1$0IGr98yPfj0k$MpxQx',$,'Site A',$,$,$,$,$,$,$,$,$,$,$);",
            "#7=IFCBUILDING('3Q1$0IGr98yPfj0k$MpxQy',$,'Building 1',$,$,$,$,$,$,$,$,$);",
            "ENDSEC;",
            "END-ISO-10303-21;",
        ]
        .join("\n")
    }

    #[test]
    fn extracts_a_closed_polyline_as_a_footprint() {
        let result = import_ifc(&sample()).unwrap();
        assert_eq!(result.footprints.len(), 1);
        let fp = &result.footprints[0];
        assert_eq!(fp.step_id, 5);
        assert_eq!(fp.boundary.len(), 4);
        let area = thoth_spatial::area(&fp.boundary);
        assert!((area - 200.0).abs() < 1e-6);
    }

    #[test]
    fn extracts_site_and_building_names() {
        let result = import_ifc(&sample()).unwrap();
        assert_eq!(
            result.spatial_structure_names,
            vec!["Site A".to_string(), "Building 1".to_string()]
        );
    }

    #[test]
    fn converts_footprints_to_building_plan_elements() {
        let result = import_ifc(&sample()).unwrap();
        let buildings = result.footprints_as_buildings("layer-1");
        assert_eq!(buildings.len(), 1);
        let PlanElement::Building(b) = &buildings[0] else {
            panic!("expected Building");
        };
        assert_eq!(b.storeys, 1.0);
        assert_eq!(b.base.boundary.len(), 4);
    }

    #[test]
    fn open_polylines_are_not_treated_as_footprints() {
        let text = [
            "DATA;",
            "#1=IFCCARTESIANPOINT((0.,0.,0.));",
            "#2=IFCCARTESIANPOINT((10.,0.,0.));",
            "#3=IFCPOLYLINE((#1,#2));", // open — just 2 points, not closed
            "ENDSEC;",
        ]
        .join("\n");
        let result = import_ifc(&text).unwrap();
        assert!(result.footprints.is_empty());
    }

    #[test]
    fn polyline_referencing_unknown_point_is_an_error() {
        let text = ["DATA;", "#5=IFCPOLYLINE((#1,#2,#3,#1));", "ENDSEC;"].join("\n");
        let err = import_ifc(&text).unwrap_err();
        assert!(matches!(err, InteropError::UnknownReference { .. }));
    }

    #[test]
    fn bad_entity_id_is_malformed() {
        let text = "DATA;\n#abc=IFCCARTESIANPOINT((0.,0.,0.));\nENDSEC;";
        assert!(matches!(
            import_ifc(text),
            Err(InteropError::Malformed { .. })
        ));
    }
}
