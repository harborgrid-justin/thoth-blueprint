//! Construction-staking point-list export: cut/fill-to-grade and
//! offset-from-centerline computations for a set of stake locations, given a
//! design alignment and/or design surface.
//!
//! Scope: reuses `thoth_civil::alignment::ResolvedAlignment` (for
//! station/offset resolution) and `thoth_civil::terrain::ElevationGrid` (for
//! design and existing-ground elevations) directly — this module performs
//! no alignment or terrain math of its own, only the staking geometry that
//! sits on top: for each requested stake point, it resolves station/offset/
//! side from the alignment (when supplied) and cut/fill (design elevation
//! minus existing-ground elevation, sampled from an `ElevationGrid` via that
//! crate's own bilinear interpolation) from the design/existing surfaces
//! (when supplied). At least one of an alignment or a design surface must be
//! supplied — a stake with neither has nothing for this module to compute.

use thoth_civil::alignment::{station_offset_of_point, ResolvedAlignment, Side};
use thoth_civil::terrain::ElevationGrid;
use thoth_spatial::Point;

use crate::error::{InteropError, InteropResult};

const FORMAT: &str = "ConstructionStaking";

/// One point to stake in the field.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct StakePoint {
    pub label_prefix: &'static str,
    pub position: Point,
}

/// The staking data computed for one [`StakePoint`].
#[derive(Debug, Clone, PartialEq)]
pub struct StakeRecord {
    pub label: String,
    pub position: Point,
    /// Station/offset/side along the design alignment, if one was supplied.
    pub station: Option<f64>,
    pub offset: Option<f64>,
    pub side: Option<StakeSide>,
    /// Design (proposed) surface elevation at this point, if a design
    /// surface was supplied and the point falls within its data envelope.
    pub design_elevation: Option<f64>,
    /// Existing-ground surface elevation at this point, under the same
    /// condition as `design_elevation`.
    pub existing_elevation: Option<f64>,
    /// `design_elevation - existing_elevation`: positive means fill
    /// (design is higher, material must be added), negative means cut
    /// (material must be removed). `None` if either elevation is unavailable.
    pub cut_fill: Option<f64>,
}

/// Mirrors `thoth_civil::alignment::Side`, re-exposed so callers of this
/// module don't need to name that crate's alignment module directly for
/// this one enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StakeSide {
    Left,
    Right,
    On,
}

impl From<Side> for StakeSide {
    fn from(s: Side) -> Self {
        match s {
            Side::Left => StakeSide::Left,
            Side::Right => StakeSide::Right,
            Side::On => StakeSide::On,
        }
    }
}

/// Compute staking records for a list of points against an optional design
/// alignment and/or optional design/existing surface pair.
///
/// # Errors
/// [`InteropError::Unsupported`] if neither `alignment` nor
/// `(design_surface, existing_surface)` is supplied — there is nothing to
/// compute against.
pub fn compute_staking(
    points: &[StakePoint],
    alignment: Option<&ResolvedAlignment>,
    design_surface: Option<&ElevationGrid>,
    existing_surface: Option<&ElevationGrid>,
) -> InteropResult<Vec<StakeRecord>> {
    if alignment.is_none() && design_surface.is_none() {
        return Err(InteropError::Unsupported {
            format: FORMAT,
            reason: "at least one of an alignment or a design surface must be supplied".to_string(),
        });
    }

    let mut out = Vec::with_capacity(points.len());
    for (i, stake) in points.iter().enumerate() {
        let (station, offset, side) = match alignment {
            Some(resolved) => {
                let so = station_offset_of_point(resolved, stake.position);
                (Some(so.station), Some(so.offset), Some(so.side.into()))
            }
            None => (None, None, None),
        };

        let design_elevation = design_surface.and_then(|g| sample_grid(g, stake.position));
        let existing_elevation = existing_surface.and_then(|g| sample_grid(g, stake.position));
        let cut_fill = match (design_elevation, existing_elevation) {
            (Some(d), Some(e)) => Some(d - e),
            _ => None,
        };

        out.push(StakeRecord {
            label: format!("{}{}", stake.label_prefix, i + 1),
            position: stake.position,
            station,
            offset,
            side,
            design_elevation,
            existing_elevation,
            cut_fill,
        });
    }
    Ok(out)
}

/// Sample an elevation grid at a point via its own bilinear interpolation,
/// returning `None` (rather than propagating an error) when the point falls
/// outside the grid's data envelope — a stake point legitimately outside a
/// terrain model's extent is a normal occurrence in staking work, not a
/// caller error.
fn sample_grid(grid: &ElevationGrid, p: Point) -> Option<f64> {
    thoth_civil::terrain::elevation_at_strict(grid, p).ok()
}

/// Render a plain-text stake sheet: one line per record, in the conventional
/// field-book order (label, northing, easting, station/offset, cut/fill).
pub fn format_stake_sheet(records: &[StakeRecord]) -> String {
    let mut lines = vec!["Label\tNorthing\tEasting\tStation\tOffset\tSide\tCut/Fill".to_string()];
    for r in records {
        let (northing, easting) = (-r.position.y, r.position.x);
        let station = r
            .station
            .map(|s| format!("{s:.2}"))
            .unwrap_or_else(|| "-".to_string());
        let offset = r
            .offset
            .map(|o| format!("{o:.2}"))
            .unwrap_or_else(|| "-".to_string());
        let side = match r.side {
            Some(StakeSide::Left) => "L",
            Some(StakeSide::Right) => "R",
            Some(StakeSide::On) => "-",
            None => "-",
        };
        let cut_fill = match r.cut_fill {
            Some(v) if v >= 0.0 => format!("F {v:.2}"),
            Some(v) => format!("C {:.2}", -v),
            None => "-".to_string(),
        };
        lines.push(format!(
            "{}\t{:.3}\t{:.3}\t{}\t{}\t{}\t{}",
            r.label, northing, easting, station, offset, side, cut_fill
        ));
    }
    lines.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_civil::alignment::{resolve_alignment, AlignmentPi, HorizontalAlignment};

    fn straight_alignment() -> ResolvedAlignment {
        let a = HorizontalAlignment::new(
            "a1",
            "Main St",
            vec![
                AlignmentPi::simple(Point::new(0.0, 0.0)),
                AlignmentPi::simple(Point::new(0.0, -1000.0)),
            ],
            0.0,
        );
        resolve_alignment(&a).unwrap()
    }

    fn flat_grid(elevation: f64) -> ElevationGrid {
        ElevationGrid::new(
            Point::new(-100.0, -1100.0),
            10.0,
            40,
            120,
            vec![elevation; 40 * 120],
        )
        .unwrap()
    }

    #[test]
    fn stakes_along_a_straight_alignment_report_station_and_offset() {
        let resolved = straight_alignment();
        let points = vec![
            StakePoint {
                label_prefix: "CL",
                position: Point::new(0.0, -100.0),
            },
            StakePoint {
                label_prefix: "CL",
                position: Point::new(10.0, -200.0),
            },
        ];
        let records = compute_staking(&points, Some(&resolved), None, None).unwrap();
        assert_eq!(records[0].label, "CL1");
        assert!((records[0].station.unwrap() - 100.0).abs() < 1e-6);
        assert!((records[0].offset.unwrap() - 0.0).abs() < 1e-6);
        assert!((records[1].station.unwrap() - 200.0).abs() < 1e-6);
        assert!((records[1].offset.unwrap() - 10.0).abs() < 1e-6);
        assert_eq!(records[1].side, Some(StakeSide::Right));
    }

    #[test]
    fn cut_fill_reflects_design_minus_existing() {
        let design = flat_grid(105.0);
        let existing = flat_grid(100.0);
        let points = vec![StakePoint {
            label_prefix: "P",
            position: Point::new(0.0, -100.0),
        }];
        let records = compute_staking(&points, None, Some(&design), Some(&existing)).unwrap();
        assert!((records[0].cut_fill.unwrap() - 5.0).abs() < 1e-6); // fill 5'
    }

    #[test]
    fn cut_is_reported_as_negative_cut_fill() {
        let design = flat_grid(95.0);
        let existing = flat_grid(100.0);
        let points = vec![StakePoint {
            label_prefix: "P",
            position: Point::new(0.0, -100.0),
        }];
        let records = compute_staking(&points, None, Some(&design), Some(&existing)).unwrap();
        assert!((records[0].cut_fill.unwrap() + 5.0).abs() < 1e-6);
        let sheet = format_stake_sheet(&records);
        assert!(sheet.contains("C 5.00"));
    }

    #[test]
    fn neither_alignment_nor_surface_is_rejected() {
        let points = vec![StakePoint {
            label_prefix: "P",
            position: Point::ZERO,
        }];
        assert!(matches!(
            compute_staking(&points, None, None, None),
            Err(InteropError::Unsupported { .. })
        ));
    }

    #[test]
    fn point_outside_surface_envelope_yields_no_cut_fill_not_an_error() {
        let design = flat_grid(100.0);
        let points = vec![StakePoint {
            label_prefix: "P",
            position: Point::new(10_000.0, 10_000.0),
        }];
        let records = compute_staking(&points, None, Some(&design), Some(&design)).unwrap();
        assert!(records[0].cut_fill.is_none());
    }
}
