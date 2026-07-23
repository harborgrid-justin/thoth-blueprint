//! ESRI Shapefile import/export: the `.shp`/`.shx`/`.dbf` triple.
//!
//! Scope: reads and writes the `.shp` main file and `.dbf` attribute table
//! directly from/to `&[u8]`/`Vec<u8>` (no filesystem access — callers own
//! the three files). Supports shape types `Point` (1), `PolyLine` (3), and
//! `Polygon` (5) — the three geometry types the gap analysis calls for. Does
//! not support `PointZ`/`PolyLineZ`/`PolygonZ`/`MultiPoint`/`MultiPatch`, the
//! `.shx` index file (this crate reconstructs record offsets by scanning the
//! `.shp` file directly, which every real shapefile also allows), or `.prj`
//! projection sidecar files (a shapefile's CRS is caller-supplied context,
//! matching how `thoth_spatial::SpatialContext` treats CRS everywhere else
//! in this codebase). DBF: reads/writes dBase III field types `C`
//! (character), `N`/`F` (numeric, read as `f64`), and `L` (logical/boolean);
//! `D` (date) and `M` (memo) are not supported.
//!
//! All multi-byte fields follow the shapefile spec exactly: file header and
//! record content are **big-endian**, shape-type/bounding-box/coordinate
//! fields within a record are **little-endian**. DBF is little-endian
//! throughout (as an ASCII-oriented format, endianness only matters for its
//! numeric header fields, which this module reads/writes explicitly).

use thoth_spatial::{Point, Polygon, Polyline};

use crate::error::{InteropError, InteropResult};

const FORMAT: &str = "Shapefile";
const FILE_CODE: i32 = 9994;
const VERSION: i32 = 1000;

/// One shapefile geometry type this module supports.
#[derive(Debug, Clone, PartialEq)]
pub enum ShapeGeometry {
    Point(Point),
    /// One or more disjoint polylines (a shapefile `PolyLine` record is a
    /// *set* of parts, not a single line).
    PolyLine(Vec<Polyline>),
    /// One or more rings (a shapefile `Polygon` record is a set of rings;
    /// this module does not distinguish outer rings from holes by winding
    /// order on import — every ring is kept as given).
    Polygon(Vec<Polygon>),
}

impl ShapeGeometry {
    fn shape_type(&self) -> i32 {
        match self {
            ShapeGeometry::Point(_) => 1,
            ShapeGeometry::PolyLine(_) => 3,
            ShapeGeometry::Polygon(_) => 5,
        }
    }
}

/// A DBF attribute value, restricted to the field types this module supports.
#[derive(Debug, Clone, PartialEq)]
pub enum AttributeValue {
    Text(String),
    Number(f64),
    Boolean(bool),
    Null,
}

/// One shapefile feature: its geometry plus its `.dbf` attribute row.
#[derive(Debug, Clone, PartialEq)]
pub struct ShapeFeature {
    pub geometry: ShapeGeometry,
    /// Column name → value, in field-declaration order (a `BTreeMap` would
    /// silently reorder columns on write; declaration order is what DBF
    /// readers key their field descriptors to).
    pub attributes: Vec<(String, AttributeValue)>,
}

/// A field's declared name, DBF type character, and byte width — needed to
/// write the DBF field descriptor table.
#[derive(Debug, Clone, PartialEq)]
pub struct FieldSchema {
    pub name: String,
    pub field_type: char,
    pub width: u8,
    pub decimals: u8,
}

fn field_schema_from_features(features: &[ShapeFeature]) -> Vec<FieldSchema> {
    let mut schemas: Vec<FieldSchema> = Vec::new();
    for f in features {
        for (name, value) in &f.attributes {
            if schemas.iter().any(|s| &s.name == name) {
                continue;
            }
            let (field_type, width, decimals) = match value {
                AttributeValue::Text(s) => ('C', s.len().clamp(1, 254) as u8, 0),
                AttributeValue::Number(_) => ('N', 19, 6),
                AttributeValue::Boolean(_) => ('L', 1, 0),
                AttributeValue::Null => ('C', 1, 0),
            };
            schemas.push(FieldSchema {
                name: name.clone(),
                field_type,
                width,
                decimals,
            });
        }
    }
    schemas
}

// ---------------------------------------------------------------------------
// .shp writer
// ---------------------------------------------------------------------------

fn geometry_bounds(geometries: &[ShapeGeometry]) -> (f64, f64, f64, f64) {
    let mut min_x = f64::INFINITY;
    let mut min_y = f64::INFINITY;
    let mut max_x = f64::NEG_INFINITY;
    let mut max_y = f64::NEG_INFINITY;
    let mut visit = |p: Point| {
        min_x = min_x.min(p.x);
        min_y = min_y.min(p.y);
        max_x = max_x.max(p.x);
        max_y = max_y.max(p.y);
    };
    for g in geometries {
        match g {
            ShapeGeometry::Point(p) => visit(*p),
            ShapeGeometry::PolyLine(parts) | ShapeGeometry::Polygon(parts) => {
                for part in parts {
                    for &p in part {
                        visit(p);
                    }
                }
            }
        }
    }
    if !min_x.is_finite() {
        (0.0, 0.0, 0.0, 0.0)
    } else {
        (min_x, min_y, max_x, max_y)
    }
}

fn record_content_length_words(geom: &ShapeGeometry) -> u32 {
    // Content length is measured in 16-bit words, per the shapefile spec.
    let bytes = match geom {
        ShapeGeometry::Point(_) => 4 + 16,
        ShapeGeometry::PolyLine(parts) | ShapeGeometry::Polygon(parts) => {
            let points: usize = parts.iter().map(|p| p.len()).sum();
            4 + 32 + 4 + 4 + parts.len() * 4 + points * 16
        }
    };
    (bytes / 2) as u32
}

fn bounds_of_parts(parts: &[Vec<Point>]) -> (f64, f64, f64, f64) {
    let mut min_x = f64::INFINITY;
    let mut min_y = f64::INFINITY;
    let mut max_x = f64::NEG_INFINITY;
    let mut max_y = f64::NEG_INFINITY;
    for part in parts {
        for p in part {
            min_x = min_x.min(p.x);
            min_y = min_y.min(p.y);
            max_x = max_x.max(p.x);
            max_y = max_y.max(p.y);
        }
    }
    if !min_x.is_finite() {
        (0.0, 0.0, 0.0, 0.0)
    } else {
        (min_x, min_y, max_x, max_y)
    }
}

fn write_parts_geometry(buf: &mut Vec<u8>, parts: &[Vec<Point>]) {
    let (min_x, min_y, max_x, max_y) = bounds_of_parts(parts);
    buf.extend(min_x.to_le_bytes());
    buf.extend(min_y.to_le_bytes());
    buf.extend(max_x.to_le_bytes());
    buf.extend(max_y.to_le_bytes());
    buf.extend((parts.len() as i32).to_le_bytes());
    let total_points: i32 = parts.iter().map(|p| p.len() as i32).sum();
    buf.extend(total_points.to_le_bytes());
    let mut running = 0i32;
    for part in parts {
        buf.extend(running.to_le_bytes());
        running += part.len() as i32;
    }
    for part in parts {
        for p in part {
            buf.extend(p.x.to_le_bytes());
            buf.extend(p.y.to_le_bytes());
        }
    }
}

/// Serialize shapefile geometries to a `.shp` main file buffer.
///
/// All geometries must share the same shape type (a real shapefile carries
/// exactly one geometry type per file); mixed types are rejected up front
/// rather than producing a file no reader can open correctly.
///
/// # Errors
/// [`InteropError::Unsupported`] if `geometries` is empty or mixes shape
/// types.
pub fn write_shp(geometries: &[ShapeGeometry]) -> InteropResult<Vec<u8>> {
    let Some(first) = geometries.first() else {
        return Err(InteropError::Unsupported {
            format: FORMAT,
            reason: "cannot write a .shp file with zero geometries (no shape type to declare)"
                .to_string(),
        });
    };
    let shape_type = first.shape_type();
    if geometries.iter().any(|g| g.shape_type() != shape_type) {
        return Err(InteropError::Unsupported {
            format: FORMAT,
            reason: "all geometries in one .shp file must share the same shape type".to_string(),
        });
    }

    let (min_x, min_y, max_x, max_y) = geometry_bounds(geometries);
    let content_words: u32 = geometries.iter().map(record_content_length_words).sum();
    let record_header_words = geometries.len() as u32 * 4; // 8 bytes = 4 words per record header
    let file_length_words = 50 + content_words + record_header_words;

    let mut buf = Vec::new();
    buf.extend(FILE_CODE.to_be_bytes());
    buf.extend([0u8; 20]); // 5 unused int32s
    buf.extend((file_length_words).to_be_bytes());
    buf.extend(VERSION.to_le_bytes());
    buf.extend(shape_type.to_le_bytes());
    buf.extend(min_x.to_le_bytes());
    buf.extend(min_y.to_le_bytes());
    buf.extend(max_x.to_le_bytes());
    buf.extend(max_y.to_le_bytes());
    buf.extend([0u8; 32]); // Zmin/Zmax/Mmin/Mmax, unused

    for (i, geom) in geometries.iter().enumerate() {
        let content_len = record_content_length_words(geom);
        buf.extend(((i + 1) as u32).to_be_bytes());
        buf.extend(content_len.to_be_bytes());
        buf.extend(shape_type.to_le_bytes());
        match geom {
            ShapeGeometry::Point(p) => {
                buf.extend(p.x.to_le_bytes());
                buf.extend(p.y.to_le_bytes());
            }
            ShapeGeometry::PolyLine(parts) | ShapeGeometry::Polygon(parts) => {
                write_parts_geometry(&mut buf, parts);
            }
        }
    }
    Ok(buf)
}

fn read_i32_be(data: &[u8], off: usize, format: &'static str) -> InteropResult<i32> {
    data.get(off..off + 4)
        .map(|b| i32::from_be_bytes(b.try_into().unwrap()))
        .ok_or_else(|| InteropError::Malformed {
            format,
            offset: off,
            reason: "unexpected end of file reading a big-endian i32".to_string(),
        })
}

fn read_i32_le(data: &[u8], off: usize, format: &'static str) -> InteropResult<i32> {
    data.get(off..off + 4)
        .map(|b| i32::from_le_bytes(b.try_into().unwrap()))
        .ok_or_else(|| InteropError::Malformed {
            format,
            offset: off,
            reason: "unexpected end of file reading a little-endian i32".to_string(),
        })
}

fn read_f64_le(data: &[u8], off: usize, format: &'static str) -> InteropResult<f64> {
    data.get(off..off + 8)
        .map(|b| f64::from_le_bytes(b.try_into().unwrap()))
        .ok_or_else(|| InteropError::Malformed {
            format,
            offset: off,
            reason: "unexpected end of file reading a little-endian f64".to_string(),
        })
}

/// Parse a `.shp` main file buffer into its geometries.
///
/// # Errors
/// [`InteropError::Malformed`] if the file signature isn't `9994`, a record
/// is truncated, or a record's shape type is inconsistent with the file
/// header's declared shape type. [`InteropError::Unsupported`] for a shape
/// type outside `{0 (null), 1, 3, 5}`.
pub fn parse_shp(data: &[u8]) -> InteropResult<Vec<ShapeGeometry>> {
    if data.len() < 100 {
        return Err(InteropError::Malformed {
            format: FORMAT,
            offset: 0,
            reason: format!(
                "file is only {} bytes, shorter than the 100-byte header",
                data.len()
            ),
        });
    }
    let file_code = read_i32_be(data, 0, FORMAT)?;
    if file_code != FILE_CODE {
        return Err(InteropError::Malformed {
            format: FORMAT,
            offset: 0,
            reason: format!("bad file code {file_code}, expected {FILE_CODE}"),
        });
    }
    let header_shape_type = read_i32_le(data, 32, FORMAT)?;

    let mut geometries = Vec::new();
    let mut cursor = 100usize;
    while cursor + 8 <= data.len() {
        let _record_number = read_i32_be(data, cursor, FORMAT)?;
        let content_words = read_i32_be(data, cursor + 4, FORMAT)?;
        if content_words < 0 {
            return Err(InteropError::Malformed {
                format: FORMAT,
                offset: cursor + 4,
                reason: "negative record content length".to_string(),
            });
        }
        let content_start = cursor + 8;
        let content_len = content_words as usize * 2;
        if content_start + content_len > data.len() {
            return Err(InteropError::Malformed {
                format: FORMAT,
                offset: content_start,
                reason: "record content runs past end of file".to_string(),
            });
        }
        let shape_type = read_i32_le(data, content_start, FORMAT)?;
        if shape_type != 0 && shape_type != header_shape_type {
            return Err(InteropError::Malformed {
                format: FORMAT,
                offset: content_start,
                reason: format!(
                    "record shape type {shape_type} does not match file header's {header_shape_type}"
                ),
            });
        }

        match shape_type {
            0 => {} // null shape: skip, no geometry
            1 => {
                let x = read_f64_le(data, content_start + 4, FORMAT)?;
                let y = read_f64_le(data, content_start + 12, FORMAT)?;
                geometries.push(ShapeGeometry::Point(Point::new(x, y)));
            }
            3 | 5 => {
                let num_parts = read_i32_le(data, content_start + 36, FORMAT)? as usize;
                let num_points = read_i32_le(data, content_start + 40, FORMAT)? as usize;
                let parts_start = content_start + 44;
                let mut part_offsets = Vec::with_capacity(num_parts);
                for i in 0..num_parts {
                    part_offsets.push(read_i32_le(data, parts_start + i * 4, FORMAT)? as usize);
                }
                let points_start = parts_start + num_parts * 4;
                let mut all_points = Vec::with_capacity(num_points);
                for i in 0..num_points {
                    let x = read_f64_le(data, points_start + i * 16, FORMAT)?;
                    let y = read_f64_le(data, points_start + i * 16 + 8, FORMAT)?;
                    all_points.push(Point::new(x, y));
                }
                let mut parts = Vec::with_capacity(num_parts);
                for i in 0..num_parts {
                    let start = part_offsets[i];
                    let end = part_offsets.get(i + 1).copied().unwrap_or(num_points);
                    if start > end || end > all_points.len() {
                        return Err(InteropError::Malformed {
                            format: FORMAT,
                            offset: parts_start + i * 4,
                            reason: format!("part index range [{start}, {end}) is invalid"),
                        });
                    }
                    parts.push(all_points[start..end].to_vec());
                }
                geometries.push(if shape_type == 3 {
                    ShapeGeometry::PolyLine(parts)
                } else {
                    ShapeGeometry::Polygon(parts)
                });
            }
            other => {
                return Err(InteropError::Unsupported {
                    format: FORMAT,
                    reason: format!(
                        "shape type {other} is not supported (only Point/PolyLine/Polygon)"
                    ),
                })
            }
        }

        cursor = content_start + content_len;
    }
    Ok(geometries)
}

// ---------------------------------------------------------------------------
// .dbf reader/writer
// ---------------------------------------------------------------------------

fn dbf_field_value(raw: &str, field_type: char) -> AttributeValue {
    let trimmed = raw.trim();
    match field_type {
        'N' | 'F' => trimmed
            .parse::<f64>()
            .map(AttributeValue::Number)
            .unwrap_or(AttributeValue::Null),
        'L' => match trimmed {
            "T" | "t" | "Y" | "y" => AttributeValue::Boolean(true),
            "F" | "f" | "N" | "n" => AttributeValue::Boolean(false),
            _ => AttributeValue::Null,
        },
        _ => AttributeValue::Text(trimmed.to_string()),
    }
}

/// Serialize a `.dbf` attribute table for the given features' rows, using
/// field widths/types inferred from the first occurrence of each column.
pub fn write_dbf(features: &[ShapeFeature]) -> Vec<u8> {
    let schema = field_schema_from_features(features);
    let record_length: usize = 1 + schema.iter().map(|f| f.width as usize).sum::<usize>();
    let header_length = 32 + schema.len() * 32 + 1;

    // 0x03 = dBase III, no memo; then a 3-byte last-update date (year since
    // 1900/month/day), left unset (0/0/0).
    let mut buf = vec![0x03u8, 0, 0, 0];
    buf.extend((features.len() as u32).to_le_bytes());
    buf.extend((header_length as u16).to_le_bytes());
    buf.extend((record_length as u16).to_le_bytes());
    buf.extend([0u8; 20]); // reserved

    for f in &schema {
        let mut name_bytes = [0u8; 11];
        let bytes = f.name.as_bytes();
        let n = bytes.len().min(10);
        name_bytes[..n].copy_from_slice(&bytes[..n]);
        buf.extend(name_bytes);
        buf.push(f.field_type as u8);
        buf.extend([0u8; 4]); // field data address, unused
        buf.push(f.width);
        buf.push(f.decimals);
        buf.extend([0u8; 14]); // reserved
    }
    buf.push(0x0d); // header terminator

    for feat in features {
        buf.push(b' '); // not deleted
        for field in &schema {
            let value = feat
                .attributes
                .iter()
                .find(|(name, _)| name == &field.name)
                .map(|(_, v)| v.clone())
                .unwrap_or(AttributeValue::Null);
            let text = match value {
                AttributeValue::Text(s) => s,
                AttributeValue::Number(n) => format!("{n:.*}", field.decimals as usize),
                AttributeValue::Boolean(b) => if b { "T" } else { "F" }.to_string(),
                AttributeValue::Null => String::new(),
            };
            let width = field.width as usize;
            let mut cell = vec![b' '; width];
            let bytes = text.as_bytes();
            let n = bytes.len().min(width);
            if field.field_type == 'N' || field.field_type == 'F' {
                // Right-align numeric fields (DBF convention).
                cell[width - n..].copy_from_slice(&bytes[..n]);
            } else {
                cell[..n].copy_from_slice(&bytes[..n]);
            }
            buf.extend(cell);
        }
    }
    buf.push(0x1a); // end-of-file marker
    buf
}

/// Parse a `.dbf` attribute table into rows of `(field name, value)` pairs.
///
/// # Errors
/// [`InteropError::Malformed`] if the file is shorter than its declared
/// header/record length, or a field descriptor/record is truncated.
pub fn parse_dbf(data: &[u8]) -> InteropResult<Vec<Vec<(String, AttributeValue)>>> {
    if data.len() < 32 {
        return Err(InteropError::Malformed {
            format: FORMAT,
            offset: 0,
            reason: "file shorter than the 32-byte DBF header".to_string(),
        });
    }
    let record_count = u32::from_le_bytes(data[4..8].try_into().unwrap()) as usize;
    let header_length = u16::from_le_bytes(data[8..10].try_into().unwrap()) as usize;
    let record_length = u16::from_le_bytes(data[10..12].try_into().unwrap()) as usize;
    if header_length > data.len() {
        return Err(InteropError::Malformed {
            format: FORMAT,
            offset: 8,
            reason: format!(
                "declared header length {header_length} exceeds file size {}",
                data.len()
            ),
        });
    }

    let mut fields: Vec<FieldSchema> = Vec::new();
    let mut off = 32;
    while off < header_length - 1 && data.get(off) != Some(&0x0d) {
        if off + 32 > data.len() {
            return Err(InteropError::Malformed {
                format: FORMAT,
                offset: off,
                reason: "truncated field descriptor".to_string(),
            });
        }
        let name_bytes = &data[off..off + 11];
        let name_end = name_bytes.iter().position(|&b| b == 0).unwrap_or(11);
        let name = String::from_utf8_lossy(&name_bytes[..name_end]).into_owned();
        let field_type = data[off + 11] as char;
        let width = data[off + 16];
        let decimals = data[off + 17];
        fields.push(FieldSchema {
            name,
            field_type,
            width,
            decimals,
        });
        off += 32;
    }

    let mut rows = Vec::with_capacity(record_count);
    let mut cursor = header_length;
    for _ in 0..record_count {
        if cursor + record_length > data.len() {
            return Err(InteropError::Malformed {
                format: FORMAT,
                offset: cursor,
                reason: "truncated record".to_string(),
            });
        }
        let mut field_off = cursor + 1; // skip deletion flag
        let mut row = Vec::with_capacity(fields.len());
        for f in &fields {
            let width = f.width as usize;
            let raw = String::from_utf8_lossy(&data[field_off..field_off + width]).into_owned();
            row.push((f.name.clone(), dbf_field_value(&raw, f.field_type)));
            field_off += width;
        }
        rows.push(row);
        cursor += record_length;
    }
    Ok(rows)
}

/// Assemble features by zipping parsed `.shp` geometries with parsed `.dbf`
/// rows (matched positionally, as the shapefile spec requires: record *n* in
/// each file describes the same feature).
///
/// # Errors
/// [`InteropError::CountMismatch`] if the geometry and attribute counts differ.
pub fn zip_shapefile(
    geometries: Vec<ShapeGeometry>,
    attribute_rows: Vec<Vec<(String, AttributeValue)>>,
) -> InteropResult<Vec<ShapeFeature>> {
    if geometries.len() != attribute_rows.len() {
        return Err(InteropError::CountMismatch {
            format: FORMAT,
            what: "records (.shp vs .dbf)",
            expected: geometries.len(),
            actual: attribute_rows.len(),
        });
    }
    Ok(geometries
        .into_iter()
        .zip(attribute_rows)
        .map(|(geometry, attributes)| ShapeFeature {
            geometry,
            attributes,
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn features() -> Vec<ShapeFeature> {
        vec![
            ShapeFeature {
                geometry: ShapeGeometry::Polygon(vec![vec![
                    Point::new(0.0, 0.0),
                    Point::new(100.0, 0.0),
                    Point::new(100.0, 100.0),
                    Point::new(0.0, 100.0),
                ]]),
                attributes: vec![
                    (
                        "APN".to_string(),
                        AttributeValue::Text("045-12-007".to_string()),
                    ),
                    ("AREA".to_string(), AttributeValue::Number(10000.0)),
                ],
            },
            ShapeFeature {
                geometry: ShapeGeometry::Polygon(vec![vec![
                    Point::new(200.0, 0.0),
                    Point::new(300.0, 0.0),
                    Point::new(300.0, 100.0),
                ]]),
                attributes: vec![
                    (
                        "APN".to_string(),
                        AttributeValue::Text("045-12-008".to_string()),
                    ),
                    ("AREA".to_string(), AttributeValue::Number(5000.5)),
                ],
            },
        ]
    }

    #[test]
    fn polygon_shapefile_round_trips_geometry_and_attributes() {
        let feats = features();
        let geoms: Vec<_> = feats.iter().map(|f| f.geometry.clone()).collect();
        let shp = write_shp(&geoms).unwrap();
        let dbf = write_dbf(&feats);

        let parsed_geoms = parse_shp(&shp).unwrap();
        let parsed_rows = parse_dbf(&dbf).unwrap();
        let parsed = zip_shapefile(parsed_geoms, parsed_rows).unwrap();

        assert_eq!(parsed.len(), 2);
        let ShapeGeometry::Polygon(rings) = &parsed[0].geometry else {
            panic!("expected polygon");
        };
        assert_eq!(rings[0].len(), 4);
        for (orig, got) in feats[0]
            .geometry
            .clone()
            .into_polygon_points()
            .iter()
            .zip(rings[0].iter())
        {
            assert!((orig.x - got.x).abs() < 1e-6);
            assert!((orig.y - got.y).abs() < 1e-6);
        }
        assert_eq!(
            parsed[0].attributes[0],
            (
                "APN".to_string(),
                AttributeValue::Text("045-12-007".to_string())
            )
        );
        let AttributeValue::Number(area) = parsed[0].attributes[1].1 else {
            panic!("expected numeric area");
        };
        assert!((area - 10000.0).abs() < 1e-3);
    }

    #[test]
    fn point_shapefile_round_trips() {
        let geoms = vec![ShapeGeometry::Point(Point::new(12.5, -7.25))];
        let shp = write_shp(&geoms).unwrap();
        let parsed = parse_shp(&shp).unwrap();
        assert_eq!(parsed, geoms);
    }

    #[test]
    fn polyline_shapefile_round_trips_multiple_parts() {
        let geoms = vec![ShapeGeometry::PolyLine(vec![
            vec![Point::new(0.0, 0.0), Point::new(10.0, 0.0)],
            vec![
                Point::new(20.0, 20.0),
                Point::new(30.0, 20.0),
                Point::new(30.0, 30.0),
            ],
        ])];
        let shp = write_shp(&geoms).unwrap();
        let parsed = parse_shp(&shp).unwrap();
        assert_eq!(parsed, geoms);
    }

    #[test]
    fn bad_file_code_is_malformed() {
        let mut shp = write_shp(&[ShapeGeometry::Point(Point::new(0.0, 0.0))]).unwrap();
        shp[3] = 0xff; // corrupt the low byte of the big-endian file code
        let err = parse_shp(&shp).unwrap_err();
        assert!(matches!(err, InteropError::Malformed { .. }));
    }

    #[test]
    fn truncated_file_is_malformed() {
        let err = parse_shp(&[0u8; 10]).unwrap_err();
        assert!(matches!(err, InteropError::Malformed { .. }));
    }

    #[test]
    fn empty_geometry_list_is_unsupported() {
        assert!(matches!(
            write_shp(&[]).unwrap_err(),
            InteropError::Unsupported { .. }
        ));
    }

    #[test]
    fn mixed_shape_types_are_unsupported() {
        let geoms = vec![
            ShapeGeometry::Point(Point::new(0.0, 0.0)),
            ShapeGeometry::PolyLine(vec![vec![Point::new(0.0, 0.0), Point::new(1.0, 1.0)]]),
        ];
        assert!(matches!(
            write_shp(&geoms).unwrap_err(),
            InteropError::Unsupported { .. }
        ));
    }

    #[test]
    fn mismatched_record_counts_are_rejected() {
        let geoms = vec![ShapeGeometry::Point(Point::new(0.0, 0.0))];
        let err = zip_shapefile(geoms, vec![]).unwrap_err();
        assert!(matches!(err, InteropError::CountMismatch { .. }));
    }

    #[test]
    fn dbf_round_trips_text_number_and_boolean_fields() {
        let feats = vec![ShapeFeature {
            geometry: ShapeGeometry::Point(Point::new(0.0, 0.0)),
            attributes: vec![
                (
                    "NAME".to_string(),
                    AttributeValue::Text("Lot 1".to_string()),
                ),
                ("AREA".to_string(), AttributeValue::Number(1234.5)),
                ("FLAG".to_string(), AttributeValue::Boolean(true)),
            ],
        }];
        let dbf = write_dbf(&feats);
        let rows = parse_dbf(&dbf).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(
            rows[0][0],
            (
                "NAME".to_string(),
                AttributeValue::Text("Lot 1".to_string())
            )
        );
        assert_eq!(
            rows[0][2],
            ("FLAG".to_string(), AttributeValue::Boolean(true))
        );
    }

    // Test-only helper to reach into a `ShapeGeometry::Polygon`'s first ring.
    impl ShapeGeometry {
        fn into_polygon_points(self) -> Vec<Point> {
            match self {
                ShapeGeometry::Polygon(rings) => rings.into_iter().next().unwrap_or_default(),
                _ => panic!("not a polygon"),
            }
        }
    }
}
