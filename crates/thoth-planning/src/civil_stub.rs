//! Minimal local stand-ins for cross-crate civil/survey types.
//!
//! **Gap notice** (see `crates/thoth-planning/GAPS.md`): [`crate::erosion`]'s
//! compliance audit and [`Site`](crate::elements::Site) need `ControlLine`,
//! `CivilSymbol`, and `InfrastructureNetwork` — types that properly belong to
//! `thoth-civil` / `thoth-survey` (they mirror
//! `packages/domain/src/survey/controls.ts` and
//! `packages/domain/src/civil/network.ts`). Those crates are out of this
//! crate's scope and not wired as a dependency, so this module defines
//! locally-scoped stand-ins carrying only the fields the erosion audit reads.
//!
//! These are deliberately permissive: the TS original accesses most of these
//! fields through untyped `(x as any).field` casts (the real `ControlLine`/
//! `CivilSymbol` interfaces don't declare `gradient`, `slopeLength`,
//! `reinforced`, etc. either), so a `properties` bag here is a faithful port
//! of that looseness rather than an invented abstraction.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use thoth_spatial::Point;

/// A civil/erosion-control line feature (silt fence, tree line, flow line, …).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ControlLine {
    pub id: String,
    /// Feature type, e.g. `"silt-fence"`.
    pub control_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    /// Ad hoc properties the audit consults (`gradient`, `slopeLength`,
    /// `reinforced`, …), matching the TS original's untyped field access.
    #[serde(default)]
    pub properties: BTreeMap<String, Value>,
}

/// A civil/erosion-control point symbol (inlet protection, ditch check, …).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CivilSymbol {
    pub id: String,
    /// Symbol type, e.g. `"inlet-protection"`, `"silt-basin"`, `"riprap"`.
    pub symbol_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subtype: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    pub position: Point,
    #[serde(default)]
    pub properties: BTreeMap<String, Value>,
}

/// A node in an infrastructure network.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NetworkNode {
    pub id: String,
    pub point: Point,
}

/// A directed edge connecting two network nodes by id.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NetworkEdge {
    pub from: String,
    pub to: String,
}

/// A connected linear infrastructure system (storm, sewer, water, road, …),
/// modeled as nodes and edges rather than loose lines.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct InfrastructureNetwork {
    pub id: String,
    pub name: String,
    /// Network discipline, e.g. `"storm"`, `"sewer"`, `"water"`, `"road"`.
    pub kind: String,
    pub nodes: Vec<NetworkNode>,
    pub edges: Vec<NetworkEdge>,
}

/// Read a numeric ad hoc property, mirroring the TS `(x as any).field ?? default` pattern.
pub fn prop_f64(props: &BTreeMap<String, Value>, key: &str) -> Option<f64> {
    props.get(key).and_then(Value::as_f64)
}

/// Read a boolean ad hoc property, mirroring the TS `(x as any).field ?? default` pattern.
pub fn prop_bool(props: &BTreeMap<String, Value>, key: &str) -> Option<bool> {
    props.get(key).and_then(Value::as_bool)
}
