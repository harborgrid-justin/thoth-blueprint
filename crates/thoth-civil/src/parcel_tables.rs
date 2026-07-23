//! Dynamic parcel & data tables — REQ-047 through REQ-055.
//!
//! Port of `packages/domain/src/civil/parcelTables.ts`. Depends only on
//! [`crate::labels_and_udp::SegmentLabel`] and
//! [`crate::site_and_parcels::ParcelObject`], both ported within this
//! crate — no cross-crate dependency.

use crate::error::{CivilError, CivilResult};
use crate::labels_and_udp::SegmentLabel;
use crate::site_and_parcels::ParcelObject;

/// Default row cap before [`split_table_into_stacks`] starts a new stack
/// (REQ-055).
pub const DEFAULT_MAX_ROWS_PER_STACK: usize = 10;

/// The four parcel-table families (REQ-047, REQ-048, REQ-049).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ParcelTableType {
    Line,
    Curve,
    Segment,
    Area,
}

/// Whether a table tracks its source geometry live or is a frozen
/// snapshot (REQ-050, REQ-051).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReactivityMode {
    Dynamic,
    Static,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SortOrder {
    Ascending,
    Descending,
}

/// A single one-per-line/curve/segment/parcel table row. Fields not
/// applicable to a given [`ParcelTableType`] are left `None`.
#[derive(Debug, Clone, PartialEq)]
pub struct ParcelTableRow {
    /// e.g. `"L1"`, `"C1"`, `"A1"`.
    pub tag: String,
    pub length_ft: Option<f64>,
    pub bearing_text: Option<String>,
    pub radius_ft: Option<f64>,
    pub delta_angle_deg: Option<f64>,
    pub area_sq_ft: Option<f64>,
    pub perimeter_ft: Option<f64>,
    pub parcel_name: Option<String>,
}

/// A stack offset in plan units.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct StackOffset {
    pub x: f64,
    pub y: f64,
}

/// A dynamic or static parcel/segment data table.
#[derive(Debug, Clone, PartialEq)]
pub struct ParcelTable {
    pub id: String,
    pub table_type: ParcelTableType,
    pub title: String,
    pub headers: Vec<String>,
    pub rows: Vec<ParcelTableRow>,
    pub reactivity_mode: ReactivityMode,
    /// Static tables lock against edits.
    pub is_locked: bool,
    pub sort_column_index: Option<usize>,
    pub sort_order: Option<SortOrder>,
    /// REQ-055.
    pub max_rows_per_stack: Option<usize>,
    pub stack_offset: Option<StackOffset>,
}

fn empty_row(tag: String) -> ParcelTableRow {
    ParcelTableRow {
        tag,
        length_ft: None,
        bearing_text: None,
        radius_ft: None,
        delta_angle_deg: None,
        area_sq_ft: None,
        perimeter_ft: None,
        parcel_name: None,
    }
}

fn parse_distance_text(distance_text: &str) -> f64 {
    distance_text.trim_end_matches('\'').parse().unwrap_or(0.0)
}

fn default_headers(table_type: ParcelTableType) -> Vec<String> {
    match table_type {
        ParcelTableType::Line => vec!["Line #", "Bearing", "Distance (ft)"],
        ParcelTableType::Curve => vec!["Curve #", "Radius (ft)", "Delta Angle", "Length (ft)"],
        ParcelTableType::Segment => vec!["Tag", "Geometric Data", "Length (ft)"],
        ParcelTableType::Area => vec!["Parcel #", "Parcel Name", "Area (Sq Ft)", "Perimeter (Ft)"],
    }
    .into_iter()
    .map(str::to_string)
    .collect()
}

/// REQ-047, REQ-048, REQ-049: build a parcel table of the given type from
/// segment labels and/or parcels (combined segment tables tag lines `L#`
/// and curves `C#` independently within one `segment`-type table).
pub fn generate_parcel_table(
    table_type: ParcelTableType,
    title: impl Into<String>,
    segment_labels: &[SegmentLabel],
    parcels: &[ParcelObject],
) -> ParcelTable {
    let mut rows = Vec::new();
    let mut line_counter = 1;
    let mut curve_counter = 1;

    if matches!(table_type, ParcelTableType::Line | ParcelTableType::Segment) {
        for lbl in segment_labels.iter().filter(|l| !l.is_curve) {
            let tag = format!("L{line_counter}");
            line_counter += 1;
            rows.push(ParcelTableRow {
                bearing_text: Some(lbl.bearing_text.clone()),
                length_ft: Some(parse_distance_text(&lbl.distance_text)),
                ..empty_row(tag)
            });
        }
    }

    if matches!(
        table_type,
        ParcelTableType::Curve | ParcelTableType::Segment
    ) {
        for lbl in segment_labels.iter().filter(|l| l.is_curve) {
            let tag = format!("C{curve_counter}");
            curve_counter += 1;
            rows.push(ParcelTableRow {
                radius_ft: Some(lbl.radius.unwrap_or(0.0)),
                delta_angle_deg: Some(lbl.delta_angle_deg.unwrap_or(0.0)),
                length_ft: Some(
                    lbl.arc_length
                        .unwrap_or_else(|| parse_distance_text(&lbl.distance_text)),
                ),
                ..empty_row(tag)
            });
        }
    }

    if table_type == ParcelTableType::Area {
        for (lot_num, p) in (1..).zip(parcels.iter()) {
            rows.push(ParcelTableRow {
                area_sq_ft: Some(p.area_sq_ft),
                perimeter_ft: Some(p.perimeter_ft),
                parcel_name: Some(p.name.clone()),
                ..empty_row(format!("A{lot_num}"))
            });
        }
    }

    ParcelTable {
        id: format!("tbl-{table_type:?}-{}", thoth_spatial::create_id("t")),
        table_type,
        title: title.into(),
        headers: default_headers(table_type),
        rows,
        reactivity_mode: ReactivityMode::Dynamic,
        is_locked: false,
        sort_column_index: None,
        sort_order: None,
        max_rows_per_stack: Some(20),
        stack_offset: Some(StackOffset { x: 0.0, y: -200.0 }),
    }
}

/// REQ-051: lock a table to static (frozen) mode, preventing further edits
/// or conversion back to dynamic mode.
pub fn lock_static_table(table: &ParcelTable) -> ParcelTable {
    ParcelTable {
        reactivity_mode: ReactivityMode::Static,
        is_locked: true,
        ..table.clone()
    }
}

#[derive(Debug, Clone, PartialEq)]
enum SortKey {
    Text(String),
    Number(f64),
}

impl PartialOrd for SortKey {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        match (self, other) {
            (SortKey::Text(a), SortKey::Text(b)) => a.partial_cmp(b),
            (SortKey::Number(a), SortKey::Number(b)) => a.partial_cmp(b),
            // Mixed comparisons never occur in practice (every column index
            // maps to one consistent key type per table type); fall back to
            // "equal" rather than panicking.
            _ => Some(std::cmp::Ordering::Equal),
        }
    }
}

fn sort_key(table_type: ParcelTableType, column_index: usize, row: &ParcelTableRow) -> SortKey {
    if table_type == ParcelTableType::Area {
        match column_index {
            1 => SortKey::Text(row.parcel_name.clone().unwrap_or_default()),
            2 => SortKey::Number(row.area_sq_ft.unwrap_or(0.0)),
            _ => SortKey::Text(row.tag.clone()),
        }
    } else {
        match column_index {
            1 => SortKey::Number(row.length_ft.unwrap_or(0.0)),
            _ => SortKey::Text(row.tag.clone()),
        }
    }
}

/// REQ-052: sort table rows by column, ascending or descending. Rejects
/// sorting a [`ReactivityMode::Static`] (locked) table.
pub fn sort_table(
    table: &ParcelTable,
    column_index: usize,
    order: SortOrder,
) -> CivilResult<ParcelTable> {
    if table.is_locked {
        return Err(CivilError::PrerequisiteViolation {
            reason: "cannot sort a locked static table".to_string(),
        });
    }

    let mut sorted_rows = table.rows.clone();
    sorted_rows.sort_by(|a, b| {
        let ka = sort_key(table.table_type, column_index, a);
        let kb = sort_key(table.table_type, column_index, b);
        let ordering = ka.partial_cmp(&kb).unwrap_or(std::cmp::Ordering::Equal);
        match order {
            SortOrder::Ascending => ordering,
            SortOrder::Descending => ordering.reverse(),
        }
    });

    Ok(ParcelTable {
        rows: sorted_rows,
        sort_column_index: Some(column_index),
        sort_order: Some(order),
        ..table.clone()
    })
}

/// REQ-053: edit a table's title and column headers via the Text
/// Component Editor. Rejects a locked static table.
pub fn edit_table_headers(
    table: &ParcelTable,
    new_title: impl Into<String>,
    new_headers: Vec<String>,
) -> CivilResult<ParcelTable> {
    if table.is_locked {
        return Err(CivilError::PrerequisiteViolation {
            reason: "cannot edit a locked static table".to_string(),
        });
    }

    Ok(ParcelTable {
        title: new_title.into(),
        headers: new_headers,
        ..table.clone()
    })
}

/// REQ-055: split a large table into multiple tiled stacks (each capped at
/// `max_rows_per_stack` rows) across layout sheets.
pub fn split_table_into_stacks(table: &ParcelTable, max_rows_per_stack: usize) -> Vec<ParcelTable> {
    table
        .rows
        .chunks(max_rows_per_stack.max(1))
        .enumerate()
        .map(|(i, chunk)| ParcelTable {
            id: format!("{}-stack-{}", table.id, i + 1),
            title: format!("{} (Sheet {})", table.title, i + 1),
            rows: chunk.to_vec(),
            max_rows_per_stack: Some(max_rows_per_stack),
            stack_offset: Some(StackOffset {
                x: i as f64 * 300.0,
                y: 0.0,
            }),
            ..table.clone()
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::common::LineSegment;
    use crate::labels_and_udp::{default_label_style, generate_segment_label};
    use crate::site_and_parcels::ParcelStyle;
    use thoth_spatial::Point;

    fn style() -> ParcelStyle {
        ParcelStyle {
            id: "s".to_string(),
            name: "s".to_string(),
            boundary_color: "#fff".to_string(),
            linetype: "CONTINUOUS".to_string(),
            layer: "C-PROP".to_string(),
        }
    }

    fn parcel(name: &str, area: f64, perimeter: f64) -> ParcelObject {
        ParcelObject {
            id: format!("parcel-{name}"),
            name: name.to_string(),
            number: 1,
            site_id: "site-1".to_string(),
            boundary_vertices: vec![],
            arcs: None,
            style: style(),
            area_sq_ft: area,
            perimeter_ft: perimeter,
            elevation_ft: None,
            address: None,
            tax_id: None,
            user_classification: None,
        }
    }

    fn line_label(dx: f64, dy: f64) -> SegmentLabel {
        generate_segment_label(
            LineSegment::new(Point::ZERO, Point::new(dx, dy)),
            false,
            None,
            None,
            None,
        )
    }

    fn curve_label(radius: f64, delta: f64, length: f64) -> SegmentLabel {
        let mut lbl = generate_segment_label(
            LineSegment::new(Point::ZERO, Point::new(0.0, length)),
            true,
            Some(radius),
            Some(length),
            Some(delta),
        );
        lbl.style = default_label_style();
        lbl
    }

    #[test]
    fn generate_parcel_table_line_type_tags_sequentially() {
        let labels = vec![line_label(0.0, 100.0), line_label(50.0, 0.0)];
        let table = generate_parcel_table(ParcelTableType::Line, "Lines", &labels, &[]);
        assert_eq!(table.rows.len(), 2);
        assert_eq!(table.rows[0].tag, "L1");
        assert_eq!(table.rows[1].tag, "L2");
    }

    #[test]
    fn generate_parcel_table_segment_type_combines_lines_and_curves() {
        let labels = vec![line_label(0.0, 100.0), curve_label(50.0, 90.0, 78.5)];
        let table = generate_parcel_table(ParcelTableType::Segment, "Segments", &labels, &[]);
        assert_eq!(table.rows.len(), 2);
        assert_eq!(table.rows[0].tag, "L1");
        assert_eq!(table.rows[1].tag, "C1");
    }

    #[test]
    fn generate_parcel_table_area_type_uses_parcels() {
        let parcels = vec![
            parcel("Lot 1", 5000.0, 300.0),
            parcel("Lot 2", 6000.0, 320.0),
        ];
        let table = generate_parcel_table(ParcelTableType::Area, "Areas", &[], &parcels);
        assert_eq!(table.rows.len(), 2);
        assert_eq!(table.rows[0].tag, "A1");
        assert_eq!(table.headers[0], "Parcel #");
    }

    #[test]
    fn lock_static_table_sets_locked_and_static() {
        let table = generate_parcel_table(ParcelTableType::Area, "Areas", &[], &[]);
        let locked = lock_static_table(&table);
        assert!(locked.is_locked);
        assert_eq!(locked.reactivity_mode, ReactivityMode::Static);
    }

    #[test]
    fn sort_table_orders_area_rows_by_area_descending() {
        let parcels = vec![
            parcel("Lot 1", 5000.0, 300.0),
            parcel("Lot 2", 9000.0, 320.0),
        ];
        let table = generate_parcel_table(ParcelTableType::Area, "Areas", &[], &parcels);
        let sorted = sort_table(&table, 2, SortOrder::Descending).unwrap();
        assert_eq!(sorted.rows[0].parcel_name, Some("Lot 2".to_string()));
    }

    #[test]
    fn sort_table_rejects_locked_table() {
        let table = generate_parcel_table(ParcelTableType::Area, "Areas", &[], &[]);
        let locked = lock_static_table(&table);
        let err = sort_table(&locked, 0, SortOrder::Ascending).unwrap_err();
        assert!(matches!(err, CivilError::PrerequisiteViolation { .. }));
    }

    #[test]
    fn edit_table_headers_rejects_locked_table() {
        let table = generate_parcel_table(ParcelTableType::Area, "Areas", &[], &[]);
        let locked = lock_static_table(&table);
        let err = edit_table_headers(&locked, "New", vec!["A".to_string()]).unwrap_err();
        assert!(matches!(err, CivilError::PrerequisiteViolation { .. }));
    }

    #[test]
    fn edit_table_headers_updates_title_and_headers() {
        let table = generate_parcel_table(ParcelTableType::Area, "Areas", &[], &[]);
        let updated = edit_table_headers(&table, "Renamed", vec!["Col A".to_string()]).unwrap();
        assert_eq!(updated.title, "Renamed");
        assert_eq!(updated.headers, vec!["Col A".to_string()]);
    }

    #[test]
    fn split_table_into_stacks_chunks_rows() {
        let parcels: Vec<ParcelObject> = (0..25)
            .map(|i| parcel(&format!("Lot {i}"), 1000.0, 100.0))
            .collect();
        let table = generate_parcel_table(ParcelTableType::Area, "Areas", &[], &parcels);
        let stacks = split_table_into_stacks(&table, 10);
        assert_eq!(stacks.len(), 3);
        assert_eq!(stacks[0].rows.len(), 10);
        assert_eq!(stacks[2].rows.len(), 5);
        assert_eq!(stacks[1].title, "Areas (Sheet 2)");
    }
}
