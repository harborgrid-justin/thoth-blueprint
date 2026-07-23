//! Regional plug-ins (jurisdictions) — the platform ships **100% of the plat
//! / civil capabilities enabled**, and a region plug-in *adjusts* them for a
//! place: which survey framework applies (PLSS vs. the Georgia Land Lot
//! System vs. plain metes-and-bounds), the default units/CRS, the recognized
//! monument types, the plat sheet's title-block fields and required
//! certificates, the curve-table columns, and local subdivision standards.
//!
//! Enabling a plug-in (e.g. "Newton County, Georgia") is purely additive/
//! configurational: nothing is hard-coded to one jurisdiction, and the base
//! capability set has everything turned on.
//!
//! Port of `packages/domain/src/planning/regions.ts` +
//! `packages/domain/src/planning/types/regions.ts`.
//!
//! **Gap notice** (see `GAPS.md`): the TS `RegionPlugin` type references
//! `MonumentType` (`thoth-survey`) and `SheetSizeId`/`Orientation`
//! (`thoth-drawing`) — types owned by sibling crates not wired as
//! dependencies here. [`MonumentType`] and [`Orientation`] below are
//! locally-scoped stand-ins carrying the same variants; `SheetSizeId` is
//! kept as a plain `String` (its real catalog — ARCH D, ANSI sizes, ISO A0–A4,
//! … — belongs to `thoth-drawing`).

use serde::{Deserialize, Serialize};

/// The rectangular-survey framework a jurisdiction is described in.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SurveyFramework {
    Plss,
    GeorgiaLandLot,
    MetesAndBounds,
}

/// The platform's plat/civil capabilities. Every flag defaults to enabled.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Capabilities {
    pub survey_framework: bool,
    pub monuments: bool,
    pub curve_table: bool,
    pub line_table: bool,
    pub easements: bool,
    pub stationing: bool,
    pub plat_composer: bool,
    pub certificates: bool,
    pub interior_angles: bool,
    pub sheet_set: bool,
    pub title_block: bool,
    pub revisions: bool,
    pub dimensions: bool,
    pub schedules: bool,
    pub sections: bool,
    pub elevations: bool,
    pub details: bool,
    pub grid_bubbles: bool,
    pub keynotes: bool,
    pub match_lines: bool,
    pub cad_layers: bool,
    pub building_interiors: bool,
    pub pdf_export: bool,
}

/// The full capability set, everything on — the platform's baseline.
pub const ALL_CAPABILITIES: Capabilities = Capabilities {
    survey_framework: true,
    monuments: true,
    curve_table: true,
    line_table: true,
    easements: true,
    stationing: true,
    plat_composer: true,
    certificates: true,
    interior_angles: true,
    sheet_set: true,
    title_block: true,
    revisions: true,
    dimensions: true,
    schedules: true,
    sections: true,
    elevations: true,
    details: true,
    grid_bubbles: true,
    keynotes: true,
    match_lines: true,
    cad_layers: true,
    building_interiors: true,
    pdf_export: true,
};

/// A monument type recognized by a jurisdiction (local stand-in for
/// `thoth-survey::MonumentType` — see the module gap notice).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum MonumentType {
    Prm,
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

/// Sheet orientation (local stand-in for `thoth-drawing::Orientation`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Orientation {
    Landscape,
    Portrait,
}

/// A plat certificate/attestation block (template text with `{placeholders}`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CertificateSpec {
    pub id: String,
    pub title: String,
    pub body: String,
    /// Signature-line labels beneath the block.
    #[serde(default)]
    pub signatures: Vec<String>,
}

/// A field shown in the sheet title block.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TitleBlockField {
    pub label: String,
    /// Data key resolved from the sheet context (e.g. "county", "scale").
    pub key: String,
}

/// The sheet title-block layout for a jurisdiction.
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
pub struct TitleBlockSpec {
    /// Fixed lines (firm name/address/license), shown verbatim if provided.
    #[serde(default)]
    pub firm_lines: Vec<String>,
    pub fields: Vec<TitleBlockField>,
}

/// A column key in the consolidated curve-data table.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CurveTableColumnKey {
    Label,
    Radius,
    Delta,
    ArcLength,
    Chord,
    ChordBearing,
    Tangent,
}

/// A column in the consolidated curve-data table.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CurveTableColumn {
    pub key: CurveTableColumnKey,
    pub label: String,
}

/// The CAD layer-naming standard a jurisdiction's sheets follow.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LayerStandard {
    Ncs,
    Aia,
}

/// Drawing length unit for sheet composition.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DrawingUnit {
    In,
    Mm,
}

/// Sheet/drafting standards a jurisdiction sets for its CAD deliverables.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SheetStandards {
    /// Sheet size id (e.g. `"arch-d"`) — see the module gap notice.
    pub default_size: String,
    pub orientation: Orientation,
    /// Named drawing-scale ids offered for this jurisdiction.
    pub scale_set: Vec<String>,
    pub layer_standard: LayerStandard,
    /// Default dimension-style id.
    pub dim_style_id: String,
    pub unit: DrawingUnit,
}

/// Local subdivision / zoning standards a jurisdiction can impose.
#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
pub struct JurisdictionStandards {
    /// Minimum lot area, acres.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_lot_area_acres: Option<f64>,
    /// Minimum lot area, sq ft.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_lot_area_sq_ft: Option<f64>,
    /// Nominal land-lot acreage for the Georgia Land Lot System.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub land_lot_acres: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub front_setback: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub side_setback: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rear_setback: Option<f64>,
    /// Minimum right-of-way width, plan units.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_row_width: Option<f64>,
}

/// A region plug-in's default spatial settings.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RegionDefaults {
    pub units: thoth_spatial::Unit,
    pub area_unit: thoth_spatial::AreaUnit,
    pub crs: thoth_spatial::Crs,
}

/// A regional plug-in: how the platform's capabilities are adjusted for a place.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RegionPlugin {
    pub id: String,
    pub name: String,
    pub country: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub county: Option<String>,
    pub survey_framework: SurveyFramework,
    pub defaults: RegionDefaults,
    pub monuments: Vec<MonumentType>,
    /// Capability overrides; unspecified flags stay enabled. `None` fields
    /// leave [`ALL_CAPABILITIES`]'s value untouched (see [`resolve_capabilities`]).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub capabilities: Option<Capabilities>,
    pub curve_table_columns: Vec<CurveTableColumn>,
    pub certificates: Vec<CertificateSpec>,
    pub title_block: TitleBlockSpec,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub standards: Option<JurisdictionStandards>,
    /// CAD sheet/drafting standards for this jurisdiction.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sheet_standards: Option<SheetStandards>,
}

/// Resolve a plug-in's effective capabilities against the all-on baseline.
/// A plug-in's `capabilities` is all-or-nothing here (unlike the TS
/// `Partial<Capabilities>` merge) only in the sense that this port's
/// `Capabilities` has no partiality of its own to merge over — every plug-in
/// defined in this crate leaves `capabilities` unset, so this always resolves
/// to [`ALL_CAPABILITIES`] today; the override point exists for future
/// plug-ins that opt a flag off.
pub fn resolve_capabilities(plugin: Option<&RegionPlugin>) -> Capabilities {
    match plugin.and_then(|p| p.capabilities) {
        Some(overrides) => overrides,
        None => ALL_CAPABILITIES,
    }
}

fn standard_monuments() -> Vec<MonumentType> {
    vec![
        MonumentType::Prm,
        MonumentType::Pcp,
        MonumentType::IronRod,
        MonumentType::IronPipe,
        MonumentType::RebarCap,
        MonumentType::NailDisc,
        MonumentType::Concrete,
        MonumentType::Benchmark,
    ]
}

fn full_curve_columns() -> Vec<CurveTableColumn> {
    vec![
        CurveTableColumn {
            key: CurveTableColumnKey::Label,
            label: "Curve".to_string(),
        },
        CurveTableColumn {
            key: CurveTableColumnKey::Radius,
            label: "Radius".to_string(),
        },
        CurveTableColumn {
            key: CurveTableColumnKey::Delta,
            label: "Delta".to_string(),
        },
        CurveTableColumn {
            key: CurveTableColumnKey::ArcLength,
            label: "Arc".to_string(),
        },
        CurveTableColumn {
            key: CurveTableColumnKey::Chord,
            label: "Chord".to_string(),
        },
        CurveTableColumn {
            key: CurveTableColumnKey::ChordBearing,
            label: "Chord Brg.".to_string(),
        },
        CurveTableColumn {
            key: CurveTableColumnKey::Tangent,
            label: "Tangent".to_string(),
        },
    ]
}

fn imperial_sheet_standards() -> SheetStandards {
    SheetStandards {
        default_size: "arch-d".to_string(),
        orientation: Orientation::Landscape,
        scale_set: [
            "eng-10", "eng-20", "eng-30", "eng-40", "eng-50", "eng-100", "arch-1-8", "arch-1-4",
            "arch-1-2",
        ]
        .into_iter()
        .map(String::from)
        .collect(),
        layer_standard: LayerStandard::Ncs,
        dim_style_id: "eng-arrow".to_string(),
        unit: DrawingUnit::In,
    }
}

/// Generic U.S. PLSS jurisdiction — the sensible default.
pub fn us_plss_default() -> RegionPlugin {
    RegionPlugin {
        id: "us-plss-default".to_string(),
        name: "United States (PLSS default)".to_string(),
        country: "United States".to_string(),
        state: None,
        county: None,
        survey_framework: SurveyFramework::Plss,
        defaults: RegionDefaults {
            units: thoth_spatial::Unit::Feet,
            area_unit: thoth_spatial::AreaUnit::Acres,
            crs: "EPSG:3857".to_string(),
        },
        monuments: {
            let mut m = standard_monuments();
            m.push(MonumentType::SectionCorner);
            m.push(MonumentType::QuarterCorner);
            m
        },
        capabilities: None,
        curve_table_columns: full_curve_columns(),
        title_block: TitleBlockSpec {
            firm_lines: vec![],
            fields: vec![
                TitleBlockField {
                    label: "Project".to_string(),
                    key: "projectName".to_string(),
                },
                TitleBlockField {
                    label: "Location".to_string(),
                    key: "framework".to_string(),
                },
                TitleBlockField {
                    label: "Scale".to_string(),
                    key: "scale".to_string(),
                },
                TitleBlockField {
                    label: "Date".to_string(),
                    key: "date".to_string(),
                },
                TitleBlockField {
                    label: "Sheet".to_string(),
                    key: "sheet".to_string(),
                },
            ],
        },
        certificates: vec![
            CertificateSpec {
                id: "dedication".to_string(),
                title: "Owner's Certificate & Dedication".to_string(),
                body: "The undersigned owner of the land shown hereon has caused the same to be surveyed and subdivided as shown, and dedicates the rights-of-way and easements to public use.".to_string(),
                signatures: vec!["Owner".to_string(), "Date".to_string()],
            },
            CertificateSpec {
                id: "surveyor".to_string(),
                title: "Surveyor's Certificate".to_string(),
                body: "I certify that this plat is a true and correct representation of the land surveyed, that the monuments shown were placed as depicted, and that the survey meets the applicable minimum technical standards.".to_string(),
                signatures: vec!["Professional Land Surveyor".to_string(), "License No.".to_string()],
            },
            CertificateSpec {
                id: "approval".to_string(),
                title: "Certificate of Approval".to_string(),
                body: "Approved for recording by the governing authority of {jurisdiction}.".to_string(),
                signatures: vec!["Approving Official".to_string(), "Date".to_string()],
            },
        ],
        standards: Some(JurisdictionStandards {
            min_row_width: Some(50.0),
            ..Default::default()
        }),
        sheet_standards: Some(imperial_sheet_standards()),
    }
}

/// Newton County, Georgia — a Georgia Land Lot System jurisdiction
/// (202.5-acre land lots), Georgia West State Plane, with Georgia plat
/// certificates.
pub fn newton_county_ga() -> RegionPlugin {
    RegionPlugin {
        id: "us-ga-newton".to_string(),
        name: "Newton County, Georgia".to_string(),
        country: "United States".to_string(),
        state: Some("Georgia".to_string()),
        county: Some("Newton".to_string()),
        survey_framework: SurveyFramework::GeorgiaLandLot,
        defaults: RegionDefaults {
            units: thoth_spatial::Unit::Feet,
            area_unit: thoth_spatial::AreaUnit::Acres,
            crs: "EPSG:2240".to_string(),
        },
        monuments: standard_monuments(),
        capabilities: None,
        curve_table_columns: full_curve_columns(),
        title_block: TitleBlockSpec {
            firm_lines: vec!["NEWTON COUNTY, GEORGIA".to_string(), "Land Lot / District survey".to_string()],
            fields: vec![
                TitleBlockField {
                    label: "Project".to_string(),
                    key: "projectName".to_string(),
                },
                TitleBlockField {
                    label: "Land Lot / District".to_string(),
                    key: "framework".to_string(),
                },
                TitleBlockField {
                    label: "County".to_string(),
                    key: "county".to_string(),
                },
                TitleBlockField {
                    label: "Scale".to_string(),
                    key: "scale".to_string(),
                },
                TitleBlockField {
                    label: "Sheet".to_string(),
                    key: "sheet".to_string(),
                },
            ],
        },
        certificates: vec![
            CertificateSpec {
                id: "dedication".to_string(),
                title: "Owner's Certificate & Dedication".to_string(),
                body: "The owner of the property shown and described hereon acknowledges this plat and dedicates to the use of the public forever all rights-of-way, streets, and easements shown, in Newton County, Georgia.".to_string(),
                signatures: vec!["Owner".to_string(), "Date".to_string()],
            },
            CertificateSpec {
                id: "surveyor-ga".to_string(),
                title: "Surveyor's Certificate (Georgia)".to_string(),
                body: "It is hereby certified that this plat is true and correct and was prepared from an actual survey of the property by a Georgia Registered Land Surveyor; that all monuments shown hereon actually exist or are marked as \u{201c}Future\u{201d}; and that this plat complies with the Georgia Plat Act (O.C.G.A. \u{a7} 15-6-67).".to_string(),
                signatures: vec!["Georgia Registered Land Surveyor".to_string(), "Registration No.".to_string()],
            },
            CertificateSpec {
                id: "county-approval".to_string(),
                title: "Certificate of Approval for Recording".to_string(),
                body: "This plat has been approved for recording by the Newton County Board of Commissioners / Planning & Development, subject to the county subdivision regulations.".to_string(),
                signatures: vec!["Director / Chairman".to_string(), "Date".to_string()],
            },
            CertificateSpec {
                id: "health".to_string(),
                title: "Health Department Certificate".to_string(),
                body: "Approved for on-site sewage management (septic) and water supply by the Newton County Environmental Health Department, where applicable.".to_string(),
                signatures: vec!["Environmental Health".to_string(), "Date".to_string()],
            },
        ],
        standards: Some(JurisdictionStandards {
            land_lot_acres: Some(202.5),
            min_lot_area_acres: Some(1.0),
            front_setback: Some(50.0),
            side_setback: Some(15.0),
            rear_setback: Some(40.0),
            min_row_width: Some(60.0),
            ..Default::default()
        }),
        sheet_standards: Some(SheetStandards {
            scale_set: ["eng-20", "eng-30", "eng-40", "eng-50", "eng-100", "eng-200", "arch-1-4"]
                .into_iter()
                .map(String::from)
                .collect(),
            ..imperial_sheet_standards()
        }),
    }
}

/// Prince William County, Virginia — Virginia State Plane North (NAD83, US
/// Survey Feet), Virginia APELSCIDLA surveyor certificates, PWC DCSM
/// approval block, and GPIN parcel tracking.
pub fn prince_william_county_va() -> RegionPlugin {
    RegionPlugin {
        id: "us-va-prince-william".to_string(),
        name: "Prince William County, Virginia".to_string(),
        country: "United States".to_string(),
        state: Some("Virginia".to_string()),
        county: Some("Prince William".to_string()),
        survey_framework: SurveyFramework::MetesAndBounds,
        defaults: RegionDefaults {
            units: thoth_spatial::Unit::Feet,
            area_unit: thoth_spatial::AreaUnit::Sqft,
            crs: "EPSG:2283".to_string(),
        },
        monuments: standard_monuments(),
        capabilities: None,
        curve_table_columns: full_curve_columns(),
        title_block: TitleBlockSpec {
            firm_lines: vec![
                "PRINCE WILLIAM COUNTY, VIRGINIA".to_string(),
                "Department of Development Services \u{2014} Land Development Division".to_string(),
            ],
            fields: vec![
                TitleBlockField {
                    label: "Project Name".to_string(),
                    key: "projectName".to_string(),
                },
                TitleBlockField {
                    label: "Tax Map / GPIN".to_string(),
                    key: "gpin".to_string(),
                },
                TitleBlockField {
                    label: "Magisterial District".to_string(),
                    key: "district".to_string(),
                },
                TitleBlockField {
                    label: "Zoning District".to_string(),
                    key: "zoning".to_string(),
                },
                TitleBlockField {
                    label: "Scale".to_string(),
                    key: "scale".to_string(),
                },
                TitleBlockField {
                    label: "Sheet".to_string(),
                    key: "sheet".to_string(),
                },
            ],
        },
        certificates: vec![
            CertificateSpec {
                id: "surveyor-va".to_string(),
                title: "Surveyor's Certificate (Virginia APELSCIDLA)".to_string(),
                body: "I hereby certify that this plat was prepared under my direct supervision from an actual field survey conducted in accordance with 18VAC10-20 of the Virginia APELSCIDLA Board Regulations, and meets or exceeds minimum technical standards for Class A boundary surveys in the Commonwealth of Virginia. This plat is for review purposes only and not for recordation.".to_string(),
                signatures: vec!["Virginia Certified Land Surveyor".to_string(), "APELSCIDLA License No.".to_string()],
            },
            CertificateSpec {
                id: "owner-dedication-va".to_string(),
                title: "Owner's Consent & Dedication Certificate".to_string(),
                body: "The undersigned owners of the property shown and described hereon certify that this plat is made with their free consent and desire, and hereby dedicate to the Board of County Supervisors of Prince William County, Virginia, for public use, all rights-of-way, public utility, and drainage easements (PU&DE) depicted. Phrase: Hereby Dedicated for Public Street Purposes.".to_string(),
                signatures: vec!["Property Owner(s)".to_string(), "Date".to_string(), "Notary Public Signature & Seal".to_string()],
            },
            CertificateSpec {
                id: "pwc-approval".to_string(),
                title: "Prince William County Approval Block".to_string(),
                body: "Approved for recordation by the Director of Development Services / County Surveyor of Prince William County, Virginia, pursuant to the Prince William County Subdivision Ordinance and Design and Construction Standards Manual (DCSM).".to_string(),
                signatures: vec!["Director of Development Services / County Surveyor".to_string(), "Date".to_string()],
            },
            CertificateSpec {
                id: "pwc-service-authority".to_string(),
                title: "Health & Service Authority Certificate".to_string(),
                body: "Approved for public water and sanitary sewer service connection by the Prince William County Service Authority (PWCSA) and Virginia Department of Health (VDH). The proposed drainfield(s) shall provide a reserve drainfield area at least equal to that of the primary sewage disposal site.".to_string(),
                signatures: vec!["PWCSA Representative".to_string(), "Date".to_string()],
            },
            CertificateSpec {
                id: "pwc-mandatory-notes".to_string(),
                title: "PWC Mandatory Checklist Notes (DCSM & APM 4.05.5)".to_string(),
                body: "1. All underlying easements may not be indicated on this plat. 2. The owner of fee title to any property on which plant material has been established in accordance with an approved landscape/planting plan shall be responsible for the maintenance, repair and replacement of the approved plant material as required by the ordinance. 3. Land designated as buffer area shall be landscaped and may only be used for structures, uses, or facilities in accordance with the requirements of the Zoning Ordinance and the DCSM. 4. Property lies in Zone X (Unshaded) per FEMA FIRM Panel 51153C0140E. Flood Hazard Area: None. 5. Resource Protection Area (RPA): No RPA stream buffers or tidal wetlands exist on parcel. PASA App # PASA2026-00123.".to_string(),
                signatures: vec![],
            },
        ],
        standards: Some(JurisdictionStandards {
            min_lot_area_sq_ft: Some(28000.0),
            front_setback: Some(35.0),
            side_setback: Some(15.0),
            rear_setback: Some(25.0),
            min_row_width: Some(50.0),
            ..Default::default()
        }),
        sheet_standards: Some(SheetStandards {
            scale_set: ["eng-20", "eng-30", "eng-40", "eng-50", "eng-100", "eng-200", "arch-1-4"]
                .into_iter()
                .map(String::from)
                .collect(),
            ..imperial_sheet_standards()
        }),
    }
}

/// All available region plug-ins.
pub fn region_plugins() -> Vec<RegionPlugin> {
    vec![
        us_plss_default(),
        newton_county_ga(),
        prince_william_county_va(),
    ]
}

/// Look up a region plug-in by id.
pub fn get_region_plugin(id: Option<&str>) -> Option<RegionPlugin> {
    let id = id?;
    region_plugins().into_iter().find(|p| p.id == id)
}

/// List all registered region plug-ins.
pub fn list_region_plugins() -> Vec<RegionPlugin> {
    region_plugins()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn baseline_capabilities_are_all_enabled() {
        let c = ALL_CAPABILITIES;
        assert!(
            c.survey_framework
                && c.monuments
                && c.curve_table
                && c.line_table
                && c.easements
                && c.stationing
                && c.plat_composer
                && c.certificates
                && c.interior_angles
                && c.sheet_set
                && c.title_block
                && c.revisions
                && c.dimensions
                && c.schedules
                && c.sections
                && c.elevations
                && c.details
                && c.grid_bubbles
                && c.keynotes
                && c.match_lines
                && c.cad_layers
                && c.building_interiors
                && c.pdf_export
        );
        assert_eq!(resolve_capabilities(None), ALL_CAPABILITIES);
    }

    #[test]
    fn registers_newton_county_georgia_with_the_land_lot_framework() {
        let newton = get_region_plugin(Some("us-ga-newton")).unwrap();
        assert_eq!(newton.state.as_deref(), Some("Georgia"));
        assert_eq!(newton.county.as_deref(), Some("Newton"));
        assert_eq!(newton.survey_framework, SurveyFramework::GeorgiaLandLot);
        assert_eq!(newton.defaults.units, thoth_spatial::Unit::Feet);
        assert_eq!(newton.standards.unwrap().land_lot_acres, Some(202.5));
        assert!(newton
            .certificates
            .iter()
            .any(|c| c.title.to_lowercase().contains("georgia")));
        assert!(resolve_capabilities(Some(&newton)).plat_composer);
    }

    #[test]
    fn lists_the_default_newton_and_prince_william_plugins() {
        let ids: Vec<String> = list_region_plugins().into_iter().map(|p| p.id).collect();
        assert!(ids.contains(&"us-plss-default".to_string()));
        assert!(ids.contains(&"us-ga-newton".to_string()));
        assert!(ids.contains(&"us-va-prince-william".to_string()));
    }

    #[test]
    fn registers_prince_william_county_virginia_with_state_plane_and_apelscidla() {
        let pwc = get_region_plugin(Some("us-va-prince-william")).unwrap();
        assert_eq!(pwc.state.as_deref(), Some("Virginia"));
        assert_eq!(pwc.county.as_deref(), Some("Prince William"));
        assert_eq!(pwc.defaults.crs, "EPSG:2283");
        assert_eq!(pwc.standards.unwrap().min_lot_area_sq_ft, Some(28000.0));
        assert!(pwc
            .certificates
            .iter()
            .any(|c| c.title.contains("APELSCIDLA")));
        assert!(pwc
            .certificates
            .iter()
            .any(|c| c.title.contains("Prince William County")));
    }
}
