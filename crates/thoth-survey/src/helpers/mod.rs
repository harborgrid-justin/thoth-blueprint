//! Bridge helpers connecting survey data to plats, reports, and drawings —
//! Rust port of `packages/domain/src/survey/helpers/*.ts`.
//!
//! Of the fourteen TS helper modules, four are self-contained within the
//! survey/spatial domain:
//!
//! - [`metes_and_bounds`] — legal-description course-table geometry.
//! - [`plat_drawing`] — plat-sheet layout math (viewport projection, scale).
//! - [`plat_report`] — CSV/text formatting for a [`crate::survey::SurveyReport`].
//! - [`subdivision`] — frontage-line selection for parcel layout.
//!
//! Seven more were unlocked this pass by adding `thoth-civil` as a
//! dependency (stable, complete, and earlier in this migration's dependency
//! chain — see `../../GAPS.md` #3):
//!
//! - [`alignment_report`] — `alignmentReportHelpers.ts`: curve-table labels.
//! - [`assembly_builder`] — `assemblyBuilderHelpers.ts`: subassembly/assembly
//!   summaries.
//! - [`corridor`] — `corridorHelpers.ts`: corridor extrusion + feature lines.
//! - [`grading`] — `gradingHelpers.ts`: scratch grading pads + balanced
//!   elevation solving.
//! - [`pipe`] — `pipeHelpers.ts`: invert seeding + pipe network validation.
//! - [`profile`] — `profileHelpers.ts`: cross-section sampling + PVI edits.
//! - [`superelevation`] — `superelevationHelpers.ts`: runoff curves +
//!   alignment design-speed patching.
//!
//! The remaining three (`buildPlatFromScratch`, `platSheetHelpers`,
//! `planProductionHelpers`) stay `not-yet-ported`: they need the full
//! planning element hierarchy (`thoth-planning`'s `Site`) and/or
//! `thoth-drawing`'s `planproduction` module, both of which sit *later* than
//! `thoth-survey` in this migration's dependency chain
//! (`thoth-civil` → `thoth-survey` → `thoth-planning` → `thoth-drawing`) —
//! depending on either from here would create a circular crate dependency.
//! See `../../STATUS.md` and `../../GAPS.md` for the full accounting.

pub mod alignment_report;
pub mod assembly_builder;
pub mod corridor;
pub mod grading;
pub mod metes_and_bounds;
pub mod pipe;
pub mod plat_drawing;
pub mod plat_report;
pub mod profile;
pub mod subdivision;
pub mod superelevation;
