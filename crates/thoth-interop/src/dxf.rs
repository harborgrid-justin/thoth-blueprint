//! DXF basemap import: turn CAD entities into `thoth_planning::PlanElement`s
//! so an existing survey/basemap drawing can become the starting point for a
//! plan.
//!
//! Scope: parses the ASCII DXF group-code stream (the same tag-value format
//! `thoth_civil::pointcloud::parse_dxf` reads for `POINT` entities) for the
//! `ENTITIES` section, recognizing `LINE`, `LWPOLYLINE`, `POLYLINE` (+ its
//! `VERTEX`/`SEQEND` children), `CIRCLE`, `ARC`, and `TEXT`. Does not read
//! blocks/`INSERT` references, hatches, dimensions, 3D entities (elevation/
//! extrusion direction is ignored — every entity is flattened to its XY plan
//! projection), or binary DXF.
//!
//! **Mapping to `PlanElement`** (every concrete element requires a closed
//! [`thoth_spatial::Polygon`] boundary via `ElementBase`, which raw CAD
//! linework does not inherently have):
//!
//! - A **closed** `LWPOLYLINE`/`POLYLINE` (explicit closed flag, or an
//!   explicitly repeated first/last vertex) and every `CIRCLE` become a
//!   [`PlanElement::Region`] — the most generic boundary-only element kind —
//!   with the circle approximated by a 64-gon (see [`CIRCLE_SEGMENTS`]).
//! - An **open** `LINE`/`LWPOLYLINE`/`POLYLINE`/`ARC` becomes a
//!   [`PlanElement::RightOfWay`] with `centerline` set to the traced
//!   vertices (the semantically meaningful data) and a synthetic boundary
//!   ring: a thin buffer of [`LINEAR_BOUNDARY_WIDTH`] plan units either side
//!   of the centerline, present *only* to satisfy `ElementBase`'s
//!   non-degenerate-polygon invariant — it is not a real right-of-way width
//!   and callers should not treat it as one.
//! - `TEXT` becomes a [`PlanElement::Note`] (position = insertion point,
//!   text = the DXF text string).
//!
//! Every imported element's `cad_layer_id` is set from the entity's DXF
//! layer (group code 8), so the original CAD layering survives the import
//! even though this crate's own `layer_id` is a fresh planning layer.

use thoth_planning::{new_base, PlanElement};
use thoth_spatial::{ElementKind, Point, Polygon};

use crate::error::{InteropError, InteropResult};

/// Segments used to approximate a `CIRCLE` entity as a polygon.
pub const CIRCLE_SEGMENTS: u32 = 64;

/// Half-width (plan units) of the synthetic boundary buffered around an
/// imported open linear entity — see the module scope doc.
pub const LINEAR_BOUNDARY_WIDTH: f64 = 0.01;

const FORMAT: &str = "DXF";

/// One DXF entity extracted from the `ENTITIES` section, before conversion
/// to a `PlanElement`.
#[derive(Debug, Clone, PartialEq)]
enum DxfEntity {
    Line {
        layer: String,
        start: Point,
        end: Point,
    },
    Polyline {
        layer: String,
        vertices: Vec<Point>,
        closed: bool,
    },
    Circle {
        layer: String,
        center: Point,
        radius: f64,
    },
    Arc {
        layer: String,
        center: Point,
        radius: f64,
        start_angle_deg: f64,
        end_angle_deg: f64,
    },
    Text {
        layer: String,
        position: Point,
        text: String,
    },
}

/// The outcome of importing one DXF entity: either a plan element, or a
/// documented reason it was intentionally not converted (e.g. a degenerate
/// zero-length line) — this crate never silently drops an entity without
/// saying why.
#[derive(Debug, Clone, PartialEq)]
pub enum ImportOutcome {
    /// Boxed because `PlanElement` is much larger than the `Skipped` variant
    /// (it embeds a full `ElementBase` with a boundary polygon); boxing
    /// keeps `ImportOutcome` itself small regardless of which variant is
    /// most common in a given import.
    Imported(Box<PlanElement>),
    Skipped {
        entity: &'static str,
        reason: String,
    },
}

/// The result of importing a DXF document: every entity's outcome, so a
/// caller can present "N imported, M skipped (why)" rather than a silent
/// partial import.
#[derive(Debug, Clone, Default)]
pub struct DxfImportResult {
    pub outcomes: Vec<ImportOutcome>,
}

impl DxfImportResult {
    /// Just the successfully imported elements, in entity order.
    pub fn elements(&self) -> Vec<&PlanElement> {
        self.outcomes
            .iter()
            .filter_map(|o| match o {
                ImportOutcome::Imported(e) => Some(e.as_ref()),
                ImportOutcome::Skipped { .. } => None,
            })
            .collect()
    }
}

/// A full circle's boundary as a closed ring of `segments` distinct vertices
/// (the closing edge back to vertex 0 is implied, matching `Polygon`'s
/// convention — the first point is not repeated at the end).
fn circle_points(center: Point, radius: f64, segments: u32) -> Vec<Point> {
    let steps = segments.max(3);
    (0..steps)
        .map(|i| {
            let ang = (360.0 * i as f64 / steps as f64).to_radians();
            Point::new(center.x + radius * ang.cos(), center.y + radius * ang.sin())
        })
        .collect()
}

fn arc_points(
    center: Point,
    radius: f64,
    start_deg: f64,
    end_deg: f64,
    segments: u32,
) -> Vec<Point> {
    let mut sweep = end_deg - start_deg;
    while sweep < 0.0 {
        sweep += 360.0;
    }
    if sweep.abs() < 1e-9 {
        sweep = 360.0;
    }
    let steps = segments.max(1);
    (0..=steps)
        .map(|i| {
            let ang = (start_deg + sweep * i as f64 / steps as f64).to_radians();
            Point::new(center.x + radius * ang.cos(), center.y + radius * ang.sin())
        })
        .collect()
}

/// Buffer an open polyline into a thin closed ring — see
/// [`LINEAR_BOUNDARY_WIDTH`]. Returns `None` if the centerline is degenerate
/// (fewer than 2 distinct points).
fn thin_buffer(centerline: &[Point], half_width: f64) -> Option<Polygon> {
    if centerline.len() < 2 {
        return None;
    }
    let mut left = Vec::with_capacity(centerline.len());
    let mut right = Vec::with_capacity(centerline.len());
    for i in 0..centerline.len() {
        let prev = if i == 0 {
            centerline[0]
        } else {
            centerline[i - 1]
        };
        let next = if i + 1 < centerline.len() {
            centerline[i + 1]
        } else {
            centerline[i]
        };
        let dir = thoth_spatial::normalize(thoth_spatial::subtract(next, prev));
        if thoth_spatial::length(dir) < 1e-12 {
            return None;
        }
        let normal = Point::new(-dir.y, dir.x);
        let p = centerline[i];
        left.push(Point::new(
            p.x + normal.x * half_width,
            p.y + normal.y * half_width,
        ));
        right.push(Point::new(
            p.x - normal.x * half_width,
            p.y - normal.y * half_width,
        ));
    }
    right.reverse();
    left.extend(right);
    if thoth_spatial::area(&left) < thoth_spatial::GEOMETRY_EPSILON {
        return None;
    }
    Some(left)
}

fn convert_entity(entity: DxfEntity, index: usize) -> ImportOutcome {
    let id = |kind: &str| format!("dxf-{kind}-{index}");
    match entity {
        DxfEntity::Circle {
            layer,
            center,
            radius,
        } => {
            if radius <= 0.0 {
                return ImportOutcome::Skipped {
                    entity: "CIRCLE",
                    reason: format!("non-positive radius {radius}"),
                };
            }
            let boundary = circle_points(center, radius, CIRCLE_SEGMENTS);
            let mut base = new_base(
                id("region"),
                ElementKind::Region,
                "Imported circle",
                "dxf-import",
                boundary,
            );
            base.cad_layer_id = Some(layer);
            ImportOutcome::Imported(Box::new(PlanElement::Region(
                thoth_planning::elements::Region {
                    base,
                    region_type: None,
                },
            )))
        }
        DxfEntity::Polyline {
            layer,
            vertices,
            closed,
        } => {
            let repeats_first_vertex = vertices.len() >= 2
                && thoth_spatial::distance(vertices[0], *vertices.last().unwrap()) < 1e-9;
            let is_closed = closed || repeats_first_vertex;
            let ring: Vec<Point> = if repeats_first_vertex {
                vertices[..vertices.len() - 1].to_vec()
            } else {
                vertices.clone()
            };

            if is_closed {
                if ring.len() < 3 || thoth_spatial::area(&ring) < thoth_spatial::GEOMETRY_EPSILON {
                    return ImportOutcome::Skipped {
                        entity: "LWPOLYLINE/POLYLINE",
                        reason: "closed polyline has a degenerate (near-zero-area) boundary"
                            .to_string(),
                    };
                }
                let mut base = new_base(
                    id("region"),
                    ElementKind::Region,
                    "Imported polyline",
                    "dxf-import",
                    ring,
                );
                base.cad_layer_id = Some(layer);
                ImportOutcome::Imported(Box::new(PlanElement::Region(
                    thoth_planning::elements::Region {
                        base,
                        region_type: None,
                    },
                )))
            } else {
                let Some(buffer) = thin_buffer(&vertices, LINEAR_BOUNDARY_WIDTH) else {
                    return ImportOutcome::Skipped {
                        entity: "LWPOLYLINE/POLYLINE",
                        reason: "open polyline has fewer than 2 distinct vertices".to_string(),
                    };
                };
                let mut base = new_base(
                    id("row"),
                    ElementKind::Row,
                    "Imported linework",
                    "dxf-import",
                    buffer,
                );
                base.cad_layer_id = Some(layer);
                ImportOutcome::Imported(Box::new(PlanElement::RightOfWay(
                    thoth_planning::elements::RightOfWay {
                        base,
                        centerline: Some(vertices),
                        width: None,
                    },
                )))
            }
        }
        DxfEntity::Line { layer, start, end } => {
            let Some(buffer) = thin_buffer(&[start, end], LINEAR_BOUNDARY_WIDTH) else {
                return ImportOutcome::Skipped {
                    entity: "LINE",
                    reason: "zero-length line".to_string(),
                };
            };
            let mut base = new_base(
                id("row"),
                ElementKind::Row,
                "Imported line",
                "dxf-import",
                buffer,
            );
            base.cad_layer_id = Some(layer);
            ImportOutcome::Imported(Box::new(PlanElement::RightOfWay(
                thoth_planning::elements::RightOfWay {
                    base,
                    centerline: Some(vec![start, end]),
                    width: None,
                },
            )))
        }
        DxfEntity::Arc {
            layer,
            center,
            radius,
            start_angle_deg,
            end_angle_deg,
        } => {
            if radius <= 0.0 {
                return ImportOutcome::Skipped {
                    entity: "ARC",
                    reason: format!("non-positive radius {radius}"),
                };
            }
            let vertices = arc_points(
                center,
                radius,
                start_angle_deg,
                end_angle_deg,
                CIRCLE_SEGMENTS / 2,
            );
            let Some(buffer) = thin_buffer(&vertices, LINEAR_BOUNDARY_WIDTH) else {
                return ImportOutcome::Skipped {
                    entity: "ARC",
                    reason: "degenerate arc".to_string(),
                };
            };
            let mut base = new_base(
                id("row"),
                ElementKind::Row,
                "Imported arc",
                "dxf-import",
                buffer,
            );
            base.cad_layer_id = Some(layer);
            ImportOutcome::Imported(Box::new(PlanElement::RightOfWay(
                thoth_planning::elements::RightOfWay {
                    base,
                    centerline: Some(vertices),
                    width: None,
                },
            )))
        }
        DxfEntity::Text {
            layer,
            position,
            text,
        } => ImportOutcome::Imported(Box::new(PlanElement::Note(
            thoth_planning::elements::PlanNote {
                id: id("note"),
                kind: ElementKind::Note,
                layer_id: layer,
                text,
                position,
                renovation_status: Default::default(),
            },
        ))),
    }
}

/// Parse a DXF document's `ENTITIES` section and convert every recognized
/// entity into a `PlanElement` (or a documented skip reason).
///
/// # Errors
/// [`InteropError::Malformed`] if a group code isn't a valid integer, or a
/// coordinate value isn't a valid number.
pub fn import_dxf(text: &str) -> InteropResult<DxfImportResult> {
    let lines: Vec<&str> = text
        .split(['\n', '\r'])
        .filter(|l| !l.is_empty())
        .map(str::trim)
        .collect();

    let mut entities = Vec::new();
    let mut i = 0usize;
    let mut in_entities = false;
    let mut pending_polyline: Option<(String, Vec<Point>, bool)> = None;

    while i + 1 < lines.len() {
        let code: i32 = lines[i].parse().map_err(|e| InteropError::Malformed {
            format: FORMAT,
            offset: i,
            reason: format!("group code '{}' is not an integer: {e}", lines[i]),
        })?;
        let value = lines[i + 1];
        i += 2;

        if code == 2 && value == "ENTITIES" {
            in_entities = true;
            continue;
        }
        if code == 0 && value == "ENDSEC" {
            in_entities = false;
            continue;
        }
        if !in_entities {
            continue;
        }

        if code == 0 {
            // Flush any polyline being accumulated via VERTEX records.
            if value != "VERTEX" {
                if let Some((layer, vertices, closed)) = pending_polyline.take() {
                    entities.push(DxfEntity::Polyline {
                        layer,
                        vertices,
                        closed,
                    });
                }
            }
            match value {
                "LINE" => {
                    let (entity, consumed) = parse_line(&lines, i, FORMAT)?;
                    entities.push(entity);
                    i = consumed;
                }
                "LWPOLYLINE" => {
                    let (entity, consumed) = parse_lwpolyline(&lines, i, FORMAT)?;
                    entities.push(entity);
                    i = consumed;
                }
                "POLYLINE" => {
                    let (layer, closed, consumed) = parse_polyline_header(&lines, i, FORMAT)?;
                    pending_polyline = Some((layer, Vec::new(), closed));
                    i = consumed;
                }
                "VERTEX" => {
                    let (point, consumed) = parse_vertex(&lines, i, FORMAT)?;
                    if let Some((_, vertices, _)) = pending_polyline.as_mut() {
                        vertices.push(point);
                    }
                    i = consumed;
                }
                "SEQEND" => {
                    i = skip_entity_body(&lines, i);
                }
                "CIRCLE" => {
                    let (entity, consumed) = parse_circle(&lines, i, FORMAT)?;
                    entities.push(entity);
                    i = consumed;
                }
                "ARC" => {
                    let (entity, consumed) = parse_arc(&lines, i, FORMAT)?;
                    entities.push(entity);
                    i = consumed;
                }
                "TEXT" | "MTEXT" => {
                    let (entity, consumed) = parse_text(&lines, i, FORMAT)?;
                    entities.push(entity);
                    i = consumed;
                }
                _ => {
                    i = skip_entity_body(&lines, i);
                }
            }
        }
    }
    if let Some((layer, vertices, closed)) = pending_polyline.take() {
        entities.push(DxfEntity::Polyline {
            layer,
            vertices,
            closed,
        });
    }

    let outcomes = entities
        .into_iter()
        .enumerate()
        .map(|(idx, e)| convert_entity(e, idx))
        .collect();
    Ok(DxfImportResult { outcomes })
}

/// Read group codes until the next entity-starting `0` code, returning the
/// index positioned at that next `0` code (or end of input).
fn skip_entity_body(lines: &[&str], mut i: usize) -> usize {
    while i + 1 < lines.len() {
        if lines[i] == "0" {
            break;
        }
        i += 2;
    }
    i
}

/// Common per-entity scalar accumulator: layer name (group 8) plus whatever
/// numeric group codes the caller asks for, read until the next `0` code.
struct EntityFields {
    layer: String,
    values: std::collections::BTreeMap<i32, f64>,
    text: Option<String>,
}

fn read_entity_fields(
    lines: &[&str],
    mut i: usize,
    format: &'static str,
) -> InteropResult<(EntityFields, usize)> {
    let mut fields = EntityFields {
        layer: "0".to_string(),
        values: std::collections::BTreeMap::new(),
        text: None,
    };
    while i + 1 < lines.len() {
        if lines[i] == "0" {
            break;
        }
        let code: i32 = lines[i].parse().map_err(|e| InteropError::Malformed {
            format,
            offset: i,
            reason: format!("group code '{}' is not an integer: {e}", lines[i]),
        })?;
        let value = lines[i + 1];
        i += 2;
        match code {
            8 => fields.layer = value.to_string(),
            1 => fields.text = Some(value.to_string()),
            _ => {
                if let Ok(v) = value.parse::<f64>() {
                    fields.values.insert(code, v);
                }
            }
        }
    }
    Ok((fields, i))
}

fn get(
    fields: &EntityFields,
    code: i32,
    format: &'static str,
    entity: &str,
    i: usize,
) -> InteropResult<f64> {
    fields
        .values
        .get(&code)
        .copied()
        .ok_or_else(|| InteropError::Malformed {
            format,
            offset: i,
            reason: format!("{entity} is missing required group code {code}"),
        })
}

fn parse_line(lines: &[&str], i: usize, format: &'static str) -> InteropResult<(DxfEntity, usize)> {
    let (f, next) = read_entity_fields(lines, i, format)?;
    let start = Point::new(
        get(&f, 10, format, "LINE", i)?,
        get(&f, 20, format, "LINE", i)?,
    );
    let end = Point::new(
        get(&f, 11, format, "LINE", i)?,
        get(&f, 21, format, "LINE", i)?,
    );
    Ok((
        DxfEntity::Line {
            layer: f.layer,
            start,
            end,
        },
        next,
    ))
}

fn parse_circle(
    lines: &[&str],
    i: usize,
    format: &'static str,
) -> InteropResult<(DxfEntity, usize)> {
    let (f, next) = read_entity_fields(lines, i, format)?;
    let center = Point::new(
        get(&f, 10, format, "CIRCLE", i)?,
        get(&f, 20, format, "CIRCLE", i)?,
    );
    let radius = get(&f, 40, format, "CIRCLE", i)?;
    Ok((
        DxfEntity::Circle {
            layer: f.layer,
            center,
            radius,
        },
        next,
    ))
}

fn parse_arc(lines: &[&str], i: usize, format: &'static str) -> InteropResult<(DxfEntity, usize)> {
    let (f, next) = read_entity_fields(lines, i, format)?;
    let center = Point::new(
        get(&f, 10, format, "ARC", i)?,
        get(&f, 20, format, "ARC", i)?,
    );
    let radius = get(&f, 40, format, "ARC", i)?;
    let start_angle_deg = get(&f, 50, format, "ARC", i)?;
    let end_angle_deg = get(&f, 51, format, "ARC", i)?;
    Ok((
        DxfEntity::Arc {
            layer: f.layer,
            center,
            radius,
            start_angle_deg,
            end_angle_deg,
        },
        next,
    ))
}

fn parse_text(lines: &[&str], i: usize, format: &'static str) -> InteropResult<(DxfEntity, usize)> {
    let (f, next) = read_entity_fields(lines, i, format)?;
    let position = Point::new(
        get(&f, 10, format, "TEXT", i)?,
        get(&f, 20, format, "TEXT", i)?,
    );
    Ok((
        DxfEntity::Text {
            layer: f.layer,
            position,
            text: f.text.unwrap_or_default(),
        },
        next,
    ))
}

fn parse_vertex(lines: &[&str], i: usize, format: &'static str) -> InteropResult<(Point, usize)> {
    let (f, next) = read_entity_fields(lines, i, format)?;
    let x = get(&f, 10, format, "VERTEX", i)?;
    let y = get(&f, 20, format, "VERTEX", i)?;
    Ok((Point::new(x, y), next))
}

fn parse_polyline_header(
    lines: &[&str],
    i: usize,
    format: &'static str,
) -> InteropResult<(String, bool, usize)> {
    let (f, next) = read_entity_fields(lines, i, format)?;
    let closed = f
        .values
        .get(&70)
        .map(|v| (*v as i64) & 1 != 0)
        .unwrap_or(false);
    Ok((f.layer, closed, next))
}

fn parse_lwpolyline(
    lines: &[&str],
    i: usize,
    format: &'static str,
) -> InteropResult<(DxfEntity, usize)> {
    // LWPOLYLINE repeats group codes 10/20 once per vertex; walk manually
    // instead of using `read_entity_fields` (which keeps only the last value
    // per code).
    let mut layer = "0".to_string();
    let mut closed = false;
    let mut vertices: Vec<Point> = Vec::new();
    let mut pending_x: Option<f64> = None;
    let mut cursor = i;
    while cursor + 1 < lines.len() {
        if lines[cursor] == "0" {
            break;
        }
        let code: i32 = lines[cursor].parse().map_err(|e| InteropError::Malformed {
            format,
            offset: cursor,
            reason: format!("group code '{}' is not an integer: {e}", lines[cursor]),
        })?;
        let value = lines[cursor + 1];
        cursor += 2;
        match code {
            8 => layer = value.to_string(),
            70 => closed = value.parse::<i64>().map(|v| v & 1 != 0).unwrap_or(false),
            10 => pending_x = value.parse::<f64>().ok(),
            20 => {
                if let (Some(x), Ok(y)) = (pending_x.take(), value.parse::<f64>()) {
                    vertices.push(Point::new(x, y));
                }
            }
            _ => {}
        }
    }
    Ok((
        DxfEntity::Polyline {
            layer,
            vertices,
            closed,
        },
        cursor,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dxf(entities_body: &str) -> String {
        format!("0\nSECTION\n2\nENTITIES\n{entities_body}0\nENDSEC\n0\nEOF\n")
    }

    #[test]
    fn closed_lwpolyline_becomes_a_region() {
        let text = dxf(
            "0\nLWPOLYLINE\n8\nSITE\n70\n1\n10\n0\n20\n0\n10\n10\n20\n0\n10\n10\n20\n10\n10\n0\n20\n10\n",
        );
        let result = import_dxf(&text).unwrap();
        assert_eq!(result.elements().len(), 1);
        let PlanElement::Region(r) = result.elements()[0] else {
            panic!("expected Region");
        };
        assert_eq!(r.base.cad_layer_id.as_deref(), Some("SITE"));
        assert_eq!(r.base.boundary.len(), 4);
    }

    #[test]
    fn open_line_becomes_a_right_of_way_with_centerline() {
        let text = dxf("0\nLINE\n8\nROADS\n10\n0\n20\n0\n11\n100\n21\n0\n");
        let result = import_dxf(&text).unwrap();
        assert_eq!(result.elements().len(), 1);
        let PlanElement::RightOfWay(row) = result.elements()[0] else {
            panic!("expected RightOfWay");
        };
        let centerline = row.centerline.as_ref().unwrap();
        assert_eq!(centerline.len(), 2);
        assert_eq!(centerline[1], Point::new(100.0, 0.0));
    }

    #[test]
    fn circle_becomes_a_region_approximated_as_a_polygon() {
        let text = dxf("0\nCIRCLE\n8\n0\n10\n0\n20\n0\n40\n5\n");
        let result = import_dxf(&text).unwrap();
        let PlanElement::Region(r) = result.elements()[0] else {
            panic!("expected Region");
        };
        assert_eq!(r.base.boundary.len() as u32, CIRCLE_SEGMENTS);
        let area = thoth_spatial::area(&r.base.boundary);
        let expected = std::f64::consts::PI * 25.0;
        assert!((area - expected).abs() / expected < 0.01);
    }

    #[test]
    fn text_becomes_a_note() {
        let text = dxf("0\nTEXT\n8\nLABELS\n10\n5\n20\n5\n1\nLot 1\n");
        let result = import_dxf(&text).unwrap();
        let PlanElement::Note(n) = result.elements()[0] else {
            panic!("expected Note");
        };
        assert_eq!(n.text, "Lot 1");
        assert_eq!(n.position, Point::new(5.0, 5.0));
    }

    #[test]
    fn polyline_with_vertices_and_seqend_is_read() {
        let text = dxf(
            "0\nPOLYLINE\n8\nSITE\n70\n1\n0\nVERTEX\n10\n0\n20\n0\n0\nVERTEX\n10\n10\n20\n0\n0\nVERTEX\n10\n10\n20\n10\n0\nSEQEND\n",
        );
        let result = import_dxf(&text).unwrap();
        assert_eq!(result.elements().len(), 1);
        assert!(matches!(result.elements()[0], PlanElement::Region(_)));
    }

    #[test]
    fn zero_radius_circle_is_skipped_with_a_reason() {
        let text = dxf("0\nCIRCLE\n8\n0\n10\n0\n20\n0\n40\n0\n");
        let result = import_dxf(&text).unwrap();
        assert_eq!(result.elements().len(), 0);
        assert!(matches!(
            &result.outcomes[0],
            ImportOutcome::Skipped {
                entity: "CIRCLE",
                ..
            }
        ));
    }

    #[test]
    fn unrecognized_entities_are_skipped_without_erroring() {
        let text = dxf("0\nHATCH\n8\n0\n10\n0\n20\n0\n0\nLINE\n8\n0\n10\n0\n20\n0\n11\n1\n21\n1\n");
        let result = import_dxf(&text).unwrap();
        // HATCH isn't recognized at all (it's skipped at the parse loop, not
        // added as an entity), so only the LINE produces an outcome.
        assert_eq!(result.outcomes.len(), 1);
    }

    #[test]
    fn bad_group_code_is_malformed() {
        let text = "0\nSECTION\n2\nENTITIES\nNOTANUMBER\nLINE\n0\nENDSEC\n0\nEOF\n";
        assert!(matches!(
            import_dxf(text),
            Err(InteropError::Malformed { .. })
        ));
    }
}
