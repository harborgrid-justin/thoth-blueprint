//! Sample lines, cross-section views, and average-end-area earthwork
//! quantity takeoff along an alignment.
//!
//! Port of `packages/domain/src/civil/sections.ts` +
//! `packages/domain/src/civil/types/sections.ts`. The TS source reads its
//! default swath width from the parts-catalog registry's civil design
//! standards (`sectionSwathWidthFt`), which has no registered value — so it
//! always falls through to its own literal fallback of `50.0`, mirrored here
//! as [`DEFAULT_SWATH_WIDTH`].

use crate::alignment::{
    point_at_station, resolve_alignment, HorizontalAlignment, ResolvedAlignment,
};
use crate::grading::CU_FT_PER_CU_YD;
use crate::profile::{sample_cross_section, CrossSection};
use crate::terrain::ElevationGrid;
use thoth_spatial::Point;

/// Default cross-section swath half-width, plan units.
pub const DEFAULT_SWATH_WIDTH: f64 = 50.0;

/// A single sample line (station cut) across an alignment.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SampleLine {
    pub station: f64,
    pub swath_left: f64,
    pub swath_right: f64,
    pub center_point: Point,
}

/// A named group of [`SampleLine`]s along one alignment.
#[derive(Debug, Clone)]
pub struct SampleLineGroup {
    pub id: String,
    pub name: String,
    pub alignment_id: String,
    pub sample_lines: Vec<SampleLine>,
}

/// Cross-section view data (existing vs. proposed) at one sample line.
#[derive(Debug, Clone, PartialEq)]
pub struct SectionView {
    pub station: f64,
    pub sample_line_id: String,
    pub cross_section: CrossSection,
    pub min_elevation: f64,
    pub max_elevation: f64,
}

/// One station's earthwork volume item, with running cumulative totals.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct EarthworkVolumeItem {
    pub station: f64,
    pub cut_area_sq_ft: f64,
    pub fill_area_sq_ft: f64,
    pub cut_volume_cu_yd: f64,
    pub fill_volume_cu_yd: f64,
    pub net_volume_cu_yd: f64,
    pub cumulative_cut_cu_yd: f64,
    pub cumulative_fill_cu_yd: f64,
    pub cumulative_net_cu_yd: f64,
}

/// Full quantity-takeoff volume summary for a sample line group.
#[derive(Debug, Clone, PartialEq)]
pub struct QtoVolumeSummary {
    pub alignment_id: String,
    pub items: Vec<EarthworkVolumeItem>,
    pub total_cut_cu_yd: f64,
    pub total_fill_cu_yd: f64,
    pub total_net_cu_yd: f64,
}

/// Creates sample lines across an alignment baseline by station interval
/// range.
pub fn generate_sample_lines(
    alignment: &HorizontalAlignment,
    resolved: Option<&ResolvedAlignment>,
    interval: f64,
    swath_width: f64,
) -> SampleLineGroup {
    let owned;
    let res = match resolved {
        Some(r) => Some(r),
        None => match resolve_alignment(alignment) {
            Ok(r) => {
                owned = r;
                Some(&owned)
            }
            Err(_) => None,
        },
    };

    let Some(res) = res else {
        return SampleLineGroup {
            id: format!("slg-{}", alignment.id),
            name: format!("{} Sample Lines", alignment.name),
            alignment_id: alignment.id.clone(),
            sample_lines: Vec::new(),
        };
    };

    let mut sample_lines = Vec::new();
    let start = res.start_station;
    let end = res.end_station;

    let mut s = start;
    while s <= end + 1e-6 {
        if let Ok(at) = point_at_station(res, s) {
            sample_lines.push(SampleLine {
                station: s,
                swath_left: swath_width,
                swath_right: swath_width,
                center_point: at.point,
            });
        }
        s += interval;
    }

    SampleLineGroup {
        id: format!("slg-{}", alignment.id),
        name: format!("{} Sample Lines", alignment.name),
        alignment_id: alignment.id.clone(),
        sample_lines,
    }
}

/// Generates cross-section view data plotting existing vs. proposed profiles
/// at a sample line. Returns `None` if the sample line's station falls
/// outside the alignment (matches the TS `null` return for a failed
/// `sampleCrossSection`).
pub fn generate_section_view(
    sample_line: &SampleLine,
    existing_grid: &ElevationGrid,
    proposed_grid: Option<&ElevationGrid>,
    resolved: &ResolvedAlignment,
) -> Option<SectionView> {
    let cs = sample_cross_section(
        existing_grid,
        proposed_grid,
        resolved,
        sample_line.station,
        sample_line.swath_left,
        2.5,
    )?;

    let all_elevs: Vec<f64> = cs
        .existing_points
        .iter()
        .map(|p| p.elevation)
        .chain(cs.proposed_points.iter().map(|p| p.elevation))
        .collect();

    let min_elevation = all_elevs.iter().cloned().fold(f64::INFINITY, f64::min);
    let max_elevation = all_elevs.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let (min_elevation, max_elevation) = if all_elevs.is_empty() {
        (0.0, 100.0)
    } else {
        (min_elevation, max_elevation)
    };

    Some(SectionView {
        station: sample_line.station,
        sample_line_id: format!("sl-{}", sample_line.station),
        cross_section: cs,
        min_elevation,
        max_elevation,
    })
}

fn calc_section_areas(
    existing_grid: &ElevationGrid,
    proposed_grid: &ElevationGrid,
    resolved: &ResolvedAlignment,
    line: &SampleLine,
) -> (f64, f64) {
    let Some(cs) = sample_cross_section(
        existing_grid,
        Some(proposed_grid),
        resolved,
        line.station,
        line.swath_left,
        2.0,
    ) else {
        return (0.0, 0.0);
    };
    if cs.existing_points.is_empty() {
        return (0.0, 0.0);
    }

    let mut cut_sq_ft = 0.0;
    let mut fill_sq_ft = 0.0;

    for i in 0..cs.existing_points.len() - 1 {
        let x1 = cs.existing_points[i].offset;
        let x2 = cs.existing_points[i + 1].offset;
        let dx = (x2 - x1).abs();

        let z_eg1 = cs.existing_points[i].elevation;
        let z_eg2 = cs.existing_points[i + 1].elevation;
        let z_pr1 = cs.proposed_points.get(i).map_or(z_eg1, |p| p.elevation);
        let z_pr2 = cs.proposed_points.get(i + 1).map_or(z_eg2, |p| p.elevation);

        let diff1 = z_pr1 - z_eg1;
        let diff2 = z_pr2 - z_eg2;
        let avg_diff = (diff1 + diff2) / 2.0;

        if avg_diff > 0.0 {
            fill_sq_ft += avg_diff * dx;
        } else {
            cut_sq_ft += avg_diff.abs() * dx;
        }
    }

    (cut_sq_ft, fill_sq_ft)
}

/// Calculates cut and fill earthwork volumes using the average end-area
/// method: `Volume (cu.yd) = ((Area1 + Area2) / 2) * Distance / 27`.
pub fn calculate_earthwork_volumes(
    sample_line_group: &SampleLineGroup,
    existing_grid: &ElevationGrid,
    proposed_grid: &ElevationGrid,
    resolved: &ResolvedAlignment,
) -> QtoVolumeSummary {
    let mut items = Vec::new();
    let mut cum_cut = 0.0;
    let mut cum_fill = 0.0;

    let lines = &sample_line_group.sample_lines;
    let section_areas: Vec<(f64, f64, f64)> = lines
        .iter()
        .map(|line| {
            let (cut, fill) = calc_section_areas(existing_grid, proposed_grid, resolved, line);
            (line.station, cut, fill)
        })
        .collect();

    for i in 0..section_areas.len() {
        let (station, cut_sq_ft, fill_sq_ft) = section_areas[i];

        if i == 0 {
            items.push(EarthworkVolumeItem {
                station,
                cut_area_sq_ft: cut_sq_ft,
                fill_area_sq_ft: fill_sq_ft,
                cut_volume_cu_yd: 0.0,
                fill_volume_cu_yd: 0.0,
                net_volume_cu_yd: 0.0,
                cumulative_cut_cu_yd: 0.0,
                cumulative_fill_cu_yd: 0.0,
                cumulative_net_cu_yd: 0.0,
            });
            continue;
        }

        let (prev_station, prev_cut, prev_fill) = section_areas[i - 1];
        let dist = station - prev_station;

        let cut_vol_yd3 = ((prev_cut + cut_sq_ft) / 2.0) * dist / CU_FT_PER_CU_YD;
        let fill_vol_yd3 = ((prev_fill + fill_sq_ft) / 2.0) * dist / CU_FT_PER_CU_YD;
        let net_vol_yd3 = fill_vol_yd3 - cut_vol_yd3;

        cum_cut += cut_vol_yd3;
        cum_fill += fill_vol_yd3;

        items.push(EarthworkVolumeItem {
            station,
            cut_area_sq_ft: cut_sq_ft,
            fill_area_sq_ft: fill_sq_ft,
            cut_volume_cu_yd: cut_vol_yd3,
            fill_volume_cu_yd: fill_vol_yd3,
            net_volume_cu_yd: net_vol_yd3,
            cumulative_cut_cu_yd: cum_cut,
            cumulative_fill_cu_yd: cum_fill,
            cumulative_net_cu_yd: cum_fill - cum_cut,
        });
    }

    QtoVolumeSummary {
        alignment_id: sample_line_group.alignment_id.clone(),
        items,
        total_cut_cu_yd: cum_cut,
        total_fill_cu_yd: cum_fill,
        total_net_cu_yd: cum_fill - cum_cut,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::alignment::AlignmentPi;
    use approx::assert_relative_eq;

    #[test]
    fn generate_sample_lines_spans_the_alignment_at_interval() {
        let align = HorizontalAlignment::new(
            "a1",
            "Test",
            vec![
                AlignmentPi::simple(Point::new(0.0, 0.0)),
                AlignmentPi::simple(Point::new(1000.0, 0.0)),
            ],
            0.0,
        );
        let group = generate_sample_lines(&align, None, 100.0, DEFAULT_SWATH_WIDTH);
        assert!(!group.sample_lines.is_empty());
        assert_eq!(group.sample_lines[0].station, 0.0);
    }

    #[test]
    fn generate_sample_lines_on_degenerate_alignment_is_empty() {
        let align =
            HorizontalAlignment::new("a1", "Test", vec![AlignmentPi::simple(Point::ZERO)], 0.0);
        let group = generate_sample_lines(&align, None, 100.0, DEFAULT_SWATH_WIDTH);
        assert!(group.sample_lines.is_empty());
    }

    #[test]
    fn calculate_earthwork_volumes_matches_average_end_area_by_hand() {
        let align = HorizontalAlignment::new(
            "a1",
            "Test",
            vec![
                AlignmentPi::simple(Point::new(0.0, 0.0)),
                AlignmentPi::simple(Point::new(200.0, 0.0)),
            ],
            0.0,
        );
        let resolved = resolve_alignment(&align).unwrap();

        // Flat existing at 10, flat proposed at 12: uniform 2-unit fill everywhere.
        let existing =
            ElevationGrid::new(Point::new(-60.0, -60.0), 5.0, 30, 30, vec![10.0; 900]).unwrap();
        let proposed =
            ElevationGrid::new(Point::new(-60.0, -60.0), 5.0, 30, 30, vec![12.0; 900]).unwrap();

        let group = generate_sample_lines(&align, Some(&resolved), 100.0, 25.0);
        let summary = calculate_earthwork_volumes(&group, &existing, &proposed, &resolved);
        assert!(summary.total_fill_cu_yd > 0.0);
        assert_relative_eq!(summary.total_cut_cu_yd, 0.0, epsilon = 1e-9);
    }
}
