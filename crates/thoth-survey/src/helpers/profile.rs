//! Vertical-profile cross-section sampling and PVI-table edits for the plan
//! canvas. Direct port of
//! `packages/domain/src/survey/helpers/profileHelpers.ts`.
//!
//! Unlocked this pass by adding `thoth-civil` as a dependency (see
//! `../../GAPS.md` #3 and `../../STATUS.md`).

use thoth_civil::alignment::ResolvedAlignment;
use thoth_civil::profile::{sample_cross_section, CrossSection, VerticalProfile, VerticalPvi};
use thoth_civil::terrain::ElevationGrid;

/// Samples an existing/proposed cross-section at `selected_station` using
/// `terrain` for *both* the existing and proposed grid (the TS original
/// passes the same `terrainSurface` value for both `sampleCrossSection`
/// parameters — there is no separate "proposed" surface at this call site).
/// Returns `None` if either `resolved` or `terrain` is absent (mirrors the
/// TS `if (!resolved || !terrainSurface) return null;`), or if the station
/// falls outside the alignment.
pub fn compute_cross_section(
    resolved: Option<&ResolvedAlignment>,
    terrain: Option<&ElevationGrid>,
    selected_station: f64,
    swath_width: f64,
) -> Option<CrossSection> {
    let (resolved, terrain) = (resolved?, terrain?);
    sample_cross_section(
        terrain,
        Some(terrain),
        resolved,
        selected_station,
        swath_width,
        2.0,
    )
}

/// Which field of a [`VerticalPvi`] to edit via [`update_profile_pvi`] —
/// Rust's typed replacement for the TS original's `field: keyof VerticalPVI`
/// dynamic property access.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PviField {
    Station,
    Elevation,
    CurveLength,
}

/// Returns a copy of `profile` with the PVI at `index` updated: `field` set
/// to `value` (all other PVIs, and all other fields of that PVI, unchanged).
///
/// Diverges from the TS original for an out-of-range `index`: the TS
/// `updated[index] = {...updated[index], [field]: value}` would grow the
/// array and splice in a bare `{ [field]: value }` object missing its other
/// required fields — a malformed `VerticalPVI`. Rust's typed `VerticalPvi`
/// has no representation for that half-filled state, so an out-of-range
/// `index` here is a no-op, returning `profile` unchanged.
pub fn update_profile_pvi(
    profile: &VerticalProfile,
    index: usize,
    field: PviField,
    value: f64,
) -> VerticalProfile {
    let mut pvis = profile.pvis.clone();
    if let Some(pvi) = pvis.get_mut(index) {
        match field {
            PviField::Station => pvi.station = value,
            PviField::Elevation => pvi.elevation = value,
            PviField::CurveLength => pvi.curve_length = Some(value),
        }
    }
    VerticalProfile {
        id: profile.id.clone(),
        name: profile.name.clone(),
        alignment_id: profile.alignment_id.clone(),
        pvis,
    }
}

/// Appends a new PVI 100 stations past the last existing one (or at station
/// 100 if the profile is empty), at a fixed elevation of 15 and a 50-unit
/// curve length — the TS original's fixed "add a reasonable-looking default
/// PVI" fixture.
pub fn add_profile_pvi(profile: &VerticalProfile) -> VerticalProfile {
    let station = profile.pvis.last().map_or(100.0, |p| p.station + 100.0);
    let mut pvis = profile.pvis.clone();
    pvis.push(VerticalPvi {
        station,
        elevation: 15.0,
        curve_length: Some(50.0),
    });
    VerticalProfile {
        id: profile.id.clone(),
        name: profile.name.clone(),
        alignment_id: profile.alignment_id.clone(),
        pvis,
    }
}

/// Removes the PVI at `index`, unless `profile` has one or fewer PVIs (a
/// profile always keeps at least one PVI). An out-of-range `index` is a
/// no-op (matches the TS `.filter((_, i) => i !== index)`, which removes
/// nothing when no element's index equals an out-of-range value).
pub fn remove_profile_pvi(profile: &VerticalProfile, index: usize) -> VerticalProfile {
    let mut pvis = profile.pvis.clone();
    if pvis.len() > 1 && index < pvis.len() {
        pvis.remove(index);
    }
    VerticalProfile {
        id: profile.id.clone(),
        name: profile.name.clone(),
        alignment_id: profile.alignment_id.clone(),
        pvis,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;
    use thoth_civil::alignment::{resolve_alignment, AlignmentPi, HorizontalAlignment};
    use thoth_spatial::Point;

    fn straight_alignment() -> ResolvedAlignment {
        let a = HorizontalAlignment::new(
            "a1",
            "Straight",
            vec![
                AlignmentPi::simple(Point::new(0.0, 0.0)),
                AlignmentPi::simple(Point::new(500.0, 0.0)),
            ],
            0.0,
        );
        resolve_alignment(&a).unwrap()
    }

    fn flat_grid() -> ElevationGrid {
        ElevationGrid::new(Point::new(-100.0, -100.0), 10.0, 40, 40, vec![25.0; 1600]).unwrap()
    }

    fn profile() -> VerticalProfile {
        VerticalProfile {
            id: "vp1".into(),
            name: "Profile 1".into(),
            alignment_id: "a1".into(),
            pvis: vec![
                VerticalPvi {
                    station: 0.0,
                    elevation: 50.0,
                    curve_length: None,
                },
                VerticalPvi {
                    station: 500.0,
                    elevation: 150.0,
                    curve_length: Some(200.0),
                },
            ],
        }
    }

    #[test]
    fn computes_a_cross_section_at_a_station() {
        let r = straight_alignment();
        let g = flat_grid();
        let cs = compute_cross_section(Some(&r), Some(&g), 100.0, 20.0).unwrap();
        assert_eq!(cs.station, 100.0);
        assert!(!cs.existing_points.is_empty());
        // Same grid used for both existing and proposed.
        assert_eq!(cs.existing_points.len(), cs.proposed_points.len());
        for p in &cs.existing_points {
            assert_relative_eq!(p.elevation, 25.0, epsilon = 1e-9);
        }
    }

    #[test]
    fn returns_none_without_a_resolved_alignment_or_terrain() {
        let r = straight_alignment();
        let g = flat_grid();
        assert!(compute_cross_section(None, Some(&g), 100.0, 20.0).is_none());
        assert!(compute_cross_section(Some(&r), None, 100.0, 20.0).is_none());
    }

    #[test]
    fn updates_a_single_field_of_one_pvi() {
        let p = profile();
        let updated = update_profile_pvi(&p, 0, PviField::Elevation, 60.0);
        assert_relative_eq!(updated.pvis[0].elevation, 60.0, epsilon = 1e-9);
        assert_relative_eq!(updated.pvis[0].station, 0.0, epsilon = 1e-9); // unchanged
        assert_relative_eq!(updated.pvis[1].elevation, 150.0, epsilon = 1e-9); // untouched
    }

    #[test]
    fn updating_curve_length_sets_it_to_some() {
        let p = profile();
        let updated = update_profile_pvi(&p, 0, PviField::CurveLength, 75.0);
        assert_eq!(updated.pvis[0].curve_length, Some(75.0));
    }

    #[test]
    fn updating_an_out_of_range_index_is_a_no_op() {
        let p = profile();
        let updated = update_profile_pvi(&p, 99, PviField::Elevation, 999.0);
        assert_eq!(updated.pvis.len(), p.pvis.len());
        assert_relative_eq!(updated.pvis[1].elevation, 150.0, epsilon = 1e-9);
    }

    #[test]
    fn adds_a_pvi_100_stations_past_the_last_one() {
        let p = profile();
        let updated = add_profile_pvi(&p);
        assert_eq!(updated.pvis.len(), 3);
        let added = updated.pvis.last().unwrap();
        assert_relative_eq!(added.station, 600.0, epsilon = 1e-9);
        assert_relative_eq!(added.elevation, 15.0, epsilon = 1e-9);
        assert_eq!(added.curve_length, Some(50.0));
    }

    #[test]
    fn adds_a_pvi_at_station_100_for_an_empty_profile() {
        let empty = VerticalProfile {
            id: "e".into(),
            name: "E".into(),
            alignment_id: "a".into(),
            pvis: vec![],
        };
        let updated = add_profile_pvi(&empty);
        assert_relative_eq!(updated.pvis[0].station, 100.0, epsilon = 1e-9);
    }

    #[test]
    fn removes_a_pvi_by_index() {
        let mut p = profile();
        p.pvis.push(VerticalPvi {
            station: 1000.0,
            elevation: 100.0,
            curve_length: None,
        });
        let updated = remove_profile_pvi(&p, 1);
        assert_eq!(updated.pvis.len(), 2);
        assert_relative_eq!(updated.pvis[1].station, 1000.0, epsilon = 1e-9);
    }

    #[test]
    fn refuses_to_remove_the_last_remaining_pvi() {
        let single = VerticalProfile {
            id: "s".into(),
            name: "S".into(),
            alignment_id: "a".into(),
            pvis: vec![VerticalPvi {
                station: 0.0,
                elevation: 0.0,
                curve_length: None,
            }],
        };
        let updated = remove_profile_pvi(&single, 0);
        assert_eq!(updated.pvis.len(), 1);
    }

    #[test]
    fn removing_an_out_of_range_index_is_a_no_op() {
        let p = profile();
        let updated = remove_profile_pvi(&p, 99);
        assert_eq!(updated.pvis.len(), p.pvis.len());
    }
}
