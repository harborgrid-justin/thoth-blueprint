//! The sheet and drawing-set document model, with **NCS sheet numbering**.
//!
//! A [`DrawingSet`] is an ordered collection of [`Sheet`]s — the deliverable
//! a project issues. Each sheet has a size, orientation, a named scale, a
//! discipline, a title block, revisions, and references to the paper-space
//! viewports composed onto it (see [`crate::sheetview`]). Sheet identifiers
//! follow the US National CAD Standard `AA-NNN` convention: a discipline
//! letter, a sheet-type digit, and a two-digit sequence (e.g. `A-101`).
//!
//! Port of `packages/domain/src/drawing/sheet.ts`.

use crate::drafting::{discipline_name, DisciplineCode, DISCIPLINE_ORDER};
use crate::error::DrawingError;
use crate::sheetsize::{Orientation, SheetSizeId};

/// The NCS sheet-type digit (the first numeral of the sheet number), 0-9.
pub type SheetTypeDigit = u8;

/// A parsed NCS sheet number.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct SheetNumber {
    pub discipline: DisciplineCode,
    /// Sequence within the (discipline, type), 1-99.
    pub r#type: SheetTypeDigit,
    pub sequence: u32,
}

/// A single revision-block entry (a delta triangle references this).
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct Revision {
    pub id: String,
    /// Revision number/delta (1, 2, 3 ...).
    pub delta: i32,
    pub date: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub by: Option<String>,
}

/// The resolved title-block content for one sheet.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct TitleBlockData {
    pub project_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub drawn_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checked_by: Option<String>,
    pub date: String,
    pub scale_label: String,
    pub sheet_number: String,
    pub sheet_title: String,
    /// "3 of 12" ordinal within the set.
    pub sheet_of: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_number: Option<String>,
    /// Seal/stamp caption, if the sheet carries one.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seal: Option<String>,
}

/// One sheet in a drawing set.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct Sheet {
    pub id: String,
    pub number: SheetNumber,
    pub title: String,
    pub size: SheetSizeId,
    pub orientation: Orientation,
    /// Named drawing scale id (from [`crate::drafting`]), or "as-shown".
    pub scale_id: String,
    pub discipline: DisciplineCode,
    /// Ids of the paper-space viewports composed onto this sheet.
    pub viewport_ids: Vec<String>,
    pub revisions: Vec<Revision>,
    /// Free-text general notes shown on the sheet.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub notes: Vec<String>,
    /// Ids of keynotes (from [`crate::annotation`]) referenced on this sheet.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub keynote_ids: Vec<String>,
}

/// Defaults applied to every sheet's title block in a set.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct TitleBlockDefaults {
    pub project_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub drawn_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checked_by: Option<String>,
    pub date: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_number: Option<String>,
    /// Fixed firm lines (name/address/licence).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub firm_lines: Vec<String>,
}

/// An ordered set of sheets — the issued deliverable.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct DrawingSet {
    pub id: String,
    pub name: String,
    pub sheets: Vec<Sheet>,
    pub title_block_defaults: TitleBlockDefaults,
}

/// Human name for each sheet-type digit.
pub fn sheet_type_name(digit: SheetTypeDigit) -> &'static str {
    match digit {
        0 => "General",
        1 => "Plans",
        2 => "Elevations",
        3 => "Sections",
        4 => "Large-scale views",
        5 => "Details",
        6 => "Schedules & diagrams",
        7 => "User defined",
        8 => "User defined",
        9 => "3D representations",
        _ => "User defined",
    }
}

/// Format an NCS sheet number as `A-101`.
pub fn format_sheet_number(n: SheetNumber) -> String {
    format!("{}-{}{:02}", n.discipline.as_letter(), n.r#type, n.sequence)
}

/// Parse an NCS sheet number like `A-101` or `C-501`.
///
/// Errors with [`DrawingError::MalformedSheetNumber`] if the text doesn't
/// match the `[A-Z]-?[0-9][0-9][0-9]` grammar, or if the letter isn't one of
/// the 21 NCS discipline designators — see [`DisciplineCode`]'s rustdoc for
/// why this is a deliberate hardening beyond the TS original, which trusts
/// any matched letter.
pub fn parse_sheet_number(text: &str) -> Result<SheetNumber, DrawingError> {
    let upper = text.trim().to_uppercase();
    let bytes: Vec<char> = upper.chars().collect();
    // Grammar: one uppercase letter, an optional '-', then exactly 3 digits.
    let mut idx = 0;
    let letter = *bytes.first().ok_or_else(|| malformed(text))?;
    if !letter.is_ascii_uppercase() {
        return Err(malformed(text));
    }
    idx += 1;
    if bytes.get(idx) == Some(&'-') {
        idx += 1;
    }
    let digits: String = bytes[idx..].iter().collect();
    if digits.len() != 3 || !digits.chars().all(|c| c.is_ascii_digit()) {
        return Err(malformed(text));
    }
    let discipline =
        DisciplineCode::from_letter(letter).ok_or(DrawingError::MalformedSheetNumber(
            text.to_string(),
            "letter is not a recognized NCS discipline code",
        ))?;
    let type_digit: u8 = digits[0..1].parse().expect("single ASCII digit");
    let sequence: u32 = digits[1..3].parse().expect("two ASCII digits");
    Ok(SheetNumber {
        discipline,
        r#type: type_digit,
        sequence,
    })
}

fn malformed(text: &str) -> DrawingError {
    DrawingError::MalformedSheetNumber(text.to_string(), "does not match the NCS `AA-NNN` grammar")
}

/// Compare two sheets by discipline order, then type, then sequence.
pub fn compare_sheets(a: &Sheet, b: &Sheet) -> std::cmp::Ordering {
    let idx_a = DISCIPLINE_ORDER
        .iter()
        .position(|d| *d == a.number.discipline);
    let idx_b = DISCIPLINE_ORDER
        .iter()
        .position(|d| *d == b.number.discipline);
    let da = idx_a.unwrap_or(usize::MAX);
    let db = idx_b.unwrap_or(usize::MAX);
    da.cmp(&db)
        .then(a.number.r#type.cmp(&b.number.r#type))
        .then(a.number.sequence.cmp(&b.number.sequence))
}

/// A copy of the set's sheets in canonical NCS order.
pub fn sort_sheets(set: &DrawingSet) -> Vec<Sheet> {
    let mut sheets = set.sheets.clone();
    sheets.sort_by(compare_sheets);
    sheets
}

/// The next free sequence number for a (discipline, type) pair in a set.
pub fn next_sheet_number(
    set: &DrawingSet,
    discipline: DisciplineCode,
    r#type: SheetTypeDigit,
) -> SheetNumber {
    let max = set
        .sheets
        .iter()
        .filter(|s| s.number.discipline == discipline && s.number.r#type == r#type)
        .map(|s| s.number.sequence)
        .max()
        .unwrap_or(0);
    SheetNumber {
        discipline,
        r#type,
        sequence: max + 1,
    }
}

/// One row of the drawing index (cover-sheet sheet list).
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct SheetIndexRow {
    pub number: String,
    pub title: String,
    pub discipline: String,
    pub ordinal: usize,
    pub count: usize,
}

/// Build the drawing index for a set (discipline-ordered rows).
pub fn sheet_index(set: &DrawingSet) -> Vec<SheetIndexRow> {
    let ordered = sort_sheets(set);
    let count = ordered.len();
    ordered
        .iter()
        .enumerate()
        .map(|(i, s)| SheetIndexRow {
            number: format_sheet_number(s.number),
            title: s.title.clone(),
            discipline: discipline_name(s.number.discipline).to_string(),
            ordinal: i + 1,
            count,
        })
        .collect()
}

/// Resolve the title-block data for a sheet, folding the set defaults with
/// the sheet's own number/title/scale and computing the "n of N" ordinal.
pub fn resolve_title_block(set: &DrawingSet, sheet: &Sheet, scale_label: &str) -> TitleBlockData {
    let ordered = sort_sheets(set);
    let idx = ordered.iter().position(|s| s.id == sheet.id).unwrap_or(0);
    let d = &set.title_block_defaults;
    TitleBlockData {
        project_name: d.project_name.clone(),
        client: d.client.clone(),
        location: d.location.clone(),
        drawn_by: d.drawn_by.clone(),
        checked_by: d.checked_by.clone(),
        date: d.date.clone(),
        project_number: d.project_number.clone(),
        scale_label: scale_label.to_string(),
        sheet_number: format_sheet_number(sheet.number),
        sheet_title: sheet.title.clone(),
        sheet_of: format!("{} of {}", idx + 1, ordered.len()),
        seal: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sheet(discipline: DisciplineCode, r#type: u8, sequence: u32, id: &str) -> Sheet {
        Sheet {
            id: id.to_string(),
            number: SheetNumber {
                discipline,
                r#type,
                sequence,
            },
            title: format!("Sheet {id}"),
            size: "arch-d".to_string(),
            orientation: Orientation::Landscape,
            scale_id: "as-shown".to_string(),
            discipline,
            viewport_ids: vec![],
            revisions: vec![],
            notes: vec![],
            keynote_ids: vec![],
        }
    }

    #[test]
    fn format_sheet_number_pads_sequence_to_two_digits() {
        let n = SheetNumber {
            discipline: DisciplineCode::A,
            r#type: 1,
            sequence: 1,
        };
        assert_eq!(format_sheet_number(n), "A-101");
    }

    #[test]
    fn parse_sheet_number_round_trips_with_format() {
        let n = parse_sheet_number("A-101").unwrap();
        assert_eq!(
            n,
            SheetNumber {
                discipline: DisciplineCode::A,
                r#type: 1,
                sequence: 1
            }
        );
        assert_eq!(format_sheet_number(n), "A-101");
    }

    #[test]
    fn parse_sheet_number_accepts_missing_hyphen_and_lowercase() {
        let n = parse_sheet_number("c501").unwrap();
        assert_eq!(
            n,
            SheetNumber {
                discipline: DisciplineCode::C,
                r#type: 5,
                sequence: 1
            }
        );
    }

    #[test]
    fn parse_sheet_number_rejects_malformed_text() {
        assert!(parse_sheet_number("").is_err());
        assert!(parse_sheet_number("A-1").is_err());
        assert!(parse_sheet_number("AB-101").is_err());
    }

    #[test]
    fn parse_sheet_number_rejects_a_letter_outside_the_ncs_set() {
        // "K" is not one of the 21 NCS discipline designators — the TS
        // original would silently accept it via an unchecked cast; this port
        // rejects it explicitly (see the module rustdoc).
        let err = parse_sheet_number("K-101").unwrap_err();
        assert!(matches!(err, DrawingError::MalformedSheetNumber(_, _)));
    }

    #[test]
    fn compare_sheets_orders_by_discipline_then_type_then_sequence() {
        let a = sheet(DisciplineCode::A, 1, 1, "a1");
        let c = sheet(DisciplineCode::C, 1, 1, "c1");
        assert_eq!(compare_sheets(&c, &a), std::cmp::Ordering::Less);
    }

    #[test]
    fn sort_sheets_returns_ncs_canonical_order() {
        let set = DrawingSet {
            id: "s".to_string(),
            name: "Set".to_string(),
            sheets: vec![
                sheet(DisciplineCode::A, 1, 1, "a1"),
                sheet(DisciplineCode::G, 0, 1, "g1"),
            ],
            title_block_defaults: TitleBlockDefaults {
                project_name: "P".to_string(),
                client: None,
                location: None,
                drawn_by: None,
                checked_by: None,
                date: "2024".to_string(),
                project_number: None,
                firm_lines: vec![],
            },
        };
        let ordered = sort_sheets(&set);
        assert_eq!(ordered[0].id, "g1");
        assert_eq!(ordered[1].id, "a1");
    }

    #[test]
    fn next_sheet_number_increments_the_max_sequence() {
        let set = DrawingSet {
            id: "s".to_string(),
            name: "Set".to_string(),
            sheets: vec![
                sheet(DisciplineCode::A, 1, 1, "a1"),
                sheet(DisciplineCode::A, 1, 3, "a3"),
            ],
            title_block_defaults: TitleBlockDefaults {
                project_name: "P".to_string(),
                client: None,
                location: None,
                drawn_by: None,
                checked_by: None,
                date: "2024".to_string(),
                project_number: None,
                firm_lines: vec![],
            },
        };
        let next = next_sheet_number(&set, DisciplineCode::A, 1);
        assert_eq!(next.sequence, 4);
    }

    #[test]
    fn sheet_index_numbers_rows_in_ncs_order_with_total_count() {
        let set = DrawingSet {
            id: "s".to_string(),
            name: "Set".to_string(),
            sheets: vec![
                sheet(DisciplineCode::A, 1, 1, "a1"),
                sheet(DisciplineCode::G, 0, 1, "g1"),
            ],
            title_block_defaults: TitleBlockDefaults {
                project_name: "P".to_string(),
                client: None,
                location: None,
                drawn_by: None,
                checked_by: None,
                date: "2024".to_string(),
                project_number: None,
                firm_lines: vec![],
            },
        };
        let rows = sheet_index(&set);
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].number, "G-001");
        assert_eq!(rows[0].count, 2);
        assert_eq!(rows[1].ordinal, 2);
    }

    #[test]
    fn resolve_title_block_computes_sheet_of_ordinal() {
        let set = DrawingSet {
            id: "s".to_string(),
            name: "Set".to_string(),
            sheets: vec![
                sheet(DisciplineCode::G, 0, 1, "g1"),
                sheet(DisciplineCode::A, 1, 1, "a1"),
            ],
            title_block_defaults: TitleBlockDefaults {
                project_name: "Project".to_string(),
                client: None,
                location: None,
                drawn_by: Some("TB".to_string()),
                checked_by: None,
                date: "2024".to_string(),
                project_number: Some("001".to_string()),
                firm_lines: vec![],
            },
        };
        let sheet_a = &set.sheets[1];
        let tb = resolve_title_block(&set, sheet_a, "1\"=20'");
        assert_eq!(tb.sheet_of, "2 of 2");
        assert_eq!(tb.sheet_number, "A-101");
    }
}
