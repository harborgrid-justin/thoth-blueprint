//! Small display/formatting helpers used by the Civil Studio UI layer:
//! station and bearing text formatting, and polygon-to-SVG-path conversion.
//!
//! Port of `packages/domain/src/civil/helpers/civilStudioHelpers.ts`.

use thoth_spatial::Point;

/// Formats a station value in feet into standard Civil 3D notation (e.g.
/// `1250` → `"12+50.00"`). Distinct from [`crate::common::format_station`]:
/// this one always uses 2 fraction digits and doesn't support negative
/// stations, matching the TS helper exactly.
pub fn format_station(station_ft: f64) -> String {
    let rounded = (station_ft * 100.0).round() / 100.0;
    let major = (rounded / 100.0).floor();
    let minor_value = rounded % 100.0;
    let minor = format!("{:.2}", minor_value);
    let minor_padded = if minor.len() < 5 { format!("{}{}", "0".repeat(5 - minor.len()), minor) } else { minor };
    format!("{}+{}", major as i64, minor_padded)
}

/// Formats a bearing angle in degrees into a degrees-minutes-seconds string.
pub fn format_bearing_dms(bearing_deg: f64) -> String {
    let deg = bearing_deg.floor();
    let min_float = (bearing_deg - deg) * 60.0;
    let min = min_float.floor();
    let sec = ((min_float - min) * 60.0).round();
    format!("{}°{:02}'{:02}\"", deg as i64, min as i64, sec as i64)
}

/// Converts polygon vertices to an SVG path `d` attribute string.
pub fn vertices_to_svg_path(vertices: &[Point], scale: f64, offset_x: f64, offset_y: f64) -> String {
    if vertices.is_empty() {
        return String::new();
    }
    let points_str = vertices
        .iter()
        .enumerate()
        .map(|(i, v)| {
            let px = v.x * scale + offset_x;
            let py = v.y * scale + offset_y;
            format!("{} {:.1} {:.1}", if i == 0 { "M" } else { "L" }, px, py)
        })
        .collect::<Vec<_>>()
        .join(" ");
    format!("{} Z", points_str)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_station_matches_civil3d_notation() {
        assert_eq!(format_station(1250.0), "12+50.00");
        assert_eq!(format_station(0.0), "0+00.00");
    }

    #[test]
    fn format_bearing_dms_splits_degrees_minutes_seconds() {
        assert_eq!(format_bearing_dms(45.5), "45°30'00\"");
    }

    #[test]
    fn vertices_to_svg_path_builds_moveto_lineto_close() {
        let verts = vec![Point::new(0.0, 0.0), Point::new(10.0, 0.0), Point::new(10.0, 10.0)];
        let path = vertices_to_svg_path(&verts, 1.0, 0.0, 0.0);
        assert_eq!(path, "M 0.0 0.0 L 10.0 0.0 L 10.0 10.0 Z");
    }

    #[test]
    fn vertices_to_svg_path_of_empty_input_is_empty() {
        assert_eq!(vertices_to_svg_path(&[], 1.0, 0.0, 0.0), "");
    }
}
