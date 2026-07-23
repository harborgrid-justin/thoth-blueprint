//! Bridge helpers connecting survey data to plats, reports, and drawings —
//! Rust port of `packages/domain/src/survey/helpers/*.ts`.
//!
//! Of the fourteen TS helper modules, the four that are self-contained
//! within the survey/spatial domain are ported here in full:
//!
//! - [`metes_and_bounds`] — legal-description course-table geometry.
//! - [`plat_drawing`] — plat-sheet layout math (viewport projection, scale).
//! - [`plat_report`] — CSV/text formatting for a [`crate::survey::SurveyReport`].
//! - [`subdivision`] — frontage-line selection for parcel layout.
//!
//! The remaining ten (`alignmentReportHelpers`, `assemblyBuilderHelpers`,
//! `buildPlatFromScratch`, `corridorHelpers`, `gradingHelpers`,
//! `pipeHelpers`, `planProductionHelpers`, `platSheetHelpers`,
//! `profileHelpers`, `superelevationHelpers`) bridge into `civil/*`, the
//! full planning element hierarchy (`spatial/types::{Site, Parcel, Lot,
//! Building, Easement, RightOfWay, PlanNote}`), and `drawing/*` — domains
//! owned by the concurrently developed `thoth-civil`, `thoth-planning`, and
//! `thoth-drawing` crates, none of which are dependencies of this crate. See
//! `../../STATUS.md` and `../../GAPS.md` for the full accounting.

pub mod metes_and_bounds;
pub mod plat_drawing;
pub mod plat_report;
pub mod subdivision;
