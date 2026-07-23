//! Colored point-cloud interchange: parse and serialize survey/LiDAR point
//! data across the formats planners exchange — XYZ, PTS, PLY, LAS, and DXF.
//! Pure; no I/O, no rendering. Text formats round-trip through strings, LAS
//! through raw bytes.
//!
//! Coordinates are in the plan's units; RGB channels are 0–255; intensity is
//! the raw sensor value where a format carries it.
//!
//! Port of `packages/domain/src/civil/pointcloud.ts` +
//! `packages/domain/src/civil/types/pointCloud.ts`. `pointCloudToSpots`/
//! `spotsToPointCloud` are adapted at the crate boundary: the TS originals
//! convert to/from the planning domain's `SpotElevationPoint` element, which
//! `thoth-civil` intentionally doesn't depend on (see
//! `crates/thoth-civil/GAPS.md`); here they convert to/from the local
//! [`PointCloudSpot`] instead, carrying the same fields.

use thoth_spatial::{Bounds, Point};

use crate::error::{CivilError, CivilResult};

/// A single point with optional color and intensity.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CloudPoint {
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub r: Option<u8>,
    pub g: Option<u8>,
    pub b: Option<u8>,
    pub intensity: Option<f64>,
}

impl CloudPoint {
    pub const fn bare(x: f64, y: f64, z: f64) -> Self {
        CloudPoint {
            x,
            y,
            z,
            r: None,
            g: None,
            b: None,
            intensity: None,
        }
    }

    fn has_color(&self) -> bool {
        self.r.is_some() && self.g.is_some() && self.b.is_some()
    }
}

/// A cloud of points.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct PointCloud {
    pub points: Vec<CloudPoint>,
}

/// Supported point-cloud formats.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PointCloudFormat {
    Xyz,
    Pts,
    Ply,
    Las,
    Dxf,
}

/// Text-based formats carry a `String`; LAS carries raw bytes.
#[derive(Debug, Clone, PartialEq)]
pub enum PointCloudData {
    Text(String),
    Binary(Vec<u8>),
}

impl PointCloudData {
    fn as_text(&self) -> String {
        match self {
            PointCloudData::Text(s) => s.clone(),
            PointCloudData::Binary(b) => String::from_utf8_lossy(b).into_owned(),
        }
    }

    fn as_bytes(&self) -> Vec<u8> {
        match self {
            PointCloudData::Text(s) => s.as_bytes().to_vec(),
            PointCloudData::Binary(b) => b.clone(),
        }
    }
}

/// Infer a [`PointCloudFormat`] from a filename extension.
pub fn point_cloud_format_from_name(name: &str) -> Option<PointCloudFormat> {
    let ext = name.to_lowercase();
    let ext = ext.rsplit('.').next()?;
    match ext {
        "xyz" => Some(PointCloudFormat::Xyz),
        "pts" => Some(PointCloudFormat::Pts),
        "ply" => Some(PointCloudFormat::Ply),
        "las" => Some(PointCloudFormat::Las),
        "dxf" => Some(PointCloudFormat::Dxf),
        _ => None,
    }
}

/// Whether a format is delivered as binary bytes rather than text.
pub fn is_binary_point_cloud_format(format: PointCloudFormat) -> bool {
    format == PointCloudFormat::Las
}

/// Parse point-cloud data of a given format.
///
/// # Errors
/// [`CivilError::MalformedData`] if the PLY header or LAS signature is
/// invalid; the other formats are lenient and simply skip unparsable lines.
pub fn parse_point_cloud(
    data: &PointCloudData,
    format: PointCloudFormat,
) -> CivilResult<PointCloud> {
    match format {
        PointCloudFormat::Xyz => Ok(parse_xyz(&data.as_text())),
        PointCloudFormat::Pts => Ok(parse_pts(&data.as_text())),
        PointCloudFormat::Ply => parse_ply(data),
        PointCloudFormat::Las => parse_las(&data.as_bytes()),
        PointCloudFormat::Dxf => Ok(parse_dxf(&data.as_text())),
    }
}

/// Serialize a point cloud to a given format.
pub fn serialize_point_cloud(cloud: &PointCloud, format: PointCloudFormat) -> PointCloudData {
    match format {
        PointCloudFormat::Xyz => PointCloudData::Text(write_xyz(cloud)),
        PointCloudFormat::Pts => PointCloudData::Text(write_pts(cloud)),
        PointCloudFormat::Ply => PointCloudData::Text(write_ply(cloud)),
        PointCloudFormat::Las => PointCloudData::Binary(write_las(cloud)),
        PointCloudFormat::Dxf => PointCloudData::Text(write_dxf(cloud)),
    }
}

fn clamp_byte(v: f64) -> u8 {
    v.round().clamp(0.0, 255.0) as u8
}

fn clamp_u16(v: f64) -> u16 {
    v.round().clamp(0.0, 65535.0) as u16
}

/// Format a number, trimming trailing zeros for non-integers (matches the
/// TS `num()` helper's compact `toFixed(6)` trimming).
fn num(v: f64) -> String {
    if v.fract() == 0.0 {
        format!("{}", v as i64)
    } else {
        let s = format!("{:.6}", v);
        let s = s.trim_end_matches('0');
        s.trim_end_matches('.').to_string()
    }
}

// ---------------------------------------------------------------------------
// XYZ — whitespace-separated "x y z [r g b]" or "x y z [intensity]"
// ---------------------------------------------------------------------------

/// Parse whitespace/comma-separated `x y z [r g b]` or `x y z [intensity]`
/// lines, skipping blank lines and `#`/`//` comments.
pub fn parse_xyz(text: &str) -> PointCloud {
    let mut points = Vec::new();
    for raw in text.split(['\n', '\r']).filter(|l| !l.is_empty()) {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') || line.starts_with("//") {
            continue;
        }
        let t: Vec<Option<f64>> = line
            .split([' ', '\t', ','])
            .filter(|s| !s.is_empty())
            .map(|s| s.parse::<f64>().ok())
            .collect();
        if t.len() < 3 || t[..3].iter().any(|v| v.is_none()) {
            continue;
        }
        let mut p = CloudPoint::bare(t[0].unwrap(), t[1].unwrap(), t[2].unwrap());
        if t.len() >= 6 {
            if let (Some(r), Some(g), Some(b)) = (t[3], t[4], t[5]) {
                p.r = Some(clamp_byte(r));
                p.g = Some(clamp_byte(g));
                p.b = Some(clamp_byte(b));
            }
        } else if t.len() == 4 {
            p.intensity = t[3];
        }
        points.push(p);
    }
    PointCloud { points }
}

/// Serialize to XYZ text.
pub fn write_xyz(cloud: &PointCloud) -> String {
    cloud
        .points
        .iter()
        .map(|p| {
            if p.has_color() {
                format!(
                    "{} {} {} {} {} {}",
                    num(p.x),
                    num(p.y),
                    num(p.z),
                    p.r.unwrap(),
                    p.g.unwrap(),
                    p.b.unwrap()
                )
            } else {
                format!("{} {} {}", num(p.x), num(p.y), num(p.z))
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
}

// ---------------------------------------------------------------------------
// PTS — first line is the point count, then "x y z [intensity] [r g b]"
// ---------------------------------------------------------------------------

/// Parse PTS text: an optional leading point-count line, then
/// `x y z [intensity] [r g b]` per line.
pub fn parse_pts(text: &str) -> PointCloud {
    let lines: Vec<&str> = text.split(['\n', '\r']).collect();
    let mut points = Vec::new();
    let mut start = 0usize;
    for (i, raw) in lines.iter().enumerate() {
        let l = raw.trim();
        if l.is_empty() {
            continue;
        }
        if l.chars().all(|c| c.is_ascii_digit()) {
            start = i + 1;
        }
        break;
    }
    for raw in lines.iter().skip(start) {
        let l = raw.trim();
        if l.is_empty() {
            continue;
        }
        let t: Vec<Option<f64>> = l
            .split([' ', '\t', ','])
            .filter(|s| !s.is_empty())
            .map(|s| s.parse::<f64>().ok())
            .collect();
        if t.len() < 3 || t[..3].iter().any(|v| v.is_none()) {
            continue;
        }
        let mut p = CloudPoint::bare(t[0].unwrap(), t[1].unwrap(), t[2].unwrap());
        if t.len() >= 4 {
            p.intensity = t[3];
        }
        if t.len() >= 7 {
            if let (Some(r), Some(g), Some(b)) = (t[4], t[5], t[6]) {
                p.r = Some(clamp_byte(r));
                p.g = Some(clamp_byte(g));
                p.b = Some(clamp_byte(b));
            }
        }
        points.push(p);
    }
    PointCloud { points }
}

/// Serialize to PTS text (count header, then intensity + RGB, defaulting to
/// white/`0` when absent).
pub fn write_pts(cloud: &PointCloud) -> String {
    let header = cloud.points.len().to_string();
    let body: Vec<String> = cloud
        .points
        .iter()
        .map(|p| {
            let intensity = p.intensity.unwrap_or(0.0);
            let r = p.r.unwrap_or(255);
            let g = p.g.unwrap_or(255);
            let b = p.b.unwrap_or(255);
            format!(
                "{} {} {} {} {} {} {}",
                num(p.x),
                num(p.y),
                num(p.z),
                num(intensity),
                r,
                g,
                b
            )
        })
        .collect();
    std::iter::once(header)
        .chain(body)
        .collect::<Vec<_>>()
        .join("\n")
}

// ---------------------------------------------------------------------------
// PLY — Stanford format, ascii and binary_little_endian/big_endian
// ---------------------------------------------------------------------------

struct PlyProperty {
    name: String,
    ty: String,
}

fn read_ply_scalar(bytes: &[u8], off: usize, ty: &str, little: bool) -> CivilResult<(f64, usize)> {
    let get = |n: usize| -> CivilResult<&[u8]> {
        bytes
            .get(off..off + n)
            .ok_or_else(|| CivilError::MalformedData {
                format: "PLY",
                reason: "truncated binary body".to_string(),
            })
    };
    Ok(match ty {
        "char" | "int8" => (get(1)?[0] as i8 as f64, 1),
        "uchar" | "uint8" => (get(1)?[0] as f64, 1),
        "short" | "int16" => {
            let b = get(2)?;
            (
                if little {
                    i16::from_le_bytes([b[0], b[1]])
                } else {
                    i16::from_be_bytes([b[0], b[1]])
                } as f64,
                2,
            )
        }
        "ushort" | "uint16" => {
            let b = get(2)?;
            (
                if little {
                    u16::from_le_bytes([b[0], b[1]])
                } else {
                    u16::from_be_bytes([b[0], b[1]])
                } as f64,
                2,
            )
        }
        "int" | "int32" => {
            let b = get(4)?;
            (
                if little {
                    i32::from_le_bytes([b[0], b[1], b[2], b[3]])
                } else {
                    i32::from_be_bytes([b[0], b[1], b[2], b[3]])
                } as f64,
                4,
            )
        }
        "uint" | "uint32" => {
            let b = get(4)?;
            (
                if little {
                    u32::from_le_bytes([b[0], b[1], b[2], b[3]])
                } else {
                    u32::from_be_bytes([b[0], b[1], b[2], b[3]])
                } as f64,
                4,
            )
        }
        "float" | "float32" => {
            let b = get(4)?;
            (
                if little {
                    f32::from_le_bytes([b[0], b[1], b[2], b[3]])
                } else {
                    f32::from_be_bytes([b[0], b[1], b[2], b[3]])
                } as f64,
                4,
            )
        }
        "double" | "float64" => {
            let b = get(8)?;
            let arr: [u8; 8] = b.try_into().unwrap();
            (
                if little {
                    f64::from_le_bytes(arr)
                } else {
                    f64::from_be_bytes(arr)
                },
                8,
            )
        }
        other => {
            return Err(CivilError::MalformedData {
                format: "PLY",
                reason: format!("unsupported property type {other}"),
            })
        }
    })
}

fn ply_point_from_values(props: &[PlyProperty], values: &[f64]) -> CloudPoint {
    let mut p = CloudPoint::bare(0.0, 0.0, 0.0);
    for (prop, &v) in props.iter().zip(values) {
        match prop.name.as_str() {
            "x" => p.x = v,
            "y" => p.y = v,
            "z" => p.z = v,
            "red" => p.r = Some(clamp_byte(v)),
            "green" => p.g = Some(clamp_byte(v)),
            "blue" => p.b = Some(clamp_byte(v)),
            "intensity" | "scalar_intensity" => p.intensity = Some(v),
            _ => {}
        }
    }
    p
}

fn find_subarray(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack.windows(needle.len()).position(|w| w == needle)
}

/// Parse a PLY point cloud (ascii, or binary_little_endian/big_endian).
///
/// # Errors
/// [`CivilError::MalformedData`] if `end_header` is missing, the binary body
/// is truncated, or a property declares an unsupported scalar type.
pub fn parse_ply(data: &PointCloudData) -> CivilResult<PointCloud> {
    let bytes = data.as_bytes();
    let header_end =
        find_subarray(&bytes, b"end_header").ok_or_else(|| CivilError::MalformedData {
            format: "PLY",
            reason: "missing end_header".to_string(),
        })?;
    let mut cursor = header_end + "end_header".len();
    while cursor < bytes.len() && bytes[cursor] != b'\n' {
        cursor += 1;
    }
    cursor += 1; // past the newline
    let header_text = String::from_utf8_lossy(&bytes[..header_end]).into_owned();

    let mut format = "ascii".to_string();
    let mut vertex_count = 0usize;
    let mut props: Vec<PlyProperty> = Vec::new();
    let mut in_vertex = false;
    for line in header_text.split(['\n', '\r']) {
        let t: Vec<&str> = line.split_whitespace().collect();
        if t.is_empty() {
            continue;
        }
        match t[0] {
            "format" => format = t.get(1).copied().unwrap_or("ascii").to_string(),
            "element" => {
                in_vertex = t.get(1) == Some(&"vertex");
                if in_vertex {
                    vertex_count = t.get(2).and_then(|s| s.parse().ok()).unwrap_or(0);
                }
            }
            "property" if in_vertex => {
                props.push(PlyProperty {
                    ty: t[1].to_string(),
                    name: t[t.len() - 1].to_string(),
                });
            }
            _ => {}
        }
    }

    let mut points = Vec::new();
    if format == "ascii" {
        let body_text = String::from_utf8_lossy(&bytes[cursor..]).into_owned();
        let body_lines: Vec<&str> = body_text
            .split(['\n', '\r'])
            .filter(|l| !l.trim().is_empty())
            .collect();
        for line in body_lines.iter().take(vertex_count) {
            let values: Vec<f64> = line
                .split_whitespace()
                .filter_map(|s| s.parse().ok())
                .collect();
            points.push(ply_point_from_values(&props, &values));
        }
    } else {
        let little = format.contains("little");
        let mut off = cursor;
        for _ in 0..vertex_count {
            let mut values = Vec::with_capacity(props.len());
            for prop in &props {
                let (val, size) = read_ply_scalar(&bytes, off, &prop.ty, little)?;
                values.push(val);
                off += size;
            }
            points.push(ply_point_from_values(&props, &values));
        }
    }
    Ok(PointCloud { points })
}

/// Serialize to ASCII PLY.
pub fn write_ply(cloud: &PointCloud) -> String {
    let n = cloud.points.len();
    let mut lines = vec![
        "ply".to_string(),
        "format ascii 1.0".to_string(),
        "comment Thoth Blueprint point cloud".to_string(),
        format!("element vertex {n}"),
        "property float x".to_string(),
        "property float y".to_string(),
        "property float z".to_string(),
        "property uchar red".to_string(),
        "property uchar green".to_string(),
        "property uchar blue".to_string(),
        "end_header".to_string(),
    ];
    for p in &cloud.points {
        lines.push(format!(
            "{} {} {} {} {} {}",
            num(p.x),
            num(p.y),
            num(p.z),
            p.r.unwrap_or(255),
            p.g.unwrap_or(255),
            p.b.unwrap_or(255)
        ));
    }
    lines.join("\n")
}

// ---------------------------------------------------------------------------
// LAS — ASPRS LiDAR binary (reads point formats 0-3; writes format 2 w/ RGB)
// ---------------------------------------------------------------------------

const LAS_HEADER_SIZE: usize = 227; // LAS 1.2 public header block

/// Parse an ASPRS LAS binary buffer (point data formats 0–3; only formats 2
/// and 3 carry RGB).
///
/// # Errors
/// [`CivilError::MalformedData`] if the `LASF` signature is missing.
pub fn parse_las(buffer: &[u8]) -> CivilResult<PointCloud> {
    if buffer.len() < 4 || &buffer[0..4] != b"LASF" {
        return Err(CivilError::MalformedData {
            format: "LAS",
            reason: "bad signature".to_string(),
        });
    }

    let u32_at = |o: usize| u32::from_le_bytes(buffer[o..o + 4].try_into().unwrap());
    let u16_at = |o: usize| u16::from_le_bytes(buffer[o..o + 2].try_into().unwrap());
    let f64_at = |o: usize| f64::from_le_bytes(buffer[o..o + 8].try_into().unwrap());

    let offset_to_point_data = u32_at(96) as usize;
    let point_format = buffer[104];
    let record_length = u16_at(105) as usize;
    let point_count = u32_at(107) as usize;
    let scale_x = f64_at(131);
    let scale_y = f64_at(139);
    let scale_z = f64_at(147);
    let off_x = f64_at(155);
    let off_y = f64_at(163);
    let off_z = f64_at(171);

    // Byte offset of the RGB triple within a record, by point format (`None` = none).
    let color_offset: Option<usize> = match point_format {
        2 => Some(20),
        3 => Some(28),
        _ => None,
    };

    let mut points = Vec::with_capacity(point_count);
    for i in 0..point_count {
        let base = offset_to_point_data + i * record_length;
        if base + record_length > buffer.len() {
            break;
        }
        let x =
            i32::from_le_bytes(buffer[base..base + 4].try_into().unwrap()) as f64 * scale_x + off_x;
        let y = i32::from_le_bytes(buffer[base + 4..base + 8].try_into().unwrap()) as f64 * scale_y
            + off_y;
        let z = i32::from_le_bytes(buffer[base + 8..base + 12].try_into().unwrap()) as f64
            * scale_z
            + off_z;
        let intensity = u16::from_le_bytes(buffer[base + 12..base + 14].try_into().unwrap()) as f64;
        let mut p = CloudPoint {
            x,
            y,
            z,
            r: None,
            g: None,
            b: None,
            intensity: Some(intensity),
        };
        if let Some(co) = color_offset {
            let red = u16::from_le_bytes(buffer[base + co..base + co + 2].try_into().unwrap());
            let green =
                u16::from_le_bytes(buffer[base + co + 2..base + co + 4].try_into().unwrap());
            let blue = u16::from_le_bytes(buffer[base + co + 4..base + co + 6].try_into().unwrap());
            let scale16 = red > 255 || green > 255 || blue > 255;
            let conv =
                |v: u16| -> u8 { clamp_byte(if scale16 { v as f64 / 257.0 } else { v as f64 }) };
            p.r = Some(conv(red));
            p.g = Some(conv(green));
            p.b = Some(conv(blue));
        }
        points.push(p);
    }
    Ok(PointCloud { points })
}

fn write_ascii(buf: &mut [u8], offset: usize, text: &str, length: usize) {
    let bytes = text.as_bytes();
    for i in 0..length {
        buf[offset + i] = if i < bytes.len() { bytes[i] } else { 0 };
    }
}

/// Serialize to ASPRS LAS 1.2 binary, point data format 2 (with RGB).
pub fn write_las(cloud: &PointCloud) -> Vec<u8> {
    let pts = &cloud.points;
    let record_length: usize = 26; // point format 2
    let total = LAS_HEADER_SIZE + pts.len() * record_length;
    let mut buf = vec![0u8; total];

    let b = point_cloud_bounds(cloud);
    let zr = point_cloud_elevation_range(cloud);
    let scale: f64 = 0.001;
    let off_x = b.min_x;
    let off_y = b.min_y;
    let off_z = zr.0;

    // Public header block.
    buf[0..4].copy_from_slice(b"LASF");
    buf[24] = 1; // version major
    buf[25] = 2; // version minor
    write_ascii(&mut buf, 26, "Thoth Blueprint", 32); // system id
    write_ascii(&mut buf, 58, "Thoth Blueprint", 32); // generating software
    buf[94..96].copy_from_slice(&(LAS_HEADER_SIZE as u16).to_le_bytes());
    buf[96..100].copy_from_slice(&(LAS_HEADER_SIZE as u32).to_le_bytes());
    buf[100..104].copy_from_slice(&0u32.to_le_bytes()); // number of VLRs
    buf[104] = 2; // point data record format
    buf[105..107].copy_from_slice(&(record_length as u16).to_le_bytes());
    buf[107..111].copy_from_slice(&(pts.len() as u32).to_le_bytes()); // legacy point count
    buf[131..139].copy_from_slice(&scale.to_le_bytes());
    buf[139..147].copy_from_slice(&scale.to_le_bytes());
    buf[147..155].copy_from_slice(&scale.to_le_bytes());
    buf[155..163].copy_from_slice(&off_x.to_le_bytes());
    buf[163..171].copy_from_slice(&off_y.to_le_bytes());
    buf[171..179].copy_from_slice(&off_z.to_le_bytes());
    buf[179..187].copy_from_slice(&b.max_x.to_le_bytes());
    buf[187..195].copy_from_slice(&b.min_x.to_le_bytes());
    buf[195..203].copy_from_slice(&b.max_y.to_le_bytes());
    buf[203..211].copy_from_slice(&b.min_y.to_le_bytes());
    buf[211..219].copy_from_slice(&zr.1.to_le_bytes());
    buf[219..227].copy_from_slice(&zr.0.to_le_bytes());

    let mut off = LAS_HEADER_SIZE;
    for p in pts {
        buf[off..off + 4].copy_from_slice(&(((p.x - off_x) / scale).round() as i32).to_le_bytes());
        buf[off + 4..off + 8]
            .copy_from_slice(&(((p.y - off_y) / scale).round() as i32).to_le_bytes());
        buf[off + 8..off + 12]
            .copy_from_slice(&(((p.z - off_z) / scale).round() as i32).to_le_bytes());
        buf[off + 12..off + 14]
            .copy_from_slice(&clamp_u16(p.intensity.unwrap_or(0.0)).to_le_bytes());
        buf[off + 14] = 0; // return bits
        buf[off + 15] = 0; // classification
        buf[off + 16] = 0; // scan angle
        buf[off + 17] = 0; // user data
        buf[off + 18..off + 20].copy_from_slice(&0u16.to_le_bytes()); // point source id
        buf[off + 20..off + 22].copy_from_slice(&((p.r.unwrap_or(255) as u16) * 257).to_le_bytes());
        buf[off + 22..off + 24].copy_from_slice(&((p.g.unwrap_or(255) as u16) * 257).to_le_bytes());
        buf[off + 24..off + 26].copy_from_slice(&((p.b.unwrap_or(255) as u16) * 257).to_le_bytes());
        off += record_length;
    }
    buf
}

// ---------------------------------------------------------------------------
// DXF — CAD interchange; POINT entities with true-color (group code 420)
// ---------------------------------------------------------------------------

/// Parse DXF `POINT` entities, including AutoCAD Color Index (group 62) and
/// true-color (group 420) values.
pub fn parse_dxf(text: &str) -> PointCloud {
    let lines: Vec<&str> = text
        .split(['\n', '\r'])
        .filter(|l| !l.is_empty())
        .map(|l| l.trim())
        .collect();
    let mut points = Vec::new();
    let mut current: Option<CloudPoint> = None;
    let flush = |current: &mut Option<CloudPoint>, points: &mut Vec<CloudPoint>| {
        if let Some(p) = current.take() {
            points.push(p);
        }
    };

    let mut i = 0;
    while i + 1 < lines.len() {
        let code: Option<i32> = lines[i].parse().ok();
        let value = lines[i + 1];
        i += 2;
        let Some(code) = code else { continue };
        if code == 0 {
            flush(&mut current, &mut points);
            if value == "POINT" {
                current = Some(CloudPoint::bare(0.0, 0.0, 0.0));
            }
        } else if let Some(p) = current.as_mut() {
            let v: f64 = value.parse().unwrap_or(0.0);
            match code {
                10 => p.x = v,
                20 => p.y = v,
                30 => p.z = v,
                62 => {
                    let (r, g, b) = aci_to_rgb(v as i32);
                    p.r = Some(r);
                    p.g = Some(g);
                    p.b = Some(b);
                }
                420 => {
                    let iv = v as i64;
                    p.r = Some(((iv >> 16) & 0xff) as u8);
                    p.g = Some(((iv >> 8) & 0xff) as u8);
                    p.b = Some((iv & 0xff) as u8);
                }
                _ => {}
            }
        }
    }
    flush(&mut current, &mut points);
    PointCloud { points }
}

/// Serialize to a minimal DXF `ENTITIES` section of `POINT`s with true-color.
pub fn write_dxf(cloud: &PointCloud) -> String {
    let mut out: Vec<String> = vec!["0".into(), "SECTION".into(), "2".into(), "ENTITIES".into()];
    for p in &cloud.points {
        out.extend([
            "0".to_string(),
            "POINT".to_string(),
            "8".to_string(),
            "PointCloud".to_string(),
        ]);
        out.extend([
            "10".to_string(),
            num(p.x),
            "20".to_string(),
            num(p.y),
            "30".to_string(),
            num(p.z),
        ]);
        if p.has_color() {
            let packed = ((p.r.unwrap() as u32) << 16)
                | ((p.g.unwrap() as u32) << 8)
                | (p.b.unwrap() as u32);
            out.extend(["420".to_string(), packed.to_string()]);
        }
    }
    out.extend([
        "0".to_string(),
        "ENDSEC".to_string(),
        "0".to_string(),
        "EOF".to_string(),
    ]);
    out.join("\n")
}

/// A tiny AutoCAD Color Index → RGB map for the common indices.
fn aci_to_rgb(index: i32) -> (u8, u8, u8) {
    match index {
        1 => (255, 0, 0),
        2 => (255, 255, 0),
        3 => (0, 255, 0),
        4 => (0, 255, 255),
        5 => (0, 0, 255),
        6 => (255, 0, 255),
        7 => (255, 255, 255),
        8 => (128, 128, 128),
        9 => (192, 192, 192),
        _ => (255, 255, 255),
    }
}

// ---------------------------------------------------------------------------
// Cloud helpers
// ---------------------------------------------------------------------------

/// Bounding box of a cloud's XY footprint.
pub fn point_cloud_bounds(cloud: &PointCloud) -> Bounds {
    if cloud.points.is_empty() {
        return Bounds {
            min_x: 0.0,
            min_y: 0.0,
            max_x: 0.0,
            max_y: 0.0,
        };
    }
    let mut min_x = f64::INFINITY;
    let mut min_y = f64::INFINITY;
    let mut max_x = f64::NEG_INFINITY;
    let mut max_y = f64::NEG_INFINITY;
    for p in &cloud.points {
        min_x = min_x.min(p.x);
        min_y = min_y.min(p.y);
        max_x = max_x.max(p.x);
        max_y = max_y.max(p.y);
    }
    Bounds {
        min_x,
        min_y,
        max_x,
        max_y,
    }
}

/// Elevation range (min, max) of a cloud. `(0.0, 0.0)` for an empty cloud.
pub fn point_cloud_elevation_range(cloud: &PointCloud) -> (f64, f64) {
    let mut min = f64::INFINITY;
    let mut max = f64::NEG_INFINITY;
    for p in &cloud.points {
        min = min.min(p.z);
        max = max.max(p.z);
    }
    (
        if min.is_finite() { min } else { 0.0 },
        if max.is_finite() { max } else { 0.0 },
    )
}

/// Voxel-downsample a cloud to at most one point per `cell_size` XY grid
/// cell, keeping the first point encountered. Useful before rendering a
/// dense scan. Returns `cloud` unchanged if `cell_size <= 0`.
pub fn downsample_point_cloud(cloud: &PointCloud, cell_size: f64) -> PointCloud {
    if cell_size <= 0.0 {
        return cloud.clone();
    }
    let mut seen = std::collections::HashSet::new();
    let mut points = Vec::new();
    for &p in &cloud.points {
        let key = (
            (p.x / cell_size).floor() as i64,
            (p.y / cell_size).floor() as i64,
        );
        if seen.insert(key) {
            points.push(p);
        }
    }
    PointCloud { points }
}

/// A spot-elevation sample derived from a point cloud (the crate-local
/// analogue of the planning domain's `SpotElevationPoint` — see the module
/// doc comment on why this crate doesn't depend on that type directly).
#[derive(Debug, Clone, PartialEq)]
pub struct PointCloudSpot {
    pub id: String,
    pub layer_id: String,
    pub position: Point,
    pub z: f64,
    pub label: String,
}

/// Convert a cloud into spot-elevation samples on a layer.
pub fn point_cloud_to_spots(cloud: &PointCloud, layer_id: &str) -> Vec<PointCloudSpot> {
    cloud
        .points
        .iter()
        .enumerate()
        .map(|(i, p)| PointCloudSpot {
            id: thoth_spatial::create_id("spot"),
            layer_id: layer_id.to_string(),
            position: Point::new(p.x, p.y),
            z: p.z,
            label: format!("PC{}", i + 1),
        })
        .collect()
}

/// Build a cloud from spot-elevation samples (inverse of [`point_cloud_to_spots`]).
pub fn spots_to_point_cloud(spots: &[PointCloudSpot]) -> PointCloud {
    PointCloud {
        points: spots
            .iter()
            .map(|s| CloudPoint::bare(s.position.x, s.position.y, s.z))
            .collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cloud() -> PointCloud {
        PointCloud {
            points: vec![
                CloudPoint {
                    x: 0.0,
                    y: 0.0,
                    z: 1.5,
                    r: Some(255),
                    g: Some(0),
                    b: Some(0),
                    intensity: Some(100.0),
                },
                CloudPoint {
                    x: 10.25,
                    y: -3.5,
                    z: 2.75,
                    r: Some(0),
                    g: Some(128),
                    b: Some(64),
                    intensity: Some(200.0),
                },
                CloudPoint {
                    x: 5.0,
                    y: 5.0,
                    z: 0.25,
                    r: Some(10),
                    g: Some(20),
                    b: Some(30),
                    intensity: Some(50.0),
                },
            ],
        }
    }

    fn expect_close(a: &PointCloud, b: &PointCloud) {
        assert_eq!(a.points.len(), b.points.len());
        for (p, q) in a.points.iter().zip(&b.points) {
            assert!((p.x - q.x).abs() < 1e-2);
            assert!((p.y - q.y).abs() < 1e-2);
            assert!((p.z - q.z).abs() < 1e-2);
            if q.r.is_some() {
                assert_eq!(p.r, q.r);
                assert_eq!(p.g, q.g);
                assert_eq!(p.b, q.b);
            }
        }
    }

    #[test]
    fn format_detection_maps_extensions() {
        assert_eq!(
            point_cloud_format_from_name("scan.LAS"),
            Some(PointCloudFormat::Las)
        );
        assert_eq!(
            point_cloud_format_from_name("a/b/c.ply"),
            Some(PointCloudFormat::Ply)
        );
        assert_eq!(point_cloud_format_from_name("nope.txt"), None);
    }

    #[test]
    fn xyz_round_trip_preserves_coordinates_and_color() {
        expect_close(&parse_xyz(&write_xyz(&cloud())), &cloud());
    }

    #[test]
    fn xyz_ignores_comments_and_blank_lines() {
        let parsed = parse_xyz("# header\n1 2 3 255 255 255\n\n4 5 6 0 0 0\n");
        assert_eq!(parsed.points.len(), 2);
    }

    #[test]
    fn pts_round_trip_writes_count_header_and_preserves_intensity() {
        let text = write_pts(&cloud());
        assert_eq!(text.split('\n').next().unwrap(), "3");
        let parsed = parse_pts(&text);
        expect_close(&parsed, &cloud());
        assert_eq!(parsed.points[0].intensity, Some(100.0));
    }

    #[test]
    fn ply_ascii_round_trip_preserves_coordinates_and_color() {
        let text = write_ply(&cloud());
        assert!(text.starts_with("ply"));
        let parsed = parse_ply(&PointCloudData::Text(text)).unwrap();
        expect_close(&parsed, &cloud());
    }

    #[test]
    fn ply_binary_parses_a_hand_built_little_endian_buffer() {
        let header = "ply\nformat binary_little_endian 1.0\nelement vertex 1\nproperty float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nend_header\n";
        let mut buf = header.as_bytes().to_vec();
        buf.extend_from_slice(&1.5f32.to_le_bytes());
        buf.extend_from_slice(&(-2.5f32).to_le_bytes());
        buf.extend_from_slice(&3.5f32.to_le_bytes());
        buf.push(200);
        buf.push(100);
        buf.push(50);
        let parsed = parse_ply(&PointCloudData::Binary(buf)).unwrap();
        let p = parsed.points[0];
        assert!((p.x - 1.5).abs() < 1e-6);
        assert!((p.y + 2.5).abs() < 1e-6);
        assert!((p.z - 3.5).abs() < 1e-6);
        assert_eq!(p.r, Some(200));
        assert_eq!(p.g, Some(100));
        assert_eq!(p.b, Some(50));
    }

    #[test]
    fn ply_missing_end_header_is_malformed() {
        assert!(matches!(
            parse_ply(&PointCloudData::Text("ply\nformat ascii 1.0\n".to_string())),
            Err(CivilError::MalformedData { .. })
        ));
    }

    #[test]
    fn las_round_trip_preserves_coordinates_and_color() {
        let buffer = write_las(&cloud());
        assert_eq!(buffer.len(), 227 + 3 * 26);
        let parsed = parse_las(&buffer).unwrap();
        expect_close(&parsed, &cloud());
    }

    #[test]
    fn las_has_a_valid_lasf_signature() {
        let bytes = write_las(&cloud());
        assert_eq!(&bytes[0..4], b"LASF");
    }

    #[test]
    fn las_bad_signature_is_malformed() {
        assert!(matches!(
            parse_las(&[0u8; 300]),
            Err(CivilError::MalformedData { .. })
        ));
    }

    #[test]
    fn dxf_round_trip_preserves_points_and_true_color() {
        let text = write_dxf(&cloud());
        assert!(text.contains("POINT"));
        expect_close(&parse_dxf(&text), &cloud());
    }

    #[test]
    fn generic_dispatch_by_format() {
        let PointCloudData::Text(text) = serialize_point_cloud(&cloud(), PointCloudFormat::Xyz)
        else {
            panic!("expected text data");
        };
        let parsed = parse_point_cloud(&PointCloudData::Text(text), PointCloudFormat::Xyz).unwrap();
        expect_close(&parsed, &cloud());
    }

    #[test]
    fn downsamples_to_one_point_per_cell() {
        let dense = PointCloud {
            points: vec![
                CloudPoint::bare(0.1, 0.1, 0.0),
                CloudPoint::bare(0.2, 0.2, 0.0),
                CloudPoint::bare(5.0, 5.0, 0.0),
            ],
        };
        assert_eq!(downsample_point_cloud(&dense, 1.0).points.len(), 2);
    }

    #[test]
    fn converts_to_spot_elevations() {
        let spots = point_cloud_to_spots(&cloud(), "layer-terrain");
        assert_eq!(spots.len(), 3);
        assert_eq!(spots[0].z, 1.5);
        assert_eq!(spots[0].position, Point::new(0.0, 0.0));
    }

    #[test]
    fn spots_to_point_cloud_is_the_inverse() {
        let spots = point_cloud_to_spots(&cloud(), "layer-terrain");
        let round_tripped = spots_to_point_cloud(&spots);
        assert_eq!(round_tripped.points.len(), cloud().points.len());
        for (p, q) in round_tripped.points.iter().zip(cloud().points.iter()) {
            assert_eq!(p.x, q.x);
            assert_eq!(p.y, q.y);
            assert_eq!(p.z, q.z);
        }
    }
}
