//! Survey functions for plats — the metes-and-bounds, bearing, closure, and
//! coordinate math a land surveyor needs to describe and check a boundary.
//!
//! Direct port of `packages/domain/src/survey/survey.ts` and
//! `types/survey.ts`.
//!
//! # Conventions
//!
//! - **North is −Y, East is +X.** Plan coordinates increase downward on
//!   screen (like most 2D canvases), so survey north (up) is the −Y
//!   direction. Every function here uses this convention consistently;
//!   callers never mix it with the display transform.
//! - **Azimuth** is measured clockwise from north in `[0, 360)`.
//! - **Bearing** is the surveyor's quadrant form (e.g. `N45°30′15″E`).
//! - Distances are in the plan's [`thoth_spatial::Unit`]; areas are reported
//!   in both the plan's square unit and acres/hectares.

use thoth_spatial::{signed_area, AreaUnit, EdgeArcs, Point, Polygon, SpatialContext, Unit};

use crate::bearing::{
    azimuth, azimuth_to_bearing, bearing_to_azimuth, format_bearing, to_dms, Cardinal, Dms,
    EastWest, NorthSouth, QuadrantBearing,
};
use crate::curve::{boundary_area, boundary_edges, boundary_perimeter, Arc};
use crate::error::SurveyError;
use crate::fmt_utils::{group_thousands, locale_fixed};

const DEG: f64 = 180.0 / std::f64::consts::PI;

/// Default false easting/northing (feet), matching
/// `federalReference.json`'s `standards.survey.falseEasting/falseNorthing`
/// — the local-coordinate datum offset most U.S. plats use to keep
/// coordinates positive.
const DEFAULT_FALSE_EASTING: f64 = 5000.0;
const DEFAULT_FALSE_NORTHING: f64 = 5000.0;

/// Travel direction (unit vector) for an azimuth in the north = −Y frame.
pub fn dir_for(azimuth_deg: f64) -> Point {
    let a = azimuth_deg.to_radians();
    Point::new(a.sin(), -a.cos())
}

/// Corner label for a 0-based vertex index (`P1`, `P2`, …).
pub fn corner_label(index: usize) -> String {
    format!("P{}", index + 1)
}

/// Which side of the direction of travel a curve turns.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CurveDirection {
    Left,
    Right,
}

/// The curve data a plat tabulates for an arc course.
#[derive(Debug, Clone, PartialEq)]
pub struct CurveRecord {
    /// 1-based course number this curve belongs to.
    pub course_index: u32,
    /// Curve label on the plat, e.g. `"C1"`.
    pub label: String,
    /// Radius, plan units.
    pub radius: f64,
    /// Arc length, plan units.
    pub arc_length: f64,
    /// Central (delta) angle in decimal degrees.
    pub delta: f64,
    pub delta_dms: Dms,
    /// Tangent distance (PC/PT to PI), plan units.
    pub tangent: f64,
    /// Long chord length, plan units.
    pub chord_length: f64,
    pub chord_bearing: QuadrantBearing,
    pub chord_bearing_text: String,
    /// Direction the curve turns along the direction of travel.
    pub direction: CurveDirection,
}

/// Straight line, or a circular arc (with [`SurveyCourse::curve`]).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CourseType {
    Line,
    Curve,
}

/// A single course (leg) of a metes-and-bounds traverse.
#[derive(Debug, Clone, PartialEq)]
pub struct SurveyCourse {
    /// 1-based course number.
    pub index: u32,
    pub course_type: CourseType,
    pub from: Point,
    pub to: Point,
    /// Label of the corner the course leaves (e.g. `"P1"`).
    pub from_label: String,
    pub to_label: String,
    /// Azimuth of the course; for a curve this is the long-chord azimuth.
    pub azimuth: f64,
    pub bearing: QuadrantBearing,
    pub bearing_text: String,
    /// Length in plan units; for a curve this is the chord (traverse) distance.
    pub distance: f64,
    /// Length in meters (spatially honest).
    pub distance_meters: f64,
    /// Latitude (northing component) of the course, plan units.
    pub latitude: f64,
    /// Departure (easting component) of the course, plan units.
    pub departure: f64,
    /// Curve record when [`CourseType::Curve`].
    pub curve: Option<CurveRecord>,
}

/// Result of a traverse-closure computation.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TraverseClosure {
    pub perimeter: f64,
    /// Residual sum of latitudes (should be ~0 for a closed traverse).
    pub latitude_error: f64,
    /// Residual sum of departures (should be ~0 for a closed traverse).
    pub departure_error: f64,
    /// Linear misclosure = hypot(latitude_error, departure_error), plan units.
    pub linear_misclosure: f64,
    /// Precision ratio denominator: perimeter / misclosure (`Infinity` if exact).
    pub precision: f64,
}

impl TraverseClosure {
    /// Human text, e.g. `"1:14,200"` or `"Exact (closed)"`.
    pub fn precision_text(&self) -> String {
        if !self.precision.is_finite() || self.precision > 1e6 {
            "Exact (closed)".to_string()
        } else {
            format!("1:{}", group_thousands(self.precision.round() as i64))
        }
    }
}

/// Options controlling how the recorded plat values are rounded before
/// closing (see [`record_closure`]).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct RecordClosureOptions {
    /// Decimal places the recorded distances are rounded to (default 2).
    pub distance_precision: Option<u32>,
}

/// A boundary corner as survey coordinates (northing/easting).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CornerCoordinate {
    pub index: usize,
    pub northing: f64,
    pub easting: f64,
    pub point: Point,
}

impl CornerCoordinate {
    pub fn label(&self) -> String {
        corner_label(self.index)
    }
}

/// False easting/northing so local coordinates stay positive (see
/// [`boundary_coordinates`]).
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct CoordinateBasis {
    pub false_easting: Option<f64>,
    pub false_northing: Option<f64>,
}

/// Area of a boundary reported in survey terms.
#[derive(Debug, Clone, PartialEq)]
pub struct SurveyArea {
    /// Area in the plan's square unit (e.g. ft² or m²).
    pub square_units: f64,
    pub unit_label: String,
    pub acres: f64,
    pub hectares: f64,
    pub square_meters: f64,
}

/// The interior angle at a boundary corner, for the plat's angular record.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CornerAngle {
    pub index: usize,
    /// Interior angle in decimal degrees.
    pub interior: f64,
    /// Interior angle as whole degrees/minutes/seconds.
    pub dms: Dms,
}

impl CornerAngle {
    pub fn label(&self) -> String {
        corner_label(self.index)
    }
}

/// A complete survey/plat report for one boundary.
#[derive(Debug, Clone, PartialEq)]
pub struct SurveyReport {
    pub courses: Vec<SurveyCourse>,
    /// The curve table — one record per arc course, empty for straight tracts.
    pub curves: Vec<CurveRecord>,
    /// Whether the boundary contains any circular-arc courses.
    pub has_curves: bool,
    /// Coordinate (geometric) closure — exact for a coordinate-derived traverse.
    pub closure: TraverseClosure,
    /// Closure of the traverse as **recorded** (rounded bearings/distances).
    pub record: TraverseClosure,
    pub coordinates: Vec<CornerCoordinate>,
    /// Interior angle at each corner; `angles_sum` should equal `angles_expected`.
    pub angles: Vec<CornerAngle>,
    pub angles_sum: f64,
    pub angles_expected: f64,
    pub area: SurveyArea,
    pub area_by_dmd: f64,
    pub perimeter: f64,
    pub perimeter_meters: f64,
    pub units: Unit,
}

fn area_to_square_meters(area: f64, spatial: &SpatialContext) -> f64 {
    let factor = spatial.units.meters_per_unit();
    area * factor * factor
}

fn square_meters_to(sqm: f64, unit: AreaUnit) -> f64 {
    sqm / unit.sqm_per_unit()
}

/// Build the tabulated curve record for an arc course.
fn curve_record(course_index: u32, curve_no: u32, from: Point, to: Point, arc: &Arc) -> CurveRecord {
    let chord_az = azimuth(from, to);
    let delta = arc.delta * DEG;
    let mid = Point::new((from.x + to.x) / 2.0, (from.y + to.y) / 2.0);
    let u = Point::new(
        (to.x - from.x) / arc.chord_length,
        (to.y - from.y) / arc.chord_length,
    );
    let r = Point::new(arc.center.x - mid.x, arc.center.y - mid.y);
    let direction = if u.x * r.y - u.y * r.x > 0.0 {
        CurveDirection::Right
    } else {
        CurveDirection::Left
    };
    let chord_bearing = azimuth_to_bearing(chord_az);
    CurveRecord {
        course_index,
        label: format!("C{curve_no}"),
        radius: arc.radius,
        arc_length: arc.arc_length,
        delta,
        delta_dms: to_dms(delta),
        tangent: arc.tangent,
        chord_length: arc.chord_length,
        chord_bearing_text: format_bearing(&chord_bearing),
        chord_bearing,
        direction,
    }
}

/// The metes-and-bounds courses of a closed boundary: one course per edge,
/// traversed in order. Straight edges carry a bearing and distance; curved
/// edges (per-edge `arcs` bulges) additionally carry a [`CurveRecord`], and
/// their bearing/distance/latitude/departure describe the **long chord** —
/// the value a traverse closes on, exactly as a plat reports.
pub fn polygon_courses(
    polygon: &Polygon,
    spatial: &SpatialContext,
    arcs: Option<&EdgeArcs>,
) -> Vec<SurveyCourse> {
    let n = polygon.len();
    let mut courses = Vec::with_capacity(n);
    let mut curve_no = 0u32;
    for edge in boundary_edges(polygon, arcs) {
        let (from, to, i) = (edge.from, edge.to, edge.index);
        let az = azimuth(from, to);
        let dist = thoth_spatial::distance(from, to);
        let bearing = azimuth_to_bearing(az);
        let rad = az.to_radians();
        let curve = edge.arc.as_ref().map(|arc| {
            curve_no += 1;
            curve_record((i + 1) as u32, curve_no, from, to, arc)
        });
        courses.push(SurveyCourse {
            index: (i + 1) as u32,
            course_type: if edge.arc.is_some() {
                CourseType::Curve
            } else {
                CourseType::Line
            },
            from,
            to,
            from_label: corner_label(i),
            to_label: corner_label((i + 1) % n),
            azimuth: az,
            bearing_text: format_bearing(&bearing),
            bearing,
            distance: dist,
            distance_meters: dist * if spatial.units == Unit::Feet { 0.3048 } else { 1.0 },
            latitude: rad.cos() * dist,
            departure: rad.sin() * dist,
            curve,
        });
    }
    courses
}

/// Check how well a set of courses closes back on the Point of Beginning.
pub fn traverse_closure(courses: &[SurveyCourse]) -> TraverseClosure {
    let perimeter: f64 = courses.iter().map(|c| c.distance).sum();
    let latitude_error: f64 = courses.iter().map(|c| c.latitude).sum();
    let departure_error: f64 = courses.iter().map(|c| c.departure).sum();
    let linear_misclosure = latitude_error.hypot(departure_error);
    let precision = if linear_misclosure < 1e-9 {
        f64::INFINITY
    } else {
        perimeter / linear_misclosure
    };
    TraverseClosure {
        perimeter,
        latitude_error,
        departure_error,
        linear_misclosure,
        precision,
    }
}

/// Interior angle (in decimal degrees) at each vertex of a simple polygon,
/// index-aligned with `polygon`. Handles convex and reflex (concave)
/// corners: the returned angles sum to exactly `(n − 2) × 180°` for any
/// simple ring, independent of winding order. This is the angular record a
/// plat carries at each monument.
pub fn interior_angles(polygon: &Polygon) -> Vec<f64> {
    let n = polygon.len();
    if n < 3 {
        return vec![0.0; n];
    }
    let ccw = signed_area(polygon) > 0.0;
    let mut angles = Vec::with_capacity(n);
    for i in 0..n {
        let prev = polygon[(i + n - 1) % n];
        let curr = polygon[i];
        let next = polygon[(i + 1) % n];
        let d1x = curr.x - prev.x;
        let d1y = curr.y - prev.y;
        let d2x = next.x - curr.x;
        let d2y = next.y - curr.y;
        // Signed deflection (turn) from the incoming to the outgoing course.
        let turn = (d1x * d2y - d1y * d2x).atan2(d1x * d2x + d1y * d2y) * DEG;
        let mut interior = if ccw { 180.0 - turn } else { 180.0 + turn };
        interior = ((interior % 360.0) + 360.0) % 360.0;
        if interior == 0.0 && turn.abs() > 179.9 {
            interior = 360.0;
        }
        angles.push(interior);
    }
    angles
}

/// Traverse closure computed from the **recorded** bearings and distances —
/// i.e. the rounded values actually written on the plat (bearings to the
/// whole second, distances to `distance_precision`). Unlike
/// [`traverse_closure`] (which closes a coordinate-derived traverse and is
/// therefore always exact), this reveals the real misclosure a field crew
/// would find if they staked the plat exactly as drawn. This is the
/// precision figure a plat should report.
pub fn record_closure(courses: &[SurveyCourse], options: RecordClosureOptions) -> TraverseClosure {
    let factor = 10f64.powi(options.distance_precision.unwrap_or(2) as i32);
    let mut latitude_error = 0.0;
    let mut departure_error = 0.0;
    let mut perimeter = 0.0;
    for c in courses {
        let dist = (c.distance * factor).round() / factor;
        let rad = bearing_to_azimuth(&c.bearing).to_radians();
        perimeter += dist;
        latitude_error += rad.cos() * dist;
        departure_error += rad.sin() * dist;
    }
    let linear_misclosure = latitude_error.hypot(departure_error);
    let precision = if linear_misclosure < 1e-9 {
        f64::INFINITY
    } else {
        perimeter / linear_misclosure
    };
    TraverseClosure {
        perimeter,
        latitude_error,
        departure_error,
        linear_misclosure,
        precision,
    }
}

/// Area of a boundary by the **Double Meridian Distance** method, computed
/// from the courses' latitudes and departures. This is mathematically
/// independent of the shoelace formula used by [`survey_area`], so
/// agreement between the two is a rigorous cross-check that the coordinate
/// geometry is self-consistent. Returned in plan units².
pub fn dmd_area(courses: &[SurveyCourse]) -> f64 {
    let mut dmd = 0.0;
    let mut double_area = 0.0;
    for (i, c) in courses.iter().enumerate() {
        dmd = if i == 0 {
            c.departure
        } else {
            dmd + courses[i - 1].departure + c.departure
        };
        double_area += dmd * c.latitude;
    }
    (double_area / 2.0).abs()
}

/// Survey coordinates for each corner. Uses an assumed local datum: Easting
/// grows with +X and Northing with north (−Y), offset by a false origin so
/// values stay positive (a common local-coordinate convention on plats).
pub fn boundary_coordinates(polygon: &Polygon, basis: CoordinateBasis) -> Vec<CornerCoordinate> {
    let false_easting = basis.false_easting.unwrap_or(DEFAULT_FALSE_EASTING);
    let false_northing = basis.false_northing.unwrap_or(DEFAULT_FALSE_NORTHING);
    polygon
        .iter()
        .enumerate()
        .map(|(index, &point)| CornerCoordinate {
            index,
            easting: point.x + false_easting,
            northing: -point.y + false_northing,
            point,
        })
        .collect()
}

/// Area of a boundary, honoring any curved edges, reported in the plan's
/// square unit and in acres/hectares/square-meters.
pub fn survey_area(polygon: &Polygon, spatial: &SpatialContext, arcs: Option<&EdgeArcs>) -> SurveyArea {
    let sqm = area_to_square_meters(boundary_area(polygon, arcs), spatial);
    let factor = if spatial.units == Unit::Feet {
        0.092_903_04
    } else {
        1.0
    };
    SurveyArea {
        square_units: sqm / factor,
        unit_label: format!("{}²", spatial.units.label()),
        acres: square_meters_to(sqm, AreaUnit::Acres),
        hectares: square_meters_to(sqm, AreaUnit::Hectares),
        square_meters: sqm,
    }
}

/// Compute the full survey report for a boundary, honoring any curved edges.
pub fn survey_report(polygon: &Polygon, spatial: &SpatialContext, arcs: Option<&EdgeArcs>) -> SurveyReport {
    let courses = polygon_courses(polygon, spatial, arcs);
    let perimeter = boundary_perimeter(polygon, arcs);
    let angle_degrees = interior_angles(polygon);
    let angles: Vec<CornerAngle> = angle_degrees
        .iter()
        .enumerate()
        .map(|(i, &interior)| CornerAngle {
            index: i,
            interior,
            dms: to_dms(interior),
        })
        .collect();
    let curves: Vec<CurveRecord> = courses.iter().filter_map(|c| c.curve.clone()).collect();
    let angles_sum: f64 = angle_degrees.iter().sum();
    SurveyReport {
        curves,
        has_curves: courses.iter().any(|c| c.curve.is_some()),
        closure: traverse_closure(&courses),
        record: record_closure(&courses, RecordClosureOptions { distance_precision: Some(2) }),
        coordinates: boundary_coordinates(polygon, CoordinateBasis::default()),
        angles,
        angles_sum,
        angles_expected: (polygon.len() as f64 - 2.0) * 180.0,
        area: survey_area(polygon, spatial, arcs),
        area_by_dmd: dmd_area(&courses),
        perimeter,
        perimeter_meters: perimeter * if spatial.units == Unit::Feet { 0.3048 } else { 1.0 },
        units: spatial.units,
        courses,
    }
}

/// Heading/context for a [`legal_description`].
#[derive(Debug, Clone, Default)]
pub struct LegalDescriptionOptions {
    /// Name/heading of the tract being described.
    pub tract_name: Option<String>,
    /// Larger context (e.g. subdivision or site name).
    pub context: Option<String>,
}

/// Format a value with thousands separators and 2 fixed decimal places,
/// e.g. `5000.0` → `"5,000.00"` (the `fmt` helper in the TS original).
fn fmt(v: f64) -> String {
    locale_fixed(v, 2)
}

/// Generate a metes-and-bounds legal description for a boundary — the
/// narrative form a plat and deed carry ("BEGINNING at… thence… to the
/// POINT OF BEGINNING").
pub fn legal_description(
    polygon: &Polygon,
    spatial: &SpatialContext,
    options: &LegalDescriptionOptions,
    arcs: Option<&EdgeArcs>,
) -> String {
    let report = survey_report(polygon, spatial, arcs);
    let u = spatial.units.label();
    let pob = &report.coordinates[0];
    let mut lines: Vec<String> = Vec::new();

    let heading = options.tract_name.as_deref().unwrap_or("the tract");
    let context = options
        .context
        .as_ref()
        .map(|c| format!(" situated in {c}"))
        .unwrap_or_default();
    lines.push(format!(
        "A parcel of land{context}, being {heading}, more particularly described as follows:"
    ));
    lines.push(String::new());
    lines.push(format!(
        "BEGINNING at the Point of Beginning ({}), having local coordinates N {}, E {};",
        pob.label(),
        fmt(pob.northing),
        fmt(pob.easting)
    ));
    for c in &report.courses {
        let last = c.index as usize == report.courses.len();
        let to = if last {
            "the POINT OF BEGINNING".to_string()
        } else {
            format!("corner {}", c.to_label)
        };
        if let Some(cv) = &c.curve {
            let direction = match cv.direction {
                CurveDirection::Left => "left",
                CurveDirection::Right => "right",
            };
            lines.push(format!(
                "thence along a curve to the {direction} having a radius of {} {u}, an arc length of {} {u}, a central angle of {}, and a long chord bearing {} for {} {u} to {to};",
                fmt(cv.radius),
                fmt(cv.arc_length),
                format_dms(&cv.delta_dms),
                cv.chord_bearing_text,
                fmt(cv.chord_length)
            ));
        } else {
            lines.push(format!(
                "thence {}, a distance of {} {u} to {to};",
                c.bearing_text,
                fmt(c.distance)
            ));
        }
    }
    lines.push(String::new());
    lines.push(format!(
        "Containing {} {u}² ({:.3} acres), more or less. Traverse closure: {}.",
        fmt(report.area.square_units),
        report.area.acres,
        report.closure.precision_text()
    ));
    lines.join("\n")
}

/// Format a degrees/minutes/seconds triple as e.g. `90°00′00″`.
pub fn format_dms(a: &Dms) -> String {
    format!("{}°{:02}′{:02}″", a.degrees.abs(), a.minutes, a.seconds)
}

/// `true` if `c` is one of the characters `°`, `-`, or any Unicode
/// whitespace — the degree/minute separator class `parse_bearing` accepts.
fn is_degree_separator(c: char) -> bool {
    c == '°' || c == '-' || c.is_whitespace()
}

/// `true` if `c` is one of the characters `′`, `'`, `-`, or any Unicode
/// whitespace — the minute/second separator class `parse_bearing` accepts.
fn is_minute_separator(c: char) -> bool {
    c == '′' || c == '\'' || c == '-' || c.is_whitespace()
}

fn skip_ws(chars: &[char], i: &mut usize) {
    while *i < chars.len() && chars[*i].is_whitespace() {
        *i += 1;
    }
}

/// Parse a quadrant bearing string into a [`QuadrantBearing`].
///
/// Accepts cardinal words (`"Due North"`, `"N"`, …) and quadrant forms like
/// `"N 45-30-15 E"`, `"N45.5E"`, or `` "N 45°30'15\" E" `` — a hand-rolled
/// parser that walks the same grammar as the TS original's regular
/// expression (`^([NS])\s*(\d+(?:\.\d+)?)(?:\s*[°\-\s]\s*(\d+)?(?:\s*[′'\-\s]\s*(\d+)?(?:″|""|'|")?)?)?\s*([EW])$`),
/// chosen over a `regex` dependency since the grammar is small, fixed, and
/// exercised by golden tests.
pub fn parse_bearing(text: &str) -> Result<QuadrantBearing, SurveyError> {
    let normalized = text.trim().to_uppercase();
    let collapsed = normalized.split_whitespace().collect::<Vec<_>>().join(" ");

    match collapsed.as_str() {
        "DUE NORTH" | "DUE N" | "N" => {
            return Ok(QuadrantBearing {
                ns: NorthSouth::N,
                degrees: 0,
                minutes: 0,
                seconds: 0,
                ew: EastWest::E,
                cardinal: Some(Cardinal::N),
            })
        }
        "DUE SOUTH" | "DUE S" | "S" => {
            return Ok(QuadrantBearing {
                ns: NorthSouth::S,
                degrees: 0,
                minutes: 0,
                seconds: 0,
                ew: EastWest::E,
                cardinal: Some(Cardinal::S),
            })
        }
        "DUE EAST" | "DUE E" | "E" => {
            return Ok(QuadrantBearing {
                ns: NorthSouth::N,
                degrees: 90,
                minutes: 0,
                seconds: 0,
                ew: EastWest::E,
                cardinal: Some(Cardinal::E),
            })
        }
        "DUE WEST" | "DUE W" | "W" => {
            return Ok(QuadrantBearing {
                ns: NorthSouth::N,
                degrees: 90,
                minutes: 0,
                seconds: 0,
                ew: EastWest::W,
                cardinal: Some(Cardinal::W),
            })
        }
        _ => {}
    }

    let invalid = || SurveyError::InvalidBearingFormat(text.to_string());
    let chars: Vec<char> = collapsed.chars().collect();
    let len = chars.len();
    let mut i = 0usize;

    let ns = match chars.first() {
        Some('N') => NorthSouth::N,
        Some('S') => NorthSouth::S,
        _ => return Err(invalid()),
    };
    i += 1;
    skip_ws(&chars, &mut i);

    let num_start = i;
    while i < len && chars[i].is_ascii_digit() {
        i += 1;
    }
    if i == num_start {
        return Err(invalid());
    }
    if i < len && chars[i] == '.' {
        let dot = i;
        let frac_start = i + 1;
        let mut j = frac_start;
        while j < len && chars[j].is_ascii_digit() {
            j += 1;
        }
        if j > frac_start {
            i = j;
        } else {
            i = dot; // no digits after the decimal point: leave it unconsumed
        }
    }
    let val: f64 = chars[num_start..i]
        .iter()
        .collect::<String>()
        .parse()
        .map_err(|_| invalid())?;

    let mut minutes = 0i32;
    let mut seconds = 0i32;
    let mut has_minutes = false;

    if i < len && is_degree_separator(chars[i]) {
        i += 1;
        skip_ws(&chars, &mut i);
        let m_start = i;
        while i < len && chars[i].is_ascii_digit() {
            i += 1;
        }
        if i > m_start {
            minutes = chars[m_start..i]
                .iter()
                .collect::<String>()
                .parse()
                .map_err(|_| invalid())?;
            has_minutes = true;
        }

        if i < len && is_minute_separator(chars[i]) {
            i += 1;
            skip_ws(&chars, &mut i);
            let s_start = i;
            while i < len && chars[i].is_ascii_digit() {
                i += 1;
            }
            if i > s_start {
                seconds = chars[s_start..i]
                    .iter()
                    .collect::<String>()
                    .parse()
                    .map_err(|_| invalid())?;
            }
            // Optional trailing quote mark(s): `""`, `″`, `'`, or `"`.
            if i + 1 < len && chars[i] == '"' && chars[i + 1] == '"' {
                i += 2;
            } else if i < len && (chars[i] == '″' || chars[i] == '\'' || chars[i] == '"') {
                i += 1;
            }
        }
    }

    skip_ws(&chars, &mut i);
    if i >= len {
        return Err(invalid());
    }
    let ew = match chars[i] {
        'E' => EastWest::E,
        'W' => EastWest::W,
        _ => return Err(invalid()),
    };
    i += 1;
    if i != len {
        return Err(invalid());
    }

    if !(0.0..=90.0).contains(&val) {
        return Err(SurveyError::BearingAngleOutOfRange(text.to_string()));
    }

    if !has_minutes {
        let dms = to_dms(val);
        Ok(QuadrantBearing {
            ns,
            degrees: dms.degrees,
            minutes: dms.minutes,
            seconds: dms.seconds,
            ew,
            cardinal: None,
        })
    } else {
        Ok(QuadrantBearing {
            ns,
            degrees: val.floor() as i32,
            minutes,
            seconds,
            ew,
            cardinal: None,
        })
    }
}

/// Result of an adjusted traverse computation.
#[derive(Debug, Clone, PartialEq)]
pub struct AdjustedTraverse {
    pub courses: Vec<SurveyCourse>,
    pub closure_before: TraverseClosure,
    pub closure_after: TraverseClosure,
}

/// The rule used by [`adjust_traverse`] to distribute linear misclosure
/// across a traverse's courses.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AdjustmentMethod {
    /// Compass (Bowditch) rule: distribute proportionally to course length.
    /// This was the TS default.
    Compass,
    /// Transit rule: distribute proportionally to each course's latitude
    /// (or departure) magnitude.
    Transit,
}

/// Adjust a traverse using either the Compass (Bowditch) or Transit rule to
/// close the linear error, redistributing it across every course and
/// guaranteeing the last course's endpoint exactly matches the first
/// course's start.
pub fn adjust_traverse(courses: &[SurveyCourse], method: AdjustmentMethod) -> AdjustedTraverse {
    let closure_before = traverse_closure(courses);
    let n = courses.len();
    if n == 0 || closure_before.linear_misclosure < 1e-9 {
        return AdjustedTraverse {
            courses: courses.to_vec(),
            closure_before,
            closure_after: closure_before,
        };
    }

    let total_lat = closure_before.latitude_error;
    let total_dep = closure_before.departure_error;
    let total_dist = closure_before.perimeter;
    let sum_abs_lat: f64 = courses.iter().map(|c| c.latitude.abs()).sum();
    let sum_abs_dep: f64 = courses.iter().map(|c| c.departure.abs()).sum();

    let mut adjusted_courses: Vec<SurveyCourse> = Vec::with_capacity(n);
    let mut current_point = courses[0].from;

    for c in courses {
        let (d_lat, d_dep) = match method {
            AdjustmentMethod::Compass => (
                -total_lat * (c.distance / total_dist),
                -total_dep * (c.distance / total_dist),
            ),
            AdjustmentMethod::Transit => (
                if sum_abs_lat < 1e-9 {
                    0.0
                } else {
                    -total_lat * (c.latitude.abs() / sum_abs_lat)
                },
                if sum_abs_dep < 1e-9 {
                    0.0
                } else {
                    -total_dep * (c.departure.abs() / sum_abs_dep)
                },
            ),
        };

        let adj_lat = c.latitude + d_lat;
        let adj_dep = c.departure + d_dep;

        // North is -Y, East is +X.
        let next_point = Point::new(current_point.x + adj_dep, current_point.y - adj_lat);

        let dist = adj_dep.hypot(adj_lat);
        let az = (adj_dep.atan2(adj_lat) * DEG + 360.0) % 360.0;
        let bearing = azimuth_to_bearing(az);

        adjusted_courses.push(SurveyCourse {
            index: c.index,
            course_type: c.course_type,
            from: current_point,
            to: next_point,
            from_label: c.from_label.clone(),
            to_label: c.to_label.clone(),
            azimuth: az,
            bearing_text: format_bearing(&bearing),
            bearing,
            distance: dist,
            distance_meters: if c.distance < 1e-9 {
                0.0
            } else {
                dist * (c.distance_meters / c.distance)
            },
            latitude: adj_lat,
            departure: adj_dep,
            curve: c.curve.clone(),
        });

        current_point = next_point;
    }

    // Guarantee topological closure on the final point back to P0.
    if let Some(last) = adjusted_courses.last_mut() {
        last.to = courses[0].from;
    }

    let closure_after = traverse_closure(&adjusted_courses);
    AdjustedTraverse {
        courses: adjusted_courses,
        closure_before,
        closure_after,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;
    use thoth_spatial::area as polygon_area;

    fn spatial_meters() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: Unit::Meters,
            scale: 1.0,
        }
    }

    // A 100x100 square. Screen Y increases downward, so survey north is -Y.
    fn square() -> Polygon {
        vec![
            Point::new(0.0, 0.0),
            Point::new(100.0, 0.0),
            Point::new(100.0, 100.0),
            Point::new(0.0, 100.0),
        ]
    }

    // An L-shaped tract exercising a reflex (concave) corner.
    fn ell() -> Polygon {
        vec![
            Point::new(0.0, 0.0),
            Point::new(60.0, 0.0),
            Point::new(60.0, 40.0),
            Point::new(30.0, 40.0),
            Point::new(30.0, 80.0),
            Point::new(0.0, 80.0),
        ]
    }

    #[test]
    fn produces_one_course_per_edge_with_correct_bearings() {
        let spatial = spatial_meters();
        let courses = polygon_courses(&square(), &spatial, None);
        assert_eq!(courses.len(), 4);
        let texts: Vec<&str> = courses.iter().map(|c| c.bearing_text.as_str()).collect();
        assert_eq!(texts, vec!["Due East", "Due South", "Due West", "Due North"]);
        assert!(courses.iter().all(|c| (c.distance - 100.0).abs() < 1e-9));
    }

    #[test]
    fn closes_exactly_for_a_polygon_derived_traverse() {
        let spatial = spatial_meters();
        let closure = traverse_closure(&polygon_courses(&square(), &spatial, None));
        assert!(closure.linear_misclosure < 1e-6);
        assert_eq!(closure.precision_text(), "Exact (closed)");
        assert_relative_eq!(closure.perimeter, 400.0, epsilon = 1e-9);
    }

    #[test]
    fn closes_the_recorded_rounded_traverse() {
        let spatial = spatial_meters();
        let record = record_closure(&polygon_courses(&square(), &spatial, None), RecordClosureOptions::default());
        assert_eq!(record.precision_text(), "Exact (closed)");

        let tri: Polygon = vec![
            Point::new(0.0, 0.0),
            Point::new(100.0, 0.0),
            Point::new(40.0, 70.0),
        ];
        let rec = record_closure(&polygon_courses(&tri, &spatial, None), RecordClosureOptions::default());
        assert!(rec.linear_misclosure < 0.05);
        assert!(rec.perimeter > 0.0);
    }

    #[test]
    fn gives_90_degrees_at_every_corner_of_a_square() {
        let angles = interior_angles(&square());
        for a in &angles {
            assert_relative_eq!(*a, 90.0, epsilon = 1e-6);
        }
        assert_relative_eq!(angles.iter().sum::<f64>(), 360.0, epsilon = 1e-6);
    }

    #[test]
    fn sums_to_n_minus_2_times_180_and_finds_the_reflex_corner() {
        let poly = ell();
        let angles = interior_angles(&poly);
        assert_relative_eq!(
            angles.iter().sum::<f64>(),
            (poly.len() as f64 - 2.0) * 180.0,
            epsilon = 1e-6
        );
        let reflex: Vec<&f64> = angles.iter().filter(|a| **a > 180.0).collect();
        assert_eq!(reflex.len(), 1);
        assert_relative_eq!(*reflex[0], 270.0, epsilon = 1e-6);
    }

    #[test]
    fn recovers_the_azimuth_from_a_quadrant_bearing() {
        for az in [15.5, 100.25, 210.9, 355.1, 44.999] {
            assert_relative_eq!(bearing_to_azimuth(&azimuth_to_bearing(az)), az, epsilon = 1e-3);
        }
    }

    #[test]
    fn dmd_area_agrees_with_shoelace_area_independently() {
        let spatial = spatial_meters();
        for poly in [square(), ell()] {
            let dmd = dmd_area(&polygon_courses(&poly, &spatial, None));
            assert_relative_eq!(dmd, polygon_area(&poly), epsilon = 1e-6);
        }
    }

    #[test]
    fn full_report_carries_angles_record_closure_and_verified_dmd_area() {
        let spatial = spatial_meters();
        let report = survey_report(&ell(), &spatial, None);
        assert_relative_eq!(report.angles_sum, report.angles_expected, epsilon = 1e-6);
        assert_relative_eq!(report.angles_expected, 720.0, epsilon = 1e-9);
        assert_relative_eq!(report.area_by_dmd, report.area.square_units, epsilon = 1e-4);
        assert_relative_eq!(report.area_by_dmd, 3600.0, epsilon = 1e-4);
        assert!(report.record.linear_misclosure >= 0.0);
    }

    #[test]
    fn assigns_positive_local_northing_easting() {
        let coords = boundary_coordinates(&square(), CoordinateBasis::default());
        assert_eq!(coords[0].label(), "P1");
        assert_relative_eq!(coords[0].easting, 5000.0, epsilon = 1e-9);
        assert_relative_eq!(coords[0].northing, 5000.0, epsilon = 1e-9);
        assert_eq!(coords[2].label(), "P3");
        assert_relative_eq!(coords[2].easting, 5100.0, epsilon = 1e-9);
        assert_relative_eq!(coords[2].northing, 4900.0, epsilon = 1e-9);
    }

    #[test]
    fn reports_area_in_survey_units_and_acres() {
        let spatial = spatial_meters();
        let report = survey_report(&square(), &spatial, None);
        assert_relative_eq!(report.area.square_meters, 10000.0, epsilon = 1e-6);
        assert_relative_eq!(report.area.acres, 2.471, epsilon = 1e-2);
    }

    #[test]
    fn curved_tract_reports_curve_table_and_arc_aware_area_perimeter() {
        let spatial = spatial_meters();
        let mut arcs = EdgeArcs::new();
        arcs.insert("0".to_string(), -1.0);
        let semi = std::f64::consts::PI * 50.0 * 50.0 / 2.0;

        let report = survey_report(&square(), &spatial, Some(&arcs));
        assert!(report.has_curves);
        assert_eq!(report.curves.len(), 1);
        let c = &report.curves[0];
        assert_eq!(c.label, "C1");
        assert_relative_eq!(c.radius, 50.0, epsilon = 1e-6);
        assert_relative_eq!(c.delta, 180.0, epsilon = 1e-6);
        assert_relative_eq!(c.arc_length, std::f64::consts::PI * 50.0, epsilon = 1e-6);

        assert_relative_eq!(report.area.square_units, 10000.0 + semi, epsilon = 1e-3);
        assert_relative_eq!(report.perimeter, 300.0 + std::f64::consts::PI * 50.0, epsilon = 1e-6);
        assert_relative_eq!(report.area.square_units - report.area_by_dmd, semi, epsilon = 1e-3);
    }

    #[test]
    fn describes_the_curve_in_the_legal_description() {
        let spatial = spatial_meters();
        let mut arcs = EdgeArcs::new();
        arcs.insert("0".to_string(), -1.0);
        let text = legal_description(
            &square(),
            &spatial,
            &LegalDescriptionOptions {
                tract_name: Some("Lot 7".to_string()),
                context: None,
            },
            Some(&arcs),
        );
        assert!(text.contains("along a curve to the"));
        assert!(text.contains("radius of"));
        assert!(text.contains("arc length of"));
    }

    #[test]
    fn legal_description_reads_as_a_metes_and_bounds_description() {
        let spatial = spatial_meters();
        let text = legal_description(
            &square(),
            &spatial,
            &LegalDescriptionOptions {
                tract_name: Some("Lot 1".to_string()),
                context: Some("Test Subdivision".to_string()),
            },
            None,
        );
        assert!(text.contains("BEGINNING at the Point of Beginning"));
        assert!(text.contains("thence Due East"));
        assert!(text.contains("the POINT OF BEGINNING"));
        assert!(text.contains("acres"));
        assert!(text.contains("Test Subdivision"));
    }

    #[test]
    fn parses_cardinal_directions() {
        assert_eq!(
            parse_bearing("Due North").unwrap(),
            QuadrantBearing {
                ns: NorthSouth::N,
                degrees: 0,
                minutes: 0,
                seconds: 0,
                ew: EastWest::E,
                cardinal: Some(Cardinal::N)
            }
        );
        assert_eq!(
            parse_bearing("N").unwrap(),
            QuadrantBearing {
                ns: NorthSouth::N,
                degrees: 0,
                minutes: 0,
                seconds: 0,
                ew: EastWest::E,
                cardinal: Some(Cardinal::N)
            }
        );
        assert_eq!(
            parse_bearing("Due West").unwrap(),
            QuadrantBearing {
                ns: NorthSouth::N,
                degrees: 90,
                minutes: 0,
                seconds: 0,
                ew: EastWest::W,
                cardinal: Some(Cardinal::W)
            }
        );
    }

    #[test]
    fn parses_standard_quadrant_bearings() {
        assert_eq!(
            parse_bearing("N 45-30-15 E").unwrap(),
            QuadrantBearing {
                ns: NorthSouth::N,
                degrees: 45,
                minutes: 30,
                seconds: 15,
                ew: EastWest::E,
                cardinal: None
            }
        );
        assert_eq!(
            parse_bearing("S45.5W").unwrap(),
            QuadrantBearing {
                ns: NorthSouth::S,
                degrees: 45,
                minutes: 30,
                seconds: 0,
                ew: EastWest::W,
                cardinal: None
            }
        );
        assert_eq!(
            parse_bearing("N 45\u{b0}30'15\" E").unwrap(),
            QuadrantBearing {
                ns: NorthSouth::N,
                degrees: 45,
                minutes: 30,
                seconds: 15,
                ew: EastWest::E,
                cardinal: None
            }
        );
    }

    #[test]
    fn throws_on_invalid_bearings() {
        assert!(parse_bearing("Invalid").is_err());
        assert!(matches!(
            parse_bearing("N 100 E").unwrap_err(),
            SurveyError::BearingAngleOutOfRange(_)
        ));
    }

    fn manual_course(
        from: Point,
        to: Point,
        bearing: QuadrantBearing,
        bearing_text: &str,
        distance: f64,
        latitude: f64,
        departure: f64,
        index: u32,
    ) -> SurveyCourse {
        SurveyCourse {
            index,
            course_type: CourseType::Line,
            from,
            to,
            from_label: corner_label((index - 1) as usize),
            to_label: corner_label((index % 4) as usize),
            azimuth: bearing_to_azimuth(&bearing),
            bearing,
            bearing_text: bearing_text.to_string(),
            distance,
            distance_meters: distance,
            latitude,
            departure,
            curve: None,
        }
    }

    #[test]
    fn closes_an_open_traverse_using_compass_rule() {
        let due_east = QuadrantBearing {
            ns: NorthSouth::N,
            degrees: 90,
            minutes: 0,
            seconds: 0,
            ew: EastWest::E,
            cardinal: Some(Cardinal::E),
        };
        let due_south = QuadrantBearing {
            ns: NorthSouth::S,
            degrees: 0,
            minutes: 0,
            seconds: 0,
            ew: EastWest::E,
            cardinal: Some(Cardinal::S),
        };
        let due_west = QuadrantBearing {
            ns: NorthSouth::N,
            degrees: 90,
            minutes: 0,
            seconds: 0,
            ew: EastWest::W,
            cardinal: Some(Cardinal::W),
        };
        let due_north = QuadrantBearing {
            ns: NorthSouth::N,
            degrees: 0,
            minutes: 0,
            seconds: 0,
            ew: EastWest::E,
            cardinal: Some(Cardinal::N),
        };

        let courses = vec![
            manual_course(Point::new(0.0, 0.0), Point::new(100.0, 0.0), due_east, "Due East", 100.0, 0.0, 100.0, 1),
            manual_course(Point::new(100.0, 0.0), Point::new(100.0, 100.0), due_south, "Due South", 100.0, -100.0, 0.0, 2),
            manual_course(Point::new(100.0, 100.0), Point::new(0.0, 100.0), due_west, "Due West", 100.0, 0.0, -100.0, 3),
            manual_course(Point::new(0.0, 100.0), Point::new(2.0, 0.0), due_north, "Due North", 100.0, 100.0, 2.0, 4),
        ];

        let closure_before = traverse_closure(&courses);
        assert!(closure_before.linear_misclosure > 1.0);
        assert_ne!(closure_before.precision_text(), "Exact (closed)");

        let adjusted = adjust_traverse(&courses, AdjustmentMethod::Compass);
        assert!(adjusted.closure_after.linear_misclosure < 1e-9);
        assert_eq!(adjusted.closure_after.precision_text(), "Exact (closed)");
        assert_eq!(adjusted.courses.last().unwrap().to, Point::new(0.0, 0.0));
    }

    #[test]
    fn closes_an_open_traverse_using_transit_rule() {
        let due_east = QuadrantBearing {
            ns: NorthSouth::N,
            degrees: 90,
            minutes: 0,
            seconds: 0,
            ew: EastWest::E,
            cardinal: Some(Cardinal::E),
        };
        let due_south = QuadrantBearing {
            ns: NorthSouth::S,
            degrees: 0,
            minutes: 0,
            seconds: 0,
            ew: EastWest::E,
            cardinal: Some(Cardinal::S),
        };
        let due_west = QuadrantBearing {
            ns: NorthSouth::N,
            degrees: 90,
            minutes: 0,
            seconds: 0,
            ew: EastWest::W,
            cardinal: Some(Cardinal::W),
        };
        let due_north = QuadrantBearing {
            ns: NorthSouth::N,
            degrees: 0,
            minutes: 0,
            seconds: 0,
            ew: EastWest::E,
            cardinal: Some(Cardinal::N),
        };

        let courses = vec![
            manual_course(Point::new(0.0, 0.0), Point::new(100.0, 0.0), due_east, "Due East", 100.0, 0.0, 100.0, 1),
            manual_course(Point::new(100.0, 0.0), Point::new(100.0, 100.0), due_south, "Due South", 100.0, -100.0, 0.0, 2),
            manual_course(Point::new(100.0, 100.0), Point::new(0.0, 100.0), due_west, "Due West", 100.0, 0.0, -100.0, 3),
            manual_course(Point::new(0.0, 100.0), Point::new(0.0, -2.0), due_north, "Due North", 102.0, 102.0, 0.0, 4),
        ];

        let adjusted = adjust_traverse(&courses, AdjustmentMethod::Transit);
        assert!(adjusted.closure_after.linear_misclosure < 1e-9);
        assert_eq!(adjusted.closure_after.precision_text(), "Exact (closed)");
        assert_eq!(adjusted.courses.last().unwrap().to, Point::new(0.0, 0.0));
    }

    #[test]
    fn zero_course_traverse_returns_unchanged() {
        let adjusted = adjust_traverse(&[], AdjustmentMethod::Compass);
        assert!(adjusted.courses.is_empty());
        assert_eq!(adjusted.closure_before.perimeter, 0.0);
    }

    #[test]
    fn interior_angles_of_a_degenerate_polygon_are_zero() {
        let two_points = vec![Point::new(0.0, 0.0), Point::new(1.0, 1.0)];
        assert_eq!(interior_angles(&two_points), vec![0.0, 0.0]);
    }
}
