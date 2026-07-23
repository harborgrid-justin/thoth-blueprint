//! `thoth-civil` — civil-engineering domain logic for Thoth Blueprint.
//!
//! Rust port of `packages/domain/src/civil`. This is the platform's civil
//! engineering computation core: horizontal/vertical alignments, road
//! corridors, terrain models and grading (cut/fill), pipe/utility network
//! design, superelevation transitions, point clouds, and cross-sections.
//! Framework-agnostic: no React, no server framework, no database driver —
//! just `f64` math and the shared [`thoth_spatial`] contract.
//!
//! See `crates/thoth-civil/STATUS.md` for the exact TS→Rust file mapping and
//! per-module port status, and `crates/thoth-civil/GAPS.md` for the
//! cross-crate dependencies this crate cannot follow (survey `Point2D`,
//! planning `Site`/`GradeRegion`, and the parts-catalog registry) and how
//! each was worked around.

pub mod alignment;
pub mod assembly;
pub mod common;
pub mod corridor;
pub mod error;
pub mod grading;
pub mod helpers;
pub mod intersection;
pub mod network;
pub mod partbuilder;
pub mod pipedesign;
pub mod pointcloud;
pub mod profile;
pub mod sections;
pub mod superelevation;
pub mod terrain;
pub mod terrain_model;

pub use error::{CivilError, CivilResult};
