//! `@thoth/service-geospatial` — coordinate-system transforms and
//! import/export interop.
//!
//! Port of `services/geospatial/src/{index.ts, interop.ts, projections.ts}`.
//! Per `docs/ARCHITECTURE.md`, this service owns coordinate-system
//! transforms, and import/export of GeoJSON (KML/Shapefile/DXF are noted in
//! the architecture as this service's territory too, but the TS original
//! only implements GeoJSON — this port matches that scope exactly, not
//! expanding it).
//!
//! The HTTP transport in `services/geospatial/src/index.ts` (three Express
//! routes: reproject/import/export) is not reproduced here — this crate is
//! a native services library, not a web server; [`projections`] and
//! [`interop`] are the route handlers' actual logic, callable directly.

pub mod error;
pub mod interop;
pub mod projections;

pub use error::GeospatialError;
pub use interop::{elements_to_geojson, geojson_to_elements, GeoJsonFeature, GeoJsonFeatureCollection, GeoJsonGeometry, LandUseCategory, PlanElement};
pub use projections::{reproject_bounds, reproject_point, reproject_points};
