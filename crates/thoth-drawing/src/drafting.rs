//! Drafting standards — the CAD conventions that make output read as a real
//! engineering/architectural sheet: **line weights** (the ISO pen set), **line
//! types** (continuous, hidden, centre, …), named **drawing scales** (imperial
//! architectural & engineering plus metric ratios), the **discipline designators**
//! and **CAD layer** naming of the US National CAD Standard, and **plot styles**.
//!
//! Pure data + lookups. Renderers map these to SVG stroke attributes / PDF pens.
//!
//! Port of `packages/domain/src/drawing/drafting.ts`. The TS source pulls its
//! default text height / extension gap / pen-ladder constants from the shared
//! `planning/geoid/data/federalReference.json`, which lives in the
//! `thoth-planning` crate's scope, not this one. Those specific numeric
//! constants are reproduced verbatim below (see [`ISO_PEN_LADDER_MM`],
//! [`LINE_WEIGHTS`]) with a note of their origin; if `thoth-planning` later
//! exposes them as a shared type, this module should switch to consuming that
//! instead of duplicating the literals.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

/// Named tiers of the ISO line-weight pen set.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum LineWeightName {
    Fine,
    Thin,
    Light,
    Medium,
    Wide,
    XWide,
    XxWide,
}

/// Named CAD line types.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LineTypeName {
    Continuous,
    Hidden,
    Center,
    Phantom,
    Dashed,
    Dashdot,
    Dotted,
    Property,
    Break,
    Matchline,
}

/// A line-type definition: a repeating dash pattern in paper millimetres.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LineTypeDef {
    pub name: LineTypeName,
    pub label: &'static str,
    /// Dash/gap lengths in mm (empty = solid).
    pub pattern: Vec<f64>,
}

/// Which scale system a named scale belongs to.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ScaleSystem {
    Architectural,
    Engineering,
    Metric,
}

/// A named drawing scale (paper distance to model distance).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DrawingScale {
    pub id: String,
    pub label: String,
    pub system: ScaleSystem,
    pub model_per_paper: f64,
}

/// US National CAD Standard single-letter discipline designator.
///
/// The TS union is closed, but `parseSheetNumber` casts *any* regex-matched
/// uppercase letter to this type without checking membership — a latent
/// unsoundness in the original. This port keeps the enum closed and instead
/// makes [`crate::sheet::parse_sheet_number`] return an explicit
/// [`crate::DrawingError::MalformedSheetNumber`] for a letter outside this set,
/// which is a deliberate, documented hardening rather than a byte-for-byte bug
/// reproduction.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum DisciplineCode {
    G,
    H,
    V,
    B,
    C,
    L,
    S,
    A,
    I,
    Q,
    F,
    P,
    D,
    M,
    E,
    W,
    T,
    R,
    X,
    Z,
    O,
}

impl DisciplineCode {
    /// Parse a single uppercase letter into a discipline code, `None` if it
    /// isn't one of the 21 designators.
    pub fn from_letter(c: char) -> Option<Self> {
        use DisciplineCode::*;
        Some(match c {
            'G' => G,
            'H' => H,
            'V' => V,
            'B' => B,
            'C' => C,
            'L' => L,
            'S' => S,
            'A' => A,
            'I' => I,
            'Q' => Q,
            'F' => F,
            'P' => P,
            'D' => D,
            'M' => M,
            'E' => E,
            'W' => W,
            'T' => T,
            'R' => R,
            'X' => X,
            'Z' => Z,
            'O' => O,
            _ => return None,
        })
    }

    /// The single uppercase letter this discipline code prints as.
    pub const fn as_letter(self) -> char {
        use DisciplineCode::*;
        match self {
            G => 'G',
            H => 'H',
            V => 'V',
            B => 'B',
            C => 'C',
            L => 'L',
            S => 'S',
            A => 'A',
            I => 'I',
            Q => 'Q',
            F => 'F',
            P => 'P',
            D => 'D',
            M => 'M',
            E => 'E',
            W => 'W',
            T => 'T',
            R => 'R',
            X => 'X',
            Z => 'Z',
            O => 'O',
        }
    }
}

/// A CAD layer in the NCS/AIA long format: `DISCIPLINE-MAJOR-MINOR-STATUS`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CadLayer {
    /// Full formatted name, e.g. "A-WALL".
    pub name: String,
    pub discipline: DisciplineCode,
    /// Major field, e.g. "WALL", "TOPO", "ANNO".
    pub major: String,
    /// Optional minor/modifier field, e.g. "FULL", "IDEN".
    #[serde(skip_serializing_if = "Option::is_none")]
    pub minor: Option<String>,
    pub color: String,
    pub line_weight: LineWeightName,
    pub line_type: LineTypeName,
    /// Whether the layer plots (non-plotting layers are construction aids).
    pub plot: bool,
}

/// A plot/pen style: how a screen colour maps to plotted ink.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PlotStyle {
    pub name: &'static str,
    /// Screening percentage (100 = full ink, lower = greyer).
    pub screening: f64,
    /// Optional line-weight override applied at plot time.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub line_weight_override: Option<LineWeightName>,
}

// --- line weights (from federalReference.json: standards.drafting.lineWeightsMm) ----

/// Millimetre width for each named line weight (ISO pen ladder). Reproduced
/// from `federalReference.json`'s `standards.drafting.lineWeightsMm`.
pub fn line_weight_mm(name: LineWeightName) -> f64 {
    use LineWeightName::*;
    match name {
        Fine => 0.13,
        Thin => 0.18,
        Light => 0.25,
        Medium => 0.35,
        Wide => 0.5,
        XWide => 0.7,
        XxWide => 1.0,
    }
}

/// The full ISO pen ladder in millimetres, for style pickers. Reproduced from
/// `federalReference.json`'s `standards.drafting.isoPenLadderMm`.
pub const ISO_PEN_LADDER_MM: [f64; 9] = [0.13, 0.18, 0.25, 0.35, 0.5, 0.7, 1.0, 1.4, 2.0];

// --- line types --------------------------------------------------------------

/// Look up the dash pattern (mm) for a line type — empty for continuous.
pub fn line_type_pattern(name: LineTypeName) -> Vec<f64> {
    line_type_def(name).pattern
}

/// Look up the full definition for a named line type.
pub fn line_type_def(name: LineTypeName) -> LineTypeDef {
    use LineTypeName::*;
    let (label, pattern): (&'static str, Vec<f64>) = match name {
        Continuous => ("Continuous", vec![]),
        Hidden => ("Hidden", vec![2.0, 1.5]),
        Center => ("Center", vec![10.0, 2.0, 2.0, 2.0]),
        Phantom => ("Phantom", vec![12.0, 2.0, 2.0, 2.0, 2.0, 2.0]),
        Dashed => ("Dashed", vec![4.0, 2.0]),
        Dashdot => ("Dash-dot", vec![8.0, 2.0, 1.0, 2.0]),
        Dotted => ("Dotted", vec![0.5, 2.0]),
        Property => ("Property line", vec![14.0, 3.0, 3.0, 3.0]),
        Break => ("Break", vec![6.0, 2.0, 1.0, 2.0]),
        Matchline => ("Match line", vec![16.0, 3.0, 3.0, 3.0]),
    };
    LineTypeDef {
        name,
        label,
        pattern,
    }
}

// --- drawing scales ------------------------------------------------------------

/// Imperial architectural scales are quoted as `x" = 1'-0"`, i.e. `x` paper
/// inches represents 12 model inches, so `model_per_paper = 12 / x`.
fn arch(id: &str, label: &str, paper_inches_per_foot: f64) -> DrawingScale {
    DrawingScale {
        id: id.to_string(),
        label: label.to_string(),
        system: ScaleSystem::Architectural,
        model_per_paper: 12.0 / paper_inches_per_foot,
    }
}

/// Imperial engineering scales are quoted as `1" = N'`, i.e. one paper inch
/// represents N model feet (12·N model inches), so `model_per_paper = 12·N`.
fn eng(id: &str, label: &str, feet_per_inch: f64) -> DrawingScale {
    DrawingScale {
        id: id.to_string(),
        label: label.to_string(),
        system: ScaleSystem::Engineering,
        model_per_paper: 12.0 * feet_per_inch,
    }
}

/// Metric ratios are direct: `1:N` -> N model units per paper unit.
fn metric(n: u32) -> DrawingScale {
    DrawingScale {
        id: format!("1:{n}"),
        label: format!("1:{n}"),
        system: ScaleSystem::Metric,
        model_per_paper: n as f64,
    }
}

/// The registry of standard drawing scales, in the same order as the TS
/// `DRAWING_SCALES` array (architectural, then engineering, then metric).
pub fn drawing_scales() -> Vec<DrawingScale> {
    vec![
        arch("arch-1-16", "1/16\" = 1'-0\"", 1.0 / 16.0),
        arch("arch-3-32", "3/32\" = 1'-0\"", 3.0 / 32.0),
        arch("arch-1-8", "1/8\" = 1'-0\"", 1.0 / 8.0),
        arch("arch-3-16", "3/16\" = 1'-0\"", 3.0 / 16.0),
        arch("arch-1-4", "1/4\" = 1'-0\"", 1.0 / 4.0),
        arch("arch-3-8", "3/8\" = 1'-0\"", 3.0 / 8.0),
        arch("arch-1-2", "1/2\" = 1'-0\"", 1.0 / 2.0),
        arch("arch-3-4", "3/4\" = 1'-0\"", 3.0 / 4.0),
        arch("arch-1", "1\" = 1'-0\"", 1.0),
        arch("arch-1-1-2", "1-1/2\" = 1'-0\"", 1.5),
        arch("arch-3", "3\" = 1'-0\"", 3.0),
        eng("eng-10", "1\" = 10'", 10.0),
        eng("eng-20", "1\" = 20'", 20.0),
        eng("eng-30", "1\" = 30'", 30.0),
        eng("eng-40", "1\" = 40'", 40.0),
        eng("eng-50", "1\" = 50'", 50.0),
        eng("eng-60", "1\" = 60'", 60.0),
        eng("eng-100", "1\" = 100'", 100.0),
        eng("eng-200", "1\" = 200'", 200.0),
        metric(1),
        metric(5),
        metric(10),
        metric(20),
        metric(50),
        metric(100),
        metric(200),
        metric(500),
        metric(1000),
    ]
}

/// Look up a drawing scale by id (falls back to `eng-20`, matching the TS
/// `drawingScale` fallback).
pub fn drawing_scale(id: &str) -> DrawingScale {
    drawing_scales()
        .into_iter()
        .find(|s| s.id == id)
        .unwrap_or_else(|| eng("eng-20", "1\" = 20'", 20.0))
}

/// Model units per paper unit for a named scale.
pub fn scale_ratio(id: &str) -> f64 {
    drawing_scale(id).model_per_paper
}

/// Human label for a named scale.
pub fn format_scale(id: &str) -> String {
    drawing_scale(id).label
}

// --- disciplines (NCS designators) --------------------------------------------

/// Human name for each discipline designator.
pub fn discipline_name(code: DisciplineCode) -> &'static str {
    use DisciplineCode::*;
    match code {
        G => "General",
        H => "Hazardous Materials",
        V => "Survey / Mapping",
        B => "Geotechnical",
        C => "Civil",
        L => "Landscape",
        S => "Structural",
        A => "Architectural",
        I => "Interiors",
        Q => "Equipment",
        F => "Fire Protection",
        P => "Plumbing",
        D => "Process",
        M => "Mechanical",
        E => "Electrical",
        W => "Distributed Energy",
        T => "Telecommunications",
        R => "Resource",
        X => "Other Disciplines",
        Z => "Contractor / Shop Drawings",
        O => "Operations",
    }
}

/// Canonical ordering of disciplines for sheet-set sorting.
pub const DISCIPLINE_ORDER: [DisciplineCode; 21] = [
    DisciplineCode::G,
    DisciplineCode::H,
    DisciplineCode::V,
    DisciplineCode::B,
    DisciplineCode::C,
    DisciplineCode::L,
    DisciplineCode::S,
    DisciplineCode::A,
    DisciplineCode::I,
    DisciplineCode::Q,
    DisciplineCode::F,
    DisciplineCode::P,
    DisciplineCode::D,
    DisciplineCode::M,
    DisciplineCode::E,
    DisciplineCode::W,
    DisciplineCode::T,
    DisciplineCode::R,
    DisciplineCode::X,
    DisciplineCode::Z,
    DisciplineCode::O,
];

// --- CAD layers (NCS / AIA long format) ---------------------------------------

/// Format an NCS/AIA layer name from its parts.
pub fn format_layer_name(discipline: DisciplineCode, major: &str, minor: Option<&str>) -> String {
    let base = format!("{}-{}", discipline.as_letter(), major.to_uppercase());
    match minor {
        Some(m) => format!("{base}-{}", m.to_uppercase()),
        None => base,
    }
}

/// Extra attributes for [`cad_layer`], mirroring the TS options object.
pub struct CadLayerAttrs<'a> {
    pub minor: Option<&'a str>,
    pub color: &'a str,
    pub line_weight: LineWeightName,
    pub line_type: Option<LineTypeName>,
    pub plot: Option<bool>,
}

/// Build a CAD layer, formatting its name from the parts.
pub fn cad_layer(discipline: DisciplineCode, major: &str, attrs: CadLayerAttrs<'_>) -> CadLayer {
    CadLayer {
        name: format_layer_name(discipline, major, attrs.minor),
        discipline,
        major: major.to_uppercase(),
        minor: attrs.minor.map(|m| m.to_uppercase()),
        color: attrs.color.to_string(),
        line_weight: attrs.line_weight,
        line_type: attrs.line_type.unwrap_or(LineTypeName::Continuous),
        plot: attrs.plot.unwrap_or(true),
    }
}

/// A standard starter layer set spanning the common disciplines.
pub fn standard_cad_layers() -> Vec<CadLayer> {
    use DisciplineCode::*;
    use LineTypeName as LT;
    use LineWeightName as LW;
    vec![
        cad_layer(
            G,
            "ANNO",
            CadLayerAttrs {
                minor: Some("TTLB"),
                color: "#0f172a",
                line_weight: LW::Thin,
                line_type: None,
                plot: None,
            },
        ),
        cad_layer(
            C,
            "PROP",
            CadLayerAttrs {
                minor: None,
                color: "#0f172a",
                line_weight: LW::Wide,
                line_type: Some(LT::Property),
                plot: None,
            },
        ),
        cad_layer(
            C,
            "TOPO",
            CadLayerAttrs {
                minor: None,
                color: "#92400e",
                line_weight: LW::Thin,
                line_type: None,
                plot: None,
            },
        ),
        cad_layer(
            C,
            "ROAD",
            CadLayerAttrs {
                minor: None,
                color: "#334155",
                line_weight: LW::Medium,
                line_type: None,
                plot: None,
            },
        ),
        cad_layer(
            C,
            "ESMT",
            CadLayerAttrs {
                minor: None,
                color: "#7c3aed",
                line_weight: LW::Thin,
                line_type: Some(LT::Dashdot),
                plot: None,
            },
        ),
        cad_layer(
            L,
            "PLNT",
            CadLayerAttrs {
                minor: None,
                color: "#15803d",
                line_weight: LW::Thin,
                line_type: None,
                plot: None,
            },
        ),
        cad_layer(
            S,
            "GRID",
            CadLayerAttrs {
                minor: None,
                color: "#64748b",
                line_weight: LW::Thin,
                line_type: Some(LT::Center),
                plot: None,
            },
        ),
        cad_layer(
            A,
            "WALL",
            CadLayerAttrs {
                minor: Some("FULL"),
                color: "#0f172a",
                line_weight: LW::Wide,
                line_type: None,
                plot: None,
            },
        ),
        cad_layer(
            A,
            "GLAZ",
            CadLayerAttrs {
                minor: None,
                color: "#0284c7",
                line_weight: LW::Thin,
                line_type: None,
                plot: None,
            },
        ),
        cad_layer(
            A,
            "DOOR",
            CadLayerAttrs {
                minor: None,
                color: "#0f172a",
                line_weight: LW::Light,
                line_type: None,
                plot: None,
            },
        ),
        cad_layer(
            A,
            "ANNO",
            CadLayerAttrs {
                minor: Some("DIMS"),
                color: "#0f172a",
                line_weight: LW::Fine,
                line_type: None,
                plot: None,
            },
        ),
        cad_layer(
            A,
            "ROOM",
            CadLayerAttrs {
                minor: None,
                color: "#475569",
                line_weight: LW::Fine,
                line_type: None,
                plot: None,
            },
        ),
    ]
}

// --- plot styles ----------------------------------------------------------------

/// Common plot styles (monochrome and grayscale).
pub fn plot_styles() -> Vec<PlotStyle> {
    vec![
        PlotStyle {
            name: "Monochrome",
            screening: 100.0,
            line_weight_override: None,
        },
        PlotStyle {
            name: "Grayscale 50%",
            screening: 50.0,
            line_weight_override: None,
        },
        PlotStyle {
            name: "Screened 25%",
            screening: 25.0,
            line_weight_override: None,
        },
    ]
}

/// The full table of line weights, keyed by name, for style pickers that want
/// every entry at once rather than one-at-a-time via [`line_weight_mm`].
pub fn line_weights_table() -> BTreeMap<LineWeightName, f64> {
    use LineWeightName::*;
    [Fine, Thin, Light, Medium, Wide, XWide, XxWide]
        .into_iter()
        .map(|w| (w, line_weight_mm(w)))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn line_weight_mm_matches_iso_pen_ladder() {
        assert_eq!(line_weight_mm(LineWeightName::Fine), 0.13);
        assert_eq!(line_weight_mm(LineWeightName::XxWide), 1.0);
    }

    #[test]
    fn line_type_pattern_is_empty_for_continuous() {
        assert!(line_type_pattern(LineTypeName::Continuous).is_empty());
        assert_eq!(line_type_pattern(LineTypeName::Hidden), vec![2.0, 1.5]);
    }

    #[test]
    fn architectural_scale_ratio_is_twelve_over_paper_inches() {
        // 1/4" = 1'-0" -> model_per_paper = 12 / 0.25 = 48
        assert_eq!(scale_ratio("arch-1-4"), 48.0);
    }

    #[test]
    fn engineering_scale_ratio_is_twelve_times_feet() {
        // 1" = 20' -> model_per_paper = 240
        assert_eq!(scale_ratio("eng-20"), 240.0);
    }

    #[test]
    fn metric_scale_ratio_is_the_ratio_itself() {
        assert_eq!(scale_ratio("1:100"), 100.0);
    }

    #[test]
    fn unknown_scale_id_falls_back_to_eng_20() {
        assert_eq!(scale_ratio("nonexistent"), 240.0);
        assert_eq!(format_scale("nonexistent"), "1\" = 20'");
    }

    #[test]
    fn discipline_from_letter_rejects_letters_outside_ncs_set() {
        assert_eq!(DisciplineCode::from_letter('A'), Some(DisciplineCode::A));
        assert_eq!(DisciplineCode::from_letter('K'), None);
    }

    #[test]
    fn format_layer_name_uppercases_and_joins_parts() {
        assert_eq!(
            format_layer_name(DisciplineCode::A, "wall", Some("full")),
            "A-WALL-FULL"
        );
        assert_eq!(format_layer_name(DisciplineCode::C, "topo", None), "C-TOPO");
    }

    #[test]
    fn standard_cad_layers_has_twelve_entries() {
        assert_eq!(standard_cad_layers().len(), 12);
    }

    #[test]
    fn discipline_order_lists_all_twenty_one_codes_once() {
        let mut seen = std::collections::BTreeSet::new();
        for d in DISCIPLINE_ORDER {
            assert!(seen.insert(d.as_letter()), "duplicate discipline in order");
        }
        assert_eq!(seen.len(), 21);
    }
}
