//! Building-interior model — the primitives an architectural floor plan is
//! made of: **levels**, **walls** (with thickness and height), **doors** and
//! **windows** hosted on walls, and **rooms** with finishes. A
//! [`BuildingModel`] references a footprint `Building` element by id (see
//! [`crate::elements::Building`]) and adds the interior a plan/section/
//! elevation needs.
//!
//! Port of `packages/domain/src/planning/building.ts` and
//! `types/building.ts`. Per `GAP_CLOSE_STATUS.md` item 1 (and the original
//! `STATUS.md` note it follows through on): only the **pure-geometry**
//! helpers are ported here — `wall_direction`, `wall_length`, `wall_polygon`,
//! `opening_center`, `opening_jambs`, `door_swing`, `room_area`,
//! `level_contents`, `find_wall`. The **catalog-backed** helpers
//! (`WALL_TYPES`, `resolve_wall_type`, `create_wall_from_part`,
//! `create_door_from_part`, `create_window_from_part`,
//! `get_building_doors_from_catalog`, `get_building_windows_from_catalog`)
//! stay **not-yet-ported**: they read `globalPartsDb`
//! (`packages/domain/src/parts`), which now lives in `thoth-drawing::parts`.
//! `thoth-drawing` depends on `thoth-planning` this round (see
//! `GAP_CLOSE_STATUS.md`'s dependency-order note), so this crate cannot
//! depend back on it without a cycle — a genuine architectural constraint,
//! not a time-boxing choice.
//!
//! Framework-agnostic. Coordinates are plan-space; north is −Y as elsewhere
//! in this crate.

use serde::{Deserialize, Serialize};
use thoth_spatial::{
    add, distance, normalize, scale, subtract, AreaUnit, Point, Polygon, SpatialContext,
};

use crate::metrics::{area_to_square_meters, square_meters_to};

/// A building storey/level.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Level {
    pub id: String,
    pub name: String,
    /// Finished-floor elevation in plan units.
    pub elevation: f64,
    /// Floor-to-floor height in plan units.
    pub height: f64,
}

/// A wall type (assembly) — its nominal thickness and a material key.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WallType {
    pub id: String,
    pub label: String,
    pub thickness: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub material: Option<String>,
}

/// A wall segment on a level.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Wall {
    pub id: String,
    pub level_id: String,
    /// Wall centreline: two points (straight) or a polyline.
    pub baseline: Vec<Point>,
    /// Wall thickness in plan units.
    pub thickness: f64,
    /// Wall height in plan units.
    pub height: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub type_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub layer_id: Option<String>,
}

/// A door's swing hand, viewed in plan.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Swing {
    L,
    R,
}

/// How a door's leaf/leaves are configured.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Leaf {
    Single,
    Double,
    Sliding,
    Overhead,
}

/// A door hosted on a wall.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Door {
    pub id: String,
    pub wall_id: String,
    /// Distance from the wall's start along its baseline, plan units.
    pub offset: f64,
    pub width: f64,
    pub height: f64,
    pub mark: String,
    pub swing: Swing,
    pub leaf: Leaf,
}

/// A window hosted on a wall.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Window {
    pub id: String,
    pub wall_id: String,
    pub offset: f64,
    pub width: f64,
    pub height: f64,
    pub mark: String,
    /// Sill height above finished floor, plan units.
    pub sill: f64,
}

/// A room bounded by a polygon, with finishes.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Room {
    pub id: String,
    pub level_id: String,
    pub boundary: Polygon,
    pub name: String,
    pub number: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub floor_finish: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_finish: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wall_finish: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ceiling_finish: Option<String>,
    /// Ceiling height, plan units.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ceiling_height: Option<f64>,
}

/// The interior model for one footprint building.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BuildingModel {
    pub id: String,
    /// The footprint `Building` element this interior belongs to.
    pub building_id: String,
    pub levels: Vec<Level>,
    pub walls: Vec<Wall>,
    pub doors: Vec<Door>,
    pub windows: Vec<Window>,
    pub rooms: Vec<Room>,
}

/// The straight centreline direction (start→end) of a wall.
pub fn wall_direction(wall: &Wall) -> Point {
    let pts = &wall.baseline;
    if pts.len() < 2 {
        return Point::new(1.0, 0.0);
    }
    let a = pts[0];
    let b = pts[pts.len() - 1];
    normalize(subtract(b, a))
}

/// The length of a wall along its baseline.
pub fn wall_length(wall: &Wall) -> f64 {
    let mut total = 0.0;
    for i in 1..wall.baseline.len() {
        total += distance(wall.baseline[i - 1], wall.baseline[i]);
    }
    total
}

/// The filled polygon of a wall: its baseline offset by ±thickness/2. Handles
/// a straight (2-point) baseline; polyline walls are offset segment-wise (no
/// miter join — each vertex's offset direction comes from the chord between
/// its neighbors, matching the TS original exactly).
pub fn wall_polygon(wall: &Wall) -> Polygon {
    let pts = &wall.baseline;
    if pts.len() < 2 {
        return Vec::new();
    }
    let half = wall.thickness / 2.0;
    let mut left: Vec<Point> = Vec::with_capacity(pts.len());
    let mut right: Vec<Point> = Vec::with_capacity(pts.len());
    for i in 0..pts.len() {
        let prev = pts[i.saturating_sub(1)];
        let next = pts[(i + 1).min(pts.len() - 1)];
        let dir = normalize(subtract(next, prev));
        let n = Point::new(-dir.y, dir.x);
        left.push(add(pts[i], scale(n, half)));
        right.push(add(pts[i], scale(n, -half)));
    }
    right.reverse();
    left.into_iter().chain(right).collect()
}

/// The point on a wall's baseline at an opening's offset.
pub fn opening_center(wall: &Wall, offset: f64) -> Point {
    let dir = wall_direction(wall);
    add(wall.baseline[0], scale(dir, offset))
}

/// The two jamb points (opening edges) of a wall-hosted opening, given its
/// centerline `offset` and `width`.
pub fn opening_jambs(wall: &Wall, offset: f64, width: f64) -> (Point, Point) {
    let dir = wall_direction(wall);
    let start = wall.baseline[0];
    let p1 = add(start, scale(dir, offset - width / 2.0));
    let p2 = add(start, scale(dir, offset + width / 2.0));
    (p1, p2)
}

/// The door leaf line + swing-arc sample points for a hosted door.
pub struct DoorSwing {
    pub hinge: Point,
    pub leaf_end: Point,
    pub arc: Vec<Point>,
}

/// The door leaf line + swing-arc sample points for a hosted [`Door`].
pub fn door_swing(wall: &Wall, door: &Door) -> DoorSwing {
    let dir = wall_direction(wall);
    let n = Point::new(-dir.y, dir.x);
    let (j1, j2) = opening_jambs(wall, door.offset, door.width);
    let hinge = if matches!(door.swing, Swing::L) {
        j1
    } else {
        j2
    };
    let along = if matches!(door.swing, Swing::L) {
        dir
    } else {
        scale(dir, -1.0)
    };
    // Leaf opens 90° from the wall toward the interior normal.
    let leaf_end = add(hinge, scale(n, door.width));
    let mut arc = Vec::new();
    let start_ang = n.y.atan2(n.x);
    let end_ang = along.y.atan2(along.x);
    let mut sweep = end_ang - start_ang;
    while sweep <= -std::f64::consts::PI {
        sweep += 2.0 * std::f64::consts::PI;
    }
    while sweep > std::f64::consts::PI {
        sweep -= 2.0 * std::f64::consts::PI;
    }
    let steps = 8;
    for i in 0..=steps {
        let t = start_ang + (sweep * i as f64) / steps as f64;
        arc.push(Point::new(
            hinge.x + door.width * t.cos(),
            hinge.y + door.width * t.sin(),
        ));
    }
    DoorSwing {
        hinge,
        leaf_end,
        arc,
    }
}

/// Room floor area in a real-world unit, honoring the site's [`SpatialContext`].
pub fn room_area(room: &Room, spatial: &SpatialContext, unit: AreaUnit) -> f64 {
    let plan_area = thoth_spatial::area(&room.boundary);
    square_meters_to(area_to_square_meters(plan_area, spatial), unit)
}

/// All walls, doors, windows, rooms on a given level.
pub struct LevelContents<'a> {
    pub walls: Vec<&'a Wall>,
    pub doors: Vec<&'a Door>,
    pub windows: Vec<&'a Window>,
    pub rooms: Vec<&'a Room>,
}

/// All walls, doors, windows, rooms on a given level of a [`BuildingModel`].
pub fn level_contents<'a>(model: &'a BuildingModel, level_id: &str) -> LevelContents<'a> {
    let walls: Vec<&Wall> = model
        .walls
        .iter()
        .filter(|w| w.level_id == level_id)
        .collect();
    let wall_ids: std::collections::BTreeSet<&str> = walls.iter().map(|w| w.id.as_str()).collect();
    LevelContents {
        doors: model
            .doors
            .iter()
            .filter(|d| wall_ids.contains(d.wall_id.as_str()))
            .collect(),
        windows: model
            .windows
            .iter()
            .filter(|w| wall_ids.contains(w.wall_id.as_str()))
            .collect(),
        rooms: model
            .rooms
            .iter()
            .filter(|r| r.level_id == level_id)
            .collect(),
        walls,
    }
}

/// Find a wall by id within a model.
pub fn find_wall<'a>(model: &'a BuildingModel, wall_id: &str) -> Option<&'a Wall> {
    model.walls.iter().find(|w| w.id == wall_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ctx() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: thoth_spatial::Unit::Meters,
            scale: 1.0,
        }
    }

    fn straight_wall() -> Wall {
        Wall {
            id: "w1".to_string(),
            level_id: "l1".to_string(),
            baseline: vec![Point::new(0.0, 0.0), Point::new(10.0, 0.0)],
            thickness: 0.2,
            height: 3.0,
            type_id: None,
            layer_id: None,
        }
    }

    #[test]
    fn wall_direction_is_the_normalized_start_to_end_vector() {
        let dir = wall_direction(&straight_wall());
        assert!((dir.x - 1.0).abs() < 1e-9);
        assert!(dir.y.abs() < 1e-9);
    }

    #[test]
    fn wall_direction_falls_back_to_plus_x_for_a_degenerate_baseline() {
        let mut wall = straight_wall();
        wall.baseline = vec![Point::new(3.0, 4.0)];
        let dir = wall_direction(&wall);
        assert_eq!(dir, Point::new(1.0, 0.0));
    }

    #[test]
    fn wall_length_sums_polyline_segments() {
        let mut wall = straight_wall();
        wall.baseline = vec![
            Point::new(0.0, 0.0),
            Point::new(3.0, 0.0),
            Point::new(3.0, 4.0),
        ];
        assert!((wall_length(&wall) - 7.0).abs() < 1e-9);
    }

    #[test]
    fn wall_polygon_offsets_a_straight_wall_by_half_thickness_each_side() {
        let wall = straight_wall();
        let poly = wall_polygon(&wall);
        // 2 baseline points -> 2 left + 2 right = 4 vertices.
        assert_eq!(poly.len(), 4);
        // The straight wall's normal is +Y; left offset is +0.1, right is -0.1.
        assert!((poly[0].y - 0.1).abs() < 1e-9);
        assert!((poly[1].y - 0.1).abs() < 1e-9);
    }

    #[test]
    fn wall_polygon_is_empty_for_a_degenerate_baseline() {
        let mut wall = straight_wall();
        wall.baseline = vec![Point::new(0.0, 0.0)];
        assert!(wall_polygon(&wall).is_empty());
    }

    #[test]
    fn opening_jambs_straddle_the_offset_by_half_width() {
        let wall = straight_wall();
        let (j1, j2) = opening_jambs(&wall, 5.0, 3.0);
        assert!((j1.x - 3.5).abs() < 1e-9);
        assert!((j2.x - 6.5).abs() < 1e-9);
    }

    #[test]
    fn door_swing_l_hinges_at_the_start_jamb() {
        let wall = straight_wall();
        let door = Door {
            id: "d1".to_string(),
            wall_id: "w1".to_string(),
            offset: 5.0,
            width: 0.9,
            height: 2.1,
            mark: "D-101".to_string(),
            swing: Swing::L,
            leaf: Leaf::Single,
        };
        let swing = door_swing(&wall, &door);
        // Hinge is the left jamb: offset - width/2 along the wall.
        assert!((swing.hinge.x - 4.55).abs() < 1e-9);
        // 9 sample points for an 8-segment sweep.
        assert_eq!(swing.arc.len(), 9);
        // The arc stays a constant `door.width` radius from the hinge.
        for pt in &swing.arc {
            assert!((distance(*pt, swing.hinge) - door.width).abs() < 1e-9);
        }
    }

    #[test]
    fn door_swing_r_hinges_at_the_end_jamb() {
        let wall = straight_wall();
        let door = Door {
            id: "d1".to_string(),
            wall_id: "w1".to_string(),
            offset: 5.0,
            width: 0.9,
            height: 2.1,
            mark: "D-101".to_string(),
            swing: Swing::R,
            leaf: Leaf::Single,
        };
        let swing = door_swing(&wall, &door);
        assert!((swing.hinge.x - 5.45).abs() < 1e-9);
    }

    #[test]
    fn room_area_converts_plan_units_to_the_requested_area_unit() {
        let room = Room {
            id: "r1".to_string(),
            level_id: "l1".to_string(),
            boundary: vec![
                Point::new(0.0, 0.0),
                Point::new(10.0, 0.0),
                Point::new(10.0, 10.0),
                Point::new(0.0, 10.0),
            ],
            name: "Living Room".to_string(),
            number: "101".to_string(),
            floor_finish: None,
            base_finish: None,
            wall_finish: None,
            ceiling_finish: None,
            ceiling_height: None,
        };
        let sqm = room_area(&room, &ctx(), AreaUnit::Sqm);
        assert!((sqm - 100.0).abs() < 1e-6);
        let sqft = room_area(&room, &ctx(), AreaUnit::Sqft);
        assert!((sqft - 100.0 / 0.092_903_04).abs() < 1e-3);
    }

    fn model_fixture() -> BuildingModel {
        BuildingModel {
            id: "bm1".to_string(),
            building_id: "b1".to_string(),
            levels: vec![Level {
                id: "l1".to_string(),
                name: "Ground Floor".to_string(),
                elevation: 0.0,
                height: 10.0,
            }],
            walls: vec![straight_wall()],
            doors: vec![Door {
                id: "d1".to_string(),
                wall_id: "w1".to_string(),
                offset: 5.0,
                width: 0.9,
                height: 2.1,
                mark: "D-101".to_string(),
                swing: Swing::L,
                leaf: Leaf::Single,
            }],
            windows: vec![],
            rooms: vec![Room {
                id: "r1".to_string(),
                level_id: "l1".to_string(),
                boundary: vec![
                    Point::new(0.0, 0.0),
                    Point::new(10.0, 0.0),
                    Point::new(10.0, 10.0),
                    Point::new(0.0, 10.0),
                ],
                name: "Living Room".to_string(),
                number: "101".to_string(),
                floor_finish: None,
                base_finish: None,
                wall_finish: None,
                ceiling_finish: None,
                ceiling_height: None,
            }],
        }
    }

    #[test]
    fn level_contents_filters_by_level_and_hosted_wall() {
        let model = model_fixture();
        let contents = level_contents(&model, "l1");
        assert_eq!(contents.walls.len(), 1);
        assert_eq!(contents.doors.len(), 1);
        assert_eq!(contents.windows.len(), 0);
        assert_eq!(contents.rooms.len(), 1);

        let empty = level_contents(&model, "l2");
        assert_eq!(empty.walls.len(), 0);
        assert_eq!(empty.rooms.len(), 0);
    }

    #[test]
    fn find_wall_looks_up_by_id() {
        let model = model_fixture();
        assert!(find_wall(&model, "w1").is_some());
        assert!(find_wall(&model, "does-not-exist").is_none());
    }
}
