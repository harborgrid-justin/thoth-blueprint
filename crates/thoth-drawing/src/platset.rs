//! Plat-set helpers that aggregate across a whole `Site`: the consolidated
//! curve-data table a recorded plat carries (every circular curve — boundary
//! arcs and alignment curves — labeled C1...Cn), independent of which
//! element or baseline they came from.
//!
//! Port of `packages/domain/src/drawing/platset.ts`.
//!
//! ## Adaptation
//!
//! [`collect_site_curves`] walks a `Site`'s elements (for boundary-arc
//! curves) and a set of horizontal alignments (for alignment curves),
//! calling `thoth_survey::survey::survey_report`,
//! `thoth_survey::bearing::{azimuth_to_bearing, format_bearing}`, and
//! `thoth_civil::alignment::resolve_alignment` — all now dependencies of
//! this crate (see `STATUS.md`). The one adaptation: the TS original reads
//! `site.alignments`, a field this crate's scoped `thoth_planning::Site`
//! doesn't carry (see that crate's `elements.rs` module rustdoc), so
//! `alignments` is an explicit parameter instead — the same
//! signature-adaptation pattern already used in `builders.rs`.

use thoth_civil::alignment::{
    resolve_alignment, CurveDirection as CivilCurveDirection, HorizontalAlignment,
};
use thoth_planning::elements::Site;
use thoth_survey::bearing::{azimuth_to_bearing, format_bearing};
use thoth_survey::survey::{survey_report, CurveDirection as SurveyCurveDirection};

/// One row of the consolidated curve-data table.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct SiteCurve {
    pub label: String,
    /// The element or alignment the curve belongs to.
    pub source: String,
    pub radius: f64,
    pub arc_length: f64,
    /// Central (delta) angle, decimal degrees.
    pub delta_deg: f64,
    pub chord: f64,
    /// Long-chord bearing, quadrant text.
    pub chord_bearing: String,
    pub tangent: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub direction: Option<CurveDirection>,
}

/// The turning direction of a circular curve.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CurveDirection {
    Left,
    Right,
}

impl From<SurveyCurveDirection> for CurveDirection {
    fn from(d: SurveyCurveDirection) -> Self {
        match d {
            SurveyCurveDirection::Left => CurveDirection::Left,
            SurveyCurveDirection::Right => CurveDirection::Right,
        }
    }
}

impl From<CivilCurveDirection> for CurveDirection {
    fn from(d: CivilCurveDirection) -> Self {
        match d {
            CivilCurveDirection::Left => CurveDirection::Left,
            CivilCurveDirection::Right => CurveDirection::Right,
        }
    }
}

/// Collect every circular curve in the site — from element boundary arcs and
/// from horizontal alignments — into one consecutively-labeled curve table.
/// Port of the TS `collectSiteCurves`; see the module rustdoc for why
/// `alignments` is a parameter rather than `site.alignments`.
pub fn collect_site_curves(site: &Site, alignments: &[HorizontalAlignment]) -> Vec<SiteCurve> {
    let mut out = Vec::new();
    let mut n = 0u32;

    for el in &site.elements {
        let Some(base) = el.base() else {
            continue;
        };
        let has_arcs = base.arcs.as_ref().is_some_and(|a| !a.is_empty());
        if !has_arcs {
            continue;
        }
        let report = survey_report(&base.boundary, &site.spatial, base.arcs.as_ref());
        for c in &report.curves {
            n += 1;
            out.push(SiteCurve {
                label: format!("C{n}"),
                source: base.name.clone(),
                radius: c.radius,
                arc_length: c.arc_length,
                delta_deg: c.delta,
                chord: c.chord_length,
                chord_bearing: c.chord_bearing_text.clone(),
                tangent: if c.tangent.is_finite() {
                    c.tangent
                } else {
                    0.0
                },
                direction: Some(c.direction.into()),
            });
        }
    }

    for a in alignments {
        let Ok(resolved) = resolve_alignment(a) else {
            continue;
        };
        for c in &resolved.curves {
            n += 1;
            out.push(SiteCurve {
                label: format!("C{n}"),
                source: resolved.name.clone(),
                radius: c.radius,
                arc_length: c.length,
                delta_deg: c.delta_deg,
                chord: c.chord,
                chord_bearing: format_bearing(&azimuth_to_bearing(c.chord_bearing)),
                tangent: if c.tangent.is_finite() {
                    c.tangent
                } else {
                    0.0
                },
                direction: Some(c.direction.into()),
            });
        }
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_civil::alignment::AlignmentPi;
    use thoth_planning::elements::{new_base, Parcel};
    use thoth_planning::PlanElement;
    use thoth_spatial::{ElementKind, Point, SpatialContext, Unit};

    fn ctx() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: Unit::Feet,
            scale: 1.0,
        }
    }

    fn site_with_arced_parcel() -> Site {
        let mut arcs = thoth_spatial::EdgeArcs::new();
        // Bulge for a quarter-circle arc on edge 1->2 of a square.
        arcs.insert("1".to_string(), 1.0);
        let boundary = vec![
            Point::new(0.0, 0.0),
            Point::new(100.0, 0.0),
            Point::new(100.0, 100.0),
            Point::new(0.0, 100.0),
        ];
        let mut base = new_base("p1", ElementKind::Parcel, "Parcel 1", "l", boundary);
        base.arcs = Some(arcs);
        Site {
            id: "s1".to_string(),
            name: "Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements: vec![PlanElement::Parcel(Parcel { base, apn: None })],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
            monuments: None,
            plss: None,
        }
    }

    #[test]
    fn collects_a_boundary_arc_curve_labeled_c1() {
        let site = site_with_arced_parcel();
        let curves = collect_site_curves(&site, &[]);
        assert_eq!(curves.len(), 1);
        assert_eq!(curves[0].label, "C1");
        assert_eq!(curves[0].source, "Parcel 1");
        assert!(curves[0].radius > 0.0);
    }

    #[test]
    fn skips_elements_with_no_arcs() {
        let boundary = vec![
            Point::new(0.0, 0.0),
            Point::new(10.0, 0.0),
            Point::new(10.0, 10.0),
            Point::new(0.0, 10.0),
        ];
        let base = new_base("p2", ElementKind::Parcel, "Parcel 2", "l", boundary);
        let site = Site {
            id: "s1".to_string(),
            name: "Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements: vec![PlanElement::Parcel(Parcel { base, apn: None })],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
            monuments: None,
            plss: None,
        };
        assert!(collect_site_curves(&site, &[]).is_empty());
    }

    #[test]
    fn collects_an_alignment_curve_and_continues_numbering_after_boundary_curves() {
        let site = site_with_arced_parcel();
        let alignment = HorizontalAlignment::new(
            "a1",
            "Main Street",
            vec![
                AlignmentPi::simple(Point::new(0.0, 0.0)),
                AlignmentPi::curved(Point::new(500.0, 0.0), 300.0),
                AlignmentPi::simple(Point::new(500.0, 500.0)),
            ],
            0.0,
        );
        let curves = collect_site_curves(&site, &[alignment]);
        // One boundary-arc curve (C1) + one alignment curve (C2).
        assert_eq!(curves.len(), 2);
        assert_eq!(curves[0].label, "C1");
        assert_eq!(curves[1].label, "C2");
        assert_eq!(curves[1].source, "Main Street");
    }

    #[test]
    fn skips_an_alignment_that_fails_to_resolve() {
        let site = site_with_arced_parcel();
        // A degenerate (empty) PI chain fails `resolve_alignment`.
        let alignment = HorizontalAlignment::new("a1", "Bad Alignment", vec![], 0.0);
        let curves = collect_site_curves(&site, &[alignment]);
        assert_eq!(curves.len(), 1);
        assert_eq!(curves[0].source, "Parcel 1");
    }
}
