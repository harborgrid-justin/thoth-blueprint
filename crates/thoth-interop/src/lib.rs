//! `thoth-interop` — field-data and format interoperability for Thoth
//! Blueprint.
//!
//! This crate is the platform's exchange boundary with the rest of the
//! civil/survey tooling ecosystem: LandXML (surfaces, parcels, pipe
//! networks, points, alignments), Shapefile, DXF basemap import, KML/KMZ
//! export, GNSS raw-observation (RINEX) import, total-station field-book
//! import, point-cloud ground/non-ground classification, cadastral
//! parcel-fabric matching, a minimal IFC site/footprint reader, a datum
//! transformation pipeline, survey control-network least-squares adjustment,
//! and construction-staking point-list export.
//!
//! Framework-agnostic: no I/O beyond in-memory `&str`/`&[u8]` in, `String`/
//! `Vec<u8>` out — callers own reading/writing the actual files. Builds on
//! the already-stable [`thoth_spatial`] geometry/units, [`thoth_survey`]
//! COGO points and traverse math, [`thoth_planning`]'s `PlanElement`
//! hierarchy (the import destination for spatial formats), and
//! [`thoth_civil`]'s alignment/terrain/network/point-cloud types (reused
//! rather than re-derived, per each module's doc comment).
//!
//! See `STATUS.md` at the crate root for the exact module/function mapping
//! and sub-dialect/scope note for every format this crate supports.

pub mod datum;
pub mod dxf;
pub mod error;
pub mod fieldbook;
pub mod ifc;
pub mod kml;
pub mod landxml;
pub mod network_adjustment;
pub mod parcel_fabric;
pub mod pointcloud_classify;
pub mod rinex;
pub mod shapefile;
pub mod staking;
mod xml_tree;
mod zip_store;

pub use error::{InteropError, InteropResult};
