//! Dimensioning — dimension styles and dimension entities, with the geometry
//! a renderer needs to draw witness/extension lines, the dimension line,
//! arrowheads or ticks, and the measurement text. Values are computed in
//! model space and reported in a real-world display unit via the plan's
//! [`SpatialContext`].
//!
//! Supported kinds: linear (horizontal/vertical), aligned, angular, radial,
//! diameter, ordinate, and arc-length.
//!
//! Port of `packages/domain/src/drawing/dimension.ts` and its test suite
//! `drawing/tests/dimension.test.ts` (ported 1:1 below, plus additional edge
//! cases — zero-length dimensions, zero-radius radial/arc-length dimensions).

use thoth_spatial::{add, distance, normalize, scale, subtract, Point, SpatialContext, Unit};

use crate::common::format::format_thousands_fixed;
use crate::common::vector::left_normal;

/// Default text height / extension gap / extension-beyond, in paper mm.
/// Reproduced from `federalReference.json`'s `standards.drafting` (see
/// `drafting.rs`'s module rustdoc for why these are duplicated literals).
const DEFAULT_TEXT_HEIGHT_MM: f64 = 2.5;
const DEFAULT_EXTENSION_GAP: f64 = 0.5;
const DEFAULT_EXTENSION_BEYOND: f64 = 0.5;

/// Arrowhead terminator style.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DimArrow {
    Arrow,
    Tick,
    Dot,
    Open,
}

/// How dimension text is displayed.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DimUnit {
    FtIn,
    FtDec,
    In,
    M,
    Cm,
    Mm,
}

/// Horizontal or vertical (linear) / parallel-to-segment (aligned) text
/// alignment mode for a dimension style.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TextAlignment {
    Horizontal,
    Parallel,
    Perpendicular,
}

/// A named dimension style.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct DimensionStyle {
    pub id: String,
    pub label: String,
    pub arrow: DimArrow,
    /// Text height in paper millimetres.
    pub text_height: f64,
    /// Decimal precision for the numeric value.
    pub precision: u32,
    pub unit: DimUnit,
    /// Gap between the object and the start of the witness line, model units.
    pub extension_gap: f64,
    /// How far the witness line extends past the dimension line, model units.
    pub extension_beyond: f64,
    /// Suppress a trailing "0 in" / trailing zeros.
    pub suppress_zero: bool,
    #[serde(default)]
    pub suppress_extension1: bool,
    #[serde(default)]
    pub suppress_extension2: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text_alignment: Option<TextAlignment>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub secondary_unit: Option<DimUnit>,
}

/// Horizontal or vertical distance between two points.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct LinearDimension {
    pub id: String,
    pub style_id: String,
    /// Optional text override (e.g. "EQ", "VIF"); replaces the measured value.
    pub text_override: Option<String>,
    pub a: Point,
    pub b: Point,
    pub axis: Axis,
    /// Perpendicular offset of the dimension line from the points, model units.
    pub offset: f64,
}

/// The axis a linear dimension measures along.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Axis {
    Horizontal,
    Vertical,
}

/// True (aligned) distance between two points.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct AlignedDimension {
    pub id: String,
    pub style_id: String,
    pub text_override: Option<String>,
    pub a: Point,
    pub b: Point,
    pub offset: f64,
}

/// Angle at `vertex` between rays to `a` and `b`.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct AngularDimension {
    pub id: String,
    pub style_id: String,
    pub text_override: Option<String>,
    pub vertex: Point,
    pub a: Point,
    pub b: Point,
    /// Radius of the dimension arc, model units.
    pub radius: f64,
}

/// Radius (or diameter) of an arc/circle.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct RadialDimension {
    pub id: String,
    pub style_id: String,
    pub text_override: Option<String>,
    pub center: Point,
    pub edge: Point,
    #[serde(default)]
    pub diameter: bool,
}

/// Ordinate (X or Y offset from a datum).
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct OrdinateDimension {
    pub id: String,
    pub style_id: String,
    pub text_override: Option<String>,
    pub datum: Point,
    pub point: Point,
    pub axis: OrdinateAxis,
    /// Leader length to the text, model units.
    pub leader: f64,
}

/// Which coordinate an ordinate dimension reports.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OrdinateAxis {
    X,
    Y,
}

/// Arc length along a curved edge.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct ArcLengthDimension {
    pub id: String,
    pub style_id: String,
    pub text_override: Option<String>,
    pub center: Point,
    pub start: Point,
    pub end: Point,
    pub radius: f64,
    pub offset: f64,
}

/// A dimension entity, tagged by kind. All anchor points are in model space.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum Dimension {
    Linear(LinearDimension),
    Aligned(AlignedDimension),
    Angular(AngularDimension),
    Radial(RadialDimension),
    Ordinate(OrdinateDimension),
    ArcLength(ArcLengthDimension),
}

impl Dimension {
    /// The `styleId` of whichever variant this dimension is — used to look
    /// up its [`DimensionStyle`] regardless of kind.
    pub fn style_id(&self) -> &str {
        match self {
            Dimension::Linear(d) => &d.style_id,
            Dimension::Aligned(d) => &d.style_id,
            Dimension::Angular(d) => &d.style_id,
            Dimension::Radial(d) => &d.style_id,
            Dimension::Ordinate(d) => &d.style_id,
            Dimension::ArcLength(d) => &d.style_id,
        }
    }
}

/// A tick or arrow placement with an outward direction.
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct DimTick {
    pub at: Point,
    pub dir: Point,
}

/// The drawable pieces of a dimension, in model space (renderer projects them).
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct DimensionGeometry {
    /// Line segments (witness lines + dimension line / arc chords).
    pub lines: Vec<[Point; 2]>,
    /// Arrow/tick placements with an outward direction.
    pub ticks: Vec<DimTick>,
    /// Where the measurement text is anchored.
    pub text_at: Point,
    /// Text baseline rotation, degrees.
    pub text_angle_deg: f64,
}

/// The measured value, formatted label, and drawable geometry of a dimension.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct MeasuredDimension {
    pub value: f64,
    pub label: String,
    pub geometry: DimensionGeometry,
}

/// Default dimension styles (architectural ticks, engineering arrows, metric).
pub fn default_dim_styles() -> Vec<DimensionStyle> {
    vec![
        DimensionStyle {
            id: "arch-tick".to_string(),
            label: "Architectural (tick)".to_string(),
            arrow: DimArrow::Tick,
            text_height: DEFAULT_TEXT_HEIGHT_MM,
            precision: 0,
            unit: DimUnit::FtIn,
            extension_gap: DEFAULT_EXTENSION_GAP,
            extension_beyond: DEFAULT_EXTENSION_BEYOND,
            suppress_zero: true,
            suppress_extension1: false,
            suppress_extension2: false,
            text_alignment: None,
            secondary_unit: None,
        },
        DimensionStyle {
            id: "eng-arrow".to_string(),
            label: "Engineering (arrow)".to_string(),
            arrow: DimArrow::Arrow,
            text_height: DEFAULT_TEXT_HEIGHT_MM,
            precision: 2,
            unit: DimUnit::FtDec,
            extension_gap: 1.0,
            extension_beyond: 1.0,
            suppress_zero: false,
            suppress_extension1: false,
            suppress_extension2: false,
            text_alignment: None,
            secondary_unit: None,
        },
        DimensionStyle {
            id: "metric".to_string(),
            label: "Metric (arrow)".to_string(),
            arrow: DimArrow::Arrow,
            text_height: DEFAULT_TEXT_HEIGHT_MM,
            precision: 0,
            unit: DimUnit::Mm,
            extension_gap: 1.0,
            extension_beyond: 1.0,
            suppress_zero: true,
            suppress_extension1: false,
            suppress_extension2: false,
            text_alignment: None,
            secondary_unit: None,
        },
        DimensionStyle {
            id: "dual-unit".to_string(),
            label: "Dual Unit".to_string(),
            arrow: DimArrow::Arrow,
            text_height: DEFAULT_TEXT_HEIGHT_MM,
            precision: 2,
            unit: DimUnit::FtDec,
            extension_gap: 1.0,
            extension_beyond: 1.0,
            suppress_zero: false,
            suppress_extension1: false,
            suppress_extension2: false,
            text_alignment: None,
            secondary_unit: Some(DimUnit::M),
        },
        DimensionStyle {
            id: "suppressed-ext".to_string(),
            label: "Suppressed Extensions".to_string(),
            arrow: DimArrow::Tick,
            text_height: DEFAULT_TEXT_HEIGHT_MM,
            precision: 2,
            unit: DimUnit::FtDec,
            extension_gap: 1.0,
            extension_beyond: 1.0,
            suppress_zero: false,
            suppress_extension1: true,
            suppress_extension2: true,
            text_alignment: None,
            secondary_unit: None,
        },
        DimensionStyle {
            id: "align-horizontal".to_string(),
            label: "Align Horizontal".to_string(),
            arrow: DimArrow::Arrow,
            text_height: 2.5,
            precision: 2,
            unit: DimUnit::FtDec,
            extension_gap: 1.0,
            extension_beyond: 1.0,
            suppress_zero: false,
            suppress_extension1: false,
            suppress_extension2: false,
            text_alignment: Some(TextAlignment::Horizontal),
            secondary_unit: None,
        },
        DimensionStyle {
            id: "align-perpendicular".to_string(),
            label: "Align Perpendicular".to_string(),
            arrow: DimArrow::Arrow,
            text_height: 2.5,
            precision: 2,
            unit: DimUnit::FtDec,
            extension_gap: 1.0,
            extension_beyond: 1.0,
            suppress_zero: false,
            suppress_extension1: false,
            suppress_extension2: false,
            text_alignment: Some(TextAlignment::Perpendicular),
            secondary_unit: None,
        },
    ]
}

/// Look up a dimension style (falls back to architectural ticks, matching
/// the TS `dimensionStyle` fallback).
pub fn dimension_style(id: &str) -> DimensionStyle {
    default_dim_styles()
        .into_iter()
        .find(|s| s.id == id)
        .unwrap_or_else(|| default_dim_styles().remove(0))
}

/// Real-world length (in style unit) of a model-space distance.
fn to_display_length(model_dist: f64, spatial: &SpatialContext, unit: DimUnit) -> f64 {
    let meters = model_dist * spatial.units.meters_per_unit();
    match unit {
        DimUnit::M => meters,
        DimUnit::Cm => meters * 100.0,
        DimUnit::Mm => meters * 1000.0,
        DimUnit::In => meters / 0.0254,
        DimUnit::FtIn | DimUnit::FtDec => meters / 0.3048,
    }
}

fn gcd(a: i64, b: i64) -> i64 {
    if b == 0 {
        a
    } else {
        gcd(b, a % b)
    }
}

fn format_single_value(v: f64, unit: DimUnit, precision: u32, suppress_zero: bool) -> String {
    match unit {
        DimUnit::FtIn => {
            let total_in = v * 12.0;
            let mut ft = (total_in / 12.0).floor();
            let rem_in = total_in - ft * 12.0;
            if precision > 0 {
                let denom = 2i64.pow(precision.min(6));
                let num_frac = (rem_in * denom as f64).round() as i64;
                let mut whole_in = num_frac / denom;
                let frac_num = num_frac % denom;
                if whole_in == 12 {
                    ft += 1.0;
                    whole_in = 0;
                }
                if frac_num == 0 {
                    if suppress_zero && whole_in == 0 {
                        return format!("{ft}'");
                    }
                    return format!("{ft}'-{whole_in}\"");
                }
                let g = gcd(frac_num, denom);
                let frac_str = format!("{}/{}", frac_num / g, denom / g);
                if whole_in == 0 {
                    return format!("{ft}'-{frac_str}\"");
                }
                return format!("{ft}'-{whole_in} {frac_str}\"");
            }
            let mut inch = rem_in.round();
            if inch == 12.0 {
                ft += 1.0;
                inch = 0.0;
            }
            if suppress_zero && inch == 0.0 {
                return format!("{ft}'");
            }
            format!("{ft}'-{inch}\"")
        }
        DimUnit::FtDec => format!("{:.*}'", precision as usize, v),
        DimUnit::In => format!("{:.*}\"", precision as usize, v),
        DimUnit::M => format!("{:.*} m", precision as usize, v),
        DimUnit::Cm => format!("{:.*} cm", precision as usize, v),
        DimUnit::Mm => format!("{:.*} mm", precision as usize, v),
    }
}

/// Format a length value per a dimension style.
pub fn format_dim_text(
    model_dist: f64,
    style: &DimensionStyle,
    spatial: &SpatialContext,
) -> String {
    let v1 = to_display_length(model_dist, spatial, style.unit);
    let primary = format_single_value(v1, style.unit, style.precision, style.suppress_zero);
    if let Some(secondary_unit) = style.secondary_unit {
        let v2 = to_display_length(model_dist, spatial, secondary_unit);
        let secondary =
            format_single_value(v2, secondary_unit, style.precision, style.suppress_zero);
        return format!("{primary} [{secondary}]");
    }
    primary
}

/// Measure a dimension: its numeric value, formatted label, and model-space
/// geometry. Angular values are in degrees; all others are display lengths.
pub fn measure_dimension(dim: &Dimension, spatial: &SpatialContext) -> MeasuredDimension {
    let style = dimension_style(dim.style_id());
    match dim {
        Dimension::Linear(d) => measure_linear(d, &style, spatial),
        Dimension::Aligned(d) => measure_aligned(d, &style, spatial),
        Dimension::Angular(d) => measure_angular(d, &style),
        Dimension::Radial(d) => measure_radial(d, &style, spatial),
        Dimension::Ordinate(d) => measure_ordinate(d, &style, spatial),
        Dimension::ArcLength(d) => measure_arc_length(d, &style, spatial),
    }
}

fn measure_aligned(
    dim: &AlignedDimension,
    style: &DimensionStyle,
    spatial: &SpatialContext,
) -> MeasuredDimension {
    let dir = normalize(subtract(dim.b, dim.a));
    let n = left_normal(dir);
    let off = scale(n, dim.offset);
    let a2 = add(dim.a, off);
    let b2 = add(dim.b, off);
    let value = distance(dim.a, dim.b);
    let sign = if dim.offset == 0.0 {
        1.0
    } else {
        dim.offset.signum()
    };
    let gap = scale(n, sign * style.extension_gap);
    let beyond = scale(n, dim.offset + sign * style.extension_beyond);

    let mut lines: Vec<[Point; 2]> = Vec::new();
    if !style.suppress_extension1 {
        lines.push([add(dim.a, gap), add(dim.a, beyond)]);
    }
    if !style.suppress_extension2 {
        lines.push([add(dim.b, gap), add(dim.b, beyond)]);
    }
    lines.push([a2, b2]);

    let mut text_angle_deg = dir.y.atan2(dir.x).to_degrees();
    match style.text_alignment {
        Some(TextAlignment::Horizontal) => text_angle_deg = 0.0,
        Some(TextAlignment::Perpendicular) => text_angle_deg = (text_angle_deg + 90.0) % 360.0,
        _ => {}
    }

    MeasuredDimension {
        value,
        label: dim
            .text_override
            .clone()
            .unwrap_or_else(|| format_dim_text(value, style, spatial)),
        geometry: DimensionGeometry {
            lines,
            ticks: vec![
                DimTick { at: a2, dir },
                DimTick {
                    at: b2,
                    dir: scale(dir, -1.0),
                },
            ],
            text_at: add(scale(add(a2, b2), 0.5), scale(n, 0.6)),
            text_angle_deg,
        },
    }
}

fn measure_linear(
    dim: &LinearDimension,
    style: &DimensionStyle,
    spatial: &SpatialContext,
) -> MeasuredDimension {
    let dir = match dim.axis {
        Axis::Horizontal => Point::new(1.0, 0.0),
        Axis::Vertical => Point::new(0.0, 1.0),
    };
    let n = left_normal(dir);
    let base = match dim.axis {
        Axis::Horizontal => dim.a.y.max(dim.b.y),
        Axis::Vertical => dim.a.x.max(dim.b.x),
    };
    let line_coord = base + dim.offset;
    let a2 = match dim.axis {
        Axis::Horizontal => Point::new(dim.a.x, line_coord),
        Axis::Vertical => Point::new(line_coord, dim.a.y),
    };
    let b2 = match dim.axis {
        Axis::Horizontal => Point::new(dim.b.x, line_coord),
        Axis::Vertical => Point::new(line_coord, dim.b.y),
    };
    let value = match dim.axis {
        Axis::Horizontal => (dim.b.x - dim.a.x).abs(),
        Axis::Vertical => (dim.b.y - dim.a.y).abs(),
    };
    let seg_dir = normalize(subtract(b2, a2));

    let mut lines: Vec<[Point; 2]> = Vec::new();
    if !style.suppress_extension1 {
        lines.push([dim.a, a2]);
    }
    if !style.suppress_extension2 {
        lines.push([dim.b, b2]);
    }
    lines.push([a2, b2]);

    let mut text_angle_deg = match dim.axis {
        Axis::Horizontal => 0.0,
        Axis::Vertical => -90.0,
    };
    match style.text_alignment {
        Some(TextAlignment::Parallel) => text_angle_deg = seg_dir.y.atan2(seg_dir.x).to_degrees(),
        Some(TextAlignment::Perpendicular) => {
            text_angle_deg = (seg_dir.y.atan2(seg_dir.x).to_degrees() + 90.0) % 360.0
        }
        Some(TextAlignment::Horizontal) => text_angle_deg = 0.0,
        None => {}
    }

    MeasuredDimension {
        value,
        label: dim
            .text_override
            .clone()
            .unwrap_or_else(|| format_dim_text(value, style, spatial)),
        geometry: DimensionGeometry {
            lines,
            ticks: vec![
                DimTick {
                    at: a2,
                    dir: seg_dir,
                },
                DimTick {
                    at: b2,
                    dir: scale(seg_dir, -1.0),
                },
            ],
            text_at: add(scale(add(a2, b2), 0.5), scale(n, 0.6)),
            text_angle_deg,
        },
    }
}

fn measure_angular(dim: &AngularDimension, style: &DimensionStyle) -> MeasuredDimension {
    let va = subtract(dim.a, dim.vertex);
    let vb = subtract(dim.b, dim.vertex);
    let ang_a = va.y.atan2(va.x);
    let ang_b = vb.y.atan2(vb.x);
    let mut sweep = ang_b - ang_a;
    while sweep <= -std::f64::consts::PI {
        sweep += 2.0 * std::f64::consts::PI;
    }
    while sweep > std::f64::consts::PI {
        sweep -= 2.0 * std::f64::consts::PI;
    }
    let deg = (sweep.to_degrees()).abs();
    let mid = ang_a + sweep / 2.0;
    let r = dim.radius;
    let steps = (deg / 5.0).ceil().max(2.0) as i64;
    let mut arc_pts: Vec<Point> = Vec::with_capacity(steps as usize + 1);
    for i in 0..=steps {
        let t = ang_a + (sweep * i as f64) / steps as f64;
        arc_pts.push(Point::new(
            dim.vertex.x + r * t.cos(),
            dim.vertex.y + r * t.sin(),
        ));
    }
    let mut lines: Vec<[Point; 2]> = Vec::new();
    for i in 1..arc_pts.len() {
        lines.push([arc_pts[i - 1], arc_pts[i]]);
    }
    lines.push([
        dim.vertex,
        Point::new(
            dim.vertex.x + r * ang_a.cos(),
            dim.vertex.y + r * ang_a.sin(),
        ),
    ]);
    lines.push([
        dim.vertex,
        Point::new(
            dim.vertex.x + r * ang_b.cos(),
            dim.vertex.y + r * ang_b.sin(),
        ),
    ]);
    let decimals = style.precision.saturating_sub(1);
    MeasuredDimension {
        value: deg,
        label: dim
            .text_override
            .clone()
            .unwrap_or_else(|| format!("{:.*}\u{b0}", decimals as usize, deg)),
        geometry: DimensionGeometry {
            lines,
            ticks: vec![],
            text_at: Point::new(
                dim.vertex.x + (r + 1.0) * mid.cos(),
                dim.vertex.y + (r + 1.0) * mid.sin(),
            ),
            text_angle_deg: 0.0,
        },
    }
}

fn measure_radial(
    dim: &RadialDimension,
    style: &DimensionStyle,
    spatial: &SpatialContext,
) -> MeasuredDimension {
    let r = distance(dim.center, dim.edge);
    let value = if dim.diameter { r * 2.0 } else { r };
    let prefix = if dim.diameter { "\u{2300}" } else { "R" };
    let dir = normalize(subtract(dim.edge, dim.center));
    let start = if dim.diameter {
        add(dim.center, scale(dir, -r))
    } else {
        dim.center
    };
    MeasuredDimension {
        value,
        label: dim
            .text_override
            .clone()
            .unwrap_or_else(|| format!("{prefix}{}", format_dim_text(value, style, spatial))),
        geometry: DimensionGeometry {
            lines: vec![[start, dim.edge]],
            ticks: vec![DimTick {
                at: dim.edge,
                dir: scale(dir, -1.0),
            }],
            text_at: add(dim.center, scale(dir, r * 0.55)),
            text_angle_deg: 0.0,
        },
    }
}

fn measure_ordinate(
    dim: &OrdinateDimension,
    style: &DimensionStyle,
    spatial: &SpatialContext,
) -> MeasuredDimension {
    let value = match dim.axis {
        OrdinateAxis::X => dim.point.x - dim.datum.x,
        OrdinateAxis::Y => dim.point.y - dim.datum.y,
    };
    let leader_end = match dim.axis {
        OrdinateAxis::X => Point::new(dim.point.x, dim.point.y - dim.leader),
        OrdinateAxis::Y => Point::new(dim.point.x + dim.leader, dim.point.y),
    };
    MeasuredDimension {
        value: value.abs(),
        label: dim
            .text_override
            .clone()
            .unwrap_or_else(|| format_dim_text(value.abs(), style, spatial)),
        geometry: DimensionGeometry {
            lines: vec![[dim.point, leader_end]],
            ticks: vec![DimTick {
                at: dim.point,
                dir: Point::new(0.0, 1.0),
            }],
            text_at: leader_end,
            text_angle_deg: 0.0,
        },
    }
}

fn measure_arc_length(
    dim: &ArcLengthDimension,
    style: &DimensionStyle,
    spatial: &SpatialContext,
) -> MeasuredDimension {
    let a = subtract(dim.start, dim.center);
    let b = subtract(dim.end, dim.center);
    let mut sweep = b.y.atan2(b.x) - a.y.atan2(a.x);
    while sweep <= -std::f64::consts::PI {
        sweep += 2.0 * std::f64::consts::PI;
    }
    while sweep > std::f64::consts::PI {
        sweep -= 2.0 * std::f64::consts::PI;
    }
    let arc_len = sweep.abs() * dim.radius;
    let steps = ((sweep.abs().to_degrees() / 5.0).ceil()).max(2.0) as i64;
    let start_ang = a.y.atan2(a.x);
    let rr = dim.radius + dim.offset;
    let mut pts: Vec<Point> = Vec::with_capacity(steps as usize + 1);
    for i in 0..=steps {
        let t = start_ang + (sweep * i as f64) / steps as f64;
        pts.push(Point::new(
            dim.center.x + rr * t.cos(),
            dim.center.y + rr * t.sin(),
        ));
    }
    let mut lines: Vec<[Point; 2]> = Vec::new();
    for i in 1..pts.len() {
        lines.push([pts[i - 1], pts[i]]);
    }
    let mid = start_ang + sweep / 2.0;
    MeasuredDimension {
        value: arc_len,
        label: dim
            .text_override
            .clone()
            .unwrap_or_else(|| format!("\u{2312} {}", format_dim_text(arc_len, style, spatial))),
        geometry: DimensionGeometry {
            lines,
            ticks: vec![
                DimTick {
                    at: pts[0],
                    dir: normalize(subtract(pts[1], pts[0])),
                },
                DimTick {
                    at: pts[pts.len() - 1],
                    dir: normalize(subtract(pts[pts.len() - 2], pts[pts.len() - 1])),
                },
            ],
            text_at: Point::new(
                dim.center.x + (rr + 1.0) * mid.cos(),
                dim.center.y + (rr + 1.0) * mid.sin(),
            ),
            text_angle_deg: 0.0,
        },
    }
}

/// A basis for converting local plan coordinates to a survey grid's
/// northing/easting, used by [`format_spot_coordinate`].
///
/// Mirrors `survey/types/survey.ts`'s `CoordinateBasis` exactly (both fields
/// optional). `thoth-drawing` does not depend on `thoth-survey`, so the shape
/// is duplicated here rather than imported; unify during the cross-crate
/// integration pass.
#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct CoordinateBasis {
    /// False easting/northing so local coordinates stay positive.
    pub false_easting: Option<f64>,
    pub false_northing: Option<f64>,
}

/// Formatted coordinates structure for a Spot Coordinate.
#[derive(Debug, Clone, PartialEq)]
pub struct SpotCoordinate {
    pub northing: f64,
    pub easting: f64,
    pub text: String,
}

/// Format a point's coordinates as a Spot Coordinate label detailing Northing
/// and Easting.
pub fn format_spot_coordinate(
    p: Point,
    spatial: &SpatialContext,
    basis: Option<CoordinateBasis>,
) -> SpotCoordinate {
    let basis = basis.unwrap_or_default();
    let easting = p.x + basis.false_easting.unwrap_or(5000.0);
    let northing = -p.y + basis.false_northing.unwrap_or(5000.0);
    let u = if spatial.units == Unit::Feet {
        "ft"
    } else {
        "m"
    };
    let easting_str = format!("E: {} {u}", format_thousands_fixed(easting, 3));
    let northing_str = format!("N: {} {u}", format_thousands_fixed(northing, 3));
    SpotCoordinate {
        northing,
        easting,
        text: format!("{northing_str}\n{easting_str}"),
    }
}

/// A 2D point that may carry an elevation, for slope annotations.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ElevatedPoint {
    pub x: f64,
    pub y: f64,
    pub z: Option<f64>,
}

impl From<Point> for ElevatedPoint {
    fn from(p: Point) -> Self {
        ElevatedPoint {
            x: p.x,
            y: p.y,
            z: None,
        }
    }
}

/// How [`format_slope`] reports a grade.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SlopeFormat {
    Percent,
    Ratio,
}

/// Compute vertical slope ratios or grades (e.g. 2% or 4:1) along a segment.
pub fn format_slope(a: ElevatedPoint, b: ElevatedPoint, format: SlopeFormat) -> String {
    let dist2d = (b.x - a.x).hypot(b.y - a.y);
    if dist2d < 1e-9 {
        return "0.00%".to_string();
    }
    let dz = b.z.unwrap_or(0.0) - a.z.unwrap_or(0.0);
    let slope_val = dz.abs() / dist2d;
    match format {
        SlopeFormat::Percent => format!("{:.2}%", slope_val * 100.0),
        SlopeFormat::Ratio => {
            if slope_val < 1e-9 {
                "Flat".to_string()
            } else {
                format!("{:.1}:1", 1.0 / slope_val)
            }
        }
    }
}

/// Stack overlapping colinear/parallel aligned dimensions to avoid line
/// overlap, by pushing later dimensions' offsets apart by `base_gap`.
pub fn stack_dimension_chains(
    dimensions: &[AlignedDimension],
    base_gap: f64,
) -> Vec<AlignedDimension> {
    let mut stacked: Vec<AlignedDimension> = dimensions.to_vec();
    let n = stacked.len();
    let mut changed = true;
    let mut passes = 0;
    while changed && passes < 10 {
        changed = false;
        passes += 1;
        for i in 0..n {
            for j in (i + 1)..n {
                let (d1, d2) = (stacked[i].clone(), stacked[j].clone());
                let v1 = normalize(subtract(d1.b, d1.a));
                let v2 = normalize(subtract(d2.b, d2.a));
                let parallel = (v1.x * v2.y - v1.y * v2.x).abs() < 1e-3;
                if !parallel {
                    continue;
                }
                let p1a = d1.a.x * v1.x + d1.a.y * v1.y;
                let p1b = d1.b.x * v1.x + d1.b.y * v1.y;
                let p2a = d2.a.x * v1.x + d2.a.y * v1.y;
                let p2b = d2.b.x * v1.x + d2.b.y * v1.y;
                let min1 = p1a.min(p1b);
                let max1 = p1a.max(p1b);
                let min2 = p2a.min(p2b);
                let max2 = p2a.max(p2b);
                let overlap = min1 < max2 - 1e-3 && min2 < max1 - 1e-3;
                if overlap && (d1.offset - d2.offset).abs() < base_gap - 1e-3 {
                    let sign = if d1.offset == 0.0 {
                        1.0
                    } else {
                        d1.offset.signum()
                    };
                    stacked[j].offset = d1.offset + sign * base_gap;
                    changed = true;
                }
            }
        }
    }
    stacked
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn default_spatial_context() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: Unit::Meters,
            scale: 1.0,
        }
    }

    // --- ported 1:1 from drawing/tests/dimension.test.ts -----------------------

    #[test]
    fn formats_dual_units() {
        let spatial = default_spatial_context();
        let style = DimensionStyle {
            id: "dual-unit".to_string(),
            label: "Dual Unit".to_string(),
            arrow: DimArrow::Arrow,
            text_height: 2.5,
            precision: 2,
            unit: DimUnit::FtDec,
            secondary_unit: Some(DimUnit::M),
            extension_gap: 1.0,
            extension_beyond: 1.0,
            suppress_zero: false,
            suppress_extension1: false,
            suppress_extension2: false,
            text_alignment: None,
        };
        // 3.048 meters = 10.00 feet
        let text = format_dim_text(3.048, &style, &spatial);
        assert_eq!(text, "10.00' [3.05 m]");
    }

    #[test]
    fn calculates_slope_annotations_ratios_and_percents() {
        let a = ElevatedPoint {
            x: 0.0,
            y: 0.0,
            z: Some(0.0),
        };
        let b = ElevatedPoint {
            x: 100.0,
            y: 0.0,
            z: Some(2.5),
        };
        assert_eq!(format_slope(a, b, SlopeFormat::Percent), "2.50%");
        assert_eq!(format_slope(a, b, SlopeFormat::Ratio), "40.0:1");
    }

    #[test]
    fn formats_spot_coordinates_detailing_northing_and_easting() {
        let spatial = default_spatial_context();
        let p = Point::new(123.45, -234.56);
        let spot = format_spot_coordinate(p, &spatial, None);
        assert_relative_eq!(spot.easting, 5123.45, epsilon = 1e-9);
        assert_relative_eq!(spot.northing, 5234.56, epsilon = 1e-9);
        assert!(spot.text.contains("E: 5,123.450 m"));
        assert!(spot.text.contains("N: 5,234.560 m"));
    }

    #[test]
    fn suppresses_witness_extension_lines() {
        let spatial = default_spatial_context();
        let dim = Dimension::Aligned(AlignedDimension {
            id: "d1".to_string(),
            style_id: "suppressed-ext".to_string(),
            text_override: None,
            a: Point::new(0.0, 0.0),
            b: Point::new(100.0, 0.0),
            offset: 10.0,
        });
        let measured = measure_dimension(&dim, &spatial);
        assert_eq!(measured.geometry.lines.len(), 1);
        assert_eq!(
            measured.geometry.lines[0],
            [Point::new(0.0, 10.0), Point::new(100.0, 10.0)]
        );
    }

    #[test]
    fn aligns_dimension_text_perpendicular_or_horizontal() {
        let spatial = default_spatial_context();
        let dim_horiz = Dimension::Aligned(AlignedDimension {
            id: "d2".to_string(),
            style_id: "align-horizontal".to_string(),
            text_override: None,
            a: Point::new(0.0, 0.0),
            b: Point::new(0.0, 100.0),
            offset: 10.0,
        });
        let dim_perp = Dimension::Aligned(AlignedDimension {
            id: "d3".to_string(),
            style_id: "align-perpendicular".to_string(),
            text_override: None,
            a: Point::new(0.0, 0.0),
            b: Point::new(100.0, 0.0),
            offset: 10.0,
        });
        let measured_horiz = measure_dimension(&dim_horiz, &spatial);
        assert_eq!(measured_horiz.geometry.text_angle_deg, 0.0);
        let measured_perp = measure_dimension(&dim_perp, &spatial);
        assert_eq!(measured_perp.geometry.text_angle_deg, 90.0);
    }

    #[test]
    fn stacks_overlapping_dimension_chains() {
        let d1 = AlignedDimension {
            id: "dim1".to_string(),
            style_id: "arch-tick".to_string(),
            text_override: None,
            a: Point::new(0.0, 0.0),
            b: Point::new(50.0, 0.0),
            offset: 10.0,
        };
        let d2 = AlignedDimension {
            id: "dim2".to_string(),
            style_id: "arch-tick".to_string(),
            text_override: None,
            a: Point::new(25.0, 0.0),
            b: Point::new(75.0, 0.0),
            offset: 10.0,
        };
        let stacked = stack_dimension_chains(&[d1, d2], 8.0);
        assert_eq!(stacked[0].offset, 10.0);
        assert_eq!(stacked[1].offset, 18.0);
    }

    // --- additional edge cases ---------------------------------------------

    #[test]
    fn zero_length_linear_dimension_measures_to_zero_without_panicking() {
        let spatial = default_spatial_context();
        let dim = Dimension::Linear(LinearDimension {
            id: "z1".to_string(),
            style_id: "arch-tick".to_string(),
            text_override: None,
            a: Point::new(5.0, 5.0),
            b: Point::new(5.0, 5.0),
            axis: Axis::Horizontal,
            offset: 0.0,
        });
        let measured = measure_dimension(&dim, &spatial);
        assert_eq!(measured.value, 0.0);
    }

    #[test]
    fn zero_radius_radial_dimension_measures_to_zero_without_panicking() {
        let spatial = default_spatial_context();
        let dim = Dimension::Radial(RadialDimension {
            id: "r1".to_string(),
            style_id: "arch-tick".to_string(),
            text_override: None,
            center: Point::new(0.0, 0.0),
            edge: Point::new(0.0, 0.0),
            diameter: false,
        });
        let measured = measure_dimension(&dim, &spatial);
        assert_eq!(measured.value, 0.0);
        // direction is ill-defined at r=0; normalize() falls back to zero.
        assert_eq!(measured.geometry.ticks[0].dir, Point::new(0.0, 0.0));
    }

    #[test]
    fn degenerate_angular_dimension_with_coincident_rays_measures_zero_degrees() {
        let style = dimension_style("eng-arrow");
        let dim = AngularDimension {
            id: "a1".to_string(),
            style_id: "eng-arrow".to_string(),
            text_override: None,
            vertex: Point::new(0.0, 0.0),
            a: Point::new(1.0, 0.0),
            b: Point::new(1.0, 0.0),
            radius: 5.0,
        };
        let measured = measure_angular(&dim, &style);
        assert_relative_eq!(measured.value, 0.0, epsilon = 1e-9);
    }

    #[test]
    fn dimension_style_falls_back_to_architectural_tick_for_unknown_id() {
        let style = dimension_style("does-not-exist");
        assert_eq!(style.id, "arch-tick");
    }

    #[test]
    fn ft_in_format_rolls_inches_into_feet_at_twelve() {
        // 0.999999... feet rounding to 12 inches must carry into the next foot.
        assert_eq!(
            format_single_value(0.99999, DimUnit::FtIn, 0, false),
            "1'-0\""
        );
    }

    #[test]
    fn ft_in_format_reduces_fractions_to_lowest_terms() {
        // 0.5 inches at precision=1 (1/2 denominator) reduces to 1/2, not 1/2 unreduced weirdness.
        assert_eq!(
            format_single_value(4.0 / 12.0 + 0.5 / 12.0, DimUnit::FtIn, 1, false),
            "0'-4 1/2\""
        );
    }
}
