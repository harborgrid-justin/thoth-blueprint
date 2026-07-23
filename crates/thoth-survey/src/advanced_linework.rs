//! Advanced linework & geometry tools (REQ-109…REQ-117): line creation from
//! grid coordinates, lat/lon, deflection angles, station/offset, tangents,
//! perpendiculars, and right-of-way parcel generation. Direct port of
//! `packages/domain/src/survey/advancedLinework.ts` and
//! `types/advancedLinework.ts`.

use serde::{Deserialize, Serialize};

use crate::transparent_commands::{LineSegment, Point2D};

/// Presentation style for a [`SurveyFigure`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SurveyFigureStyle {
    pub id: String,
    pub name: String,
    pub line_color: String,
    pub linetype: String,
    pub layer: String,
}

/// A named, styled linework figure (open or closed).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SurveyFigure {
    pub id: String,
    pub name: String,
    pub vertices: Vec<Point2D>,
    pub is_closed: bool,
    pub style: SurveyFigureStyle,
}

/// A linework code-set rule: the drafting action a field code triggers.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum LineworkCodeSetAction {
    Begin,
    End,
    Close,
    ArcStart,
    ArcEnd,
}

/// A single rule in a linework code set.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LineworkCodeSetRule {
    pub code: String,
    pub action: LineworkCodeSetAction,
}

/// A minimal stand-in for `packages/domain/src/civil/types/siteAndParcels.ts::ParcelObject`.
///
/// **Workspace gap.** The real `ParcelObject` (with its `ParcelStyle`,
/// `SiteContainer`, etc.) belongs to the civil/parcel-layout domain owned by
/// `thoth-civil`/`thoth-planning`, neither of which is a dependency of this
/// crate (see `../GAPS.md`). [`create_right_of_way_parcel`] still needs to
/// *return* a parcel-shaped value, so this module defines the narrow local
/// subset of fields that function actually populates. Replace this with the
/// real `thoth_civil`/`thoth_planning` type once cross-crate wiring lands.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RowParcelStyle {
    pub id: String,
    pub name: String,
    pub boundary_color: String,
    pub linetype: String,
    pub layer: String,
}

/// See [`RowParcelStyle`]'s doc comment for the workspace-gap context.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RowParcel {
    pub id: String,
    pub name: String,
    pub number: i32,
    pub site_id: String,
    pub boundary_vertices: Vec<Point2D>,
    pub style: RowParcelStyle,
    pub area_sq_ft: f64,
    pub perimeter_ft: f64,
}

/// REQ-109: Line creation using Grid Northing (y) and Grid Easting (x)
/// coordinates.
pub fn create_line_from_grid_coordinates(
    start_grid: (f64, f64),
    end_grid: (f64, f64),
) -> LineSegment {
    let (start_northing, start_easting) = start_grid;
    let (end_northing, end_easting) = end_grid;
    LineSegment {
        start: Point2D::new(start_easting, start_northing),
        end: Point2D::new(end_easting, end_northing),
    }
}

/// REQ-110: Convert latitude/longitude to grid feet via a spherical Web
/// Mercator projection (the same radius-based approximation the TS
/// original uses, labeled there as "Virginia State Plane / Web Mercator").
pub fn convert_lat_lon_to_grid_feet(lat: f64, lon: f64) -> Point2D {
    const R: f64 = 20_925_604.0; // Radius of Earth in feet.
    let x = R * (lon * std::f64::consts::PI / 180.0);
    let y = R
        * (std::f64::consts::PI / 4.0 + lat * std::f64::consts::PI / 360.0)
            .tan()
            .ln();
    Point2D::new(x, y)
}

/// REQ-110: Line creation using latitude/longitude endpoints.
pub fn create_line_from_lat_lon(start: (f64, f64), end: (f64, f64)) -> LineSegment {
    LineSegment {
        start: convert_lat_lon_to_grid_feet(start.0, start.1),
        end: convert_lat_lon_to_grid_feet(end.0, end.1),
    }
}

/// REQ-111: Line creation using a deflection angle off a reference bearing.
pub fn create_line_from_deflection_angle(
    start_point: Point2D,
    reference_bearing_deg: f64,
    deflection_angle_deg: f64,
    distance_ft: f64,
) -> Point2D {
    let final_azimuth_deg = (reference_bearing_deg + deflection_angle_deg + 360.0) % 360.0;
    let az_rad = final_azimuth_deg.to_radians();
    Point2D::new(
        start_point.x + distance_ft * az_rad.sin(),
        start_point.y + distance_ft * az_rad.cos(),
    )
}

/// REQ-112: Line creation using Station and Offset values relative to an
/// alignment vector. A degenerate (zero-length) alignment falls back to a
/// unit length of 1 (matching the TS `|| 1` fallback) rather than dividing
/// by zero.
pub fn calculate_point_from_station_offset(
    alignment_start: Point2D,
    alignment_end: Point2D,
    station_ft: f64,
    offset_ft: f64,
) -> Point2D {
    let dx = alignment_end.x - alignment_start.x;
    let dy = alignment_end.y - alignment_start.y;
    let len = dx.hypot(dy);
    let len = if len == 0.0 { 1.0 } else { len };

    let ux = dx / len;
    let uy = dy / len;

    let station_x = alignment_start.x + ux * station_ft;
    let station_y = alignment_start.y + uy * station_ft;

    // Normal vector (right perpendicular = (uy, -ux)).
    let perp_x = uy;
    let perp_y = -ux;

    Point2D::new(
        station_x + perp_x * offset_ft,
        station_y + perp_y * offset_ft,
    )
}

/// REQ-113: Create a line tangent from an existing point on a curve.
pub fn create_line_tangent_from_point(
    curve_center: Point2D,
    curve_point: Point2D,
    distance_ft: f64,
) -> LineSegment {
    let rx = curve_point.x - curve_center.x;
    let ry = curve_point.y - curve_center.y;
    let r_len = rx.hypot(ry);
    let r_len = if r_len == 0.0 { 1.0 } else { r_len };

    // Tangent vector is perpendicular to the radius vector.
    let tx = -ry / r_len;
    let ty = rx / r_len;

    LineSegment {
        start: curve_point,
        end: Point2D::new(
            curve_point.x + tx * distance_ft,
            curve_point.y + ty * distance_ft,
        ),
    }
}

/// REQ-114: Create a line perpendicular from an existing point to a
/// reference line.
pub fn create_line_perpendicular_from_point(from_point: Point2D, line: LineSegment) -> LineSegment {
    let dx = line.end.x - line.start.x;
    let dy = line.end.y - line.start.y;
    let len_sq = dx * dx + dy * dy;
    let len_sq = if len_sq == 0.0 { 1.0 } else { len_sq };

    let t = ((from_point.x - line.start.x) * dx + (from_point.y - line.start.y) * dy) / len_sq;

    let projection_point = Point2D::new(line.start.x + t * dx, line.start.y + t * dy);

    LineSegment {
        start: from_point,
        end: projection_point,
    }
}

/// REQ-117: Dedicated Create Right of Way tool for parcel geometry
/// generation, given a frontage line, the R.O.W. width, and the remainder
/// parcel's depth (default 100 ft, matching the TS default parameter).
pub fn create_right_of_way_parcel(
    frontage_line: LineSegment,
    row_width_ft: f64,
    parcel_depth_ft: f64,
) -> (RowParcel, Vec<Point2D>) {
    let dx = frontage_line.end.x - frontage_line.start.x;
    let dy = frontage_line.end.y - frontage_line.start.y;
    let len = dx.hypot(dy);
    let len = if len == 0.0 { 1.0 } else { len };

    let ux = dx / len;
    let uy = dy / len;

    // Normal vector into the parcel.
    let nx = -uy;
    let ny = ux;

    let p1 = frontage_line.start;
    let p2 = frontage_line.end;
    let p3 = Point2D::new(p2.x + nx * row_width_ft, p2.y + ny * row_width_ft);
    let p4 = Point2D::new(p1.x + nx * row_width_ft, p1.y + ny * row_width_ft);

    let row_vertices = vec![p1, p2, p3, p4];

    // Remainder parcel behind the R.O.W.
    let r1 = p4;
    let r2 = p3;
    let r3 = Point2D::new(p3.x + nx * parcel_depth_ft, p3.y + ny * parcel_depth_ft);
    let r4 = Point2D::new(p4.x + nx * parcel_depth_ft, p4.y + ny * parcel_depth_ft);
    let remainder_vertices = vec![r1, r2, r3, r4];

    let row_parcel = RowParcel {
        id: "row-parcel".to_string(),
        name: "VDOT R.O.W. Dedication".to_string(),
        number: 999,
        site_id: "site-row".to_string(),
        boundary_vertices: row_vertices,
        style: RowParcelStyle {
            id: "s-row".to_string(),
            name: "R.O.W.".to_string(),
            boundary_color: "#FF00FF".to_string(),
            linetype: "CENTER".to_string(),
            layer: "C-ROAD-ROW".to_string(),
        },
        area_sq_ft: len * row_width_ft,
        perimeter_ft: 2.0 * (len + row_width_ft),
    };

    (row_parcel, remainder_vertices)
}

/// REQ-117 with the TS default `parcel_depth_ft` of 100 ft.
pub fn create_right_of_way_parcel_default_depth(
    frontage_line: LineSegment,
    row_width_ft: f64,
) -> (RowParcel, Vec<Point2D>) {
    create_right_of_way_parcel(frontage_line, row_width_ft, 100.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn grid_coordinates_swap_northing_easting_into_x_y() {
        let seg = create_line_from_grid_coordinates((100.0, 200.0), (110.0, 210.0));
        assert_eq!(seg.start, Point2D::new(200.0, 100.0));
        assert_eq!(seg.end, Point2D::new(210.0, 110.0));
    }

    #[test]
    fn deflection_angle_wraps_into_0_360() {
        let p = create_line_from_deflection_angle(Point2D::new(0.0, 0.0), 350.0, 20.0, 10.0);
        // final azimuth = (350 + 20 + 360) % 360 = 10 degrees
        let az_rad = 10f64.to_radians();
        assert_relative_eq!(p.x, 10.0 * az_rad.sin(), epsilon = 1e-9);
        assert_relative_eq!(p.y, 10.0 * az_rad.cos(), epsilon = 1e-9);
    }

    #[test]
    fn station_offset_degenerate_alignment_does_not_divide_by_zero() {
        let p = calculate_point_from_station_offset(
            Point2D::new(5.0, 5.0),
            Point2D::new(5.0, 5.0),
            10.0,
            2.0,
        );
        assert!(p.x.is_finite() && p.y.is_finite());
    }

    #[test]
    fn right_of_way_parcel_has_expected_area_and_remainder_shape() {
        let frontage = LineSegment {
            start: Point2D::new(0.0, 0.0),
            end: Point2D::new(100.0, 0.0),
        };
        let (row, remainder) = create_right_of_way_parcel_default_depth(frontage, 54.0);
        assert_relative_eq!(row.area_sq_ft, 100.0 * 54.0, epsilon = 1e-9);
        assert_eq!(remainder.len(), 4);
    }

    #[test]
    fn tangent_line_is_perpendicular_to_the_radius() {
        let center = Point2D::new(0.0, 0.0);
        let point_on_curve = Point2D::new(10.0, 0.0);
        let tangent = create_line_tangent_from_point(center, point_on_curve, 5.0);
        let radius_vec = (point_on_curve.x - center.x, point_on_curve.y - center.y);
        let tangent_vec = (
            tangent.end.x - tangent.start.x,
            tangent.end.y - tangent.start.y,
        );
        let dot = radius_vec.0 * tangent_vec.0 + radius_vec.1 * tangent_vec.1;
        assert_relative_eq!(dot, 0.0, epsilon = 1e-9);
    }
}
