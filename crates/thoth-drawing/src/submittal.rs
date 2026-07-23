//! Automated submittal-package / plan-set index generation for municipal
//! review (competitive gap-analysis Theme 5, item 52).
//!
//! Builds the cover-sheet "sheet index" table a reviewer expects at the
//! front of a submitted plan set: sheet number, title, discipline, current
//! revision status, and (when a stamp roster is supplied) whether the sheet
//! carries a professional stamp. This module adds **no new sheet-ordering
//! logic of its own** — it composes [`crate::sheet::sort_sheets`]/
//! [`crate::sheet::format_sheet_number`] (canonical NCS ordering and
//! numbering) with [`crate::stamp`] (seal coverage) and renders through
//! [`crate::schedule::ScheduleTable`] (the same generic table pipeline every
//! other schedule on a sheet uses).

use crate::drafting::discipline_name;
use crate::schedule::{CellValue, ColumnAlign, ScheduleColumn, ScheduleRow, ScheduleTable};
use crate::sheet::{format_sheet_number, sort_sheets, DrawingSet};
use crate::stamp::StampAssignment;

/// One row of the submittal index: a sheet's identity, ordinal position,
/// current revision status, and stamp coverage.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct SubmittalIndexRow {
    pub number: String,
    pub title: String,
    pub discipline: String,
    /// 1-based position within the ordered set.
    pub ordinal: usize,
    /// Total sheet count in the set.
    pub count: usize,
    /// The highest revision delta on the sheet, if any.
    pub current_revision_delta: Option<i32>,
    pub current_revision_date: Option<String>,
    pub current_revision_description: Option<String>,
    /// `None` when no stamp roster was supplied at all (stamp coverage
    /// wasn't checked); `Some(false)`/`Some(true)` otherwise.
    pub stamped: Option<bool>,
}

/// Build the submittal index rows for a set, in canonical NCS order.
///
/// `stamps` is optional: pass `None` to omit stamp-coverage checking
/// entirely (every row's `stamped` field is `None`), or `Some(&assignments)`
/// to flag which sheets currently lack a stamp assignment (this does *not*
/// validate stamp field well-formedness or discipline agreement — for the
/// full submittal-readiness check, see
/// [`crate::stamp::validate_submittal_stamps`]).
pub fn submittal_index(set: &DrawingSet, stamps: Option<&[StampAssignment]>) -> Vec<SubmittalIndexRow> {
    let ordered = sort_sheets(set);
    let count = ordered.len();
    ordered
        .iter()
        .enumerate()
        .map(|(i, s)| {
            let latest_revision = s.revisions.iter().max_by_key(|r| r.delta);
            SubmittalIndexRow {
                number: format_sheet_number(s.number),
                title: s.title.clone(),
                discipline: discipline_name(s.number.discipline).to_string(),
                ordinal: i + 1,
                count,
                current_revision_delta: latest_revision.map(|r| r.delta),
                current_revision_date: latest_revision.map(|r| r.date.clone()),
                current_revision_description: latest_revision.map(|r| r.description.clone()),
                stamped: stamps.map(|list| list.iter().any(|a| a.sheet_id == s.id)),
            }
        })
        .collect()
}

/// Render the submittal index as a printable [`ScheduleTable`] ("Sheet
/// Index" / table of contents), one row per sheet.
pub fn submittal_index_table(set: &DrawingSet, stamps: Option<&[StampAssignment]>) -> ScheduleTable {
    let index_rows = submittal_index(set, stamps);
    let rows: Vec<ScheduleRow> = index_rows
        .iter()
        .map(|r| {
            let mut row = ScheduleRow::new();
            row.insert("number".to_string(), CellValue::from(r.number.clone()));
            row.insert("title".to_string(), CellValue::from(r.title.clone()));
            row.insert(
                "discipline".to_string(),
                CellValue::from(r.discipline.clone()),
            );
            row.insert(
                "revision".to_string(),
                CellValue::from(
                    r.current_revision_delta
                        .map(|d| d.to_string())
                        .unwrap_or_else(|| "\u{2014}".to_string()),
                ),
            );
            row.insert(
                "revisionDate".to_string(),
                CellValue::from(
                    r.current_revision_date
                        .clone()
                        .unwrap_or_else(|| "\u{2014}".to_string()),
                ),
            );
            row.insert(
                "stamped".to_string(),
                CellValue::from(match r.stamped {
                    Some(true) => "Yes".to_string(),
                    Some(false) => "NO \u{2014} MISSING".to_string(),
                    None => "\u{2014}".to_string(),
                }),
            );
            row
        })
        .collect();

    ScheduleTable {
        id: "submittal-index".to_string(),
        title: "Sheet Index".to_string(),
        columns: vec![
            ScheduleColumn {
                key: "number".to_string(),
                label: "Sheet No.".to_string(),
                align: None,
            },
            ScheduleColumn {
                key: "title".to_string(),
                label: "Title".to_string(),
                align: None,
            },
            ScheduleColumn {
                key: "discipline".to_string(),
                label: "Discipline".to_string(),
                align: None,
            },
            ScheduleColumn {
                key: "revision".to_string(),
                label: "Rev.".to_string(),
                align: Some(ColumnAlign::Center),
            },
            ScheduleColumn {
                key: "revisionDate".to_string(),
                label: "Rev. Date".to_string(),
                align: Some(ColumnAlign::Center),
            },
            ScheduleColumn {
                key: "stamped".to_string(),
                label: "Stamped".to_string(),
                align: Some(ColumnAlign::Center),
            },
        ],
        rows,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::drafting::DisciplineCode;
    use crate::sheet::{Revision, Sheet, SheetNumber, TitleBlockDefaults};
    use crate::sheetsize::Orientation;
    use crate::stamp::ProfessionalStamp;

    fn sheet(discipline: DisciplineCode, r#type: u8, id: &str, revisions: Vec<Revision>) -> Sheet {
        Sheet {
            id: id.to_string(),
            number: SheetNumber {
                discipline,
                r#type,
                sequence: 1,
            },
            title: format!("Sheet {id}"),
            size: "arch-d".to_string(),
            orientation: Orientation::Landscape,
            scale_id: "as-shown".to_string(),
            discipline,
            viewport_ids: vec![],
            revisions,
            notes: vec![],
            keynote_ids: vec![],
        }
    }

    fn set(sheets: Vec<Sheet>) -> DrawingSet {
        DrawingSet {
            id: "set".to_string(),
            name: "Set".to_string(),
            sheets,
            title_block_defaults: TitleBlockDefaults {
                project_name: "Project".to_string(),
                client: None,
                location: None,
                drawn_by: None,
                checked_by: None,
                date: "2026".to_string(),
                project_number: None,
                firm_lines: vec![],
            },
        }
    }

    #[test]
    fn submittal_index_orders_by_ncs_discipline_and_carries_revision_status() {
        let s = set(vec![
            sheet(
                DisciplineCode::A,
                1,
                "a1",
                vec![Revision {
                    id: "r1".to_string(),
                    delta: 2,
                    date: "2026-05-01".to_string(),
                    description: "Revised per owner".to_string(),
                    by: None,
                }],
            ),
            sheet(DisciplineCode::G, 0, "g1", vec![]),
        ]);
        let rows = submittal_index(&s, None);
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].number, "G-001");
        assert_eq!(rows[0].current_revision_delta, None);
        assert_eq!(rows[1].number, "A-101");
        assert_eq!(rows[1].current_revision_delta, Some(2));
        assert_eq!(rows[1].current_revision_date.as_deref(), Some("2026-05-01"));
        assert!(rows[0].stamped.is_none());
    }

    #[test]
    fn submittal_index_flags_missing_stamps_when_a_roster_is_supplied() {
        let s = set(vec![sheet(DisciplineCode::C, 1, "c1", vec![])]);
        let stamped = StampAssignment {
            sheet_id: "c1".to_string(),
            stamp: ProfessionalStamp {
                signer_name: "Jane Engineer".to_string(),
                license_number: "PE-1".to_string(),
                discipline: DisciplineCode::C,
                date: "2026-01-01".to_string(),
                credential: None,
                jurisdiction: None,
            },
        };
        let rows_stamped = submittal_index(&s, Some(&[stamped]));
        assert_eq!(rows_stamped[0].stamped, Some(true));

        let rows_missing = submittal_index(&s, Some(&[]));
        assert_eq!(rows_missing[0].stamped, Some(false));
    }

    #[test]
    fn submittal_index_table_has_six_columns_and_one_row_per_sheet() {
        let s = set(vec![sheet(DisciplineCode::A, 1, "a1", vec![])]);
        let table = submittal_index_table(&s, None);
        assert_eq!(table.columns.len(), 6);
        assert_eq!(table.rows.len(), 1);
        assert_eq!(ScheduleTable::cell_text(&table.rows[0], "revision"), "\u{2014}");
        assert!(table.validate().is_ok());
    }
}
