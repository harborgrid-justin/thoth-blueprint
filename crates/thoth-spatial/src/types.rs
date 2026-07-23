//! Leaf types shared by every planning element, hoisted out of
//! `packages/domain/src/spatial/types/index.ts`.
//!
//! The richer element hierarchy (`Region`, `Parcel`, `Lot`, `Zone`, `LandUse`,
//! `Building`, `Site`, ...) is intentionally NOT ported here: in the TS
//! source those types are largely re-exports/extensions of definitions that
//! live under `planning/types/*`, and semantically they belong with the
//! planning rules that construct and consume them. They are owned by
//! `thoth-planning`, which depends on this crate for the primitives below.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::geometry::Polygon;

/// Circular-arc bulge mappings keyed by vertex index (as a string, matching
/// the TS `Record<string, number>` wire format for JSON/WASM interop).
pub type EdgeArcs = BTreeMap<String, f64>;

/// The kinds of planning elements a plan can contain.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ElementKind {
    Region,
    Parcel,
    Block,
    Lot,
    Zone,
    Landuse,
    Building,
    Row,
    Easement,
    Openspace,
    Water,
    Planting,
    Grade,
    Tree,
    Spot,
    Note,
    Stair,
    Curtainwall,
    Door,
    Window,
    Roof,
}

/// A named, orderable grouping of elements that can be shown, hidden, or locked.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Layer {
    pub id: String,
    pub name: String,
    pub order: i32,
    pub visible: bool,
    pub locked: bool,
    /// Optional color hint for elements drawn on this layer.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
}

/// Renovation status of a planning element. Defaults to `Existing` if not
/// specified, matching the TS optional-with-default-at-call-site convention.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RenovationStatus {
    #[default]
    Existing,
    New,
    Demolished,
}

/// Fields shared by every spatial planning element (mirrors TS `ElementBase`,
/// embedded via `#[serde(flatten)]` by the concrete element structs in
/// `thoth-planning`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ElementBase {
    pub id: String,
    pub kind: ElementKind,
    pub name: String,
    pub layer_id: String,
    /// Closed boundary ring in plan coordinates (arc endpoints when curved).
    pub boundary: Polygon,
    /// Optional per-edge circular-arc bulges (DXF convention; edge i runs
    /// vertex i -> i+1). Absent or empty means every edge is a straight line.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub arcs: Option<EdgeArcs>,
    /// Optional CAD layer name (NCS/AIA) this element plots on.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cad_layer_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub line_weight: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub line_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hatch_id: Option<String>,
    #[serde(default)]
    pub renovation_status: RenovationStatus,
}

/// The severity of a compliance finding.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ComplianceSeverity {
    Error,
    Warning,
    Info,
}

/// A single result from checking a plan against its constraints.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ComplianceFinding {
    pub severity: ComplianceSeverity,
    pub code: String,
    pub message: String,
    /// The element the finding concerns, if any.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub element_id: Option<String>,
}
