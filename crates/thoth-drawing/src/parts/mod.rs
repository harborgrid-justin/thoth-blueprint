//! The parts catalog: a framework-agnostic registry of real-world
//! specifiable parts (wall assemblies, fixtures, pipes, soils, sheet sizes,
//! hatch patterns, …) backing symbol libraries across every discipline.
//!
//! Port of `packages/domain/src/parts/**`.

mod data;
mod registry;
mod types;

pub use data::initial_parts_catalog;
pub use registry::{global_parts_db, GlobalPartsDatabase, PartPatch, WallType};
pub use types::{
    PartCategory, PartDimensions, PartFilterOptions, PartSpecification, PropertyValue,
};
