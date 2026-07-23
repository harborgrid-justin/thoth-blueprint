//! Schedules — the tabular data blocks a sheet carries: door, window, room,
//! and finish schedules derived from the building model, plus curve/line
//! schedules derived from survey data. One generic [`ScheduleTable`] type
//! feeds the sheet renderer uniformly, so every table (survey or
//! architectural) draws the same way.
//!
//! Port of `packages/domain/src/drawing/schedule.ts`.
//!
//! ## Scope note
//!
//! [`curve_schedule`] is fully ported (it only needs [`crate::platset::SiteCurve`],
//! which lives in this crate). `doorSchedule`, `windowSchedule`, `roomSchedule`,
//! and `finishSchedule` from the TS source all take a `BuildingModel` —
//! owned by `thoth-planning`, which this crate does not depend on — so they
//! are `not-yet-ported`; see `STATUS.md`.

use std::collections::BTreeMap;

use crate::error::DrawingError;
use crate::platset::SiteCurve;

/// A schedule column definition.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct ScheduleColumn {
    pub key: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub align: Option<ColumnAlign>,
}

/// Text alignment for a schedule column.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ColumnAlign {
    Left,
    Right,
    Center,
}

/// A single table cell value: a string or a number.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum CellValue {
    Text(String),
    Number(f64),
}

impl CellValue {
    /// Render this cell as it would appear in a rendered sheet (the TS
    /// renderer does `String(row[c.key] ?? "")`).
    pub fn display(&self) -> String {
        match self {
            CellValue::Text(s) => s.clone(),
            CellValue::Number(n) => n.to_string(),
        }
    }
}

impl From<&str> for CellValue {
    fn from(s: &str) -> Self {
        CellValue::Text(s.to_string())
    }
}

impl From<String> for CellValue {
    fn from(s: String) -> Self {
        CellValue::Text(s)
    }
}

impl From<f64> for CellValue {
    fn from(n: f64) -> Self {
        CellValue::Number(n)
    }
}

/// A row is a map from column key to a cell value.
pub type ScheduleRow = BTreeMap<String, CellValue>;

/// A generic titled table.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct ScheduleTable {
    pub id: String,
    pub title: String,
    pub columns: Vec<ScheduleColumn>,
    pub rows: Vec<ScheduleRow>,
}

impl ScheduleTable {
    /// Look up a cell's display text, defaulting to `""` for a missing key —
    /// this matches the TS renderer's lenient `row[c.key] ?? ""` exactly.
    /// Use [`ScheduleTable::validate`] beforehand if a missing column should
    /// be treated as an error rather than silently rendered blank.
    pub fn cell_text(row: &ScheduleRow, key: &str) -> String {
        row.get(key).map(CellValue::display).unwrap_or_default()
    }

    /// Check that every row supplies a value for every declared column.
    ///
    /// The TS renderer never checks this — a missing key just prints a blank
    /// cell. This validation is an explicit, opt-in hardening a caller can
    /// run before composing a sheet, per the "explicit, typed error
    /// handling ... missing schedule columns" requirement: it turns a silent
    /// blank cell in the exported drawing into a caught error during
    /// authoring.
    pub fn validate(&self) -> Result<(), DrawingError> {
        for (row_index, row) in self.rows.iter().enumerate() {
            for col in &self.columns {
                if !row.contains_key(&col.key) {
                    return Err(DrawingError::MissingScheduleColumn {
                        table_id: self.id.clone(),
                        row_index,
                        column: col.key.clone(),
                    });
                }
            }
        }
        Ok(())
    }
}

/// Curve schedule from consolidated site curves (C1...Cn).
pub fn curve_schedule(curves: &[SiteCurve]) -> ScheduleTable {
    let rows: Vec<ScheduleRow> = curves
        .iter()
        .map(|c| {
            let mut row = ScheduleRow::new();
            row.insert("label".to_string(), CellValue::from(c.label.clone()));
            row.insert("radius".to_string(), CellValue::from(format!("{:.2}", c.radius)));
            row.insert("arcLength".to_string(), CellValue::from(format!("{:.2}", c.arc_length)));
            row.insert("delta".to_string(), CellValue::from(format!("{:.2}\u{b0}", c.delta_deg)));
            row.insert("chord".to_string(), CellValue::from(format!("{:.2}", c.chord)));
            row.insert("chordBearing".to_string(), CellValue::from(c.chord_bearing.clone()));
            row.insert("tangent".to_string(), CellValue::from(format!("{:.2}", c.tangent)));
            row
        })
        .collect();

    ScheduleTable {
        id: "curve-schedule".to_string(),
        title: "Curve Table".to_string(),
        columns: vec![
            ScheduleColumn { key: "label".to_string(), label: "Curve".to_string(), align: None },
            ScheduleColumn { key: "radius".to_string(), label: "Radius".to_string(), align: Some(ColumnAlign::Right) },
            ScheduleColumn { key: "arcLength".to_string(), label: "Length".to_string(), align: Some(ColumnAlign::Right) },
            ScheduleColumn { key: "delta".to_string(), label: "Delta".to_string(), align: Some(ColumnAlign::Right) },
            ScheduleColumn { key: "chord".to_string(), label: "Chord".to_string(), align: Some(ColumnAlign::Right) },
            ScheduleColumn { key: "chordBearing".to_string(), label: "Chord Brg.".to_string(), align: None },
            ScheduleColumn { key: "tangent".to_string(), label: "Tangent".to_string(), align: Some(ColumnAlign::Right) },
        ],
        rows,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::platset::CurveDirection;

    fn sample_curve() -> SiteCurve {
        SiteCurve {
            label: "C1".to_string(),
            source: "Boundary".to_string(),
            radius: 250.0,
            arc_length: 125.664,
            delta_deg: 28.8,
            chord: 124.34,
            chord_bearing: "N45°00'00\"E".to_string(),
            tangent: 64.2,
            direction: Some(CurveDirection::Left),
        }
    }

    #[test]
    fn curve_schedule_has_seven_columns_and_one_row_per_curve() {
        let table = curve_schedule(&[sample_curve()]);
        assert_eq!(table.columns.len(), 7);
        assert_eq!(table.rows.len(), 1);
        assert_eq!(ScheduleTable::cell_text(&table.rows[0], "label"), "C1");
        assert_eq!(ScheduleTable::cell_text(&table.rows[0], "radius"), "250.00");
    }

    #[test]
    fn curve_schedule_of_empty_input_has_no_rows() {
        let table = curve_schedule(&[]);
        assert!(table.rows.is_empty());
    }

    #[test]
    fn validate_passes_for_a_well_formed_table() {
        let table = curve_schedule(&[sample_curve()]);
        assert!(table.validate().is_ok());
    }

    #[test]
    fn validate_reports_a_missing_column_by_row_and_key() {
        let mut table = curve_schedule(&[sample_curve()]);
        table.rows[0].remove("tangent");
        let err = table.validate().unwrap_err();
        assert_eq!(
            err,
            DrawingError::MissingScheduleColumn { table_id: "curve-schedule".to_string(), row_index: 0, column: "tangent".to_string() }
        );
    }

    #[test]
    fn cell_text_defaults_to_empty_string_for_a_missing_key_matching_ts_leniency() {
        let row = ScheduleRow::new();
        assert_eq!(ScheduleTable::cell_text(&row, "missing"), "");
    }
}
