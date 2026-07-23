//! Total-station field-book import.
//!
//! **Format choice**: of the three formats the gap analysis names (Trimble
//! JobXML, Leica GSI, Carlson RW5), this module implements **Carlson RW5**.
//! Reasoning: JobXML is a full XML schema with substantially more surface
//! area than this crate's other XML formats justify duplicating for one raw
//! field-book reader; GSI is a fixed-column binary-flavored text format
//! (16/24-character words with word-index/format-code prefixes) that is
//! well documented but fussier to parse defensively than a delimited format;
//! RW5 is a plain comma-delimited ASCII format with a small, well-known
//! record vocabulary (`OC`/`BK`/`FS`/`SS`/`LS`) that is both the easiest to
//! parse defensively (one record per line, comma-delimited fields, each
//! field a short alphabetic key immediately followed by its value) and the
//! most directly useful (it's what Carlson SurvCE/SurvPC — one of the most
//! widely deployed field data collectors — emits).
//!
//! **Scope**: supports `OC` (occupy — sets the current station, either from
//! inline `N`/`E`/`EL` coordinates or by re-occupying an already-known
//! point), `BK` (backsight — sets the reference azimuth, either given
//! directly via `BS` or computed from the backsight point's already-known
//! coordinates), `LS` (sets instrument height `HI`/target height `HR` for
//! subsequent shots), and `FS`/`SS` (foresight/sideshot — reduces a raw
//! angle-right/zenith-angle/slope-distance shot to a northing/easting/
//! elevation). Does **not** implement automatic occupied-station
//! advancement on `FS` (multi-setup traverse chaining, where a foresight
//! becomes the next setup's occupied point without an explicit `OC`) — every
//! `FS`/`SS` in this parser is reduced relative to the most recent `OC`/`BK`
//! pair; moving to a new instrument setup requires an explicit `OC` record.
//! Does not support GPS (`GPS`/`GS`) records, job/header (`JB`) or
//! mode (`MO`) records beyond ignoring them, or note (`--`) records as
//! anything but a trailing point description.

use std::collections::HashMap;

use thoth_survey::points::CogoPoint;

use crate::error::{InteropError, InteropResult};

const FORMAT: &str = "RW5";

#[derive(Debug, Clone, Copy)]
struct StationCoord {
    northing: f64,
    easting: f64,
    elevation: f64,
}

/// Split an RW5 field like `"AR45.1234"` into its key (`"AR"`) and value
/// (`"45.1234"`): the key is the leading run of ASCII letters.
fn split_field(field: &str) -> (&str, &str) {
    let key_len = field
        .chars()
        .take_while(|c| c.is_ascii_alphabetic())
        .count();
    field.split_at(key_len)
}

fn parse_f64(value: &str, key: &str, line: usize) -> InteropResult<f64> {
    value
        .parse::<f64>()
        .map_err(|e| InteropError::MalformedLine {
            format: FORMAT,
            line,
            reason: format!("field '{key}' has non-numeric value '{value}': {e}"),
        })
}

/// Record (or overwrite) a point's coordinates/description, tracking
/// first-seen order so output is stable and matches file order.
fn remember_point(
    id: &str,
    coord: StationCoord,
    desc: Option<String>,
    known: &mut HashMap<String, StationCoord>,
    descriptions: &mut HashMap<String, String>,
    order: &mut Vec<String>,
) {
    if !known.contains_key(id) {
        order.push(id.to_string());
    }
    known.insert(id.to_string(), coord);
    if let Some(d) = desc {
        descriptions.insert(id.to_string(), d);
    }
}

/// Parse a Carlson RW5 field book into COGO points (one per `OC` station and
/// per `FS`/`SS` shot).
///
/// # Errors
/// - [`InteropError::Unsupported`] if a `BK`/`FS`/`SS` record appears before
///   any `OC` has established a current station.
/// - [`InteropError::UnknownReference`] if an `OC`/`BK` references a point id
///   with no known coordinates yet (and none are given inline).
/// - [`InteropError::MalformedLine`] if a numeric field fails to parse.
pub fn parse_rw5(text: &str) -> InteropResult<Vec<CogoPoint>> {
    let mut known: HashMap<String, StationCoord> = HashMap::new();
    let mut descriptions: HashMap<String, String> = HashMap::new();
    let mut order: Vec<String> = Vec::new();

    let mut current_station: Option<String> = None;
    let mut backsight_azimuth_deg: Option<f64> = None;
    let mut hi = 0.0f64;
    let mut hr = 0.0f64;

    for (line_no, raw_line) in text.lines().enumerate() {
        let line = raw_line.trim();
        if line.is_empty() {
            continue;
        }
        let mut fields = line.split(',');
        let Some(record_type) = fields.next() else {
            continue;
        };

        let mut values: HashMap<&str, &str> = HashMap::new();
        let mut description: Option<String> = None;
        for field in fields {
            if let Some(desc) = field.strip_prefix("--") {
                description = Some(desc.to_string());
                continue;
            }
            let (key, value) = split_field(field);
            if !key.is_empty() {
                values.insert(key, value);
            }
        }

        match record_type {
            "JB" | "MO" | "CS" | "GPS" | "GS" => {} // header/mode/GPS records: out of scope, ignored
            "LS" => {
                if let Some(v) = values.get("HI") {
                    hi = parse_f64(v, "HI", line_no + 1)?;
                }
                if let Some(v) = values.get("HR") {
                    hr = parse_f64(v, "HR", line_no + 1)?;
                }
            }
            "OC" => {
                let id = values
                    .get("OP")
                    .ok_or_else(|| InteropError::MalformedLine {
                        format: FORMAT,
                        line: line_no + 1,
                        reason: "OC record missing OP (occupied point id)".to_string(),
                    })?;
                let coord = if let (Some(n), Some(e)) = (values.get("N"), values.get("E")) {
                    let northing = parse_f64(n, "N", line_no + 1)?;
                    let easting = parse_f64(e, "E", line_no + 1)?;
                    let elevation = values
                        .get("EL")
                        .map(|v| parse_f64(v, "EL", line_no + 1))
                        .transpose()?
                        .unwrap_or(0.0);
                    StationCoord {
                        northing,
                        easting,
                        elevation,
                    }
                } else {
                    *known
                        .get(*id)
                        .ok_or_else(|| InteropError::UnknownReference {
                            format: FORMAT,
                            what: "occupied point",
                            id: id.to_string(),
                        })?
                };
                remember_point(
                    id,
                    coord,
                    description.clone(),
                    &mut known,
                    &mut descriptions,
                    &mut order,
                );
                current_station = Some(id.to_string());
            }
            "BK" => {
                let station =
                    current_station
                        .as_ref()
                        .ok_or_else(|| InteropError::Unsupported {
                            format: FORMAT,
                            reason: "BK record with no prior OC establishing a current station"
                                .to_string(),
                        })?;
                let station_coord = *known.get(station).expect("current station is always known");
                if let Some(v) = values.get("BS") {
                    backsight_azimuth_deg = Some(parse_f64(v, "BS", line_no + 1)?);
                } else if let Some(bp) = values.get("BP") {
                    let bp_coord =
                        known
                            .get(*bp)
                            .ok_or_else(|| InteropError::UnknownReference {
                                format: FORMAT,
                                what: "backsight point",
                                id: bp.to_string(),
                            })?;
                    let dn = bp_coord.northing - station_coord.northing;
                    let de = bp_coord.easting - station_coord.easting;
                    backsight_azimuth_deg = Some(de.atan2(dn).to_degrees().rem_euclid(360.0));
                } else {
                    return Err(InteropError::MalformedLine {
                        format: FORMAT,
                        line: line_no + 1,
                        reason: "BK record has neither BS (azimuth) nor a resolvable BP"
                            .to_string(),
                    });
                }
            }
            "FS" | "SS" => {
                let station =
                    current_station
                        .as_ref()
                        .ok_or_else(|| InteropError::Unsupported {
                            format: FORMAT,
                            reason: format!(
                            "{record_type} record with no prior OC establishing a current station"
                        ),
                        })?;
                let backsight = backsight_azimuth_deg.ok_or_else(|| InteropError::Unsupported {
                    format: FORMAT,
                    reason: format!(
                        "{record_type} record with no prior BK establishing a backsight azimuth"
                    ),
                })?;
                let station_coord = *known.get(station).expect("current station is always known");

                let id = values
                    .get("FP")
                    .ok_or_else(|| InteropError::MalformedLine {
                        format: FORMAT,
                        line: line_no + 1,
                        reason: format!("{record_type} record missing FP (foresight point id)"),
                    })?;
                let angle_right = parse_f64(
                    values
                        .get("AR")
                        .ok_or_else(|| InteropError::MalformedLine {
                            format: FORMAT,
                            line: line_no + 1,
                            reason: format!("{record_type} record missing AR (angle right)"),
                        })?,
                    "AR",
                    line_no + 1,
                )?;
                let zenith = parse_f64(
                    values
                        .get("ZE")
                        .ok_or_else(|| InteropError::MalformedLine {
                            format: FORMAT,
                            line: line_no + 1,
                            reason: format!("{record_type} record missing ZE (zenith angle)"),
                        })?,
                    "ZE",
                    line_no + 1,
                )?;
                let slope_distance = parse_f64(
                    values
                        .get("SD")
                        .ok_or_else(|| InteropError::MalformedLine {
                            format: FORMAT,
                            line: line_no + 1,
                            reason: format!("{record_type} record missing SD (slope distance)"),
                        })?,
                    "SD",
                    line_no + 1,
                )?;
                let shot_hi = values
                    .get("HI")
                    .map(|v| parse_f64(v, "HI", line_no + 1))
                    .transpose()?
                    .unwrap_or(hi);
                let shot_hr = values
                    .get("HR")
                    .map(|v| parse_f64(v, "HR", line_no + 1))
                    .transpose()?
                    .unwrap_or(hr);

                let zenith_rad = zenith.to_radians();
                let azimuth_rad = (backsight + angle_right).to_radians();
                let horizontal_distance = slope_distance * zenith_rad.sin();
                let vertical_diff = slope_distance * zenith_rad.cos();

                let coord = StationCoord {
                    northing: station_coord.northing + horizontal_distance * azimuth_rad.cos(),
                    easting: station_coord.easting + horizontal_distance * azimuth_rad.sin(),
                    elevation: station_coord.elevation + shot_hi + vertical_diff - shot_hr,
                };
                remember_point(
                    id,
                    coord,
                    description.clone(),
                    &mut known,
                    &mut descriptions,
                    &mut order,
                );
            }
            _ => {} // unrecognized record types are ignored, not errors
        }
    }

    Ok(order
        .into_iter()
        .enumerate()
        .map(|(i, id)| {
            let coord = known[&id];
            CogoPoint {
                id: format!("rw5-{id}"),
                point_number: id.parse().unwrap_or(i as i64 + 1),
                northing: coord.northing,
                easting: coord.easting,
                elevation: coord.elevation,
                raw_description: descriptions.get(&id).cloned().unwrap_or_default(),
                full_description: None,
                point_style: None,
                label_style: None,
                point_group_id: None,
                rgb_color: None,
                classification_tag: None,
            }
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reduces_a_backsight_and_a_foresight_shot() {
        // Occupy point 1 at (5000, 5000); backsight point 2 due north (azimuth 0);
        // foresight point 3 turned 90 deg right (due east) at 100.000 slope
        // distance, horizontal (zenith 90 deg).
        let rw5 = [
            "JB,NM job1,DT2024-01-01",
            "MO,AD0,UN0",
            "OC,OP1,N5000.000,E5000.000,EL100.000,--STA1",
            "BK,OP1,BP2,BS0.0000",
            "LS,HI5.000,HR5.000",
            "FS,FP3,AR90.0000,ZE90.0000,SD100.000,--PT3",
        ]
        .join("\n");
        let points = parse_rw5(&rw5).unwrap();
        assert_eq!(points.len(), 2);
        assert_eq!(points[0].point_number, 1);
        assert!((points[0].northing - 5000.0).abs() < 1e-6);
        assert!((points[0].easting - 5000.0).abs() < 1e-6);

        let p3 = &points[1];
        assert_eq!(p3.point_number, 3);
        assert!(
            (p3.northing - 5000.0).abs() < 1e-3,
            "northing = {}",
            p3.northing
        );
        assert!(
            (p3.easting - 5100.0).abs() < 1e-3,
            "easting = {}",
            p3.easting
        );
        // HI == HR, so elevation unchanged on a horizontal shot.
        assert!((p3.elevation - 100.0).abs() < 1e-3);
        assert_eq!(p3.raw_description, "PT3");
    }

    #[test]
    fn backsight_azimuth_can_be_computed_from_a_known_point() {
        let rw5 = [
            "OC,OP1,N0.000,E0.000,EL0.000",
            "OC,OP2,N100.000,E0.000,EL0.000", // point 2 due north of point 1
            "OC,OP1",                         // re-occupy point 1 (already known)
            "BK,OP1,BP2",                     // no BS given; computed from coordinates -> azimuth 0
            "FS,FP3,AR90.0000,ZE90.0000,SD50.000",
        ]
        .join("\n");
        let points = parse_rw5(&rw5).unwrap();
        let p3 = points.iter().find(|p| p.point_number == 3).unwrap();
        assert!((p3.northing - 0.0).abs() < 1e-3);
        assert!((p3.easting - 50.0).abs() < 1e-3);
    }

    #[test]
    fn foresight_without_prior_occupy_is_unsupported() {
        let rw5 = "FS,FP3,AR90.0000,ZE90.0000,SD50.000";
        let err = parse_rw5(rw5).unwrap_err();
        assert!(matches!(err, InteropError::Unsupported { .. }));
    }

    #[test]
    fn unknown_backsight_point_is_an_error() {
        let rw5 = ["OC,OP1,N0.000,E0.000,EL0.000", "BK,OP1,BP99"].join("\n");
        let err = parse_rw5(&rw5).unwrap_err();
        assert!(matches!(err, InteropError::UnknownReference { .. }));
    }

    #[test]
    fn non_numeric_field_is_reported_with_line_number() {
        let rw5 = ["OC,OP1,N0.000,E0.000,EL0.000", "BK,OP1,BSabc"].join("\n");
        let err = parse_rw5(&rw5).unwrap_err();
        assert!(matches!(err, InteropError::MalformedLine { line: 2, .. }));
    }
}
