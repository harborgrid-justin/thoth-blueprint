//! Grading-pad scratch construction and balanced-elevation solving for the
//! plan canvas. Direct port of
//! `packages/domain/src/survey/helpers/gradingHelpers.ts`.
//!
//! Unlocked this pass by adding `thoth-civil` as a dependency (see
//! `../../GAPS.md` #3 and `../../STATUS.md`).

use serde_json::{json, Map, Value};

use thoth_civil::grading::{solve_balanced_elevation, GradingPad};
use thoth_civil::terrain::ElevationGrid;
use thoth_spatial::Point;

/// A minimal generic element: the narrow slice of a `site.elements[]` entry
/// (`id`, `kind`, `properties`) [`save_grading_pad_elevation`] actually reads
/// and patches. The full planning element hierarchy (`spatial/types::Site`)
/// belongs to `thoth-planning`, not a dependency of this crate — see
/// `../../GAPS.md` #3. Swap for the real element type once cross-crate
/// wiring lands.
#[derive(Debug, Clone, PartialEq)]
pub struct SiteElement {
    pub id: String,
    pub kind: String,
    pub properties: Map<String, Value>,
}

/// The result of matching a grading-pad element and patching its properties:
/// the matched element's id, and a full patched copy of that element.
#[derive(Debug, Clone, PartialEq)]
pub struct GradingPadElevationPatch {
    pub matching_pad_id: String,
    pub patch: SiteElement,
}

/// A scratch [`GradingPad`] over a fixed 200×150 footprint at `(100,100)`,
/// matching the TS original's hardcoded "Building Lot Grading Pad" fixture
/// exactly (this helper is a starting-point builder for a new pad, not a
/// derivation from an actual parcel boundary).
pub fn create_grading_pad(pad_elevation: f64, cut_slope: f64, fill_slope: f64) -> GradingPad {
    GradingPad {
        id: "pad-1".to_string(),
        name: "Building Lot Grading Pad".to_string(),
        points: vec![
            Point::new(100.0, 100.0),
            Point::new(300.0, 100.0),
            Point::new(300.0, 250.0),
            Point::new(100.0, 250.0),
        ],
        target_elevation: pad_elevation,
        cut_slope,
        fill_slope,
    }
}

/// Finds the element to apply a grading-pad elevation/slope edit to — the
/// first element of kind `"parcel"`, falling back to `elements`'s first
/// entry — and returns its id plus a patched copy carrying the new
/// `elevation`/`cutSlope`/`fillSlope` properties (existing properties are
/// preserved). Returns `None` if `elements` is empty (mirrors the TS
/// `_.find(site?.elements, ...) ?? site?.elements[0]` finding nothing to
/// patch).
pub fn save_grading_pad_elevation(
    elements: &[SiteElement],
    pad_elevation: f64,
    cut_slope: f64,
    fill_slope: f64,
) -> Option<GradingPadElevationPatch> {
    let matching = elements
        .iter()
        .find(|e| e.kind == "parcel")
        .or_else(|| elements.first())?;

    let mut properties = matching.properties.clone();
    properties.insert("elevation".to_string(), json!(pad_elevation));
    properties.insert("cutSlope".to_string(), json!(cut_slope));
    properties.insert("fillSlope".to_string(), json!(fill_slope));

    Some(GradingPadElevationPatch {
        matching_pad_id: matching.id.clone(),
        patch: SiteElement {
            id: matching.id.clone(),
            kind: matching.kind.clone(),
            properties,
        },
    })
}

/// Solves the balanced grading-pad elevation against `terrain` via
/// [`solve_balanced_elevation`] (bisection tolerance `5.0`), rounded to 2
/// decimal places (mirrors the TS `Number(balancedElev.toFixed(2))`).
/// Returns `None` when `terrain` is absent (mirrors the TS `if
/// (!terrainSurface) return;`, which never invokes its `onComplete`
/// callback). The TS original wraps this computation in a UI `setTimeout` to
/// simulate async work; that scheduling is UI plumbing, not domain logic, and
/// isn't ported here — callers on the async boundary can defer calling this
/// synchronous function themselves.
pub fn solve_grading_balance(
    pad: &GradingPad,
    terrain: Option<&ElevationGrid>,
    target_volume: f64,
) -> Option<f64> {
    let terrain = terrain?;
    let elev = solve_balanced_elevation(pad, terrain, target_volume, 5.0);
    Some((elev * 100.0).round() / 100.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn creates_the_fixed_scratch_grading_pad() {
        let pad = create_grading_pad(12.5, 2.0, 3.0);
        assert_eq!(pad.id, "pad-1");
        assert_eq!(pad.name, "Building Lot Grading Pad");
        assert_eq!(pad.points.len(), 4);
        assert_relative_eq!(pad.target_elevation, 12.5, epsilon = 1e-9);
        assert_relative_eq!(pad.cut_slope, 2.0, epsilon = 1e-9);
        assert_relative_eq!(pad.fill_slope, 3.0, epsilon = 1e-9);
    }

    fn parcel(id: &str) -> SiteElement {
        SiteElement {
            id: id.to_string(),
            kind: "parcel".to_string(),
            properties: Map::new(),
        }
    }

    #[test]
    fn prefers_a_parcel_kind_element_over_the_first_element() {
        let elements = vec![
            SiteElement {
                id: "line-1".into(),
                kind: "line".into(),
                properties: Map::new(),
            },
            parcel("parcel-1"),
        ];
        let result = save_grading_pad_elevation(&elements, 12.0, 2.0, 3.0).unwrap();
        assert_eq!(result.matching_pad_id, "parcel-1");
        assert_eq!(result.patch.properties["elevation"], json!(12.0));
        assert_eq!(result.patch.properties["cutSlope"], json!(2.0));
        assert_eq!(result.patch.properties["fillSlope"], json!(3.0));
    }

    #[test]
    fn falls_back_to_the_first_element_when_no_parcel_exists() {
        let elements = vec![SiteElement {
            id: "line-1".into(),
            kind: "line".into(),
            properties: Map::new(),
        }];
        let result = save_grading_pad_elevation(&elements, 5.0, 1.0, 1.0).unwrap();
        assert_eq!(result.matching_pad_id, "line-1");
    }

    #[test]
    fn preserves_existing_properties_when_patching() {
        let mut props = Map::new();
        props.insert("color".to_string(), json!("#ff0000"));
        let elements = vec![SiteElement {
            id: "p1".into(),
            kind: "parcel".into(),
            properties: props,
        }];
        let result = save_grading_pad_elevation(&elements, 5.0, 1.0, 1.0).unwrap();
        assert_eq!(result.patch.properties["color"], json!("#ff0000"));
        assert_eq!(result.patch.properties["elevation"], json!(5.0));
    }

    #[test]
    fn returns_none_for_an_empty_element_list() {
        assert!(save_grading_pad_elevation(&[], 5.0, 1.0, 1.0).is_none());
    }

    #[test]
    fn solves_and_rounds_the_balanced_elevation() {
        let pad = GradingPad {
            id: "g1".into(),
            name: "Pad 1".into(),
            points: vec![
                Point::new(20.0, 20.0),
                Point::new(80.0, 20.0),
                Point::new(80.0, 80.0),
                Point::new(20.0, 80.0),
            ],
            target_elevation: 12.0,
            cut_slope: 2.0,
            fill_slope: 3.0,
        };
        let surface = ElevationGrid::new(Point::new(0.0, 0.0), 20.0, 5, 5, vec![10.0; 25]).unwrap();
        let balanced = solve_grading_balance(&pad, Some(&surface), 0.0).unwrap();
        assert_relative_eq!(balanced, 10.0, epsilon = 0.5);
        // Rounded to 2 decimal places.
        assert_eq!((balanced * 100.0).round(), balanced * 100.0);
    }

    #[test]
    fn returns_none_when_terrain_is_absent() {
        let pad = create_grading_pad(10.0, 2.0, 3.0);
        assert!(solve_grading_balance(&pad, None, 0.0).is_none());
    }
}
