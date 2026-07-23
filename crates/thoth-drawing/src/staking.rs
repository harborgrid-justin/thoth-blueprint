//! Automated construction-staking sheet generation (competitive gap-analysis
//! Theme 5, item 51 — see `docs/COMPETITIVE_GAP_ANALYSIS.md`).
//!
//! `thoth-interop` (a sibling crate, developed in parallel and not yet a
//! dependency of this one) owns *computing* a staking point list from a
//! design alignment — the cut/fill-to-grade and offset math. This module
//! owns the other half: turning an already-computed list of staking points
//! into sheet-production output — a stake-out schedule table (via
//! [`crate::schedule::ScheduleTable`], so it renders through the same
//! generic table pipeline as every other schedule) and plotted plan-view
//! symbols (via [`crate::scene::SheetPrimitive`]).
//!
//! [`StakingPoint`] is a **local, self-contained type**, defined here rather
//! than imported from `thoth-interop`, per this crate's task boundary:
//! `thoth-interop`'s point-list output type is still in flight and not
//! visible to this crate. Once both crates are stable, replace this type
//! with a direct dependency on `thoth-interop`'s equivalent and delete this
//! local mirror — see `GAP_ANALYSIS_STATUS.md`.

use crate::error::DrawingError;
use crate::schedule::{CellValue, ColumnAlign, ScheduleColumn, ScheduleRow, ScheduleTable};
use crate::scene::{Pt, SheetPrimitive, TextAnchor, INK, MUTED};

/// A single construction stake-out point: a station/offset pair along a
/// design alignment, the cut (positive) or fill (negative) to grade at that
/// stake, a free-text description of what's being staked (e.g. "TOP OF
/// CURB", "SLOPE STAKE"), and its resolved plan (northing/easting)
/// coordinate.
///
/// Local, self-contained mirror of the point-list shape `thoth-interop` is
/// implementing — see the module rustdoc.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct StakingPoint {
    pub station: f64,
    pub offset: f64,
    /// Cut (positive) or fill (negative) to design grade, in plan units.
    pub cut_fill: f64,
    pub description: String,
    pub northing: f64,
    pub easting: f64,
}

impl StakingPoint {
    /// Validate that every numeric field is finite. The TS/JS ecosystem this
    /// crate ports from would happily print `NaN`/`Infinity` into a stake-out
    /// table; this crate's convention (see `STATUS.md`'s deliberate
    /// hardening list) is to reject malformed numeric input explicitly
    /// instead.
    fn validate(&self, index: usize) -> Result<(), DrawingError> {
        let fields: [(&'static str, f64); 5] = [
            ("station", self.station),
            ("offset", self.offset),
            ("cutFill", self.cut_fill),
            ("northing", self.northing),
            ("easting", self.easting),
        ];
        for (field, value) in fields {
            if !value.is_finite() {
                return Err(DrawingError::InvalidStakingPoint {
                    index,
                    field,
                    value,
                });
            }
        }
        Ok(())
    }
}

/// Format a station in engineer's notation (`12+34.56`), duplicating the
/// small formatting rule in [`crate::labeling`]'s private `format_station`
/// rather than changing that module's visibility (see `GAPS.md`'s
/// "small, plain-data shapes/helpers are duplicated locally" pattern).
fn format_station_label(value: f64, precision: usize) -> String {
    let neg = value < 0.0;
    let v = value.abs();
    let full_stations = (v / 100.0 + 1e-9).floor();
    let plus_raw = format!("{:.*}", precision, v - full_stations * 100.0);
    let width = precision + 3;
    let plus = format!("{plus_raw:0>width$}");
    format!(
        "{}{}+{}",
        if neg { "-" } else { "" },
        full_stations as i64,
        plus
    )
}

/// Format a cut/fill value as `1.23 CUT`, `0.45 FILL`, or `0.00` at grade.
pub fn format_cut_fill(cut_fill: f64) -> String {
    if cut_fill.abs() < 0.005 {
        "0.00".to_string()
    } else if cut_fill > 0.0 {
        format!("{cut_fill:.2} CUT")
    } else {
        format!("{:.2} FILL", -cut_fill)
    }
}

/// Build the stake-out schedule table for a construction-staking sheet: one
/// row per point, columns for station, offset, cut/fill, description, and
/// the resolved coordinate.
///
/// # Errors
/// [`DrawingError::InvalidStakingPoint`] if any point carries a non-finite
/// numeric field.
pub fn staking_schedule(points: &[StakingPoint]) -> Result<ScheduleTable, DrawingError> {
    let mut rows = Vec::with_capacity(points.len());
    for (i, p) in points.iter().enumerate() {
        p.validate(i)?;
        let mut row = ScheduleRow::new();
        row.insert(
            "station".to_string(),
            CellValue::from(format_station_label(p.station, 2)),
        );
        row.insert(
            "offset".to_string(),
            CellValue::from(format!(
                "{:.2} {}",
                p.offset.abs(),
                if p.offset >= 0.0 { "R" } else { "L" }
            )),
        );
        row.insert(
            "cutFill".to_string(),
            CellValue::from(format_cut_fill(p.cut_fill)),
        );
        row.insert(
            "description".to_string(),
            CellValue::from(p.description.clone()),
        );
        row.insert(
            "northing".to_string(),
            CellValue::from(format!("{:.2}", p.northing)),
        );
        row.insert(
            "easting".to_string(),
            CellValue::from(format!("{:.2}", p.easting)),
        );
        rows.push(row);
    }

    Ok(ScheduleTable {
        id: "staking-schedule".to_string(),
        title: "Construction Staking Table".to_string(),
        columns: vec![
            ScheduleColumn {
                key: "station".to_string(),
                label: "Station".to_string(),
                align: Some(ColumnAlign::Right),
            },
            ScheduleColumn {
                key: "offset".to_string(),
                label: "Offset".to_string(),
                align: Some(ColumnAlign::Right),
            },
            ScheduleColumn {
                key: "cutFill".to_string(),
                label: "Cut/Fill".to_string(),
                align: Some(ColumnAlign::Right),
            },
            ScheduleColumn {
                key: "description".to_string(),
                label: "Description".to_string(),
                align: None,
            },
            ScheduleColumn {
                key: "northing".to_string(),
                label: "Northing".to_string(),
                align: Some(ColumnAlign::Right),
            },
            ScheduleColumn {
                key: "easting".to_string(),
                label: "Easting".to_string(),
                align: Some(ColumnAlign::Right),
            },
        ],
        rows,
    })
}

/// Plot each staking point as a plan-view symbol (a small filled triangle
/// stake marker plus a two-line label: station/offset over cut-fill),
/// projected into sheet space through `project` (typically
/// [`crate::builders::Projector::project`], called via closure).
///
/// # Errors
/// [`DrawingError::InvalidStakingPoint`] if any point carries a non-finite
/// numeric field.
pub fn staking_plan_primitives(
    points: &[StakingPoint],
    project: impl Fn(thoth_spatial::Point) -> Pt,
) -> Result<Vec<SheetPrimitive>, DrawingError> {
    let mut out = Vec::new();
    for (i, p) in points.iter().enumerate() {
        p.validate(i)?;
        let at = project(thoth_spatial::Point::new(p.easting, p.northing));
        // A small filled triangle stake marker.
        out.push(SheetPrimitive::Polygon {
            pts: vec![
                Pt::new(at.x, at.y - 4.0),
                Pt::new(at.x + 3.5, at.y + 3.0),
                Pt::new(at.x - 3.5, at.y + 3.0),
            ],
            w: Some(0.5),
            stroke: Some(INK.to_string()),
            fill: Some(INK.to_string()),
            fill_opacity: None,
            dash: None,
        });
        out.push(SheetPrimitive::Text {
            at: Pt::new(at.x + 6.0, at.y - 1.0),
            text: format!(
                "{} {:.1}{}",
                format_station_label(p.station, 1),
                p.offset.abs(),
                if p.offset >= 0.0 { "R" } else { "L" }
            ),
            size: 5.5,
            color: Some(INK.to_string()),
            anchor: Some(TextAnchor::Start),
            weight: Some(600.0),
            angle: None,
            monospace: None,
        });
        out.push(SheetPrimitive::Text {
            at: Pt::new(at.x + 6.0, at.y + 6.0),
            text: format_cut_fill(p.cut_fill),
            size: 5.0,
            color: Some(MUTED.to_string()),
            anchor: Some(TextAnchor::Start),
            weight: None,
            angle: None,
            monospace: None,
        });
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_points() -> Vec<StakingPoint> {
        vec![
            StakingPoint {
                station: 1234.56,
                offset: 15.0,
                cut_fill: 1.25,
                description: "Top of Curb".to_string(),
                northing: 10000.0,
                easting: 5000.0,
            },
            StakingPoint {
                station: 1250.0,
                offset: -15.0,
                cut_fill: -0.75,
                description: "Slope Stake".to_string(),
                northing: 10010.0,
                easting: 5015.0,
            },
        ]
    }

    #[test]
    fn format_station_label_matches_engineer_notation() {
        assert_eq!(format_station_label(1234.56, 2), "12+34.56");
        assert_eq!(format_station_label(0.0, 2), "0+00.00");
    }

    #[test]
    fn format_cut_fill_labels_sign_and_zero() {
        assert_eq!(format_cut_fill(1.25), "1.25 CUT");
        assert_eq!(format_cut_fill(-0.75), "0.75 FILL");
        assert_eq!(format_cut_fill(0.0), "0.00");
    }

    #[test]
    fn staking_schedule_has_one_row_per_point_with_formatted_cells() {
        let table = staking_schedule(&sample_points()).unwrap();
        assert_eq!(table.rows.len(), 2);
        assert_eq!(
            ScheduleTable::cell_text(&table.rows[0], "station"),
            "12+34.56"
        );
        assert_eq!(
            ScheduleTable::cell_text(&table.rows[0], "offset"),
            "15.00 R"
        );
        assert_eq!(
            ScheduleTable::cell_text(&table.rows[1], "offset"),
            "15.00 L"
        );
        assert_eq!(
            ScheduleTable::cell_text(&table.rows[1], "cutFill"),
            "0.75 FILL"
        );
        assert!(table.validate().is_ok());
    }

    #[test]
    fn staking_schedule_rejects_a_non_finite_field() {
        let mut points = sample_points();
        points[0].cut_fill = f64::NAN;
        let err = staking_schedule(&points).unwrap_err();
        // f64::NAN never equals itself, so this checks shape, not the exact
        // NaN payload, via `matches!` rather than `assert_eq!`.
        assert!(matches!(
            err,
            DrawingError::InvalidStakingPoint {
                index: 0,
                field: "cutFill",
                value
            } if value.is_nan()
        ));
    }

    #[test]
    fn staking_plan_primitives_emits_a_marker_and_two_labels_per_point() {
        let prims = staking_plan_primitives(&sample_points(), |p| Pt::new(p.x, p.y)).unwrap();
        assert_eq!(prims.len(), 6); // 2 points * (1 marker + 2 text)
        let markers = prims
            .iter()
            .filter(|p| matches!(p, SheetPrimitive::Polygon { .. }))
            .count();
        assert_eq!(markers, 2);
    }
}
