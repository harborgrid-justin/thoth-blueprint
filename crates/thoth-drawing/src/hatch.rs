//! Hatch pattern registry — the standardized fills that give a drawing its
//! material read: diagonal (ANSI31), crosshatch, concrete, earth, gravel,
//! sand, steel, insulation, and so on. This is the framework-agnostic *spec*
//! (angle, spacing, weight); the web layer renders each id as an SVG
//! `<pattern>` or a PDF tiled fill.
//!
//! Port of `packages/domain/src/drawing/hatch.ts`.

use crate::drafting::LineWeightName;
use crate::parts::global_parts_db;

/// How a hatch fills an area.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HatchKind {
    Lines,
    Crosshatch,
    Dots,
    Solid,
    Grid,
}

/// A hatch pattern specification.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct HatchPattern {
    pub id: String,
    pub label: String,
    pub kind: HatchKind,
    /// Hatch line angle in degrees (0 = horizontal).
    pub angle_deg: f64,
    /// Spacing between hatch lines in paper millimetres.
    pub spacing: f64,
    pub line_weight: LineWeightName,
    /// Optional fill colour beneath the hatch.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub background: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
}

/// The standard hatch patterns. The first entry's id/label/angle are sourced
/// from the parts catalog's `hatch_patterns` subcategory (the `ANSI31`
/// entry), matching the TS `catalogHatchParts[0]` wiring — the catalog values
/// happen to coincide with the hardcoded defaults they'd otherwise be, so
/// this indirection currently changes nothing observable, but is preserved
/// for parity should the catalog entry ever diverge.
pub fn hatch_patterns() -> Vec<HatchPattern> {
    let catalog_hatch = global_parts_db().get_hatch_patterns();
    let first = catalog_hatch.first();
    let ansi31_id = first
        .and_then(|p| p.property("patternName"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_else(|| "ansi31".to_string());
    let ansi31_label = first.map(|p| p.name.clone()).unwrap_or_else(|| "ANSI31 (diagonal)".to_string());
    let ansi31_angle = first.and_then(|p| p.property("angleDegrees")).and_then(|v| v.as_f64()).unwrap_or(45.0);

    vec![
        HatchPattern {
            id: ansi31_id,
            label: ansi31_label,
            kind: HatchKind::Lines,
            angle_deg: ansi31_angle,
            spacing: 2.5,
            line_weight: LineWeightName::Fine,
            background: None,
            color: Some("#334155".to_string()),
        },
        HatchPattern {
            id: "ansi37".to_string(),
            label: "ANSI37 (crosshatch)".to_string(),
            kind: HatchKind::Crosshatch,
            angle_deg: 45.0,
            spacing: 2.5,
            line_weight: LineWeightName::Fine,
            background: None,
            color: Some("#334155".to_string()),
        },
        HatchPattern {
            id: "concrete".to_string(),
            label: "Concrete".to_string(),
            kind: HatchKind::Dots,
            angle_deg: 0.0,
            spacing: 2.0,
            line_weight: LineWeightName::Fine,
            background: None,
            color: Some("#64748b".to_string()),
        },
        HatchPattern {
            id: "earth".to_string(),
            label: "Earth".to_string(),
            kind: HatchKind::Lines,
            angle_deg: 45.0,
            spacing: 3.0,
            line_weight: LineWeightName::Fine,
            background: None,
            color: Some("#92400e".to_string()),
        },
        HatchPattern {
            id: "gravel".to_string(),
            label: "Gravel".to_string(),
            kind: HatchKind::Dots,
            angle_deg: 0.0,
            spacing: 2.5,
            line_weight: LineWeightName::Fine,
            background: None,
            color: Some("#78716c".to_string()),
        },
        HatchPattern {
            id: "sand".to_string(),
            label: "Sand".to_string(),
            kind: HatchKind::Dots,
            angle_deg: 0.0,
            spacing: 1.4,
            line_weight: LineWeightName::Fine,
            background: None,
            color: Some("#a16207".to_string()),
        },
        HatchPattern {
            id: "steel".to_string(),
            label: "Steel".to_string(),
            kind: HatchKind::Lines,
            angle_deg: 45.0,
            spacing: 1.8,
            line_weight: LineWeightName::Thin,
            background: None,
            color: Some("#1e293b".to_string()),
        },
        HatchPattern {
            id: "insulation".to_string(),
            label: "Insulation (batt)".to_string(),
            kind: HatchKind::Lines,
            angle_deg: 0.0,
            spacing: 3.0,
            line_weight: LineWeightName::Fine,
            background: None,
            color: Some("#0ea5e9".to_string()),
        },
        HatchPattern {
            id: "brick".to_string(),
            label: "Brick".to_string(),
            kind: HatchKind::Grid,
            angle_deg: 0.0,
            spacing: 3.0,
            line_weight: LineWeightName::Fine,
            background: None,
            color: Some("#b91c1c".to_string()),
        },
        HatchPattern {
            id: "water".to_string(),
            label: "Water".to_string(),
            kind: HatchKind::Lines,
            angle_deg: 0.0,
            spacing: 2.5,
            line_weight: LineWeightName::Fine,
            background: None,
            color: Some("#0284c7".to_string()),
        },
        HatchPattern {
            id: "wood".to_string(),
            label: "Wood".to_string(),
            kind: HatchKind::Lines,
            angle_deg: 0.0,
            spacing: 1.6,
            line_weight: LineWeightName::Fine,
            background: None,
            color: Some("#a16207".to_string()),
        },
        HatchPattern {
            id: "grass".to_string(),
            label: "Grass / turf".to_string(),
            kind: HatchKind::Dots,
            angle_deg: 0.0,
            spacing: 3.0,
            line_weight: LineWeightName::Fine,
            background: None,
            color: Some("#15803d".to_string()),
        },
    ]
}

/// Look up a hatch pattern by id.
pub fn hatch_pattern(id: &str) -> Option<HatchPattern> {
    hatch_patterns().into_iter().find(|h| h.id == id)
}

/// Material -> hatch id mapping keyed by element kind / land-use category /
/// building material. Supersedes ad-hoc per-element switches.
pub fn material_hatch(key: &str) -> Option<&'static str> {
    Some(match key {
        "water" | "wetland" => "water",
        "concrete" => "concrete",
        "gravel" => "gravel",
        "earth" | "grade" => "earth",
        "planting" | "openspace" | "park" => "grass",
        "agricultural" => "earth",
        "building" | "wall" => "concrete",
        "steel" => "steel",
        "masonry" => "brick",
        "wood" => "wood",
        "insulation" => "insulation",
        _ => return None,
    })
}

/// Resolve a hatch id for a material/kind key, if any.
pub fn hatch_for_material(key: Option<&str>) -> Option<&'static str> {
    key.and_then(material_hatch)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hatch_patterns_has_twelve_standard_entries() {
        assert_eq!(hatch_patterns().len(), 12);
    }

    #[test]
    fn ansi31_entry_is_sourced_from_the_parts_catalog() {
        let patterns = hatch_patterns();
        let ansi31 = &patterns[0];
        assert_eq!(ansi31.id, "ansi31");
        assert_eq!(ansi31.angle_deg, 45.0);
    }

    #[test]
    fn hatch_pattern_looks_up_by_id() {
        assert!(hatch_pattern("concrete").is_some());
        assert!(hatch_pattern("does-not-exist").is_none());
    }

    #[test]
    fn hatch_for_material_maps_known_and_unknown_keys() {
        assert_eq!(hatch_for_material(Some("wetland")), Some("water"));
        assert_eq!(hatch_for_material(Some("masonry")), Some("brick"));
        assert_eq!(hatch_for_material(Some("nonexistent")), None);
        assert_eq!(hatch_for_material(None), None);
    }
}
