//! FEMA floodplain/floodway overlay and encroachment check.
//!
//! Source: FEMA's National Flood Insurance Program (NFIP) regulatory
//! framework (44 CFR §60.3) — the **Special Flood Hazard Area (SFHA)** is
//! the area inundated by the base (1%-annual-chance, "100-year") flood,
//! defined by a **Base Flood Elevation (BFE)** surface; the **regulatory
//! floodway** is the channel plus adjacent floodplain that must remain
//! open to convey the base flood without a prohibited increase in flood
//! height (commonly a "no-rise" or a jurisdiction-specific small allowable
//! rise, e.g. 1 ft, depending on the community's floodplain ordinance).
//! Any fill or grading proposed inside the floodway is an encroachment
//! requiring engineering justification (a "no-rise certification" backed
//! by hydraulic modeling) before permitting; fill placed within the SFHA
//! but outside the floodway still displaces flood storage and commonly
//! triggers a compensatory-storage requirement in many local ordinances.
//!
//! # Assumptions and valid range
//! - **A single BFE surface** for the whole site (represented as a
//!   [`thoth_civil::terrain::ElevationGrid`], reusing that crate's already-
//!   validated grid + interpolation rather than a new surface type) — this
//!   models a BFE that varies spatially (as it does along a real flood
//!   profile) but does not model multiple flood sources with different
//!   BFEs overlapping the same site.
//! - **Floodway encroachment is checked as "does any vertex of the
//!   proposed footprint fall inside the floodway boundary"**, a
//!   point-in-polygon test on the footprint's vertices — not a full
//!   polygon-polygon intersection (a footprint that passes entirely
//!   through a floodway without any vertex landing inside it, cutting
//!   across an edge, would be missed). Use finer input geometry
//!   (footprints with vertices added at intersection points) to avoid this
//!   gap, or treat this as a first-pass screen requiring a full GIS overlay
//!   for final compliance determination.
//! - Compensatory storage volume is computed by **per-node sampling**
//!   (each grid node represents one `cell_size²` tile), not a proper
//!   polygon-clipped cell integral — adequate for a planning-level check,
//!   not a final regulatory submittal quantity.

use thoth_civil::terrain::{elevation_at, ElevationGrid};
use thoth_spatial::{point_in_polygon, Point, Polygon};

use crate::error::{HydroResult, HydrologyError};

/// The regulatory floodplain context for a site: a Base Flood Elevation
/// surface plus the SFHA and regulatory floodway boundaries within it.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FloodplainOverlay<'a> {
    pub base_flood_elevation: &'a ElevationGrid,
    pub sfha_boundary: &'a Polygon,
    pub floodway_boundary: &'a Polygon,
}

/// The result of [`check_floodway_encroachment`].
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FloodwayEncroachmentCheck {
    /// `true` if any vertex of the proposed footprint falls inside the
    /// floodway boundary.
    pub encroaches: bool,
    /// How many of the footprint's vertices fall inside the floodway.
    pub vertices_in_floodway: usize,
}

/// Check whether a proposed grading/fill footprint encroaches into the
/// regulatory floodway (see module docs for the vertex-test caveat).
pub fn check_floodway_encroachment(
    overlay: &FloodplainOverlay,
    proposed_footprint: &Polygon,
) -> FloodwayEncroachmentCheck {
    let vertices_in_floodway = proposed_footprint
        .iter()
        .filter(|&&p| point_in_polygon(p, overlay.floodway_boundary))
        .count();
    FloodwayEncroachmentCheck {
        encroaches: vertices_in_floodway > 0,
        vertices_in_floodway,
    }
}

/// Compensatory-storage volume displaced by proposed grading within the
/// SFHA: the volume of fill placed **below the Base Flood Elevation**,
/// clipped to the SFHA boundary.
///
/// For each node of `proposed` that falls inside `overlay.sfha_boundary`,
/// accumulates `max(0, min(proposed_z, bfe_z) - existing_z) · cell_size²` —
/// i.e. only the portion of any elevation increase that is still below the
/// BFE displaces flood storage; fill above the BFE (even if it started
/// below existing grade) does not.
///
/// `existing` and `proposed` must share the same grid shape (same
/// `cols`/`rows`, so every node has a direct existing/proposed pair); the
/// BFE surface (`overlay.base_flood_elevation`) may be a different
/// resolution — it is sampled via
/// [`thoth_civil::terrain::elevation_at`] at each of `proposed`'s node
/// coordinates.
///
/// # Errors
/// [`HydrologyError::ShapeMismatch`] if `existing` and `proposed` differ in
/// `cols`/`rows`.
///
/// # Example
/// A flat 95 ft site, BFE flat at 100 ft, with a small pad raised to 98 ft
/// (still below BFE) entirely inside the SFHA boundary:
/// ```
/// use thoth_hydrology::floodplain::{compensatory_storage_displaced, FloodplainOverlay};
/// use thoth_civil::terrain::ElevationGrid;
/// use thoth_spatial::Point;
///
/// let existing = ElevationGrid::new(Point::new(0.0, 0.0), 10.0, 5, 5, vec![95.0; 25]).unwrap();
/// let mut heights = vec![95.0; 25];
/// // Raise the 2x2 block of nodes at the origin corner to 98 ft.
/// for r in 0..2 {
///     for c in 0..2 {
///         heights[r * 5 + c] = 98.0;
///     }
/// }
/// let proposed = ElevationGrid::new(Point::new(0.0, 0.0), 10.0, 5, 5, heights).unwrap();
/// let bfe = ElevationGrid::new(Point::new(0.0, 0.0), 10.0, 5, 5, vec![100.0; 25]).unwrap();
/// let sfha_boundary = vec![
///     Point::new(-100.0, -100.0),
///     Point::new(100.0, -100.0),
///     Point::new(100.0, 100.0),
///     Point::new(-100.0, 100.0),
/// ];
/// let overlay = FloodplainOverlay {
///     base_flood_elevation: &bfe,
///     sfha_boundary: &sfha_boundary,
///     floodway_boundary: &sfha_boundary,
/// };
/// let displaced = compensatory_storage_displaced(&existing, &proposed, &overlay).unwrap();
/// assert!((displaced - 1200.0).abs() < 1e-6);
/// ```
pub fn compensatory_storage_displaced(
    existing: &ElevationGrid,
    proposed: &ElevationGrid,
    overlay: &FloodplainOverlay,
) -> HydroResult<f64> {
    if existing.cols() != proposed.cols() || existing.rows() != proposed.rows() {
        return Err(HydrologyError::ShapeMismatch {
            reason: format!(
                "existing grid is {}x{}, proposed grid is {}x{}",
                existing.cols(),
                existing.rows(),
                proposed.cols(),
                proposed.rows()
            ),
        });
    }

    let cell_area = proposed.cell_size() * proposed.cell_size();
    let mut total = 0.0;
    for r in 0..proposed.rows() {
        for c in 0..proposed.cols() {
            let p = Point::new(
                proposed.origin().x + c as f64 * proposed.cell_size(),
                proposed.origin().y + r as f64 * proposed.cell_size(),
            );
            if !point_in_polygon(p, overlay.sfha_boundary) {
                continue;
            }
            let existing_z = elevation_at(existing, p);
            let proposed_z = proposed.heights()[r * proposed.cols() + c];
            let bfe_z = elevation_at(overlay.base_flood_elevation, p);
            let displaced = (proposed_z.min(bfe_z) - existing_z).max(0.0);
            total += displaced * cell_area;
        }
    }
    Ok(total)
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn flat_grid(value: f64) -> ElevationGrid {
        ElevationGrid::new(Point::new(0.0, 0.0), 10.0, 5, 5, vec![value; 25]).unwrap()
    }

    fn whole_grid_boundary() -> Polygon {
        vec![
            Point::new(-100.0, -100.0),
            Point::new(100.0, -100.0),
            Point::new(100.0, 100.0),
            Point::new(-100.0, 100.0),
        ]
    }

    #[test]
    fn compensatory_storage_matches_hand_calculation() {
        let existing = flat_grid(95.0);
        let mut heights = vec![95.0; 25];
        for r in 0..2 {
            for c in 0..2 {
                heights[r * 5 + c] = 98.0;
            }
        }
        let proposed = ElevationGrid::new(Point::new(0.0, 0.0), 10.0, 5, 5, heights).unwrap();
        let bfe = flat_grid(100.0);
        let boundary = whole_grid_boundary();
        let overlay = FloodplainOverlay {
            base_flood_elevation: &bfe,
            sfha_boundary: &boundary,
            floodway_boundary: &boundary,
        };
        let displaced = compensatory_storage_displaced(&existing, &proposed, &overlay).unwrap();
        assert_relative_eq!(displaced, 1200.0, epsilon = 1e-6);
    }

    #[test]
    fn fill_above_bfe_does_not_displace_storage() {
        let existing = flat_grid(95.0);
        // Raise everything to 150 ft, well above the 100 ft BFE.
        let proposed = flat_grid(150.0);
        let bfe = flat_grid(100.0);
        let boundary = whole_grid_boundary();
        let overlay = FloodplainOverlay {
            base_flood_elevation: &bfe,
            sfha_boundary: &boundary,
            floodway_boundary: &boundary,
        };
        let displaced = compensatory_storage_displaced(&existing, &proposed, &overlay).unwrap();
        // Displaced volume is capped at (BFE - existing) = 5 ft per node,
        // not (proposed - existing) = 55 ft per node.
        let expected = 25.0 * 5.0 * 100.0;
        assert_relative_eq!(displaced, expected, epsilon = 1e-6);
    }

    #[test]
    fn fill_outside_sfha_is_not_counted() {
        let existing = flat_grid(95.0);
        let proposed = flat_grid(98.0);
        let bfe = flat_grid(100.0);
        // A tiny SFHA boundary far away from the grid entirely.
        let boundary = vec![
            Point::new(1000.0, 1000.0),
            Point::new(1001.0, 1000.0),
            Point::new(1001.0, 1001.0),
            Point::new(1000.0, 1001.0),
        ];
        let overlay = FloodplainOverlay {
            base_flood_elevation: &bfe,
            sfha_boundary: &boundary,
            floodway_boundary: &boundary,
        };
        let displaced = compensatory_storage_displaced(&existing, &proposed, &overlay).unwrap();
        assert_relative_eq!(displaced, 0.0, epsilon = 1e-12);
    }

    #[test]
    fn compensatory_storage_rejects_mismatched_grid_shapes() {
        let existing = flat_grid(95.0);
        let proposed =
            ElevationGrid::new(Point::new(0.0, 0.0), 10.0, 4, 4, vec![95.0; 16]).unwrap();
        let bfe = flat_grid(100.0);
        let boundary = whole_grid_boundary();
        let overlay = FloodplainOverlay {
            base_flood_elevation: &bfe,
            sfha_boundary: &boundary,
            floodway_boundary: &boundary,
        };
        assert!(matches!(
            compensatory_storage_displaced(&existing, &proposed, &overlay),
            Err(HydrologyError::ShapeMismatch { .. })
        ));
    }

    #[test]
    fn floodway_encroachment_detects_footprint_vertex_inside() {
        let bfe = flat_grid(100.0);
        let sfha = whole_grid_boundary();
        let floodway = vec![
            Point::new(-5.0, -5.0),
            Point::new(5.0, -5.0),
            Point::new(5.0, 5.0),
            Point::new(-5.0, 5.0),
        ];
        let overlay = FloodplainOverlay {
            base_flood_elevation: &bfe,
            sfha_boundary: &sfha,
            floodway_boundary: &floodway,
        };
        let footprint_inside = vec![
            Point::new(-1.0, -1.0),
            Point::new(1.0, -1.0),
            Point::new(1.0, 1.0),
            Point::new(-1.0, 1.0),
        ];
        let result = check_floodway_encroachment(&overlay, &footprint_inside);
        assert!(result.encroaches);
        assert_eq!(result.vertices_in_floodway, 4);

        let footprint_outside = vec![
            Point::new(50.0, 50.0),
            Point::new(60.0, 50.0),
            Point::new(60.0, 60.0),
            Point::new(50.0, 60.0),
        ];
        let result_outside = check_floodway_encroachment(&overlay, &footprint_outside);
        assert!(!result_outside.encroaches);
        assert_eq!(result_outside.vertices_in_floodway, 0);
    }
}
