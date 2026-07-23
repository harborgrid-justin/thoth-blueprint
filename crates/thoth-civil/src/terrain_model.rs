//! Build an existing/proposed terrain surface pair from surveyed spots and
//! grading regions.
//!
//! Port of `packages/domain/src/civil/terrainModel.ts` — **adapted at the
//! crate boundary**. The TS original takes a whole planning `Site` and pulls
//! `SpotElevationPoint`/`GradeRegion` elements out of it via
//! `site.elements`; `Site` (and the rest of the planning element hierarchy)
//! is owned by `thoth-planning`, and `thoth-civil` intentionally does not
//! depend on that crate (see `crates/thoth-civil/GAPS.md`). The pure
//! civil-engineering part of this module — turning a set of spots and grade
//! regions into an existing/proposed [`ElevationGrid`] pair — is fully
//! ported below; extracting those spots/regions from a `Site` is a planning
//! concern that belongs upstream of this crate (in `thoth-planning` or a
//! caller that has both crates in scope).

use thoth_spatial::{bounds, Bounds, Point, Polygon};

use crate::terrain::{grade_pad, ElevationGrid, InterpolateOptions, SpotElevation};

use crate::error::CivilResult;

const TARGET_CELLS_ACROSS: f64 = 56.0;
const MIN_CELL: f64 = 0.5;

/// A grading region: a flat pad footprint to be graded to a target
/// elevation. Mirrors the subset of the planning `GradeRegion` element this
/// module actually needs (its boundary and target elevation), without
/// depending on the full planning element type.
#[derive(Debug, Clone)]
pub struct GradeRegionInput {
    pub boundary: Polygon,
    pub target_elevation: f64,
}

/// Existing and proposed surfaces derived from a set of spot elevations and
/// grading regions.
#[derive(Debug, Clone)]
pub struct TerrainModel {
    pub has_terrain: bool,
    pub spot_count: usize,
    pub grade_count: usize,
    pub extent: Option<Bounds>,
    pub existing: Option<ElevationGrid>,
    /// Existing reshaped by every grading region (flat pads to target elevation).
    pub proposed: Option<ElevationGrid>,
}

/// The planning extent covering a set of point positions (e.g. every spot
/// elevation and note/tree/spot marker in a site). A thin, crate-boundary
/// analogue of the TS `siteExtent`, which additionally folds in the bounds of
/// every full spatial element's boundary — that half belongs to
/// `thoth-planning`, which can union its own element bounds with this one.
pub fn extent_of_points(points: &[Point]) -> Option<Bounds> {
    if points.is_empty() {
        return None;
    }
    Some(bounds(points))
}

/// Build the existing ground surface (IDW-interpolated from spot
/// elevations) and the proposed surface (existing reshaped by grading
/// regions). Returns `has_terrain: false` when there are too few spots to
/// define a surface (fewer than 2, or no extent) — mirrors the TS guard
/// exactly; this is a legitimate "nothing to build yet" state, not an error.
///
/// # Errors
/// Propagates [`crate::error::CivilError::InvalidCellSize`] only if the
/// computed cell size were ever non-positive, which cannot happen given
/// [`MIN_CELL`] — kept as a `Result` so the interpolation invariant stays
/// enforced at the type level rather than assumed.
pub fn build_terrain_model(
    spots: &[SpotElevation],
    grades: &[GradeRegionInput],
    extent: Option<Bounds>,
) -> CivilResult<TerrainModel> {
    if spots.len() < 2 || extent.is_none() {
        return Ok(TerrainModel {
            has_terrain: false,
            spot_count: spots.len(),
            grade_count: grades.len(),
            extent,
            existing: None,
            proposed: None,
        });
    }
    let extent = extent.unwrap();

    let width = (extent.max_x - extent.min_x).max(1.0);
    let height = (extent.max_y - extent.min_y).max(1.0);
    let cell_size = (width.max(height) / TARGET_CELLS_ACROSS).max(MIN_CELL);

    let existing = crate::terrain::interpolate_grid(
        spots,
        extent,
        InterpolateOptions {
            cell_size,
            power: 2.0,
            base: 0.0,
            padding: cell_size,
        },
    )?;
    let mut proposed = existing.clone();
    for g in grades {
        proposed = grade_pad(&proposed, &g.boundary, g.target_elevation);
    }

    Ok(TerrainModel {
        has_terrain: true,
        spot_count: spots.len(),
        grade_count: grades.len(),
        extent: Some(extent),
        existing: Some(existing),
        proposed: Some(proposed),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_spatial::Point;

    fn spot(x: f64, y: f64, z: f64) -> SpotElevation {
        SpotElevation {
            point: Point::new(x, y),
            z,
        }
    }

    #[test]
    fn too_few_spots_yields_no_terrain() {
        let model = build_terrain_model(
            &[spot(0.0, 0.0, 1.0)],
            &[],
            Some(Bounds {
                min_x: 0.0,
                min_y: 0.0,
                max_x: 10.0,
                max_y: 10.0,
            }),
        )
        .unwrap();
        assert!(!model.has_terrain);
        assert!(model.existing.is_none());
    }

    #[test]
    fn no_extent_yields_no_terrain() {
        let model =
            build_terrain_model(&[spot(0.0, 0.0, 1.0), spot(10.0, 10.0, 2.0)], &[], None).unwrap();
        assert!(!model.has_terrain);
    }

    #[test]
    fn enough_spots_and_extent_builds_existing_and_proposed() {
        let extent = Bounds {
            min_x: 0.0,
            min_y: 0.0,
            max_x: 100.0,
            max_y: 100.0,
        };
        let spots = vec![spot(0.0, 0.0, 10.0), spot(100.0, 100.0, 20.0)];
        let grades = vec![GradeRegionInput {
            boundary: vec![
                Point::new(10.0, 10.0),
                Point::new(20.0, 10.0),
                Point::new(20.0, 20.0),
                Point::new(10.0, 20.0),
            ],
            target_elevation: 15.0,
        }];
        let model = build_terrain_model(&spots, &grades, Some(extent)).unwrap();
        assert!(model.has_terrain);
        assert_eq!(model.spot_count, 2);
        assert_eq!(model.grade_count, 1);
        assert!(model.existing.is_some());
        assert!(model.proposed.is_some());
        // The proposed surface differs from existing where the grade region applies.
        let existing = model.existing.unwrap();
        let proposed = model.proposed.unwrap();
        assert_ne!(existing.heights(), proposed.heights());
    }

    #[test]
    fn extent_of_points_is_none_for_empty_input() {
        assert!(extent_of_points(&[]).is_none());
    }
}
