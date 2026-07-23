//! Sheet sizes — the physical page geometry a CAD sheet is plotted on. Three
//! series are supported: **ANSI** engineering sizes (A–E), **ARCH**
//! architectural sizes (A–E), and **ISO** A-series (A4–A0). Every size
//! carries its dimensions in both inches and millimetres so a sheet can be
//! laid out in either paper unit.
//!
//! Paper space is distinct from model space: model geometry is drawn to a
//! [`crate::sheetview::SheetViewport`] at a named scale, then composed onto a
//! sheet of one of these sizes with a border and title block.
//!
//! Port of `packages/domain/src/drawing/sheetsize.ts`.

use crate::parts::global_parts_db;

/// Paper unit a sheet is laid out in.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PaperUnit {
    In,
    Mm,
}

/// Sheet orientation.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Orientation {
    Landscape,
    Portrait,
}

/// A standard sheet size identifier (series + designation).
///
/// The TS `SheetSizeId` union is closed to the 15 ids below, but
/// [`SHEET_SIZES`]'s construction merges in whatever ids the parts catalog's
/// `sheet_sizes` subcategory happens to contain (currently one extra:
/// `sheet-ansi-d-24x36`), via an `as any` cast that bypasses the union
/// entirely. To port that behavior faithfully rather than the aspirational
/// static type, this id — and [`SheetSize::series`] alongside it — is modeled
/// as an open [`String`] with associated constants for the 15 standard ids.
pub type SheetSizeId = String;

/// Canonical sheet size id constants, matching the TS `SheetSizeId` union
/// members exactly.
pub mod ids {
    pub const ANSI_A: &str = "ansi-a";
    pub const ANSI_B: &str = "ansi-b";
    pub const ANSI_C: &str = "ansi-c";
    pub const ANSI_D: &str = "ansi-d";
    pub const ANSI_E: &str = "ansi-e";
    pub const ARCH_A: &str = "arch-a";
    pub const ARCH_B: &str = "arch-b";
    pub const ARCH_C: &str = "arch-c";
    pub const ARCH_D: &str = "arch-d";
    pub const ARCH_E: &str = "arch-e";
    pub const ISO_A4: &str = "iso-a4";
    pub const ISO_A3: &str = "iso-a3";
    pub const ISO_A2: &str = "iso-a2";
    pub const ISO_A1: &str = "iso-a1";
    pub const ISO_A0: &str = "iso-a0";
}

/// The size series a sheet belongs to. Open string — see [`SheetSizeId`]'s
/// rustdoc: the one catalog-derived entry stores `"ANSI"` (uppercase, via its
/// JSON `properties.series`) rather than the canonical lowercase
/// `"ansi"`/`"arch"`/`"iso"`, exactly reproducing the TS `as any` bypass.
pub type SheetSeries = String;

/// Canonical (lowercase) sheet series constants for the 15 hardcoded sizes.
pub mod series {
    pub const ANSI: &str = "ansi";
    pub const ARCH: &str = "arch";
    pub const ISO: &str = "iso";
}

/// A physical sheet size, in portrait (short edge = width) native measure.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct SheetSize {
    pub id: SheetSizeId,
    pub label: String,
    pub series: SheetSeries,
    /// Native short-edge / long-edge in inches (0 for ISO where mm is native).
    pub w_in: f64,
    pub h_in: f64,
    /// Native short-edge / long-edge in millimetres.
    pub w_mm: f64,
    pub h_mm: f64,
}

/// A width/height in a paper unit.
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct PaperDimensions {
    pub w: f64,
    pub h: f64,
    pub unit: PaperUnit,
}

/// Sheet border margins in a paper unit — a wider left margin is the binding edge.
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct SheetMargins {
    pub left: f64,
    pub right: f64,
    pub top: f64,
    pub bottom: f64,
    pub unit: PaperUnit,
}

/// A rectangle in paper units.
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct PaperRect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

/// Millimetres per inch, matching `federalReference.json`'s
/// `standards.drafting.mmPerInch`.
const MM_PER_IN: f64 = 25.4;
const IN_PER_MM: f64 = 1.0 / MM_PER_IN;

fn ansi_or_arch(id: &str, label: &str, series: &str, w_in: f64, h_in: f64) -> SheetSize {
    SheetSize {
        id: id.to_string(),
        label: label.to_string(),
        series: series.to_string(),
        w_in,
        h_in,
        w_mm: w_in * MM_PER_IN,
        h_mm: h_in * MM_PER_IN,
    }
}

fn iso(id: &str, label: &str, w_mm: f64, h_mm: f64) -> SheetSize {
    SheetSize {
        id: id.to_string(),
        label: label.to_string(),
        series: series::ISO.to_string(),
        w_mm,
        h_mm,
        w_in: w_mm * IN_PER_MM,
        h_in: h_mm * IN_PER_MM,
    }
}

/// The registry of standard sheet sizes (portrait-native dimensions), before
/// the parts-catalog extension entries are appended.
fn default_sheet_sizes() -> Vec<SheetSize> {
    vec![
        ansi_or_arch(ids::ANSI_A, "ANSI A (8.5\"×11\")", series::ANSI, 8.5, 11.0),
        ansi_or_arch(ids::ANSI_B, "ANSI B (11\"×17\")", series::ANSI, 11.0, 17.0),
        ansi_or_arch(ids::ANSI_C, "ANSI C (17\"×22\")", series::ANSI, 17.0, 22.0),
        ansi_or_arch(ids::ANSI_D, "ANSI D (22\"×34\")", series::ANSI, 22.0, 34.0),
        ansi_or_arch(ids::ANSI_E, "ANSI E (34\"×44\")", series::ANSI, 34.0, 44.0),
        ansi_or_arch(ids::ARCH_A, "ARCH A (9\"×12\")", series::ARCH, 9.0, 12.0),
        ansi_or_arch(ids::ARCH_B, "ARCH B (12\"×18\")", series::ARCH, 12.0, 18.0),
        ansi_or_arch(ids::ARCH_C, "ARCH C (18\"×24\")", series::ARCH, 18.0, 24.0),
        ansi_or_arch(ids::ARCH_D, "ARCH D (24\"×36\")", series::ARCH, 24.0, 36.0),
        ansi_or_arch(ids::ARCH_E, "ARCH E (36\"×48\")", series::ARCH, 36.0, 48.0),
        iso(ids::ISO_A4, "ISO A4 (210×297)", 210.0, 297.0),
        iso(ids::ISO_A3, "ISO A3 (297×420)", 297.0, 420.0),
        iso(ids::ISO_A2, "ISO A2 (420×594)", 420.0, 594.0),
        iso(ids::ISO_A1, "ISO A1 (594×841)", 594.0, 841.0),
        iso(ids::ISO_A0, "ISO A0 (841×1189)", 841.0, 1189.0),
    ]
}

/// All registered sheet sizes: the 15 standard sizes plus whatever the parts
/// catalog's `sheet_sizes` subcategory contributes.
pub fn list_sheet_sizes() -> Vec<SheetSize> {
    let mut sizes = default_sheet_sizes();
    for part in global_parts_db().get_sheet_sizes() {
        let series = part.property("series").and_then(|v| v.as_str()).unwrap_or(series::ANSI).to_string();
        let w_in = part.property("wIn").and_then(|v| v.as_f64()).unwrap_or(24.0);
        let h_in = part.property("hIn").and_then(|v| v.as_f64()).unwrap_or(36.0);
        let w_mm = part.property("wMm").and_then(|v| v.as_f64()).unwrap_or(609.6);
        let h_mm = part.property("hMm").and_then(|v| v.as_f64()).unwrap_or(914.4);
        sizes.push(SheetSize { id: part.id.clone(), label: part.name.clone(), series, w_in, h_in, w_mm, h_mm });
    }
    sizes
}

/// Look up a sheet size by id (falls back to ARCH D, matching the TS
/// `sheetSize` fallback chain: exact id, else the federal reference default
/// sheet id, else `arch-d`).
pub fn sheet_size(id: &str) -> SheetSize {
    let sizes = list_sheet_sizes();
    sizes
        .iter()
        .find(|s| s.id == id)
        .or_else(|| sizes.iter().find(|s| s.id == ids::ARCH_D))
        .cloned()
        .expect("ARCH D is always present in the default sheet size registry")
}

/// The outer page dimensions of a sheet in the requested paper unit and
/// orientation. Portrait keeps short-edge as width; landscape swaps them.
pub fn sheet_dimensions(id: &str, orientation: Orientation, unit: PaperUnit) -> PaperDimensions {
    let s = sheet_size(id);
    let (w, h) = match unit {
        PaperUnit::In => (s.w_in, s.h_in),
        PaperUnit::Mm => (s.w_mm, s.h_mm),
    };
    let short = w.min(h);
    let long = w.max(h);
    match orientation {
        Orientation::Landscape => PaperDimensions { w: long, h: short, unit },
        Orientation::Portrait => PaperDimensions { w: short, h: long, unit },
    }
}

/// Default NCS-style margins (inches): 1.5" binding edge, 0.5" elsewhere.
pub fn default_margins_in() -> SheetMargins {
    SheetMargins { left: 1.5, right: 0.5, top: 0.5, bottom: 0.5, unit: PaperUnit::In }
}

/// Default ISO margins (mm): 20mm binding edge, 10mm elsewhere.
pub fn default_margins_mm() -> SheetMargins {
    SheetMargins { left: 20.0, right: 10.0, top: 10.0, bottom: 10.0, unit: PaperUnit::Mm }
}

/// Default margins for a paper unit.
pub fn default_margins(unit: PaperUnit) -> SheetMargins {
    match unit {
        PaperUnit::In => default_margins_in(),
        PaperUnit::Mm => default_margins_mm(),
    }
}

/// The printable (inside-border) rectangle of a sheet, in paper units. This
/// is the area available for the drawing window, viewports, and title strip.
pub fn printable_area(
    id: &str,
    orientation: Orientation,
    unit: PaperUnit,
    margins: Option<SheetMargins>,
) -> PaperRect {
    let margins = margins.unwrap_or_else(|| default_margins(unit));
    let dim = sheet_dimensions(id, orientation, unit);
    PaperRect { x: margins.left, y: margins.top, w: dim.w - margins.left - margins.right, h: dim.h - margins.top - margins.bottom }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn list_sheet_sizes_has_fifteen_defaults_plus_the_catalog_extension() {
        let sizes = list_sheet_sizes();
        assert_eq!(sizes.len(), 16);
        assert!(sizes.iter().any(|s| s.id == "sheet-ansi-d-24x36"));
    }

    #[test]
    fn catalog_extension_preserves_the_uppercase_series_bypass() {
        let sizes = list_sheet_sizes();
        let extra = sizes.iter().find(|s| s.id == "sheet-ansi-d-24x36").unwrap();
        assert_eq!(extra.series, "ANSI");
    }

    #[test]
    fn sheet_size_falls_back_to_arch_d_for_unknown_id() {
        let s = sheet_size("nonexistent");
        assert_eq!(s.id, ids::ARCH_D);
    }

    #[test]
    fn ansi_d_dimensions_convert_to_millimetres() {
        let s = sheet_size(ids::ANSI_D);
        assert_relative_eq!(s.w_mm, 22.0 * 25.4, epsilon = 1e-9);
        assert_relative_eq!(s.h_mm, 34.0 * 25.4, epsilon = 1e-9);
    }

    #[test]
    fn iso_a4_dimensions_convert_to_inches() {
        let s = sheet_size(ids::ISO_A4);
        assert_relative_eq!(s.w_in, 210.0 / 25.4, epsilon = 1e-9);
    }

    #[test]
    fn sheet_dimensions_swaps_short_and_long_edge_by_orientation() {
        let landscape = sheet_dimensions(ids::ARCH_D, Orientation::Landscape, PaperUnit::In);
        assert_relative_eq!(landscape.w, 36.0, epsilon = 1e-9);
        assert_relative_eq!(landscape.h, 24.0, epsilon = 1e-9);

        let portrait = sheet_dimensions(ids::ARCH_D, Orientation::Portrait, PaperUnit::In);
        assert_relative_eq!(portrait.w, 24.0, epsilon = 1e-9);
        assert_relative_eq!(portrait.h, 36.0, epsilon = 1e-9);
    }

    #[test]
    fn printable_area_subtracts_default_margins() {
        let area = printable_area(ids::ARCH_D, Orientation::Landscape, PaperUnit::In, None);
        assert_relative_eq!(area.x, 1.5, epsilon = 1e-9);
        assert_relative_eq!(area.y, 0.5, epsilon = 1e-9);
        assert_relative_eq!(area.w, 36.0 - 1.5 - 0.5, epsilon = 1e-9);
        assert_relative_eq!(area.h, 24.0 - 0.5 - 0.5, epsilon = 1e-9);
    }
}
