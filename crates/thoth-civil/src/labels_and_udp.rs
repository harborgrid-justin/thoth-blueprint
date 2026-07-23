//! Dynamic annotations & parcel labels — REQ-036 through REQ-046.
//!
//! Port of `packages/domain/src/civil/labelsAndUDP.ts`. The TS source
//! imports `Point2D`/`LineSegment` from
//! `packages/domain/src/survey/transparentCommands` (here:
//! `thoth_spatial::Point`/[`crate::common::LineSegment`]) and `ParcelObject`
//! from `./siteAndParcels` (here: [`crate::site_and_parcels::ParcelObject`],
//! already ported in this crate).
//!
//! **Adapted from a registry-keyed "engine" to direct references.** The TS
//! `LabelEngine` class holds a private `Map<string, AnnotationLabelStyle>`
//! seeded with a default style, and [`create_child_style`]/
//! [`generate_area_label`]/etc. look styles up by id. This crate takes the
//! parent style directly (`&AnnotationLabelStyle`) instead: the "parent
//! style not found" error class the TS source can throw simply cannot
//! occur when the caller must already hold the style to pass it in.

use crate::common::{calculate_polygon_centroid, LineSegment};
use crate::site_and_parcels::ParcelObject;
use thoth_spatial::Point;

/// The id of the crate-level default label style returned by
/// [`default_label_style`] (mirrors the TS `'style-parent-default'` map
/// key).
pub const DEFAULT_LABEL_STYLE_ID: &str = "style-parent-default";

/// A label's font/color/orientation style, optionally inheriting from a
/// parent style (REQ-041).
#[derive(Debug, Clone, PartialEq)]
pub struct AnnotationLabelStyle {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub font_size: f64,
    pub text_color: String,
    /// REQ-042: prevents upside-down text presentation.
    pub plan_readability: bool,
    pub text_orientation_angle_deg: Option<f64>,
}

/// The crate-level default label style (10pt white, plan-readable).
pub fn default_label_style() -> AnnotationLabelStyle {
    AnnotationLabelStyle {
        id: DEFAULT_LABEL_STYLE_ID.to_string(),
        name: "Standard Label".to_string(),
        parent_id: None,
        font_size: 10.0,
        text_color: "#FFFFFF".to_string(),
        plan_readability: true,
        text_orientation_angle_deg: None,
    }
}

/// Field-level overrides for [`create_child_style`]. `Some(_)` overwrites
/// the parent's value; `None` inherits it — see
/// [`crate::site_and_parcels::UserDefinedClassificationData`] for the same
/// pattern used elsewhere in this crate.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct LabelStyleOverrides {
    pub font_size: Option<f64>,
    pub text_color: Option<String>,
    pub plan_readability: Option<bool>,
    pub text_orientation_angle_deg: Option<Option<f64>>,
}

/// REQ-041: derive a child label style inheriting from `parent`.
pub fn create_child_style(
    parent: &AnnotationLabelStyle,
    name: impl Into<String>,
    overrides: LabelStyleOverrides,
) -> AnnotationLabelStyle {
    AnnotationLabelStyle {
        id: thoth_spatial::create_id("style-child"),
        name: name.into(),
        parent_id: Some(parent.id.clone()),
        font_size: overrides.font_size.unwrap_or(parent.font_size),
        text_color: overrides
            .text_color
            .unwrap_or_else(|| parent.text_color.clone()),
        plan_readability: overrides
            .plan_readability
            .unwrap_or(parent.plan_readability),
        text_orientation_angle_deg: overrides
            .text_orientation_angle_deg
            .unwrap_or(parent.text_orientation_angle_deg),
    }
}

/// An automatically placed parcel area label (REQ-036, REQ-037).
#[derive(Debug, Clone, PartialEq)]
pub struct AreaLabel {
    pub id: String,
    pub parcel_id: String,
    pub position: Point,
    pub text: String,
    pub style: AnnotationLabelStyle,
}

/// How a segment label displays its geometric data.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SegmentLabelDisplayFormat {
    BearingOverDistance,
    DeltaOverLength,
    RadiusValue,
}

/// A label offset in plan units.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LabelOffset {
    pub dx: f64,
    pub dy: f64,
}

/// A parcel-line or curve segment label.
#[derive(Debug, Clone, PartialEq)]
pub struct SegmentLabel {
    pub id: String,
    pub segment: LineSegment,
    pub is_curve: bool,
    pub radius: Option<f64>,
    pub delta_angle_deg: Option<f64>,
    pub arc_length: Option<f64>,
    pub bearing_text: String,
    pub distance_text: String,
    pub display_format: SegmentLabelDisplayFormat,
    pub style: AnnotationLabelStyle,
    /// REQ-043.
    pub is_reversed: bool,
    /// REQ-044.
    pub is_flipped: bool,
    pub position_offset: LabelOffset,
}

/// REQ-038: parcel address/tax id/custom user-defined properties.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct UserDefinedProperties {
    pub parcel_address: Option<String>,
    pub parcel_tax_id: Option<String>,
    pub custom_attributes: Option<Vec<(String, String)>>,
}

/// REQ-036, REQ-037: generate an area label at a parcel's centroid,
/// falling back to [`default_label_style`] if none is given.
pub fn generate_area_label(
    parcel: &ParcelObject,
    style: Option<&AnnotationLabelStyle>,
) -> AreaLabel {
    let centroid = calculate_polygon_centroid(&parcel.boundary_vertices);
    let active_style = style.cloned().unwrap_or_else(default_label_style);

    let text = format!(
        "{}\nArea: {:.2} Sq. Ft.\n({:.3} Acres)",
        parcel.name,
        parcel.area_sq_ft,
        parcel.area_sq_ft / 43_560.0
    );

    AreaLabel {
        id: format!("lbl-area-{}", parcel.id),
        parcel_id: parcel.id.clone(),
        position: centroid,
        text,
        style: active_style,
    }
}

fn azimuth_deg_of(segment: LineSegment) -> f64 {
    let dx = segment.end.x - segment.start.x;
    let dy = segment.end.y - segment.start.y;
    let mut az_rad = dx.atan2(dy);
    if az_rad < 0.0 {
        az_rad += 2.0 * std::f64::consts::PI;
    }
    az_rad.to_degrees()
}

/// REQ-039, REQ-040: generate an automatic/manual segment label for a
/// parcel line or curve.
pub fn generate_segment_label(
    segment: LineSegment,
    is_curve: bool,
    radius: Option<f64>,
    arc_length: Option<f64>,
    delta_angle_deg: Option<f64>,
) -> SegmentLabel {
    let dist = segment.length();
    let az_deg = azimuth_deg_of(segment);

    SegmentLabel {
        id: thoth_spatial::create_id("lbl-seg"),
        segment,
        is_curve,
        radius,
        delta_angle_deg,
        arc_length,
        bearing_text: format_azimuth_to_dms(az_deg),
        distance_text: format!("{dist:.2}'"),
        display_format: if is_curve {
            SegmentLabelDisplayFormat::DeltaOverLength
        } else {
            SegmentLabelDisplayFormat::BearingOverDistance
        },
        style: default_label_style(),
        is_reversed: false,
        is_flipped: false,
        position_offset: LabelOffset { dx: 0.0, dy: 5.0 },
    }
}

/// REQ-042: enforce Plan Readability — keep the reading direction between
/// 90 and 270 degrees so text never displays upside-down.
pub fn apply_plan_readability(angle_deg: f64) -> f64 {
    let normalized = angle_deg.rem_euclid(360.0);
    if normalized > 90.0 && normalized < 270.0 {
        (normalized + 180.0).rem_euclid(360.0)
    } else {
        normalized
    }
}

/// REQ-043: reverse a segment label's bearing direction.
pub fn reverse_label(label: &SegmentLabel) -> SegmentLabel {
    let reversed_az = (parse_dms_to_azimuth(&label.bearing_text) + 180.0).rem_euclid(360.0);
    SegmentLabel {
        bearing_text: format_azimuth_to_dms(reversed_az),
        is_reversed: !label.is_reversed,
        ..label.clone()
    }
}

/// REQ-044: flip a segment label's display side.
pub fn flip_label(label: &SegmentLabel) -> SegmentLabel {
    SegmentLabel {
        is_flipped: !label.is_flipped,
        position_offset: LabelOffset {
            dx: -label.position_offset.dx,
            dy: -label.position_offset.dy,
        },
        ..label.clone()
    }
}

/// REQ-045: recompute a segment label's text from a new segment geometry,
/// preserving its id, style, and reversed/flipped state.
pub fn update_label_on_geometry_change(
    label: &SegmentLabel,
    new_segment: LineSegment,
) -> SegmentLabel {
    let updated = generate_segment_label(
        new_segment,
        label.is_curve,
        label.radius,
        label.arc_length,
        label.delta_angle_deg,
    );
    SegmentLabel {
        id: label.id.clone(),
        style: label.style.clone(),
        is_reversed: label.is_reversed,
        is_flipped: label.is_flipped,
        ..updated
    }
}

/// Either label kind a parcel/site can carry (REQ-046).
#[derive(Debug, Clone, PartialEq)]
pub enum ParcelLabel {
    Area(AreaLabel),
    Segment(SegmentLabel),
}

/// REQ-046: preserve a label's data (view frame/sheet references) even if
/// its parent alignment is deleted. A deliberate no-op — matching the TS
/// source, which spreads the label into an identical copy — documenting
/// that no cleanup/cascading-delete step touches label data here.
pub fn preserve_label_orphan_data(label: ParcelLabel) -> ParcelLabel {
    label
}

/// REQ-036 (label text): format a signed azimuth (0-360, clockwise from
/// north) as a quadrant bearing in degrees-minutes-seconds, e.g.
/// `"N 45° 00' 00" E"`.
pub fn format_azimuth_to_dms(azimuth_deg: f64) -> String {
    let (quad, quad2, bearing_val) = if (0.0..=90.0).contains(&azimuth_deg) {
        ("N", "E", azimuth_deg)
    } else if azimuth_deg > 90.0 && azimuth_deg <= 180.0 {
        ("S", "E", 180.0 - azimuth_deg)
    } else if azimuth_deg > 180.0 && azimuth_deg <= 270.0 {
        ("S", "W", azimuth_deg - 180.0)
    } else {
        ("N", "W", 360.0 - azimuth_deg)
    };

    let deg = bearing_val.floor() as i64;
    let min_float = (bearing_val - deg as f64) * 60.0;
    let min = min_float.floor() as i64;
    let sec = ((min_float - min as f64) * 60.0).round() as i64;

    format!("{quad} {deg}\u{b0} {min:02}' {sec:02}\" {quad2}")
}

/// Parse a `"N 45° 00' 00" E"`-style bearing string back into a 0-360
/// azimuth. Returns `0.0` for an unrecognized format, matching the TS
/// source's own silent fallback.
pub fn parse_dms_to_azimuth(dms_str: &str) -> f64 {
    let re_groups = parse_bearing_components(dms_str);
    let Some((q1, d, m, s, q2)) = re_groups else {
        return 0.0;
    };

    let val = d + m / 60.0 + s / 3600.0;

    match (q1, q2) {
        ('N', 'E') => val,
        ('S', 'E') => 180.0 - val,
        ('S', 'W') => 180.0 + val,
        ('N', 'W') => 360.0 - val,
        _ => val,
    }
}

/// Extract `(N|S, degrees, minutes, seconds, E|W)` from a DMS bearing
/// string, mirroring the TS source's regex
/// `/([NS])\s*(\d+)°\s*(\d+)'\s*(\d+)"\s*([EW])/i`.
fn parse_bearing_components(input: &str) -> Option<(char, f64, f64, f64, char)> {
    let mut chars = input.trim().chars().peekable();
    let q1 = chars.next()?.to_ascii_uppercase();
    if q1 != 'N' && q1 != 'S' {
        return None;
    }
    skip_whitespace(&mut chars);
    let d = take_digits(&mut chars)?;
    skip_char(&mut chars, '\u{b0}')?;
    skip_whitespace(&mut chars);
    let m = take_digits(&mut chars)?;
    skip_char(&mut chars, '\'')?;
    skip_whitespace(&mut chars);
    let s = take_digits(&mut chars)?;
    skip_char(&mut chars, '"')?;
    skip_whitespace(&mut chars);
    let q2 = chars.next()?.to_ascii_uppercase();
    if q2 != 'E' && q2 != 'W' {
        return None;
    }

    Some((q1, d as f64, m as f64, s as f64, q2))
}

fn skip_whitespace(chars: &mut std::iter::Peekable<std::str::Chars>) {
    while chars.peek().is_some_and(|c| c.is_whitespace()) {
        chars.next();
    }
}

fn skip_char(chars: &mut std::iter::Peekable<std::str::Chars>, expected: char) -> Option<()> {
    if chars.next()? == expected {
        Some(())
    } else {
        None
    }
}

fn take_digits(chars: &mut std::iter::Peekable<std::str::Chars>) -> Option<u32> {
    let mut digits = String::new();
    while chars.peek().is_some_and(|c| c.is_ascii_digit()) {
        digits.push(chars.next().unwrap());
    }
    if digits.is_empty() {
        None
    } else {
        digits.parse().ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::site_and_parcels::ParcelStyle;
    use approx::assert_relative_eq;

    fn parcel() -> ParcelObject {
        ParcelObject {
            id: "parcel-1".to_string(),
            name: "Lot 101".to_string(),
            number: 101,
            site_id: "site-1".to_string(),
            boundary_vertices: vec![
                Point::new(0.0, 0.0),
                Point::new(100.0, 0.0),
                Point::new(100.0, 100.0),
                Point::new(0.0, 100.0),
            ],
            arcs: None,
            style: ParcelStyle {
                id: "s".to_string(),
                name: "s".to_string(),
                boundary_color: "#fff".to_string(),
                linetype: "CONTINUOUS".to_string(),
                layer: "C-PROP".to_string(),
            },
            area_sq_ft: 10_000.0,
            perimeter_ft: 400.0,
            elevation_ft: None,
            address: None,
            tax_id: None,
            user_classification: None,
        }
    }

    #[test]
    fn generate_area_label_uses_centroid_and_default_style() {
        let label = generate_area_label(&parcel(), None);
        assert_eq!(label.position, Point::new(50.0, 50.0));
        assert_eq!(label.style.id, DEFAULT_LABEL_STYLE_ID);
        assert!(label.text.contains("Area: 10000.00 Sq. Ft."));
    }

    #[test]
    fn create_child_style_inherits_and_overrides() {
        let parent = default_label_style();
        let child = create_child_style(
            &parent,
            "Bold Label",
            LabelStyleOverrides {
                font_size: Some(14.0),
                ..Default::default()
            },
        );
        assert_eq!(child.font_size, 14.0);
        assert_eq!(child.text_color, parent.text_color);
        assert_eq!(child.parent_id, Some(parent.id));
    }

    #[test]
    fn format_azimuth_to_dms_round_trips_each_quadrant() {
        for az in [0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0] {
            let dms = format_azimuth_to_dms(az);
            let back = parse_dms_to_azimuth(&dms);
            assert_relative_eq!(back, az, epsilon = 1.0 / 3600.0);
        }
    }

    #[test]
    fn generate_segment_label_computes_bearing_and_distance() {
        let seg = LineSegment::new(Point::new(0.0, 0.0), Point::new(0.0, 100.0));
        let label = generate_segment_label(seg, false, None, None, None);
        assert_eq!(label.bearing_text, "N 0° 00' 00\" E");
        assert_eq!(label.distance_text, "100.00'");
        assert_eq!(
            label.display_format,
            SegmentLabelDisplayFormat::BearingOverDistance
        );
    }

    #[test]
    fn apply_plan_readability_flips_upside_down_range() {
        assert_relative_eq!(apply_plan_readability(180.0), 0.0);
        assert_relative_eq!(apply_plan_readability(45.0), 45.0);
        assert_relative_eq!(apply_plan_readability(300.0), 300.0);
    }

    #[test]
    fn reverse_label_flips_bearing_180_degrees() {
        let seg = LineSegment::new(Point::new(0.0, 0.0), Point::new(0.0, 100.0));
        let label = generate_segment_label(seg, false, None, None, None);
        let reversed = reverse_label(&label);
        // A due-north bearing reversed lands exactly on the 180° quadrant
        // boundary, which this format (matching the TS source's own
        // boundary convention: `azimuthDeg > 90 && azimuthDeg <= 180`) buckets
        // into the S/E quadrant rather than S/W.
        assert_eq!(reversed.bearing_text, "S 0° 00' 00\" E");
        assert!(reversed.is_reversed);
    }

    #[test]
    fn flip_label_negates_position_offset() {
        let seg = LineSegment::new(Point::new(0.0, 0.0), Point::new(0.0, 100.0));
        let label = generate_segment_label(seg, false, None, None, None);
        let flipped = flip_label(&label);
        assert_eq!(flipped.position_offset.dx, -label.position_offset.dx);
        assert_eq!(flipped.position_offset.dy, -label.position_offset.dy);
        assert!(flipped.is_flipped);
    }

    #[test]
    fn update_label_on_geometry_change_preserves_identity() {
        let seg = LineSegment::new(Point::new(0.0, 0.0), Point::new(0.0, 100.0));
        let label = generate_segment_label(seg, false, None, None, None);
        let new_seg = LineSegment::new(Point::new(0.0, 0.0), Point::new(100.0, 0.0));
        let updated = update_label_on_geometry_change(&label, new_seg);
        assert_eq!(updated.id, label.id);
        assert_eq!(updated.bearing_text, "N 90° 00' 00\" E");
    }

    #[test]
    fn preserve_label_orphan_data_is_identity() {
        let label = ParcelLabel::Area(generate_area_label(&parcel(), None));
        let preserved = preserve_label_orphan_data(label.clone());
        assert_eq!(preserved, label);
    }

    #[test]
    fn parse_dms_to_azimuth_returns_zero_for_unrecognized_input() {
        assert_eq!(parse_dms_to_azimuth("not a bearing"), 0.0);
    }
}
