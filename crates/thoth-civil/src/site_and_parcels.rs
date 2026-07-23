//! Site containers and boundary parcels — REQ-023 through REQ-035,
//! REQ-123 through REQ-129.
//!
//! Port of `packages/domain/src/civil/siteAndParcels.ts` +
//! `packages/domain/src/civil/types/siteAndParcels.ts`. The TS source imports
//! `Point2D`/`LineSegment` from `packages/domain/src/survey/transparentCommands`;
//! here those are `thoth_spatial::Point` and `crate::common::LineSegment`
//! (see that module's doc comment for why this crate defines its own
//! `LineSegment` rather than depending on `thoth-survey`'s).
//!
//! **Adapted from a registry-keyed "manager" to direct references.** The TS
//! `SiteManager` class holds a private `Map<string, SiteContainer>` and every
//! method takes a `siteId` string, looks it up, and throws if missing. This
//! crate follows the rest of `thoth-civil` (no stateful "engine" classes
//! anywhere else in this crate) and instead takes `&mut SiteContainer`
//! directly: the type system guarantees the site exists, so the
//! "site not found" error class present in every TS method simply cannot
//! occur here. A parcel *id* can still fail to resolve within a given site
//! (a real lookup, not an ownership guarantee), so
//! [`CivilError::UnknownParcel`] is kept for that case.

use thoth_spatial::Point;

use crate::common::LineSegment;
use crate::error::{CivilError, CivilResult};

/// Default starting parcel number for a newly created site (mirrors the TS
/// `startingParcelNumber: number = 101` default parameter).
pub const DEFAULT_STARTING_PARCEL_NUMBER: i64 = 101;

/// Amount (square feet) added to the last parcel of a slide-line
/// subdivision when using [`RemainderDistribution::LastParcel`] (REQ-033).
pub const REMAINDER_EXPANSION_SQ_FT: f64 = 500.0;

/// Visual/drafting style applied to a parcel's boundary linework.
#[derive(Debug, Clone, PartialEq)]
pub struct ParcelStyle {
    pub id: String,
    pub name: String,
    pub boundary_color: String,
    pub linetype: String,
    pub layer: String,
}

/// A per-vertex arc annotation on a parcel boundary.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ParcelArc {
    pub vertex_index: usize,
    pub radius: f64,
    pub delta_angle_deg: f64,
}

/// How a slide-line subdivision's minimum-area remainder is handled
/// (REQ-033).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RemainderDistribution {
    LastParcel,
    RedistributeAll,
}

/// A slide-line/frontage subdivision's lot sizing rules (REQ-031, REQ-032,
/// REQ-033).
#[derive(Debug, Clone, PartialEq)]
pub struct ParcelLayoutParameters {
    pub minimum_area_sq_ft: f64,
    pub minimum_frontage_ft: f64,
    pub frontage_offset_ft: f64,
    pub minimum_width_ft: f64,
    pub minimum_depth_ft: f64,
    pub maximum_depth_ft: Option<f64>,
    pub remainder_distribution: RemainderDistribution,
}

/// One custom classification value (REQ-128); mirrors the TS
/// `string | number` union.
#[derive(Debug, Clone, PartialEq)]
pub enum CustomPropertyValue {
    Text(String),
    Number(f64),
}

/// User-defined classification data attached to a parcel via the Parcel
/// Properties dialog (REQ-128).
///
/// Merge semantics (used by [`edit_parcel_user_defined_classification`]):
/// a `Some(_)` field in the incoming update overwrites the existing value;
/// a `None` field leaves the existing value untouched. This is the natural
/// Rust reading of the TS object-spread merge (`{...existing, ...update}`)
/// for a type whose fields are all optional.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct UserDefinedClassificationData {
    pub zoning_district: Option<String>,
    pub max_impervious_ratio: Option<f64>,
    pub owner_name: Option<String>,
    pub land_use_code: Option<String>,
    pub custom_properties: Option<Vec<(String, CustomPropertyValue)>>,
}

/// A boundary parcel (lot).
#[derive(Debug, Clone, PartialEq)]
pub struct ParcelObject {
    pub id: String,
    pub name: String,
    pub number: i64,
    pub site_id: String,
    pub boundary_vertices: Vec<Point>,
    pub arcs: Option<Vec<ParcelArc>>,
    pub style: ParcelStyle,
    pub area_sq_ft: f64,
    pub perimeter_ft: f64,
    pub elevation_ft: Option<f64>,
    pub address: Option<String>,
    pub tax_id: Option<String>,
    pub user_classification: Option<UserDefinedClassificationData>,
}

/// A lightweight named reference into another civil object collection
/// (alignments, grading objects, feature lines) that a [`SiteContainer`]
/// tracks membership of, without owning the full object.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NamedRef {
    pub id: String,
    pub name: String,
}

/// A planning site: a named collection of parcels plus the ids of the
/// alignments, grading objects, and feature lines associated with it.
#[derive(Debug, Clone, PartialEq)]
pub struct SiteContainer {
    pub id: String,
    pub name: String,
    pub starting_parcel_number: i64,
    pub parcels: Vec<ParcelObject>,
    pub alignments: Vec<NamedRef>,
    pub grading_objects: Vec<NamedRef>,
    pub feature_lines: Vec<NamedRef>,
}

/// Move vs. copy a parcel between sites (REQ-126, REQ-127).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ParcelTransferOperation {
    Move,
    Copy,
}

/// The four table-tag families a parcel table/segment can be numbered
/// under (REQ-129).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TableTagType {
    Line,
    Curve,
    Segment,
    Area,
}

/// Result of [`configure_table_tag_numbering`].
#[derive(Debug, Clone, PartialEq)]
pub struct TableTagNumbering {
    pub tag_type: TableTagType,
    pub seed_number: i64,
    pub prefix: String,
}

/// Area and perimeter of a boundary ring.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PolygonGeometry {
    pub area: f64,
    pub perimeter: f64,
}

/// Exact area (Shoelace formula) and perimeter of a boundary ring.
///
/// A direct, dependency-free reimplementation (not a call into
/// [`crate::common::calculate_polygon_area`]) mirroring the TS module
/// boundary exactly: `calculatePolygonGeometry` is this file's own export,
/// computing both quantities in one pass.
pub fn calculate_polygon_geometry(vertices: &[Point]) -> PolygonGeometry {
    if vertices.len() < 3 {
        return PolygonGeometry {
            area: 0.0,
            perimeter: 0.0,
        };
    }

    let n = vertices.len();
    let mut area = 0.0;
    let mut perimeter = 0.0;

    for i in 0..n {
        let curr = vertices[i];
        let next = vertices[(i + 1) % n];
        area += curr.x * next.y - next.x * curr.y;
        perimeter += thoth_spatial::distance(curr, next);
    }

    PolygonGeometry {
        area: (area / 2.0).abs(),
        perimeter,
    }
}

/// Create a new, empty site (REQ-023 through REQ-026).
pub fn create_site(name: impl Into<String>, starting_parcel_number: i64) -> SiteContainer {
    SiteContainer {
        id: thoth_spatial::create_id("site"),
        name: name.into(),
        starting_parcel_number,
        parcels: Vec::new(),
        alignments: Vec::new(),
        grading_objects: Vec::new(),
        feature_lines: Vec::new(),
    }
}

fn find_parcel_index(site: &SiteContainer, parcel_id: &str) -> CivilResult<usize> {
    site.parcels
        .iter()
        .position(|p| p.id == parcel_id)
        .ok_or_else(|| CivilError::UnknownParcel {
            parcel_id: parcel_id.to_string(),
        })
}

/// REQ-027, REQ-028, REQ-029: generate a boundary parcel from drafted
/// geometry. Returns the new parcel and echoes back `erase_source_entities`
/// (a passthrough flag for the caller's own CAD-cleanup step; this function
/// performs no erasure itself, matching the TS source).
pub fn generate_parcel_from_geometry(
    site: &mut SiteContainer,
    vertices: Vec<Point>,
    style: ParcelStyle,
    erase_source_entities: bool,
    arcs: Option<Vec<ParcelArc>>,
) -> (ParcelObject, bool) {
    let parcel_number = site.starting_parcel_number + site.parcels.len() as i64;
    let geom = calculate_polygon_geometry(&vertices);

    let parcel = ParcelObject {
        id: format!("parcel-{}-{parcel_number}", site.id),
        name: format!("Lot {parcel_number}"),
        number: parcel_number,
        site_id: site.id.clone(),
        boundary_vertices: vertices,
        arcs,
        style,
        area_sq_ft: geom.area,
        perimeter_ft: geom.perimeter,
        elevation_ft: None,
        address: None,
        tax_id: None,
        user_classification: None,
    };

    site.parcels.push(parcel.clone());
    (parcel, erase_source_entities)
}

/// Build a child parcel that inherits every field from `parent` except the
/// ones a subdivision operation overrides, without cloning fields (like
/// `boundary_vertices`) that are about to be replaced anyway.
fn child_parcel_from_parent(
    parent: &ParcelObject,
    id: String,
    name: String,
    number: i64,
    boundary_vertices: Vec<Point>,
    area_sq_ft: f64,
    perimeter_ft: f64,
) -> ParcelObject {
    ParcelObject {
        id,
        name,
        number,
        site_id: parent.site_id.clone(),
        boundary_vertices,
        arcs: parent.arcs.clone(),
        style: parent.style.clone(),
        area_sq_ft,
        perimeter_ft,
        elevation_ft: parent.elevation_ft,
        address: parent.address.clone(),
        tax_id: parent.tax_id.clone(),
        user_classification: parent.user_classification.clone(),
    }
}

/// REQ-030: manual parcel subdivision using a two-point split line.
pub fn subdivide_parcel_manual(
    site: &mut SiteContainer,
    parcel_id: &str,
    split_line: LineSegment,
) -> CivilResult<(ParcelObject, ParcelObject)> {
    let parcel_index = find_parcel_index(site, parcel_id)?;
    let parent = &site.parcels[parcel_index];
    if parent.boundary_vertices.len() < 2 {
        return Err(CivilError::DegeneratePolygon {
            count: parent.boundary_vertices.len(),
        });
    }

    let half1 = vec![
        parent.boundary_vertices[0],
        split_line.start,
        split_line.end,
        parent.boundary_vertices[1],
    ];
    let half2 = vec![
        split_line.start,
        parent
            .boundary_vertices
            .get(2)
            .copied()
            .unwrap_or(parent.boundary_vertices[0]),
        parent
            .boundary_vertices
            .get(3)
            .copied()
            .unwrap_or(parent.boundary_vertices[1]),
        split_line.end,
    ];

    let geom1 = calculate_polygon_geometry(&half1);
    let geom2 = calculate_polygon_geometry(&half2);

    // Matches the TS timing exactly: both child numbers are derived from
    // the site's parcel count *before* the parent is removed.
    let child1_num = site.starting_parcel_number + site.parcels.len() as i64;
    let child2_num = child1_num + 1;

    let parent = &site.parcels[parcel_index];
    let child1 = child_parcel_from_parent(
        parent,
        format!("parcel-{}-{child1_num}", site.id),
        format!("Lot {child1_num}"),
        child1_num,
        half1,
        geom1.area,
        geom1.perimeter,
    );
    let child2 = child_parcel_from_parent(
        parent,
        format!("parcel-{}-{child2_num}", site.id),
        format!("Lot {child2_num}"),
        child2_num,
        half2,
        geom2.area,
        geom2.perimeter,
    );

    site.parcels.remove(parcel_index);
    site.parcels.insert(parcel_index, child2.clone());
    site.parcels.insert(parcel_index, child1.clone());

    Ok((child1, child2))
}

/// REQ-031, REQ-032, REQ-033: automated lot layout via slide-line creation
/// along a frontage line.
pub fn execute_slide_line_subdivision(
    site: &mut SiteContainer,
    parcel_id: &str,
    frontage_line: LineSegment,
    params: &ParcelLayoutParameters,
) -> CivilResult<Vec<ParcelObject>> {
    if params.minimum_frontage_ft <= 0.0 {
        return Err(CivilError::NonPositiveInterval {
            value: params.minimum_frontage_ft,
        });
    }

    let parcel_index = find_parcel_index(site, parcel_id)?;
    let parent = site.parcels[parcel_index].clone();

    let frontage_len = frontage_line.length();
    let lot_count = ((frontage_len / params.minimum_frontage_ft).floor() as i64).max(1);

    let dx = frontage_line.end.x - frontage_line.start.x;
    let dy = frontage_line.end.y - frontage_line.start.y;
    let step_dx = dx / lot_count as f64;
    let step_dy = dy / lot_count as f64;

    let base_count = site.parcels.len() as i64;
    let mut new_lots = Vec::with_capacity(lot_count as usize);

    for i in 0..lot_count {
        let p1 = Point::new(
            frontage_line.start.x + step_dx * i as f64,
            frontage_line.start.y + step_dy * i as f64,
        );
        let p2 = Point::new(
            frontage_line.start.x + step_dx * (i + 1) as f64,
            frontage_line.start.y + step_dy * (i + 1) as f64,
        );
        let p3 = Point::new(p2.x + step_dy * 2.0, p2.y - step_dx * 2.0);
        let p4 = Point::new(p1.x + step_dy * 2.0, p1.y - step_dx * 2.0);

        let lot_verts = vec![p1, p2, p3, p4];
        let geom = calculate_polygon_geometry(&lot_verts);
        let area = geom.area.max(params.minimum_area_sq_ft);

        let num = site.starting_parcel_number + base_count + i;
        new_lots.push(child_parcel_from_parent(
            &parent,
            format!("parcel-{}-{num}", site.id),
            format!("Lot {num}"),
            num,
            lot_verts,
            area,
            geom.perimeter,
        ));
    }

    if params.remainder_distribution == RemainderDistribution::LastParcel {
        if let Some(last) = new_lots.last_mut() {
            last.area_sq_ft += REMAINDER_EXPANSION_SQ_FT;
        }
    }

    site.parcels.retain(|p| p.id != parcel_id);
    site.parcels.extend(new_lots.iter().cloned());
    Ok(new_lots)
}

/// REQ-034, REQ-123, REQ-124: batch renumber & rename every parcel in a
/// site. `_fence_line` is accepted but unused, matching the TS source's own
/// unused `_fenceLine` parameter (reserved for a future fence-relative
/// numbering direction).
pub fn renumber_parcels_along_fence<'a>(
    site: &'a mut SiteContainer,
    _fence_line: LineSegment,
    start_number: i64,
    increment: i64,
    name_template: &str,
) -> &'a [ParcelObject] {
    let mut current = start_number;
    for parcel in &mut site.parcels {
        parcel.number = current;
        parcel.name = name_template
            .replace("[COUNTER]", &current.to_string())
            .replace("[SITE]", &site.name);
        current += increment;
    }
    &site.parcels
}

/// REQ-125: edit parcel elevations globally through Multiple Parcel
/// Properties.
pub fn edit_parcel_elevations_globally(
    site: &mut SiteContainer,
    parcel_ids: &[String],
    new_elevation_ft: f64,
) -> Vec<ParcelObject> {
    let mut modified = Vec::new();
    for parcel in &mut site.parcels {
        if parcel_ids.iter().any(|id| id == &parcel.id) {
            parcel.elevation_ft = Some(new_elevation_ft);
            modified.push(parcel.clone());
        }
    }
    modified
}

/// REQ-126, REQ-127: move or copy a parcel between two distinct sites.
pub fn move_or_copy_parcel_between_sites(
    from_site: &mut SiteContainer,
    to_site: &mut SiteContainer,
    parcel_id: &str,
    operation: ParcelTransferOperation,
) -> CivilResult<ParcelObject> {
    let index = find_parcel_index(from_site, parcel_id)?;

    match operation {
        ParcelTransferOperation::Move => {
            let mut moved = from_site.parcels.remove(index);
            moved.site_id = to_site.id.clone();
            to_site.parcels.push(moved.clone());
            Ok(moved)
        }
        ParcelTransferOperation::Copy => {
            let mut copied = from_site.parcels[index].clone();
            copied.site_id = to_site.id.clone();
            copied.id = format!("parcel-{}-{}", to_site.id, thoth_spatial::create_id("copy"));
            to_site.parcels.push(copied.clone());
            Ok(copied)
        }
    }
}

/// REQ-128: edit a parcel's user-defined classification data. See
/// [`UserDefinedClassificationData`] for the field-level merge semantics.
pub fn edit_parcel_user_defined_classification(
    site: &mut SiteContainer,
    parcel_id: &str,
    update: &UserDefinedClassificationData,
) -> CivilResult<ParcelObject> {
    let index = find_parcel_index(site, parcel_id)?;
    let parcel = &mut site.parcels[index];

    let merged = match &parcel.user_classification {
        None => update.clone(),
        Some(existing) => UserDefinedClassificationData {
            zoning_district: update
                .zoning_district
                .clone()
                .or_else(|| existing.zoning_district.clone()),
            max_impervious_ratio: update
                .max_impervious_ratio
                .or(existing.max_impervious_ratio),
            owner_name: update
                .owner_name
                .clone()
                .or_else(|| existing.owner_name.clone()),
            land_use_code: update
                .land_use_code
                .clone()
                .or_else(|| existing.land_use_code.clone()),
            custom_properties: update
                .custom_properties
                .clone()
                .or_else(|| existing.custom_properties.clone()),
        },
    };

    parcel.user_classification = Some(merged);
    Ok(parcel.clone())
}

/// REQ-129: configure table tag numbering (seed number + prefix) for a
/// table-tag family. An empty or omitted `prefix` falls back to the family's
/// conventional letter (`L`/`C`/`S`/`A`), matching the TS `prefix || ...`
/// fallback (which also treats an empty string as "not provided").
pub fn configure_table_tag_numbering(
    tag_type: TableTagType,
    seed_number: i64,
    prefix: Option<&str>,
) -> TableTagNumbering {
    let default_prefix = match tag_type {
        TableTagType::Line => "L",
        TableTagType::Curve => "C",
        TableTagType::Segment => "S",
        TableTagType::Area => "A",
    };
    let prefix = match prefix {
        Some(p) if !p.is_empty() => p.to_string(),
        _ => default_prefix.to_string(),
    };

    TableTagNumbering {
        tag_type,
        seed_number,
        prefix,
    }
}

/// REQ-035: recompute a parcel's boundary geometry, area, and perimeter
/// after a connected boundary edit.
pub fn update_parcel_boundary(
    site: &mut SiteContainer,
    parcel_id: &str,
    new_vertices: Vec<Point>,
) -> CivilResult<ParcelObject> {
    let index = find_parcel_index(site, parcel_id)?;
    let geom = calculate_polygon_geometry(&new_vertices);
    let parcel = &mut site.parcels[index];
    parcel.boundary_vertices = new_vertices;
    parcel.area_sq_ft = geom.area;
    parcel.perimeter_ft = geom.perimeter;
    Ok(parcel.clone())
}

// Note: the TS module also re-exports `calculatePolygonCentroid` from
// `common/geometryHelpers`; callers of this crate reach the same function
// directly as `crate::common::calculate_polygon_centroid`, so no parallel
// re-export is added here.

#[cfg(test)]
mod tests {
    use super::*;

    fn square_style() -> ParcelStyle {
        ParcelStyle {
            id: "style-1".to_string(),
            name: "Default".to_string(),
            boundary_color: "#FFFFFF".to_string(),
            linetype: "CONTINUOUS".to_string(),
            layer: "C-PROP".to_string(),
        }
    }

    fn square(side: f64) -> Vec<Point> {
        vec![
            Point::new(0.0, 0.0),
            Point::new(side, 0.0),
            Point::new(side, side),
            Point::new(0.0, side),
        ]
    }

    #[test]
    fn calculate_polygon_geometry_of_unit_square() {
        let geom = calculate_polygon_geometry(&square(10.0));
        assert_eq!(geom.area, 100.0);
        assert_eq!(geom.perimeter, 40.0);
    }

    #[test]
    fn calculate_polygon_geometry_degenerate_returns_zero() {
        let geom = calculate_polygon_geometry(&[Point::ZERO, Point::new(1.0, 0.0)]);
        assert_eq!(geom.area, 0.0);
        assert_eq!(geom.perimeter, 0.0);
    }

    #[test]
    fn generate_parcel_from_geometry_numbers_and_registers() {
        let mut site = create_site("Meadowbrook", DEFAULT_STARTING_PARCEL_NUMBER);
        let (parcel, erased) =
            generate_parcel_from_geometry(&mut site, square(100.0), square_style(), true, None);

        assert_eq!(parcel.number, 101);
        assert_eq!(parcel.name, "Lot 101");
        assert_eq!(parcel.area_sq_ft, 10_000.0);
        assert!(erased);
        assert_eq!(site.parcels.len(), 1);
    }

    #[test]
    fn subdivide_parcel_manual_splits_into_two_children() {
        let mut site = create_site("Site", DEFAULT_STARTING_PARCEL_NUMBER);
        generate_parcel_from_geometry(&mut site, square(200.0), square_style(), false, None);
        let parcel_id = site.parcels[0].id.clone();

        let split = LineSegment::new(Point::new(100.0, 0.0), Point::new(100.0, 200.0));
        let (child1, child2) = subdivide_parcel_manual(&mut site, &parcel_id, split).unwrap();

        assert_eq!(site.parcels.len(), 2);
        assert_eq!(child1.number, 102);
        assert_eq!(child2.number, 103);
        assert_eq!(child1.style, square_style());
    }

    #[test]
    fn subdivide_parcel_manual_unknown_parcel_errors() {
        let mut site = create_site("Site", DEFAULT_STARTING_PARCEL_NUMBER);
        let split = LineSegment::new(Point::ZERO, Point::new(1.0, 1.0));
        let err = subdivide_parcel_manual(&mut site, "missing", split).unwrap_err();
        assert_eq!(
            err,
            CivilError::UnknownParcel {
                parcel_id: "missing".to_string()
            }
        );
    }

    #[test]
    fn execute_slide_line_subdivision_creates_expected_lot_count() {
        let mut site = create_site("Subdivision", DEFAULT_STARTING_PARCEL_NUMBER);
        generate_parcel_from_geometry(&mut site, square(1000.0), square_style(), false, None);
        let parcel_id = site.parcels[0].id.clone();

        let params = ParcelLayoutParameters {
            minimum_area_sq_ft: 5_000.0,
            minimum_frontage_ft: 100.0,
            frontage_offset_ft: 0.0,
            minimum_width_ft: 80.0,
            minimum_depth_ft: 120.0,
            maximum_depth_ft: None,
            remainder_distribution: RemainderDistribution::LastParcel,
        };
        let frontage = LineSegment::new(Point::new(0.0, 0.0), Point::new(1000.0, 0.0));

        let lots =
            execute_slide_line_subdivision(&mut site, &parcel_id, frontage, &params).unwrap();

        assert_eq!(lots.len(), 10);
        // Remainder distribution expands the last lot's reported area.
        assert!(lots.last().unwrap().area_sq_ft >= REMAINDER_EXPANSION_SQ_FT);
        assert!(!site.parcels.iter().any(|p| p.id == parcel_id));
    }

    #[test]
    fn execute_slide_line_subdivision_rejects_non_positive_frontage() {
        let mut site = create_site("Subdivision", DEFAULT_STARTING_PARCEL_NUMBER);
        generate_parcel_from_geometry(&mut site, square(1000.0), square_style(), false, None);
        let parcel_id = site.parcels[0].id.clone();
        let params = ParcelLayoutParameters {
            minimum_area_sq_ft: 5_000.0,
            minimum_frontage_ft: 0.0,
            frontage_offset_ft: 0.0,
            minimum_width_ft: 80.0,
            minimum_depth_ft: 120.0,
            maximum_depth_ft: None,
            remainder_distribution: RemainderDistribution::RedistributeAll,
        };
        let frontage = LineSegment::new(Point::new(0.0, 0.0), Point::new(1000.0, 0.0));
        let err =
            execute_slide_line_subdivision(&mut site, &parcel_id, frontage, &params).unwrap_err();
        assert_eq!(err, CivilError::NonPositiveInterval { value: 0.0 });
    }

    #[test]
    fn renumber_parcels_along_fence_applies_increment_and_template() {
        let mut site = create_site("Riverbend", DEFAULT_STARTING_PARCEL_NUMBER);
        generate_parcel_from_geometry(&mut site, square(50.0), square_style(), false, None);
        generate_parcel_from_geometry(&mut site, square(60.0), square_style(), false, None);

        let fence = LineSegment::new(Point::ZERO, Point::new(10.0, 10.0));
        let renumbered =
            renumber_parcels_along_fence(&mut site, fence, 200, 5, "Riverbend Lot [COUNTER]");

        assert_eq!(renumbered[0].number, 200);
        assert_eq!(renumbered[1].number, 205);
        assert_eq!(renumbered[0].name, "Riverbend Lot 200");
    }

    #[test]
    fn edit_parcel_elevations_globally_updates_selected_parcels_only() {
        let mut site = create_site("Site", DEFAULT_STARTING_PARCEL_NUMBER);
        generate_parcel_from_geometry(&mut site, square(50.0), square_style(), false, None);
        generate_parcel_from_geometry(&mut site, square(50.0), square_style(), false, None);
        let target_id = site.parcels[0].id.clone();

        let modified =
            edit_parcel_elevations_globally(&mut site, std::slice::from_ref(&target_id), 512.5);

        assert_eq!(modified.len(), 1);
        assert_eq!(modified[0].elevation_ft, Some(512.5));
        assert_eq!(site.parcels[1].elevation_ft, None);
    }

    #[test]
    fn move_or_copy_parcel_between_sites_move_removes_from_source() {
        let mut from = create_site("From", DEFAULT_STARTING_PARCEL_NUMBER);
        let mut to = create_site("To", DEFAULT_STARTING_PARCEL_NUMBER);
        generate_parcel_from_geometry(&mut from, square(50.0), square_style(), false, None);
        let parcel_id = from.parcels[0].id.clone();

        let moved = move_or_copy_parcel_between_sites(
            &mut from,
            &mut to,
            &parcel_id,
            ParcelTransferOperation::Move,
        )
        .unwrap();

        assert!(from.parcels.is_empty());
        assert_eq!(to.parcels.len(), 1);
        assert_eq!(moved.site_id, to.id);
    }

    #[test]
    fn move_or_copy_parcel_between_sites_copy_keeps_source() {
        let mut from = create_site("From", DEFAULT_STARTING_PARCEL_NUMBER);
        let mut to = create_site("To", DEFAULT_STARTING_PARCEL_NUMBER);
        generate_parcel_from_geometry(&mut from, square(50.0), square_style(), false, None);
        let parcel_id = from.parcels[0].id.clone();

        let copied = move_or_copy_parcel_between_sites(
            &mut from,
            &mut to,
            &parcel_id,
            ParcelTransferOperation::Copy,
        )
        .unwrap();

        assert_eq!(from.parcels.len(), 1);
        assert_eq!(to.parcels.len(), 1);
        assert_ne!(copied.id, parcel_id);
    }

    #[test]
    fn edit_parcel_user_defined_classification_merges_fields() {
        let mut site = create_site("Site", DEFAULT_STARTING_PARCEL_NUMBER);
        generate_parcel_from_geometry(&mut site, square(50.0), square_style(), false, None);
        let parcel_id = site.parcels[0].id.clone();

        edit_parcel_user_defined_classification(
            &mut site,
            &parcel_id,
            &UserDefinedClassificationData {
                zoning_district: Some("R-4".to_string()),
                ..Default::default()
            },
        )
        .unwrap();

        let updated = edit_parcel_user_defined_classification(
            &mut site,
            &parcel_id,
            &UserDefinedClassificationData {
                owner_name: Some("J. Smith".to_string()),
                ..Default::default()
            },
        )
        .unwrap();

        let classification = updated.user_classification.unwrap();
        assert_eq!(classification.zoning_district, Some("R-4".to_string()));
        assert_eq!(classification.owner_name, Some("J. Smith".to_string()));
    }

    #[test]
    fn configure_table_tag_numbering_falls_back_to_family_letter() {
        let cfg = configure_table_tag_numbering(TableTagType::Curve, 1, None);
        assert_eq!(cfg.prefix, "C");
        let cfg = configure_table_tag_numbering(TableTagType::Curve, 1, Some(""));
        assert_eq!(cfg.prefix, "C");
        let cfg = configure_table_tag_numbering(TableTagType::Curve, 1, Some("CV"));
        assert_eq!(cfg.prefix, "CV");
    }

    #[test]
    fn update_parcel_boundary_recomputes_area_and_perimeter() {
        let mut site = create_site("Site", DEFAULT_STARTING_PARCEL_NUMBER);
        generate_parcel_from_geometry(&mut site, square(50.0), square_style(), false, None);
        let parcel_id = site.parcels[0].id.clone();

        let updated = update_parcel_boundary(&mut site, &parcel_id, square(100.0)).unwrap();

        assert_eq!(updated.area_sq_ft, 10_000.0);
        assert_eq!(updated.perimeter_ft, 400.0);
    }
}
