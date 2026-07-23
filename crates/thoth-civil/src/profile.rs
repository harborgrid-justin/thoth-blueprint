//! Vertical design profiles: PVI chains, parabolic vertical curves, and
//! cross-section sampling against a terrain surface.
//!
//! Port of `packages/domain/src/civil/profile.ts` +
//! `packages/domain/src/civil/types/profile.ts`.

use thoth_spatial::Point;

use crate::alignment::{point_at_station, ResolvedAlignment};
use crate::terrain::{elevation_at, ElevationGrid};

/// A Point of Vertical Intersection (PVI) in a vertical design profile.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct VerticalPvi {
    pub station: f64,
    pub elevation: f64,
    /// Vertical curve length (parabolic curve), in plan units. `None`/`0`
    /// implies a grade-break point without a curve.
    pub curve_length: Option<f64>,
}

/// A vertical design profile aligned to a horizontal baseline.
#[derive(Debug, Clone)]
pub struct VerticalProfile {
    pub id: String,
    pub name: String,
    pub alignment_id: String,
    pub pvis: Vec<VerticalPvi>,
}

/// Resolved vertical curve parameters at a PVI.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ResolvedVerticalCurve {
    pub pvi_station: f64,
    pub pvi_elevation: f64,
    pub start_station: f64,
    pub end_station: f64,
    pub start_elevation: f64,
    pub end_elevation: f64,
    pub grade_in: f64,
    pub grade_out: f64,
    pub curve_length: f64,
    /// K-value = curve length / percentage grade change (sight-distance check).
    pub k_value: f64,
    /// Coefficients of the parabola `y = a·x² + b·x + c`, `x` = distance from
    /// curve start.
    pub a: f64,
    pub b: f64,
    pub c: f64,
}

/// A single offset-elevation coordinate point in a cross-section slice.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CrossSectionPoint {
    pub offset: f64,
    pub elevation: f64,
}

/// Bounded cross-section data at a specific station.
#[derive(Debug, Clone, PartialEq)]
pub struct CrossSection {
    pub station: f64,
    pub centerpoint: Point,
    pub existing_points: Vec<CrossSectionPoint>,
    pub proposed_points: Vec<CrossSectionPoint>,
}

/// A single K-value check result for one PVI.
#[derive(Debug, Clone, PartialEq)]
pub struct ProfileKValueCheck {
    pub pvi_index: usize,
    pub station: f64,
    pub k_value: f64,
    pub min_k: f64,
    pub is_violation: bool,
    pub message: String,
}

/// Resolve vertical curve parameters for a given PVI, given incoming and
/// outgoing PVIs. Returns `None` if the PVI has no curve length, or is
/// missing a neighbor on either side (matches the TS `null` return exactly —
/// a PVI without curve data isn't a caller error, it's a legitimate
/// grade-break point).
pub fn resolve_vertical_curve(pvi: VerticalPvi, prev: Option<VerticalPvi>, next: Option<VerticalPvi>) -> Option<ResolvedVerticalCurve> {
    let l = pvi.curve_length?;
    if l <= 0.0 {
        return None;
    }
    let (prev, next) = (prev?, next?);

    let g1 = (pvi.elevation - prev.elevation) / (pvi.station - prev.station);
    let g2 = (next.elevation - pvi.elevation) / (next.station - pvi.station);

    let start_station = pvi.station - l / 2.0;
    let end_station = pvi.station + l / 2.0;

    // Elevation at curve start on the incoming tangent.
    let start_elevation = pvi.elevation - g1 * (l / 2.0);
    let end_elevation = pvi.elevation + g2 * (l / 2.0);

    let grade_change = (g2 - g1).abs() * 100.0; // percent
    let k_value = if grade_change > 0.0001 { l / grade_change } else { f64::INFINITY };

    // Parabolic equation y = a*x^2 + b*x + c, x = station - start_station in [0, L].
    // At x=0: y=start_elevation, y'=g1 => c=start_elevation, b=g1.
    // At x=L: y=end_elevation, y'=g2 => a=(g2-g1)/(2L).
    let a = (g2 - g1) / (2.0 * l);
    let b = g1;
    let c = start_elevation;

    Some(ResolvedVerticalCurve {
        pvi_station: pvi.station,
        pvi_elevation: pvi.elevation,
        start_station,
        end_station,
        start_elevation,
        end_elevation,
        grade_in: g1,
        grade_out: g2,
        curve_length: l,
        k_value,
        a,
        b,
        c,
    })
}

/// Calculate the vertical profile elevation at a given station. Extrapolates
/// flat past either end of the profile (matches TS: clamps to the first/last
/// PVI's elevation), and is otherwise piecewise linear or parabolic through
/// vertical curves.
pub fn profile_elevation_at(profile: &VerticalProfile, station: f64) -> f64 {
    if profile.pvis.is_empty() {
        return 0.0;
    }
    let mut sorted = profile.pvis.clone();
    sorted.sort_by(|a, b| a.station.partial_cmp(&b.station).unwrap_or(std::cmp::Ordering::Equal));

    if station <= sorted[0].station {
        return sorted[0].elevation;
    }
    if station >= sorted[sorted.len() - 1].station {
        return sorted[sorted.len() - 1].elevation;
    }

    // Find the PVI segment containing this station.
    let mut idx = 0;
    while idx < sorted.len() - 1 && sorted[idx + 1].station < station {
        idx += 1;
    }

    let pvi = sorted[idx];
    let next_pvi = sorted[idx + 1];
    let prev_pvi = if idx > 0 { Some(sorted[idx - 1]) } else { None };

    // Check if we are inside the vertical curve of `pvi`.
    if pvi.curve_length.is_some_and(|l| l > 0.0) {
        if let Some(curve) = resolve_vertical_curve(pvi, prev_pvi, Some(next_pvi)) {
            if station >= curve.start_station && station <= curve.end_station {
                let x = station - curve.start_station;
                return curve.a * x * x + curve.b * x + curve.c;
            }
        }
    }

    // Check the vertical curve of `next_pvi`.
    let next_next_pvi = if idx + 2 < sorted.len() { Some(sorted[idx + 2]) } else { None };
    if next_pvi.curve_length.is_some_and(|l| l > 0.0) {
        if let Some(curve) = resolve_vertical_curve(next_pvi, Some(pvi), next_next_pvi) {
            if station >= curve.start_station && station <= curve.end_station {
                let x = station - curve.start_station;
                return curve.a * x * x + curve.b * x + curve.c;
            }
        }
    }

    // Straight-line interpolation (tangent run).
    let ratio = (station - pvi.station) / (next_pvi.station - pvi.station);
    pvi.elevation + (next_pvi.elevation - pvi.elevation) * ratio
}

/// Samples a cross-section slice of the terrain (existing and proposed
/// heights) at a given station along a horizontal alignment. Returns `None`
/// if the station falls outside the alignment (matches the TS `null`
/// return for `pointAtStation` failing — a legitimate empty result, not a
/// caller error, since this is routinely called while sweeping a whole
/// alignment's station range).
pub fn sample_cross_section(existing_grid: &ElevationGrid, proposed_grid: Option<&ElevationGrid>, resolved: &ResolvedAlignment, station: f64, swath_width: f64, step_size: f64) -> Option<CrossSection> {
    let at = point_at_station(resolved, station).ok()?;
    let rad = at.bearing * std::f64::consts::PI / 180.0;

    // Right-of-travel direction unit vector (perpendicular to bearing).
    let nx = rad.cos();
    let ny = rad.sin();

    let mut existing_points = Vec::new();
    let mut proposed_points = Vec::new();

    let min_offset = -swath_width;
    let max_offset = swath_width;

    let mut offset = min_offset;
    while offset <= max_offset {
        let p_world = Point::new(at.point.x + offset * nx, at.point.y + offset * ny);

        existing_points.push(CrossSectionPoint { offset, elevation: elevation_at(existing_grid, p_world) });

        if let Some(proposed_grid) = proposed_grid {
            proposed_points.push(CrossSectionPoint { offset, elevation: elevation_at(proposed_grid, p_world) });
        }
        offset += step_size;
    }

    Some(CrossSection { station, centerpoint: at.point, existing_points, proposed_points })
}

/// Extracts Existing Ground (EG) surface profile elevations along an
/// alignment baseline.
///
/// The TS original mints its id from `Date.now()`; this port uses
/// [`thoth_spatial::create_id`] instead, matching the same deliberate
/// deviation documented on `alignment::create_alignment_from_objects`.
pub fn extract_surface_profile(grid: &ElevationGrid, resolved: &ResolvedAlignment, sample_interval: f64) -> VerticalProfile {
    let mut pvis = Vec::new();
    let total_len = resolved.length;
    let count = ((total_len / sample_interval).floor() as i64).max(2);

    for i in 0..=count {
        let station = resolved.start_station + (total_len * i as f64) / count as f64;
        let Ok(at) = point_at_station(resolved, station) else {
            continue;
        };
        let elev = elevation_at(grid, at.point);
        pvis.push(VerticalPvi { station, elevation: elev, curve_length: None });
    }

    VerticalProfile {
        id: format!("eg-prof-{}", thoth_spatial::create_id("t")),
        name: format!("{} - Existing Ground Profile", resolved.name),
        alignment_id: resolved.name.clone(),
        pvis,
    }
}

/// AASHTO minimum K-value for a crest vertical curve at a given design speed.
fn min_k_crest(design_speed: f64) -> f64 {
    if design_speed <= 25.0 {
        12.0
    } else if design_speed <= 35.0 {
        29.0
    } else if design_speed <= 45.0 {
        61.0
    } else {
        151.0
    }
}

/// AASHTO minimum K-value for a sag vertical curve at a given design speed.
fn min_k_sag(design_speed: f64) -> f64 {
    if design_speed <= 25.0 {
        26.0
    } else if design_speed <= 35.0 {
        49.0
    } else if design_speed <= 45.0 {
        79.0
    } else {
        136.0
    }
}

/// Validates vertical design profile K-values against minimum stopping
/// sight-distance criteria.
pub fn validate_profile_k_values(profile: &VerticalProfile, design_speed: f64) -> Vec<ProfileKValueCheck> {
    let mut pvis = profile.pvis.clone();
    pvis.sort_by(|a, b| a.station.partial_cmp(&b.station).unwrap_or(std::cmp::Ordering::Equal));
    let mut results = Vec::new();

    for i in 1..pvis.len().saturating_sub(1) {
        let pvi = pvis[i];
        if !pvi.curve_length.is_some_and(|l| l > 0.0) {
            continue;
        }
        let Some(curve) = resolve_vertical_curve(pvi, Some(pvis[i - 1]), Some(pvis[i + 1])) else {
            continue;
        };
        let is_crest = curve.grade_in > curve.grade_out;
        let min_k = if is_crest { min_k_crest(design_speed) } else { min_k_sag(design_speed) };
        let is_violation = curve.k_value < min_k;

        results.push(ProfileKValueCheck {
            pvi_index: i,
            station: pvi.station,
            k_value: curve.k_value,
            min_k,
            is_violation,
            message: if is_violation {
                format!("Vertical curve at station {:.2} has K={:.1} below AASHTO minimum K={} for {} mph.", pvi.station, curve.k_value, min_k, design_speed)
            } else {
                format!("Vertical curve at station {:.2} meets AASHTO standards.", pvi.station)
            },
        });
    }

    results
}

/// Copies a profile and applies a constant vertical offset.
pub fn copy_and_offset_profile(profile: &VerticalProfile, vertical_delta: f64, name_suffix: &str) -> VerticalProfile {
    VerticalProfile {
        id: format!("{}-off-{}", profile.id, vertical_delta),
        name: format!("{} {} ({}{:.1}ft)", profile.name, name_suffix, if vertical_delta >= 0.0 { "+" } else { "" }, vertical_delta),
        alignment_id: profile.alignment_id.clone(),
        pvis: profile.pvis.iter().map(|p| VerticalPvi { elevation: p.elevation + vertical_delta, ..*p }).collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn profile() -> VerticalProfile {
        VerticalProfile {
            id: "vp1".into(),
            name: "Profile 1".into(),
            alignment_id: "a1".into(),
            pvis: vec![
                VerticalPvi { station: 0.0, elevation: 50.0, curve_length: None },
                VerticalPvi { station: 500.0, elevation: 150.0, curve_length: Some(200.0) },
                VerticalPvi { station: 1000.0, elevation: 100.0, curve_length: None },
            ],
        }
    }

    #[test]
    fn straight_tangent_elevations_outside_the_curve() {
        let p = profile();
        assert_relative_eq!(profile_elevation_at(&p, 200.0), 90.0, epsilon = 1e-4);
        assert_relative_eq!(profile_elevation_at(&p, 800.0), 120.0, epsilon = 1e-4);
    }

    #[test]
    fn parabolic_curve_elevation_inside_the_vertical_curve() {
        let p = profile();
        assert_relative_eq!(profile_elevation_at(&p, 500.0), 142.5, epsilon = 1e-4);
    }

    #[test]
    fn resolve_vertical_curve_is_none_without_neighbors_or_curve_length() {
        let pvi = VerticalPvi { station: 500.0, elevation: 150.0, curve_length: Some(200.0) };
        assert!(resolve_vertical_curve(pvi, None, None).is_none());
        let no_curve = VerticalPvi { station: 500.0, elevation: 150.0, curve_length: None };
        let prev = VerticalPvi { station: 0.0, elevation: 50.0, curve_length: None };
        let next = VerticalPvi { station: 1000.0, elevation: 100.0, curve_length: None };
        assert!(resolve_vertical_curve(no_curve, Some(prev), Some(next)).is_none());
    }

    #[test]
    fn empty_profile_elevation_is_zero() {
        let p = VerticalProfile { id: "e".into(), name: "E".into(), alignment_id: "a".into(), pvis: vec![] };
        assert_eq!(profile_elevation_at(&p, 100.0), 0.0);
    }

    #[test]
    fn copy_and_offset_profile_shifts_every_pvi() {
        let p = profile();
        let shifted = copy_and_offset_profile(&p, 5.0, "Offset");
        assert_relative_eq!(shifted.pvis[0].elevation, 55.0, epsilon = 1e-9);
        assert_relative_eq!(shifted.pvis[1].elevation, 155.0, epsilon = 1e-9);
    }

    #[test]
    fn validate_profile_k_values_flags_low_k_sag_curve() {
        // A sharp sag curve with a short curve length relative to grade change.
        let p = VerticalProfile {
            id: "kp".into(),
            name: "K".into(),
            alignment_id: "a".into(),
            pvis: vec![
                VerticalPvi { station: 0.0, elevation: 100.0, curve_length: None },
                VerticalPvi { station: 500.0, elevation: 50.0, curve_length: Some(50.0) },
                VerticalPvi { station: 1000.0, elevation: 100.0, curve_length: None },
            ],
        };
        let checks = validate_profile_k_values(&p, 45.0);
        assert_eq!(checks.len(), 1);
        assert!(checks[0].is_violation);
    }
}
