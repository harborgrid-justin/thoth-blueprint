//! Survey monuments — the physical control a plat references and depicts
//! with a standard symbology legend: Permanent Reference Monuments (PRM),
//! Permanent Control Points (PCP), section/quarter corners, iron rods/pipes,
//! rebar & cap, nail & disc, concrete monuments, and benchmarks, each
//! **found** or **set**. Direct port of
//! `packages/domain/src/survey/monument.ts` and `types/monument.ts`.

use serde::{Deserialize, Serialize};
use thoth_spatial::Point;

/// The kinds of survey monument a plat depicts.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MonumentType {
    /// Permanent Reference Monument (e.g. 4"×4" concrete).
    Prm,
    /// Permanent Control Point (e.g. nail & disc).
    Pcp,
    SectionCorner,
    QuarterCorner,
    IronRod,
    IronPipe,
    RebarCap,
    NailDisc,
    Concrete,
    Benchmark,
}

/// Whether a monument was recovered (found) or newly placed (set).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MonumentStatus {
    Found,
    Set,
}

/// A survey monument at a plan position.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SurveyMonument {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: MonumentType,
    pub status: MonumentStatus,
    pub position: Point,
    /// Stamp/label, e.g. `"PRM LB6685"` or `"PLS1079"`.
    pub label: Option<String>,
    pub note: Option<String>,
}

/// Presentation metadata for a monument type.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct MonumentDefinition {
    #[serde(rename = "type")]
    pub kind: MonumentType,
    pub label: &'static str,
    pub abbrev: &'static str,
}

/// The full monument-type legend, in the TS `MONUMENT_DEFINITIONS` order.
pub const MONUMENT_DEFINITIONS: &[MonumentDefinition] = &[
    MonumentDefinition {
        kind: MonumentType::Prm,
        label: "Permanent Reference Monument",
        abbrev: "PRM",
    },
    MonumentDefinition {
        kind: MonumentType::Pcp,
        label: "Permanent Control Point",
        abbrev: "PCP",
    },
    MonumentDefinition {
        kind: MonumentType::SectionCorner,
        label: "Section corner",
        abbrev: "SEC COR",
    },
    MonumentDefinition {
        kind: MonumentType::QuarterCorner,
        label: "Quarter corner",
        abbrev: "1/4 COR",
    },
    MonumentDefinition {
        kind: MonumentType::Concrete,
        label: "Concrete monument",
        abbrev: "CM",
    },
    MonumentDefinition {
        kind: MonumentType::IronRod,
        label: "Iron rod",
        abbrev: "IR",
    },
    MonumentDefinition {
        kind: MonumentType::IronPipe,
        label: "Iron pipe",
        abbrev: "IP",
    },
    MonumentDefinition {
        kind: MonumentType::RebarCap,
        label: "Rebar & cap",
        abbrev: "RB+C",
    },
    MonumentDefinition {
        kind: MonumentType::NailDisc,
        label: "Nail & disc",
        abbrev: "NL+D",
    },
    MonumentDefinition {
        kind: MonumentType::Benchmark,
        label: "Benchmark",
        abbrev: "BM",
    },
];

/// The definition for a monument type.
pub fn monument_definition(kind: MonumentType) -> MonumentDefinition {
    MONUMENT_DEFINITIONS
        .iter()
        .copied()
        .find(|d| d.kind == kind)
        .expect("MONUMENT_DEFINITIONS covers every MonumentType variant")
}

/// Human-readable label for a monument type, e.g. `"Iron rod (found)"`. The
/// Rust replacement for the `monumentLabel(type, status?)` half of the TS
/// overload — see [`monument_label`] for the `SurveyMonument` half.
pub fn monument_type_label(kind: MonumentType, status: Option<MonumentStatus>) -> String {
    let def = monument_definition(kind);
    match status {
        Some(s) => format!("{} ({})", def.label, status_word(s)),
        None => def.label.to_string(),
    }
}

/// Human-readable label for a survey monument, e.g. `"Iron rod (found)"`.
/// The Rust replacement for the `monumentLabel(monument)` half of the TS
/// overload — see [`monument_type_label`] for the bare-type half.
pub fn monument_label(monument: &SurveyMonument) -> String {
    monument_type_label(monument.kind, Some(monument.status))
}

fn status_word(status: MonumentStatus) -> &'static str {
    match status {
        MonumentStatus::Found => "found",
        MonumentStatus::Set => "set",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_monument_type_has_a_definition() {
        for def in MONUMENT_DEFINITIONS {
            assert_eq!(monument_definition(def.kind).abbrev, def.abbrev);
        }
    }

    #[test]
    fn labels_a_bare_type_with_status() {
        assert_eq!(
            monument_type_label(MonumentType::IronRod, Some(MonumentStatus::Found)),
            "Iron rod (found)"
        );
        assert_eq!(
            monument_type_label(MonumentType::Prm, None),
            "Permanent Reference Monument"
        );
    }

    #[test]
    fn labels_a_full_monument() {
        let m = SurveyMonument {
            id: "mon-1".to_string(),
            kind: MonumentType::Concrete,
            status: MonumentStatus::Set,
            position: Point::new(0.0, 0.0),
            label: Some("PRM LB6685".to_string()),
            note: None,
        };
        assert_eq!(monument_label(&m), "Concrete monument (set)");
    }
}
