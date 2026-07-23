//! `thoth-planning` — Thoth Blueprint's planning primitives and rules.
//!
//! Rust port of `packages/domain/src/planning/**` and
//! `packages/domain/src/smart/**`. This is the platform's "sacred" domain
//! model: `Site`, `Parcel`, `Lot`, `Zone`, `LandUse`, `Building`,
//! `RightOfWay`, `Easement`, `OpenSpace`, `WaterBody`, `PlantingArea`,
//! `GradeRegion`, `Stair`, `CurtainWall`, `Door`/`Window`, `Roof` — plus the
//! rules and metrics computed over them (subdivision, setbacks/buildable
//! envelopes, coverage, density, FAR, land-use allocation, erosion control,
//! compliance checks).
//!
//! Framework-agnostic: no React, no server framework, no database driver, no
//! WASM/FFI glue. Built on top of [`thoth_spatial`] for geometry/unit
//! primitives — see that crate's docs for the spatial foundation this crate
//! assumes.
//!
//! **Coverage**: this crate does not yet port every TS source file in its
//! mandate to full parity. See `STATUS.md` for the file-by-file mapping and
//! `GAPS.md` for the specific cross-crate/upstream gaps this port worked
//! around. The core rules/metrics/subdivision/setback engine and the element
//! type hierarchy ([`elements`]) are complete and fully tested; the
//! deprioritized areas (GEOID/PLSS compliance data, the smart-engine
//! automation layer, sample-data/preset fixtures) are explicitly called out
//! there rather than silently missing.

pub mod civil_stub;
pub mod common;
pub mod curve;
pub mod elements;
pub mod erosion;
pub mod land_use;
pub mod landlot;
pub mod metrics;
pub mod regions;
pub mod renovation;
pub mod rules;
pub mod subdivision;

pub use elements::{new_base, PlanElement, Site};
