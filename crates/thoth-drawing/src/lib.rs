//! `thoth-drawing` — CAD sheet composition and production for Thoth Blueprint.
//!
//! Rust port of `packages/domain/src/drawing/**` and `packages/domain/src/parts/**`.
//! Framework-agnostic: no WASM/FFI glue, no I/O, no UI. Depends only on
//! [`thoth_spatial`] for coordinate primitives and units.
//!
//! Scope (mirrors the TS module split):
//! - [`annotation`] — text styles, keynotes, column grids, revision clouds, tags.
//! - [`collada`] — a minimal COLLADA 1.4.1 writer and mesh generator.
//! - [`dimension`] — dimension styles and the six supported dimension kinds.
//! - [`drafting`] — line weights/types, drawing scales, NCS disciplines/layers.
//! - [`hatch`] — the standard hatch pattern catalog and material->hatch mapping.
//! - [`labeling`] — label style inheritance and text-template compilation.
//! - [`planproduction`] — corridor plan-production view frames and match lines.
//! - [`platset`] — the consolidated site curve-data table type.
//! - [`qto`] — cut/fill cross-section areas, mass-haul, and pay-item costing.
//! - [`schedule`] — the generic schedule table type and curve schedule builder.
//! - [`sheet`] — the `Sheet`/`DrawingSet` document model and NCS numbering.
//! - [`sheetsize`] — physical sheet sizes (ANSI/ARCH/ISO) and paper geometry.
//! - [`sheetview`] — paper-space viewports, view transforms, and view references.
//! - [`scene`] — the render-agnostic `SheetPrimitive` intermediate representation.
//! - [`builders`] — composing sheet/annotation data into `SheetPrimitive` scenes.
//! - [`parts`] — the framework-agnostic parts catalog and registry.
//!
//! Competitive gap-analysis Theme 5 additions (drawing production and
//! specialty analysis — see `docs/COMPETITIVE_GAP_ANALYSIS.md` and
//! `GAP_ANALYSIS_STATUS.md`):
//! - [`staking`] — construction-staking sheet/schedule generation.
//! - [`submittal`] — submittal-package / plan-set index generation.
//! - [`stamp`] — professional-stamp/seal metadata workflow.
//! - [`bond`] — bond/surety estimate generation from a schedule + pay items.
//! - [`photometric`] — IES point-by-point illuminance-grid calculation.
//! - [`signage`] — pavement-marking and MUTCD signage plan placement.
//! - [`sun`] — solar position and building-shadow projection.
//! - [`viewshed`] — line-of-sight visibility raster from a DTM.
//! - [`noise`] — simplified FHWA-style traffic-noise contour prediction.
//! - [`redline`] — structured plan-revision (redline) diff.
//!
//! Several TS modules depend on types owned by `thoth-planning`, `thoth-civil`,
//! and `thoth-survey` (`Site`, `BuildingModel`, `RegionPlugin`,
//! `ResolvedAlignment`, `CoordinateBasis`, …). This crate does not depend on
//! those crates (see the top-level task boundary), so functions that need
//! them are either narrowed to the plain-data subset they actually touch
//! (documented per-module), or left `not-yet-ported` — see `STATUS.md` for
//! the exhaustive file-by-file mapping and `GAPS.md` for what's missing from
//! `thoth-spatial` specifically.

pub mod annotation;
pub mod bond;
pub mod builders;
pub mod collada;
pub mod common;
pub mod dimension;
pub mod drafting;
mod error;
pub mod hatch;
pub mod labeling;
pub mod noise;
pub mod parts;
pub mod photometric;
pub mod planproduction;
pub mod platset;
pub mod qto;
pub mod redline;
pub mod scene;
pub mod schedule;
pub mod sheet;
pub mod sheetsize;
pub mod sheetview;
pub mod signage;
pub mod stamp;
pub mod staking;
pub mod submittal;
pub mod sun;
pub mod viewshed;

pub use error::DrawingError;
