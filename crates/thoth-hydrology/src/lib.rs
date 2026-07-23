//! `thoth-hydrology` — stormwater hydrology and hydraulics for Thoth
//! Blueprint.
//!
//! Fills the capability gap identified in the platform's competitive-gap
//! analysis (Theme 1): `thoth_civil::pipedesign` validates a storm/sanitary
//! pipe network's geometry and slopes, but the platform previously had no
//! rainfall-runoff hydrology at all. This crate adds it: Rational Method
//! peak flow, TR-55 time of concentration and curve-number runoff, TR-20
//! hydrograph convolution, pond routing, outlet/culvert/storm-sewer
//! hydraulics, DEM-based watershed delineation, and green-infrastructure
//! sizing/crediting.
//!
//! Framework-agnostic: no React, no server framework, no database driver —
//! just `f64` math built on [`thoth_spatial`] (geometry/units) and
//! [`thoth_civil`] (terrain and pipe-network models, which this crate reads
//! and composes over rather than duplicating).
//!
//! See `crates/thoth-hydrology/STATUS.md` for the mapping from each of the
//! competitive-gap analysis's 13 items to the module/function that
//! implements it, its test status, and any simplifying assumptions made.
//!
//! # Module map
//! - [`rational`] — item 1: Rational Method peak flow (`Q = CiA`).
//! - [`time_of_concentration`] — item 2: TR-55 sheet/shallow/channel flow.
//! - [`curve_number`] — item 3: SCS/NRCS CN lookup, runoff depth, unit
//!   hydrograph.
//! - [`rainfall`] — design-storm distributions (NRCS Type II), feeding item
//!   4.
//! - [`hydrograph`] — item 4: TR-20-style convolution/routing.
//! - [`pond_routing`] — item 5: Puls (storage-indication) pond routing.
//! - [`outlet_hydraulics`] — item 6: orifice/weir outlet-structure
//!   hydraulics.
//! - [`culvert`] — item 7: FHWA HDS-5-style inlet/outlet control headwater.
//! - [`hgl`] — item 8: storm-sewer HGL/EGL profile.
//! - [`watershed`] — item 9: D8 flow direction/accumulation/delineation.
//! - [`water_quality`] — item 10: water-quality volume (WQv) sizing.
//! - [`lid`] — item 11: bioretention/permeable pavement/swale sizing.
//! - [`credit`] — item 12: runoff-reduction crediting.
//! - [`floodplain`] — item 13: FEMA floodplain overlay/encroachment check.

pub mod credit;
pub mod culvert;
pub mod curve_number;
pub mod error;
pub mod floodplain;
pub mod hgl;
pub mod hydrograph;
pub mod lid;
pub mod outlet_hydraulics;
pub mod pond_routing;
pub mod rainfall;
pub mod rational;
pub mod time_of_concentration;
pub mod water_quality;
pub mod watershed;

pub use error::{HydroResult, HydrologyError};
