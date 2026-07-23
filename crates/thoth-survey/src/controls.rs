//! Civil / erosion-control line features — the special linear symbology a
//! construction plan sheet carries (silt fence, tree line, construction
//! fence, slope-intercept / daylight lines, and surface-water flow). Each is
//! a polyline drawn with a distinctive drafting symbol rather than a plain
//! stroke. Direct port of `packages/domain/src/survey/controls.ts` and
//! `types/controls.ts`.

use serde::{Deserialize, Serialize};
use thoth_spatial::{Point, Polyline};

/// A civil/erosion-control line feature type.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ControlLineType {
    SiltFence,
    TreeLine,
    ConstructionFence,
    SlopeIntercept,
    Flow,
}

/// A civil control feature: a typed polyline with special symbology.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ControlLine {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: ControlLineType,
    pub path: Polyline,
    pub label: Option<String>,
}

/// Presentation metadata for a [`ControlLineType`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct ControlLineDefinition {
    #[serde(rename = "type")]
    pub kind: ControlLineType,
    pub label: &'static str,
}

/// The full control-line legend, in the TS `CONTROL_LINE_DEFINITIONS` order.
pub const CONTROL_LINE_DEFINITIONS: &[ControlLineDefinition] = &[
    ControlLineDefinition {
        kind: ControlLineType::SiltFence,
        label: "Silt fence",
    },
    ControlLineDefinition {
        kind: ControlLineType::TreeLine,
        label: "Tree line / clearing limit",
    },
    ControlLineDefinition {
        kind: ControlLineType::ConstructionFence,
        label: "Construction fence",
    },
    ControlLineDefinition {
        kind: ControlLineType::SlopeIntercept,
        label: "Slope intercept",
    },
    ControlLineDefinition {
        kind: ControlLineType::Flow,
        label: "Surface-water flow",
    },
];

/// The definition for a control-line type.
pub fn control_line_definition(kind: ControlLineType) -> ControlLineDefinition {
    CONTROL_LINE_DEFINITIONS
        .iter()
        .copied()
        .find(|d| d.kind == kind)
        .expect("CONTROL_LINE_DEFINITIONS covers every ControlLineType variant")
}

/// Civil/erosion-control point symbols placed on a plan sheet.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CivilSymbolType {
    InletProtection,
    DitchCheck,
    Culvert,
    ErosionBale,
    Riprap,
    Sign,
    FlowArrow,
    StabilizedEntrance,
    SiltBasin,
}

/// A placed civil symbol (box-X inlet protection, ditch check, culvert, …).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CivilSymbol {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: CivilSymbolType,
    pub position: Point,
    pub rotation_deg: Option<f64>,
    /// A second, legacy rotation field — the TS interface carries both
    /// `rotationDeg` and `rotation`; neither is normalized against the
    /// other in the original, so this port keeps them equally independent.
    pub rotation: Option<f64>,
    pub subtype: Option<String>,
    pub label: Option<String>,
}

/// Presentation metadata for a [`CivilSymbolType`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct CivilSymbolDefinition {
    #[serde(rename = "type")]
    pub kind: CivilSymbolType,
    pub label: &'static str,
}

/// The full civil-symbol legend, in the TS `CIVIL_SYMBOL_DEFINITIONS` order.
pub const CIVIL_SYMBOL_DEFINITIONS: &[CivilSymbolDefinition] = &[
    CivilSymbolDefinition {
        kind: CivilSymbolType::InletProtection,
        label: "Inlet protection (A/B/C)",
    },
    CivilSymbolDefinition {
        kind: CivilSymbolType::DitchCheck,
        label: "Ditch check",
    },
    CivilSymbolDefinition {
        kind: CivilSymbolType::Culvert,
        label: "Culvert pipe",
    },
    CivilSymbolDefinition {
        kind: CivilSymbolType::ErosionBale,
        label: "Erosion bale / barrier",
    },
    CivilSymbolDefinition {
        kind: CivilSymbolType::Riprap,
        label: "Rip-rap / stone",
    },
    CivilSymbolDefinition {
        kind: CivilSymbolType::Sign,
        label: "Sign",
    },
    CivilSymbolDefinition {
        kind: CivilSymbolType::FlowArrow,
        label: "Surface-water flow",
    },
    CivilSymbolDefinition {
        kind: CivilSymbolType::StabilizedEntrance,
        label: "Stabilized construction entrance",
    },
    CivilSymbolDefinition {
        kind: CivilSymbolType::SiltBasin,
        label: "Sediment basin / trap",
    },
];

/// The definition for a civil-symbol type.
pub fn civil_symbol_definition(kind: CivilSymbolType) -> CivilSymbolDefinition {
    CIVIL_SYMBOL_DEFINITIONS
        .iter()
        .copied()
        .find(|d| d.kind == kind)
        .expect("CIVIL_SYMBOL_DEFINITIONS covers every CivilSymbolType variant")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_control_line_type_has_a_definition() {
        for def in CONTROL_LINE_DEFINITIONS {
            assert_eq!(control_line_definition(def.kind).label, def.label);
        }
    }

    #[test]
    fn every_civil_symbol_type_has_a_definition() {
        for def in CIVIL_SYMBOL_DEFINITIONS {
            assert_eq!(civil_symbol_definition(def.kind).label, def.label);
        }
    }
}
