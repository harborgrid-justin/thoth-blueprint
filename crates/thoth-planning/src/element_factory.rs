//! Element construction with sensible per-kind domain defaults. Port of
//! `packages/domain/src/planning/elementFactory.ts`.
//!
//! Building a new spatial planning element from a freshly-drawn boundary
//! (or a point element from a click) should hand back a real, usable
//! planning object immediately — a zone gets a designation, a building a
//! storey count, a stair its IBC-scale defaults — not a bag of nulls a
//! caller has to fill in.
//!
//! **Catalog fallback**: the TS original first checks
//! `globalPartsDb.getZoningDistricts()[0]` for a jurisdiction/product
//! override of the zoning/building defaults below (designation, max
//! coverage/FAR/height, min setback, default storeys/height, ROW width)
//! before falling back to hardcoded constants. That catalog now lives in
//! `thoth-drawing::parts`, which this crate must not depend on (see
//! `GAP_CLOSE_STATUS.md`'s dependency-order note) — this port always uses
//! the hardcoded fallback, exactly matching a site with no zoning district
//! parts registered (the same convention already established in
//! `land_use.rs` for its own catalog fallback).

use thiserror::Error;
use thoth_spatial::{create_id, ElementKind, Point, Polygon};

use crate::element_meta::element_meta;
use crate::elements::{
    new_base, Building, Easement, EasementPurpose, GradeMethod, GradeRegion, LandUse, Lot,
    OpenSpace, Parcel, PlanElement, PlanNote, Region, RegionType, RightOfWay, Site,
    SpotElevationPoint, Tree, Zone,
};
use crate::land_use::LandUseCategory;

/// TS fallback defaults (see the module doc comment for the catalog this
/// crate can't reach to override them).
const DEFAULT_DESIGNATION: &str = "R-1";
const DEFAULT_MAX_COVERAGE: f64 = 0.5;
const DEFAULT_MAX_FAR: f64 = 1.0;
const DEFAULT_MAX_HEIGHT: f64 = 12.0;
const DEFAULT_MIN_SETBACK: f64 = 3.0;
const DEFAULT_STOREYS: f64 = 2.0;
const DEFAULT_BLDG_HEIGHT: f64 = 7.0;
const DEFAULT_ROW_WIDTH: f64 = 12.0;

/// Everything that can go wrong building an element from a `kind`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Error)]
pub enum ElementFactoryError {
    #[error("{0:?} is a point-anchored kind; use create_point_element instead of create_spatial_element")]
    NotASpatialKind(ElementKind),
    #[error("{0:?} is a boundary-anchored kind; use create_spatial_element instead of create_point_element")]
    NotAPointKind(ElementKind),
}

/// The number of existing elements of a kind, for auto-naming.
fn count_of_kind(site: &Site, kind: ElementKind) -> usize {
    site.elements.iter().filter(|e| e.kind() == kind).count()
}

/// The lowercase id-prefix slug for a kind (`"zone"`, `"curtainwall"`, …) —
/// the same string [`crate::elements::PlanElement`]'s `"kind"` JSON tag
/// serializes as, and what TS's `createId(kind)` uses as its prefix.
/// `pub(crate)` so [`crate::vertex::offset_element`] can reuse it for its
/// own re-id-on-clone/paste behavior.
pub(crate) fn kind_slug(kind: ElementKind) -> String {
    match serde_json::to_value(kind) {
        Ok(serde_json::Value::String(s)) => s,
        _ => unreachable!("ElementKind always serializes to a JSON string"),
    }
}

/// Build a new spatial planning element of `kind` from a drawn boundary.
/// Element kinds carry sensible domain defaults so a freshly drawn shape is
/// immediately a real planning object.
///
/// Returns [`ElementFactoryError::NotASpatialKind`] for `note`/`tree`/`spot`
/// — use [`create_point_element`] for those (the TS original expresses this
/// exclusion at the type level via `Exclude<ElementKind, "note" | "tree" |
/// "spot">`; Rust represents the same constraint as a runtime-checked
/// `Result` since `ElementKind` doesn't have a sub-enum for "every kind but
/// these three").
pub fn create_spatial_element(
    site: &Site,
    kind: ElementKind,
    boundary: Polygon,
    layer_id: impl Into<String>,
) -> Result<PlanElement, ElementFactoryError> {
    if matches!(
        kind,
        ElementKind::Note | ElementKind::Tree | ElementKind::Spot
    ) {
        return Err(ElementFactoryError::NotASpatialKind(kind));
    }

    let meta = element_meta(kind);
    let name = format!("{} {}", meta.name_prefix, count_of_kind(site, kind) + 1);
    let layer_id = layer_id.into();
    let id = create_id(&kind_slug(kind));
    let base = new_base(id, kind, name, layer_id, boundary);

    Ok(match kind {
        ElementKind::Zone => PlanElement::Zone(Zone {
            base,
            designation: DEFAULT_DESIGNATION.to_string(),
            allowed_uses: vec![LandUseCategory::Residential],
            max_coverage: Some(DEFAULT_MAX_COVERAGE),
            max_far: Some(DEFAULT_MAX_FAR),
            max_height: Some(DEFAULT_MAX_HEIGHT),
            min_setback: Some(DEFAULT_MIN_SETBACK),
        }),
        ElementKind::Landuse => PlanElement::LandUse(LandUse {
            base,
            category: LandUseCategory::Residential,
        }),
        ElementKind::Lot => PlanElement::Lot(Lot {
            base,
            parcel_id: None,
            block_id: None,
            setback: Some(DEFAULT_MIN_SETBACK),
        }),
        ElementKind::Building => PlanElement::Building(Building {
            base,
            lot_id: None,
            storeys: DEFAULT_STOREYS,
            height: Some(DEFAULT_BLDG_HEIGHT),
            dwelling_units: Some(1.0),
            use_: Some(LandUseCategory::Residential),
        }),
        ElementKind::Row => PlanElement::RightOfWay(RightOfWay {
            base,
            centerline: None,
            width: Some(DEFAULT_ROW_WIDTH),
        }),
        ElementKind::Openspace => PlanElement::OpenSpace(OpenSpace {
            base,
            dedicated: Some(false),
        }),
        ElementKind::Region => PlanElement::Region(Region {
            base,
            region_type: Some(RegionType::Estate),
        }),
        ElementKind::Water => PlanElement::WaterBody(crate::elements::WaterBody {
            base,
            water_type: Some(crate::elements::WaterType::Pond),
        }),
        ElementKind::Planting => PlanElement::PlantingArea(crate::elements::PlantingArea {
            base,
            planting_type: Some(crate::elements::PlantingType::Forest),
            canopy_cover: Some(0.8),
        }),
        ElementKind::Grade => PlanElement::GradeRegion(GradeRegion {
            base,
            target_elevation: 0.0,
            method: Some(GradeMethod::Flat),
        }),
        ElementKind::Parcel => PlanElement::Parcel(Parcel { base, apn: None }),
        ElementKind::Block => PlanElement::Block(crate::elements::Block {
            base,
            parcel_id: None,
        }),
        ElementKind::Easement => PlanElement::Easement(Easement {
            base,
            purpose: Some(EasementPurpose::Utility),
        }),
        ElementKind::Stair => PlanElement::Stair(crate::elements::Stair {
            base,
            stair_type: crate::elements::StairType::Straight,
            width: 1.0,
            height: 2.8,
            radius: None,
            total_rotation: None,
            u_shape_offset: None,
            flight_count: None,
            intermediate_landing_length: None,
            tread_depth_limit: 0.28,
            riser_height_limit: 0.18,
            landing_slab_thickness: Some(0.15),
            tread_slab_thickness: Some(0.12),
            stringer_profile: Some(crate::elements::StringerProfile::Open),
            stringer_width: Some(0.05),
            nosing_profile: Some(crate::elements::NosingProfile::Round),
            nosing_overhang: Some(0.02),
            slip_resistant_grooves: Some(false),
            overhead_clearance_limit: None,
            ceiling_elevation: None,
        }),
        ElementKind::Curtainwall => PlanElement::CurtainWall(crate::elements::CurtainWall {
            base,
            width: 6.0,
            height: 3.2,
            grid: crate::elements::CurtainWallGrid {
                vertical_divisions: crate::elements::DivisionMode::Uniform,
                vertical_offsets: vec![4.0],
                horizontal_divisions: crate::elements::DivisionMode::Uniform,
                horizontal_offsets: vec![2.0],
                mullion_widths: Default::default(),
                infill_materials: {
                    let mut m = std::collections::BTreeMap::new();
                    for row in 0..2 {
                        for col in 0..4 {
                            m.insert(
                                format!("{col},{row}"),
                                crate::elements::InfillMaterial::Glazing,
                            );
                        }
                    }
                    m
                },
            },
            nested_grids: Default::default(),
            corner_style: Some(crate::elements::CornerStyle::Rectangular),
            frame_profile_width: Some(0.1),
            expansion_gap: Some(0.01),
            pane_offset: Some(0.02),
            clip_spacing: Some(0.6),
            structural_tie_spacing: Some(1.2),
            frame_r_value: Some(2.5),
        }),
        ElementKind::Door => PlanElement::Door(crate::elements::DoorElement {
            base,
            width: 0.9,
            height: 2.1,
            depth: 0.15,
            door_operation: crate::elements::DoorOperation::Swing,
            swing_angle: Some(90.0),
            sill_thickness: Some(0.05),
            sill_overhang: Some(0.03),
            threshold_height: Some(0.01),
            weatherstripping: Some(true),
            hardware_trim: Some(crate::elements::HardwareTrim::Lever),
            fire_rating: Some(crate::elements::FireRating::None),
            stc_rating: Some(32.0),
            safety_glazing: Some(crate::elements::SafetyGlazing::None),
            frame_profile: Some(crate::elements::FrameProfile::Wood),
        }),
        ElementKind::Window => PlanElement::Window(crate::elements::WindowElement {
            base,
            width: 1.2,
            height: 1.2,
            depth: 0.15,
            window_type: crate::elements::WindowType::SingleHung,
            sill_thickness: Some(0.06),
            sill_overhang: Some(0.04),
            threshold_height: Some(0.0),
            weatherstripping: Some(true),
            fire_rating: Some(crate::elements::FireRating::None),
            stc_rating: Some(35.0),
            safety_glazing: Some(crate::elements::SafetyGlazing::Tempered),
            frame_profile: Some(crate::elements::FrameProfile::Vinyl),
        }),
        ElementKind::Roof => PlanElement::Roof(crate::elements::RoofElement {
            base,
            roof_type: crate::elements::RoofType::Gable,
            pitch: 6.0,
            overhang: Some(0.3),
            soffit_width: Some(0.3),
            thickness: Some(0.2),
            shingle_material: Some(crate::elements::ShingleMaterial::Asphalt),
            gutters: Some(true),
            soffit_vents: Some(true),
            dormers: vec![],
        }),
        ElementKind::Note | ElementKind::Tree | ElementKind::Spot => {
            unreachable!("excluded by the guard clause at the top of this function")
        }
    })
}

/// Build a point-anchored element (note, tree, or spot elevation).
///
/// Returns [`ElementFactoryError::NotAPointKind`] for any boundary-anchored
/// kind — use [`create_spatial_element`] for those.
pub fn create_point_element(
    site: &Site,
    kind: ElementKind,
    position: Point,
    layer_id: impl Into<String>,
) -> Result<PlanElement, ElementFactoryError> {
    let layer_id = layer_id.into();
    Ok(match kind {
        ElementKind::Tree => PlanElement::Tree(Tree {
            id: create_id("tree"),
            kind,
            layer_id,
            position,
            species: Some("Shade tree".to_string()),
            canopy_radius: 4.0,
            renovation_status: Default::default(),
        }),
        ElementKind::Spot => PlanElement::Spot(SpotElevationPoint {
            id: create_id("spot"),
            kind,
            layer_id,
            position,
            z: 0.0,
            label: Some(format!("SP{}", count_of_kind(site, ElementKind::Spot) + 1)),
            renovation_status: Default::default(),
        }),
        ElementKind::Note => PlanElement::Note(PlanNote {
            id: create_id("note"),
            kind,
            layer_id,
            text: format!("Note {}", count_of_kind(site, ElementKind::Note) + 1),
            position,
            renovation_status: Default::default(),
        }),
        other => return Err(ElementFactoryError::NotAPointKind(other)),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_spatial::{SpatialContext, Unit};

    fn ctx() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: Unit::Meters,
            scale: 1.0,
        }
    }

    fn empty_site() -> Site {
        Site {
            id: "s1".to_string(),
            name: "Site".to_string(),
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

    fn square(size: f64) -> Polygon {
        vec![
            Point::new(0.0, 0.0),
            Point::new(size, 0.0),
            Point::new(size, size),
            Point::new(0.0, size),
        ]
    }

    #[test]
    fn creates_a_zone_with_domain_defaults() {
        let site = empty_site();
        let el =
            create_spatial_element(&site, ElementKind::Zone, square(10.0), "layer-zoning").unwrap();
        match el {
            PlanElement::Zone(z) => {
                assert_eq!(z.designation, "R-1");
                assert_eq!(z.max_coverage, Some(0.5));
                assert_eq!(z.base.name, "Zone 1");
            }
            _ => panic!("expected a Zone"),
        }
    }

    #[test]
    fn auto_names_increment_with_existing_count() {
        let mut site = empty_site();
        let first = create_spatial_element(&site, ElementKind::Lot, square(5.0), "l").unwrap();
        site.elements.push(first);
        let second = create_spatial_element(&site, ElementKind::Lot, square(5.0), "l").unwrap();
        assert_eq!(second.base().unwrap().name, "Lot 2");
    }

    #[test]
    fn rejects_point_kinds_for_the_spatial_constructor() {
        let site = empty_site();
        let err = create_spatial_element(&site, ElementKind::Tree, square(5.0), "l").unwrap_err();
        assert_eq!(err, ElementFactoryError::NotASpatialKind(ElementKind::Tree));
    }

    #[test]
    fn rejects_spatial_kinds_for_the_point_constructor() {
        let site = empty_site();
        let err =
            create_point_element(&site, ElementKind::Lot, Point::new(0.0, 0.0), "l").unwrap_err();
        assert_eq!(err, ElementFactoryError::NotAPointKind(ElementKind::Lot));
    }

    #[test]
    fn creates_a_tree_point_element() {
        let site = empty_site();
        let el = create_point_element(&site, ElementKind::Tree, Point::new(1.0, 2.0), "l").unwrap();
        match el {
            PlanElement::Tree(t) => {
                assert_eq!(t.position, Point::new(1.0, 2.0));
                assert_eq!(t.canopy_radius, 4.0);
            }
            _ => panic!("expected a Tree"),
        }
    }

    #[test]
    fn every_spatial_kind_constructs_without_panicking() {
        let site = empty_site();
        for kind in [
            ElementKind::Region,
            ElementKind::Parcel,
            ElementKind::Block,
            ElementKind::Zone,
            ElementKind::Landuse,
            ElementKind::Lot,
            ElementKind::Building,
            ElementKind::Row,
            ElementKind::Easement,
            ElementKind::Openspace,
            ElementKind::Water,
            ElementKind::Planting,
            ElementKind::Grade,
            ElementKind::Stair,
            ElementKind::Curtainwall,
            ElementKind::Door,
            ElementKind::Window,
            ElementKind::Roof,
        ] {
            let el = create_spatial_element(&site, kind, square(10.0), "l").unwrap();
            assert_eq!(el.kind(), kind);
        }
    }
}
