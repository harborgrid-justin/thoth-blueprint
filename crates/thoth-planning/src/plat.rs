//! Unified certified-plat composer: a document data model combining a legal
//! description, curve table, and monument callouts — this is the *document
//! model*, not rendering (rendering onto a sheet is `thoth-drawing`'s job).
//!
//! Item 50 of the Theme 4 subdivision-design-automation gap analysis.
//!
//! ## Dependency choice
//! The task brief offers two options for the metes-and-bounds text: depend
//! on `thoth-survey` (stable and complete) or compose over a caller-supplied
//! pre-formatted description string. This module takes the **latter**: the
//! `legal_description` field is plain text the caller provides. Reasons:
//! - It keeps this crate's dependency graph unchanged for a document-model
//!   addition that doesn't need `thoth-survey`'s bearing/curve math itself
//!   — this module only *assembles* a description alongside data this crate
//!   already computes (`crate::curve`'s curve-table math, `crate::regions`'s
//!   `MonumentType`/`CertificateSpec`).
//! - A metes-and-bounds description's exact wording (bearing format,
//!   "thence" phrasing, closure statement) is a jurisdiction-specific
//!   drafting convention that `thoth-survey` should own end-to-end; gluing
//!   half of that logic into this crate's document model would duplicate
//!   convention decisions that belong in one place.
//!
//! If a future pass wants this crate to *generate* the legal description
//! itself rather than accept it, adding `thoth-survey` as a dependency here
//! is the natural next step — nothing in this module's shape would need to
//! change, since `legal_description: String` is already the composed output
//! either way.

use serde::{Deserialize, Serialize};
use thoth_spatial::{bearing, distance, Point, Polygon};

use crate::curve::{boundary_area, boundary_perimeter, bulge_to_arc, EdgeArcs};
use crate::regions::{CertificateSpec, MonumentType};

/// A single monument callout on the plat (point of beginning, iron pin
/// found/set, benchmark, ...).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MonumentCallout {
    /// Plat label, e.g. `"P.O.B."`, `"IPF"`, `"IPS"`.
    pub label: String,
    pub monument_type: MonumentType,
    pub position: Point,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// One row of the consolidated curve-data table.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct CurveTableRow {
    pub index: u32,
    pub radius: f64,
    pub delta_degrees: f64,
    pub arc_length: f64,
    pub chord_length: f64,
    /// Compass bearing of the chord (0° = north, clockwise), degrees.
    pub chord_bearing_degrees: f64,
    pub tangent_length: f64,
}

/// A composed, certified-plat-ready document model.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CertifiedPlat {
    pub id: String,
    pub title: String,
    /// Caller-supplied metes-and-bounds legal description — see the module
    /// doc comment for why this crate doesn't generate it.
    pub legal_description: String,
    pub boundary: Polygon,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub arcs: Option<EdgeArcs>,
    pub monuments: Vec<MonumentCallout>,
    pub curve_table: Vec<CurveTableRow>,
    pub certificates: Vec<CertificateSpec>,
    /// Exact boundary area (honoring curved edges), plan units².
    pub area: f64,
    /// Exact boundary perimeter (honoring curved edges), plan units.
    pub perimeter: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub surveyor_of_record: Option<String>,
    /// An ISO-8601 date string (kept as plain text — no date dependency).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prepared_date: Option<String>,
}

/// Build the consolidated curve-data table for a boundary's curved edges
/// (edges with a nonzero bulge in `arcs`), reusing [`crate::curve`]'s exact
/// bulge-to-arc math rather than re-deriving curve geometry.
pub fn build_curve_table(boundary: &Polygon, arcs: Option<&EdgeArcs>) -> Vec<CurveTableRow> {
    let Some(arcs) = arcs else {
        return Vec::new();
    };
    let n = boundary.len();
    if n < 2 {
        return Vec::new();
    }

    let mut rows = Vec::new();
    let mut index = 0u32;
    for i in 0..n {
        let a = boundary[i];
        let b = boundary[(i + 1) % n];
        let Some(bulge) = arcs.get(&i.to_string()) else {
            continue;
        };
        let Some(arc) = bulge_to_arc(a, b, *bulge) else {
            continue;
        };
        index += 1;
        rows.push(CurveTableRow {
            index,
            radius: arc.radius,
            delta_degrees: arc.delta.to_degrees(),
            arc_length: arc.radius * arc.delta,
            chord_length: distance(a, b),
            chord_bearing_degrees: bearing(a, b),
            tangent_length: arc.radius * (arc.delta / 2.0).tan(),
        });
    }
    rows
}

/// Compose a [`CertifiedPlat`] document from its constituent parts, computing
/// the exact area/perimeter and curve table from the boundary and arcs.
#[allow(clippy::too_many_arguments)]
pub fn compose_certified_plat(
    id: impl Into<String>,
    title: impl Into<String>,
    legal_description: impl Into<String>,
    boundary: Polygon,
    arcs: Option<EdgeArcs>,
    monuments: Vec<MonumentCallout>,
    certificates: Vec<CertificateSpec>,
    surveyor_of_record: Option<String>,
    prepared_date: Option<String>,
) -> CertifiedPlat {
    let area = boundary_area(&boundary, arcs.as_ref());
    let perimeter = boundary_perimeter(&boundary, arcs.as_ref());
    let curve_table = build_curve_table(&boundary, arcs.as_ref());

    CertifiedPlat {
        id: id.into(),
        title: title.into(),
        legal_description: legal_description.into(),
        boundary,
        arcs,
        monuments,
        curve_table,
        certificates,
        area,
        perimeter,
        surveyor_of_record,
        prepared_date,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn square(side: f64) -> Polygon {
        vec![
            Point::new(0.0, 0.0),
            Point::new(side, 0.0),
            Point::new(side, side),
            Point::new(0.0, side),
        ]
    }

    #[test]
    fn builds_a_curve_table_row_for_a_bulged_edge() {
        let boundary = square(100.0);
        let mut arcs = EdgeArcs::new();
        arcs.insert("0".to_string(), -1.0); // semicircle bulge on edge 0
        let table = build_curve_table(&boundary, Some(&arcs));
        assert_eq!(table.len(), 1);
        assert_relative_eq!(table[0].radius, 50.0, epsilon = 1e-6);
        assert_relative_eq!(table[0].chord_length, 100.0, epsilon = 1e-6);
    }

    #[test]
    fn no_arcs_yields_an_empty_curve_table() {
        let boundary = square(100.0);
        assert!(build_curve_table(&boundary, None).is_empty());
    }

    #[test]
    fn composes_a_full_certified_plat_document() {
        let boundary = square(200.0);
        let mut arcs = EdgeArcs::new();
        arcs.insert("1".to_string(), 0.5);

        let monuments = vec![MonumentCallout {
            label: "P.O.B.".to_string(),
            monument_type: MonumentType::IronRod,
            position: Point::new(0.0, 0.0),
            description: Some("1/2\" rebar found".to_string()),
        }];
        let certificates = vec![CertificateSpec {
            id: "surveyor-cert".to_string(),
            title: "Surveyor's Certificate".to_string(),
            body: "I hereby certify that this plat is true and correct.".to_string(),
            signatures: vec!["Licensed Land Surveyor".to_string()],
        }];

        let plat = compose_certified_plat(
            "plat-1",
            "Boundary Survey for Parcel 12",
            "Beginning at an iron rod found at the northwest corner...",
            boundary.clone(),
            Some(arcs.clone()),
            monuments,
            certificates,
            Some("Jane Surveyor, PLS #1234".to_string()),
            Some("2026-07-23".to_string()),
        );

        assert_eq!(plat.monuments.len(), 1);
        assert_eq!(plat.certificates.len(), 1);
        assert_eq!(plat.curve_table.len(), 1);
        assert_relative_eq!(plat.area, boundary_area(&boundary, Some(&arcs)), epsilon = 1e-9);
        assert_relative_eq!(
            plat.perimeter,
            boundary_perimeter(&boundary, Some(&arcs)),
            epsilon = 1e-9
        );
        assert_eq!(plat.surveyor_of_record.as_deref(), Some("Jane Surveyor, PLS #1234"));
    }
}
