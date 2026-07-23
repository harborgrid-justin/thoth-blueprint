//! Build a standard multi-discipline [`DrawingSet`] from a site when the site
//! doesn't already carry one, so the sheet composer always has a full set to
//! show. The sheets are chosen from what the site contains: a cover/index
//! (G-001), a boundary/control survey sheet when survey control is present
//! (V-101), the site plan (C-101), an erosion-control plan when the site
//! carries control lines/symbols (C-102), civil details (C-501); and, when a
//! building model is present, the architectural floor plan (A-101),
//! elevations (A-201), sections (A-301), and schedules (A-601). Sheet ids are
//! deterministic so re-builds are stable.
//!
//! Port of `packages/domain/src/drawing/defaultSet.ts`.
//!
//! ## Adaptation
//!
//! The TS `ensureDrawingSet(site, plugin)` reads a few `Site` fields this
//! crate's scoped `thoth_planning::Site` doesn't carry — `drawingSets`,
//! `landLot`, and `buildingModels` (see that crate's `elements.rs` module
//! rustdoc for why; `site.monuments`/`site.plss` *are* now real `Site`
//! fields, so those are read directly). Following the same
//! signature-adaptation pattern already used in `builders.rs` (see its
//! module rustdoc), [`ensure_drawing_set`] takes exactly the missing pieces
//! as explicit parameters instead:
//!
//! - `site.drawingSets?.[0]` -> `existing_drawing_set: Option<&DrawingSet>`
//! - `!!site.landLot` -> `has_land_lot: bool` (folded with `site.monuments`/
//!   `site.plss`, read directly, into the same
//!   `(site.monuments?.length ?? 0) > 0 || !!site.plss || !!site.landLot`
//!   survey-control test the TS original runs)
//! - `site.buildingModels && site.buildingModels.length` ->
//!   `has_building_model: bool`
//! - `new Date().getFullYear().toString()` -> `year: &str` (kept pure, same
//!   adaptation `sheet::create_sheet_set_from_frames` already uses for its
//!   `date` parameter — see `planproduction.rs`)
//!
//! `site.control_lines`/`site.civil_symbols` (the erosion-control-sheet
//! trigger) are likewise read directly.

use thoth_planning::elements::Site;
use thoth_planning::regions::{Orientation as PluginOrientation, RegionPlugin};

use crate::drafting::DisciplineCode;
use crate::sheet::{DrawingSet, Sheet, SheetNumber, SheetTypeDigit, TitleBlockDefaults};
use crate::sheetsize::Orientation;

/// Convert a `thoth-planning` region-plug-in orientation into this crate's
/// own [`Orientation`] — two crates each carry their own small stand-in for
/// the other's type (see `thoth_planning::regions`'s module rustdoc), so a
/// plain `match` is the crate-boundary translation.
fn sheet_orientation(o: PluginOrientation) -> Orientation {
    match o {
        PluginOrientation::Landscape => Orientation::Landscape,
        PluginOrientation::Portrait => Orientation::Portrait,
    }
}

fn mk_sheet(
    discipline: DisciplineCode,
    r#type: SheetTypeDigit,
    sequence: u32,
    title: &str,
    plugin: &RegionPlugin,
) -> Sheet {
    let sheet_std = plugin.sheet_standards.as_ref();
    let size = sheet_std
        .map(|s| s.default_size.clone())
        .unwrap_or_else(|| "arch-d".to_string());
    let orientation = sheet_std
        .map(|s| sheet_orientation(s.orientation))
        .unwrap_or(Orientation::Landscape);
    Sheet {
        id: format!("sheet-{}-{}{:02}", discipline.as_letter(), r#type, sequence),
        number: SheetNumber {
            discipline,
            r#type,
            sequence,
        },
        title: title.to_string(),
        size,
        orientation,
        scale_id: "as-shown".to_string(),
        discipline,
        viewport_ids: vec![],
        revisions: vec![],
        notes: vec![],
        keynote_ids: vec![],
    }
}

/// The site's own drawing set, or a standard one derived from its contents.
/// See the module rustdoc for why `existing_drawing_set`/`has_land_lot`/
/// `has_building_model`/`year` are explicit parameters rather than `Site`
/// fields.
pub fn ensure_drawing_set(
    site: &Site,
    plugin: &RegionPlugin,
    existing_drawing_set: Option<&DrawingSet>,
    has_land_lot: bool,
    has_building_model: bool,
    year: &str,
) -> DrawingSet {
    if let Some(existing) = existing_drawing_set {
        return existing.clone();
    }

    let mut sheets = vec![mk_sheet(
        DisciplineCode::G,
        0,
        1,
        "Cover Sheet & Drawing Index",
        plugin,
    )];

    let has_survey_control = site.monuments.as_ref().is_some_and(|m| !m.is_empty())
        || site.plss.is_some()
        || has_land_lot;
    if has_survey_control {
        sheets.push(mk_sheet(
            DisciplineCode::V,
            1,
            1,
            "Boundary & Control Survey",
            plugin,
        ));
    }

    sheets.push(mk_sheet(
        DisciplineCode::C,
        1,
        1,
        "Overall Site Plan",
        plugin,
    ));
    let has_erosion_features = site.control_lines.as_ref().is_some_and(|v| !v.is_empty())
        || site.civil_symbols.as_ref().is_some_and(|v| !v.is_empty());
    if has_erosion_features {
        sheets.push(mk_sheet(
            DisciplineCode::C,
            1,
            2,
            "Erosion Control Plan",
            plugin,
        ));
    }
    sheets.push(mk_sheet(DisciplineCode::C, 5, 1, "Civil Details", plugin));

    if has_building_model {
        sheets.push(mk_sheet(DisciplineCode::A, 1, 1, "Floor Plan", plugin));
        sheets.push(mk_sheet(
            DisciplineCode::A,
            2,
            1,
            "Building Elevations",
            plugin,
        ));
        sheets.push(mk_sheet(
            DisciplineCode::A,
            3,
            1,
            "Building Sections",
            plugin,
        ));
        sheets.push(mk_sheet(DisciplineCode::A, 6, 1, "Schedules", plugin));
    }

    let location = plugin
        .county
        .as_ref()
        .map(|c| format!("{c} County"))
        .unwrap_or_else(|| plugin.name.clone());
    let project_number: String = site.id.chars().take(8).collect::<String>().to_uppercase();

    DrawingSet {
        id: format!("set-{}", site.id),
        name: format!("{} \u{2014} Construction Documents", site.name),
        sheets,
        title_block_defaults: TitleBlockDefaults {
            project_name: site.name.clone(),
            client: None,
            location: Some(location),
            drawn_by: Some("TB".to_string()),
            checked_by: Some("\u{2014}".to_string()),
            date: year.to_string(),
            project_number: Some(project_number),
            firm_lines: plugin.title_block.firm_lines.clone(),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_planning::regions::{
        Capabilities, RegionDefaults, SheetStandards, SurveyFramework, TitleBlockSpec,
    };
    use thoth_spatial::{Crs, SpatialContext, Unit};

    fn ctx() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: Unit::Feet,
            scale: 1.0,
        }
    }

    fn plain_site() -> Site {
        Site {
            id: "site-12345678-abcd".to_string(),
            name: "Knightsbridge".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements: vec![],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
            monuments: None,
            plss: None,
        }
    }

    fn plugin(sheet_standards: Option<SheetStandards>) -> RegionPlugin {
        RegionPlugin {
            id: "us-plss".to_string(),
            name: "United States (PLSS)".to_string(),
            country: "US".to_string(),
            state: None,
            county: None,
            survey_framework: SurveyFramework::Plss,
            defaults: RegionDefaults {
                units: Unit::Feet,
                area_unit: thoth_spatial::AreaUnit::Acres,
                crs: Crs::default(),
            },
            monuments: vec![],
            capabilities: None::<Capabilities>,
            curve_table_columns: vec![],
            certificates: vec![],
            title_block: TitleBlockSpec {
                firm_lines: vec!["Acme Surveying LLC".to_string()],
                fields: vec![],
            },
            standards: None,
            sheet_standards,
        }
    }

    #[test]
    fn returns_the_existing_set_verbatim_when_one_is_supplied() {
        let site = plain_site();
        let p = plugin(None);
        let existing = DrawingSet {
            id: "set-existing".to_string(),
            name: "Existing".to_string(),
            sheets: vec![],
            title_block_defaults: TitleBlockDefaults {
                project_name: "Existing".to_string(),
                client: None,
                location: None,
                drawn_by: None,
                checked_by: None,
                date: "2020".to_string(),
                project_number: None,
                firm_lines: vec![],
            },
        };
        let set = ensure_drawing_set(&site, &p, Some(&existing), false, false, "2026");
        assert_eq!(set.id, "set-existing");
    }

    #[test]
    fn builds_the_minimal_set_with_no_survey_or_building_model() {
        let site = plain_site();
        let p = plugin(None);
        let set = ensure_drawing_set(&site, &p, None, false, false, "2026");
        let numbers: Vec<String> = set
            .sheets
            .iter()
            .map(|s| crate::sheet::format_sheet_number(s.number))
            .collect();
        assert_eq!(numbers, vec!["G-001", "C-101", "C-501"]);
        assert_eq!(set.title_block_defaults.date, "2026");
        assert_eq!(
            set.title_block_defaults.firm_lines,
            vec!["Acme Surveying LLC".to_string()]
        );
    }

    #[test]
    fn adds_a_survey_sheet_when_a_georgia_land_lot_frame_is_present() {
        let site = plain_site();
        let p = plugin(None);
        let set = ensure_drawing_set(&site, &p, None, true, false, "2026");
        let numbers: Vec<String> = set
            .sheets
            .iter()
            .map(|s| crate::sheet::format_sheet_number(s.number))
            .collect();
        assert!(numbers.contains(&"V-101".to_string()));
    }

    #[test]
    fn adds_a_survey_sheet_when_the_site_carries_plss_framework() {
        let mut site = plain_site();
        site.plss = Some(thoth_planning::elements::PlssFrame {
            township_range: thoth_survey::plss::TownshipRange::try_new(
                1,
                thoth_survey::plss::TownshipDirection::North,
                1,
                thoth_survey::plss::RangeDirection::East,
                None,
            )
            .unwrap(),
            section: 12,
            section_nw_corner: None,
            section_side: None,
        });
        let p = plugin(None);
        let set = ensure_drawing_set(&site, &p, None, false, false, "2026");
        let numbers: Vec<String> = set
            .sheets
            .iter()
            .map(|s| crate::sheet::format_sheet_number(s.number))
            .collect();
        assert!(numbers.contains(&"V-101".to_string()));
    }

    #[test]
    fn adds_a_survey_sheet_when_the_site_carries_monuments() {
        let mut site = plain_site();
        site.monuments = Some(vec![thoth_survey::monument::SurveyMonument {
            id: "m1".to_string(),
            kind: thoth_survey::monument::MonumentType::IronRod,
            status: thoth_survey::monument::MonumentStatus::Set,
            position: thoth_spatial::Point::new(0.0, 0.0),
            label: None,
            note: None,
        }]);
        let p = plugin(None);
        let set = ensure_drawing_set(&site, &p, None, false, false, "2026");
        let numbers: Vec<String> = set
            .sheets
            .iter()
            .map(|s| crate::sheet::format_sheet_number(s.number))
            .collect();
        assert!(numbers.contains(&"V-101".to_string()));
    }

    #[test]
    fn adds_an_erosion_sheet_when_the_site_carries_control_lines() {
        let mut site = plain_site();
        site.control_lines = Some(vec![thoth_planning::civil_stub::ControlLine {
            id: "cl1".to_string(),
            control_type: "silt-fence".to_string(),
            label: None,
            properties: Default::default(),
        }]);
        let p = plugin(None);
        let set = ensure_drawing_set(&site, &p, None, false, false, "2026");
        let numbers: Vec<String> = set
            .sheets
            .iter()
            .map(|s| crate::sheet::format_sheet_number(s.number))
            .collect();
        assert!(numbers.contains(&"C-102".to_string()));
    }

    #[test]
    fn adds_four_architectural_sheets_when_a_building_model_is_present() {
        let site = plain_site();
        let p = plugin(None);
        let set = ensure_drawing_set(&site, &p, None, false, true, "2026");
        let numbers: Vec<String> = set
            .sheets
            .iter()
            .map(|s| crate::sheet::format_sheet_number(s.number))
            .collect();
        for expected in ["A-101", "A-201", "A-301", "A-601"] {
            assert!(
                numbers.contains(&expected.to_string()),
                "missing {expected}"
            );
        }
    }

    #[test]
    fn location_falls_back_to_the_plugin_name_without_a_county() {
        let site = plain_site();
        let mut p = plugin(None);
        p.county = None;
        let set = ensure_drawing_set(&site, &p, None, false, false, "2026");
        assert_eq!(
            set.title_block_defaults.location.as_deref(),
            Some("United States (PLSS)")
        );
    }

    #[test]
    fn location_uses_the_county_when_present() {
        let site = plain_site();
        let mut p = plugin(None);
        p.county = Some("Newton".to_string());
        let set = ensure_drawing_set(&site, &p, None, false, false, "2026");
        assert_eq!(
            set.title_block_defaults.location.as_deref(),
            Some("Newton County")
        );
    }

    #[test]
    fn project_number_is_the_uppercased_first_eight_id_characters() {
        let site = plain_site();
        let p = plugin(None);
        let set = ensure_drawing_set(&site, &p, None, false, false, "2026");
        assert_eq!(
            set.title_block_defaults.project_number.as_deref(),
            Some("SITE-123")
        );
    }

    #[test]
    fn sheet_size_and_orientation_fall_back_without_sheet_standards() {
        let site = plain_site();
        let p = plugin(None);
        let set = ensure_drawing_set(&site, &p, None, false, false, "2026");
        assert_eq!(set.sheets[0].size, "arch-d");
        assert_eq!(set.sheets[0].orientation, Orientation::Landscape);
    }

    #[test]
    fn sheet_size_and_orientation_honor_plugin_sheet_standards() {
        let site = plain_site();
        let p = plugin(Some(SheetStandards {
            default_size: "arch-c".to_string(),
            orientation: PluginOrientation::Portrait,
            scale_set: vec!["as-shown".to_string()],
            layer_standard: thoth_planning::regions::LayerStandard::Ncs,
            dim_style_id: "arch-tick".to_string(),
            unit: thoth_planning::regions::DrawingUnit::In,
        }));
        let set = ensure_drawing_set(&site, &p, None, false, false, "2026");
        assert_eq!(set.sheets[0].size, "arch-c");
        assert_eq!(set.sheets[0].orientation, Orientation::Portrait);
    }

    #[test]
    fn sheet_ids_are_deterministic() {
        let site = plain_site();
        let p = plugin(None);
        let set = ensure_drawing_set(&site, &p, None, false, false, "2026");
        assert_eq!(set.sheets[0].id, "sheet-G-001");
    }
}
