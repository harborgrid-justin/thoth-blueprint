//! Professional-stamp/seal metadata workflow (competitive gap-analysis
//! Theme 5, item 53).
//!
//! This is a **data model + validation workflow**, not a cryptographic
//! signature scheme: it records who signed a sheet, under what license
//! number, for which discipline, and when — the structured metadata a
//! municipal plan-review portal expects to see attached to a submitted
//! sheet set — and checks the one invariant every jurisdiction enforces
//! before accepting a submittal: *every sheet in the set carries a stamp for
//! its own discipline.*

use std::collections::HashMap;

use crate::drafting::DisciplineCode;
use crate::error::DrawingError;
use crate::sheet::{sort_sheets, DrawingSet};

/// A single professional stamp/seal record.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct ProfessionalStamp {
    pub signer_name: String,
    pub license_number: String,
    pub discipline: DisciplineCode,
    /// Free-text date string, matching the rest of this crate's convention
    /// (see [`crate::sheet::Revision::date`], [`crate::sheet::TitleBlockData::date`]).
    pub date: String,
    /// Professional credential suffix, e.g. `"PE"`, `"RLS"`, `"RA"`, `"PLS"`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub credential: Option<String>,
    /// Licensing state/board, if tracked.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jurisdiction: Option<String>,
}

impl ProfessionalStamp {
    /// Check that the required fields (signer name, license number, date)
    /// are non-blank.
    ///
    /// # Errors
    /// [`DrawingError::InvalidStamp`] naming the blank field.
    pub fn validate(&self) -> Result<(), DrawingError> {
        if self.signer_name.trim().is_empty() {
            return Err(DrawingError::InvalidStamp {
                reason: "signer_name must not be empty",
            });
        }
        if self.license_number.trim().is_empty() {
            return Err(DrawingError::InvalidStamp {
                reason: "license_number must not be empty",
            });
        }
        if self.date.trim().is_empty() {
            return Err(DrawingError::InvalidStamp {
                reason: "date must not be empty",
            });
        }
        Ok(())
    }
}

/// A stamp attached to one sheet. One stamp record can be reused across
/// several [`StampAssignment`]s (e.g. a civil engineer stamping every
/// `C`-series sheet at once), matching how real submittals are prepared.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct StampAssignment {
    pub sheet_id: String,
    pub stamp: ProfessionalStamp,
}

/// The sheets in `set` (in canonical NCS order) that lack a stamp assignment
/// entirely — an empty result does *not* by itself mean the set is fully
/// compliant; see [`validate_submittal_stamps`], which also checks
/// discipline agreement and per-stamp field validity.
pub fn sheets_missing_any_stamp(set: &DrawingSet, assignments: &[StampAssignment]) -> Vec<String> {
    let assigned: std::collections::HashSet<&str> =
        assignments.iter().map(|a| a.sheet_id.as_str()).collect();
    sort_sheets(set)
        .into_iter()
        .filter(|s| !assigned.contains(s.id.as_str()))
        .map(|s| s.id)
        .collect()
}

/// Validate that a [`DrawingSet`] is ready for submittal: every sheet has at
/// least one [`StampAssignment`], each assigned stamp's own fields are
/// well-formed, and each assigned stamp's discipline matches the sheet it is
/// attached to.
///
/// Checks sheets in canonical NCS order ([`crate::sheet::sort_sheets`]) and
/// returns the first violation found, so error output is deterministic.
///
/// # Errors
/// - [`DrawingError::MissingDisciplineStamp`] if a sheet has no assignment.
/// - [`DrawingError::InvalidStamp`] if an assigned stamp has a blank
///   required field.
/// - [`DrawingError::StampDisciplineMismatch`] if an assigned stamp's
///   discipline differs from its sheet's discipline.
pub fn validate_submittal_stamps(
    set: &DrawingSet,
    assignments: &[StampAssignment],
) -> Result<(), DrawingError> {
    let by_sheet: HashMap<&str, &ProfessionalStamp> = assignments
        .iter()
        .map(|a| (a.sheet_id.as_str(), &a.stamp))
        .collect();

    for sheet in sort_sheets(set) {
        match by_sheet.get(sheet.id.as_str()) {
            None => {
                return Err(DrawingError::MissingDisciplineStamp {
                    sheet_id: sheet.id,
                    discipline: sheet.number.discipline,
                })
            }
            Some(stamp) => {
                stamp.validate()?;
                if stamp.discipline != sheet.number.discipline {
                    return Err(DrawingError::StampDisciplineMismatch {
                        sheet_id: sheet.id,
                        sheet_discipline: sheet.number.discipline,
                        stamp_discipline: stamp.discipline,
                    });
                }
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sheet::{Sheet, SheetNumber, TitleBlockDefaults};
    use crate::sheetsize::Orientation;

    fn sheet(discipline: DisciplineCode, id: &str) -> Sheet {
        Sheet {
            id: id.to_string(),
            number: SheetNumber {
                discipline,
                r#type: 1,
                sequence: 1,
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

    fn stamp(discipline: DisciplineCode) -> ProfessionalStamp {
        ProfessionalStamp {
            signer_name: "Jane Engineer".to_string(),
            license_number: "PE-12345".to_string(),
            discipline,
            date: "2026-07-23".to_string(),
            credential: Some("PE".to_string()),
            jurisdiction: None,
        }
    }

    #[test]
    fn validate_rejects_a_blank_signer_name() {
        let mut s = stamp(DisciplineCode::C);
        s.signer_name = "  ".to_string();
        assert!(matches!(
            s.validate().unwrap_err(),
            DrawingError::InvalidStamp { .. }
        ));
    }

    #[test]
    fn sheets_missing_any_stamp_finds_unassigned_sheets() {
        let s = set(vec![
            sheet(DisciplineCode::C, "c1"),
            sheet(DisciplineCode::A, "a1"),
        ]);
        let assignments = vec![StampAssignment {
            sheet_id: "c1".to_string(),
            stamp: stamp(DisciplineCode::C),
        }];
        let missing = sheets_missing_any_stamp(&s, &assignments);
        assert_eq!(missing, vec!["a1".to_string()]);
    }

    #[test]
    fn validate_submittal_stamps_passes_when_every_sheet_is_stamped() {
        let s = set(vec![sheet(DisciplineCode::C, "c1")]);
        let assignments = vec![StampAssignment {
            sheet_id: "c1".to_string(),
            stamp: stamp(DisciplineCode::C),
        }];
        assert!(validate_submittal_stamps(&s, &assignments).is_ok());
    }

    #[test]
    fn validate_submittal_stamps_reports_a_missing_stamp() {
        let s = set(vec![sheet(DisciplineCode::C, "c1")]);
        let err = validate_submittal_stamps(&s, &[]).unwrap_err();
        assert_eq!(
            err,
            DrawingError::MissingDisciplineStamp {
                sheet_id: "c1".to_string(),
                discipline: DisciplineCode::C
            }
        );
    }

    #[test]
    fn validate_submittal_stamps_reports_a_discipline_mismatch() {
        let s = set(vec![sheet(DisciplineCode::C, "c1")]);
        let assignments = vec![StampAssignment {
            sheet_id: "c1".to_string(),
            stamp: stamp(DisciplineCode::A),
        }];
        let err = validate_submittal_stamps(&s, &assignments).unwrap_err();
        assert_eq!(
            err,
            DrawingError::StampDisciplineMismatch {
                sheet_id: "c1".to_string(),
                sheet_discipline: DisciplineCode::C,
                stamp_discipline: DisciplineCode::A
            }
        );
    }
}
