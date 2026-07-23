//! GNSS raw-observation (RINEX) import.
//!
//! **Scope — read this before assuming more than is implemented.** This
//! module parses RINEX 2.10/2.11 **observation** files:
//!
//! - The header: version/type, marker name, the approximate receiver
//!   position (`APPROX POSITION XYZ`, ECEF meters), and the declared
//!   observation type list (`# / TYPES OF OBSERV`).
//! - Epoch records: timestamp, epoch flag, the satellite list (handling the
//!   fixed-width, no-separator `Gnn`/`Rnn`/... satellite id packing and
//!   `>12`-satellite continuation lines), and each satellite's raw
//!   observation values (pseudorange `C1`/`P1`/`P2`, carrier phase `L1`/
//!   `L2`, whatever the header declares) — parsed at the spec's true
//!   fixed 16-column-per-slot width (a 14-char value plus a
//!   loss-of-lock-indicator digit plus a signal-strength digit) so a blank
//!   (missing) observation is distinguished from an adjacent value.
//!
//! **What this module does *not* do**: it does not compute a single-point
//! position from the pseudoranges. Doing so requires broadcast or precise
//! satellite ephemerides (a RINEX *navigation* file, not the observation
//! file this module reads), satellite clock corrections, and ionospheric/
//! tropospheric delay modeling — a full GNSS processing engine, explicitly
//! out of scope per this crate's mandate. The "point position" this module
//! surfaces is the header's `APPROX POSITION XYZ` (the receiver's own
//! recorded approximate location, typically accurate to meters — exactly
//! what a real-time autonomous GPS fix or a prior survey already gave it),
//! converted from ECEF to WGS84 geodetic lat/lon/height by
//! [`ecef_to_geodetic_wgs84`] (a standard closed-form ellipsoidal
//! conversion — **not** a datum transform; see [`crate::datum`] for
//! NADCON/NTv2 grid shifts, a distinct concern). Projecting that geodetic
//! position into a plan's own CRS is a further step this crate does not
//! perform (owned by `thoth-services`).
//!
//! LLI/signal-strength flags, RINEX 3 (`OBS`/mixed-constellation `#### TYPES
//! OF OBS` headers use a different layout), and navigation-message files are
//! not supported.

use crate::error::{InteropError, InteropResult};

const FORMAT: &str = "RINEX";

/// WGS84 ellipsoid semi-major axis, meters.
const WGS84_A: f64 = 6_378_137.0;
/// WGS84 ellipsoid flattening.
const WGS84_F: f64 = 1.0 / 298.257_223_563;

/// The RINEX observation header fields this module extracts.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct RinexHeader {
    pub version: f64,
    pub marker_name: Option<String>,
    /// `(x, y, z)` in ECEF meters, from `APPROX POSITION XYZ`.
    pub approx_position_ecef: Option<(f64, f64, f64)>,
    pub obs_types: Vec<String>,
}

/// One satellite's raw observation values at an epoch, aligned positionally
/// with `RinexHeader::obs_types` (`None` = the slot was blank in the file).
#[derive(Debug, Clone, PartialEq)]
pub struct SatelliteObservation {
    /// Satellite id, e.g. `"G01"`, `"R03"`.
    pub satellite: String,
    pub values: Vec<Option<f64>>,
}

/// One observation epoch.
#[derive(Debug, Clone, PartialEq)]
pub struct RinexEpoch {
    pub year: i32,
    pub month: u32,
    pub day: u32,
    pub hour: u32,
    pub minute: u32,
    pub second: f64,
    pub epoch_flag: i32,
    pub satellites: Vec<SatelliteObservation>,
}

/// A parsed RINEX observation file.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct RinexObsFile {
    pub header: RinexHeader,
    pub epochs: Vec<RinexEpoch>,
}

fn header_label(line: &str) -> &str {
    if line.len() > 60 {
        line[60..].trim()
    } else {
        ""
    }
}

fn header_data(line: &str) -> &str {
    if line.len() > 60 {
        &line[..60]
    } else {
        line
    }
}

/// Parse a RINEX 2.x observation file's header and every epoch record.
///
/// # Errors
/// [`InteropError::MalformedLine`] if a required header field
/// (`APPROX POSITION XYZ`'s 3 numbers, `# / TYPES OF OBSERV`'s count) isn't
/// parseable, or an epoch line's date/time/flag/satellite-count fields
/// aren't parseable. [`InteropError::Unsupported`] if `END OF HEADER` is
/// never found.
pub fn parse_rinex_obs(text: &str) -> InteropResult<RinexObsFile> {
    let lines: Vec<&str> = text.split('\n').map(|l| l.trim_end_matches('\r')).collect();
    let mut header = RinexHeader::default();
    let mut header_end = None;

    let mut i = 0;
    while i < lines.len() {
        let line = lines[i];
        let label = header_label(line);
        let data = header_data(line);
        match label {
            "RINEX VERSION / TYPE" => {
                header.version = data
                    .split_whitespace()
                    .next()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0.0);
            }
            "MARKER NAME" => {
                header.marker_name = Some(data.trim().to_string());
            }
            "APPROX POSITION XYZ" => {
                let nums: Vec<f64> = data
                    .split_whitespace()
                    .map(str::parse::<f64>)
                    .collect::<Result<_, _>>()
                    .map_err(|e| InteropError::MalformedLine {
                        format: FORMAT,
                        line: i + 1,
                        reason: format!("APPROX POSITION XYZ is not 3 numbers: {e}"),
                    })?;
                if nums.len() != 3 {
                    return Err(InteropError::MalformedLine {
                        format: FORMAT,
                        line: i + 1,
                        reason: format!(
                            "APPROX POSITION XYZ must have 3 values, got {}",
                            nums.len()
                        ),
                    });
                }
                header.approx_position_ecef = Some((nums[0], nums[1], nums[2]));
            }
            "# / TYPES OF OBSERV" => {
                let tokens: Vec<&str> = data.split_whitespace().collect();
                let Some((count_tok, rest)) = tokens.split_first() else {
                    return Err(InteropError::MalformedLine {
                        format: FORMAT,
                        line: i + 1,
                        reason: "empty # / TYPES OF OBSERV line".to_string(),
                    });
                };
                let count: usize = count_tok.parse().map_err(|e| InteropError::MalformedLine {
                    format: FORMAT,
                    line: i + 1,
                    reason: format!("observation type count '{count_tok}' is not an integer: {e}"),
                })?;
                header.obs_types.extend(rest.iter().map(|s| s.to_string()));
                // Continuation lines omit the count and just list more codes;
                // recognized because we haven't reached `count` types yet.
                while header.obs_types.len() < count && i + 1 < lines.len() {
                    i += 1;
                    let cont = header_data(lines[i]);
                    header
                        .obs_types
                        .extend(cont.split_whitespace().map(|s| s.to_string()));
                }
            }
            "END OF HEADER" => {
                header_end = Some(i);
                i += 1;
                break;
            }
            _ => {}
        }
        i += 1;
    }

    let Some(_) = header_end else {
        return Err(InteropError::Unsupported {
            format: FORMAT,
            reason: "no END OF HEADER line found".to_string(),
        });
    };

    let mut epochs = Vec::new();
    while i < lines.len() {
        let line = lines[i];
        if line.trim().is_empty() {
            i += 1;
            continue;
        }
        let (epoch_meta, sat_ids, next) = parse_epoch_header(&lines, i)?;
        i = next;

        let obs_per_line = 5usize;
        let lines_per_sat = header.obs_types.len().div_ceil(obs_per_line).max(1);
        let mut satellites = Vec::with_capacity(sat_ids.len());
        for sat in sat_ids {
            let mut values = Vec::with_capacity(header.obs_types.len());
            for _ in 0..lines_per_sat {
                if i >= lines.len() {
                    return Err(InteropError::MalformedLine {
                        format: FORMAT,
                        line: i,
                        reason: format!("truncated observation record for satellite {sat}"),
                    });
                }
                values.extend(parse_obs_line(lines[i]));
                i += 1;
            }
            values.truncate(header.obs_types.len());
            satellites.push(SatelliteObservation {
                satellite: sat,
                values,
            });
        }

        epochs.push(RinexEpoch {
            year: epoch_meta.0,
            month: epoch_meta.1,
            day: epoch_meta.2,
            hour: epoch_meta.3,
            minute: epoch_meta.4,
            second: epoch_meta.5,
            epoch_flag: epoch_meta.6,
            satellites,
        });
    }

    Ok(RinexObsFile { header, epochs })
}

type EpochMeta = (i32, u32, u32, u32, u32, f64, i32);

/// Parse an epoch line (plus any satellite-list continuation lines) into its
/// timestamp/flag fields and the full satellite id list.
fn parse_epoch_header(lines: &[&str], i: usize) -> InteropResult<(EpochMeta, Vec<String>, usize)> {
    let line = lines[i];
    let padded = pad_to(line, 32);
    // RINEX 2 epoch line: 5 date/time fields as I3 (year, month, day, hour,
    // minute), then seconds as F11.7, then epoch flag and satellite count as
    // I3 each — columns 0..32 total, satellites packed from column 32.
    let year_2digit: i32 = padded[0..3]
        .trim()
        .parse()
        .map_err(|e| line_err(i, format!("bad year: {e}")))?;
    let year = if year_2digit < 80 {
        2000 + year_2digit
    } else {
        1900 + year_2digit
    };
    let month: u32 = padded[3..6]
        .trim()
        .parse()
        .map_err(|e| line_err(i, format!("bad month: {e}")))?;
    let day: u32 = padded[6..9]
        .trim()
        .parse()
        .map_err(|e| line_err(i, format!("bad day: {e}")))?;
    let hour: u32 = padded[9..12]
        .trim()
        .parse()
        .map_err(|e| line_err(i, format!("bad hour: {e}")))?;
    let minute: u32 = padded[12..15]
        .trim()
        .parse()
        .map_err(|e| line_err(i, format!("bad minute: {e}")))?;
    let second: f64 = padded[15..26]
        .trim()
        .parse()
        .map_err(|e| line_err(i, format!("bad second: {e}")))?;
    let flag: i32 = padded[26..29]
        .trim()
        .parse()
        .map_err(|e| line_err(i, format!("bad epoch flag: {e}")))?;
    let numsat: usize = padded[29..32]
        .trim()
        .parse()
        .map_err(|e| line_err(i, format!("bad satellite count: {e}")))?;

    let mut sat_ids = Vec::with_capacity(numsat);
    let mut remainder: String = if line.len() > 32 {
        line[32..].to_string()
    } else {
        String::new()
    };
    let mut cursor = i;
    loop {
        let mut chars: Vec<char> = remainder.chars().collect();
        while chars.len() >= 3 && sat_ids.len() < numsat {
            let code: String = chars.drain(0..3).collect();
            let trimmed = code.trim();
            if trimmed.is_empty() {
                break;
            }
            sat_ids.push(trimmed.to_string());
        }
        if sat_ids.len() >= numsat || cursor + 1 >= lines.len() {
            break;
        }
        cursor += 1;
        remainder = if lines[cursor].len() > 32 {
            lines[cursor][32..].to_string()
        } else {
            lines[cursor].to_string()
        };
    }
    if sat_ids.len() != numsat {
        return Err(InteropError::MalformedLine {
            format: FORMAT,
            line: i + 1,
            reason: format!("declared {numsat} satellites but found {}", sat_ids.len()),
        });
    }

    Ok((
        (year, month, day, hour, minute, second, flag),
        sat_ids,
        cursor + 1,
    ))
}

fn line_err(i: usize, reason: String) -> InteropError {
    InteropError::MalformedLine {
        format: FORMAT,
        line: i + 1,
        reason,
    }
}

fn pad_to(s: &str, width: usize) -> String {
    if s.len() >= width {
        s.to_string()
    } else {
        format!("{s:<width$}")
    }
}

/// Parse one observation data line into up to 5 slots, each the spec's
/// 16-column width (14-char value + 1-char LLI + 1-char signal strength).
/// A slot that is entirely blank (or unparseable) is `None`.
fn parse_obs_line(line: &str) -> Vec<Option<f64>> {
    let padded = pad_to(line, 80);
    let chars: Vec<char> = padded.chars().collect();
    let mut out = Vec::with_capacity(5);
    for slot in 0..5 {
        let start = slot * 16;
        let end = (start + 14).min(chars.len());
        if start >= chars.len() {
            out.push(None);
            continue;
        }
        let value_text: String = chars[start..end].iter().collect();
        out.push(value_text.trim().parse::<f64>().ok());
    }
    out
}

/// Convert an ECEF position to WGS84 geodetic latitude/longitude/height,
/// via Bowring's closed-form method. Latitude/longitude in degrees, height
/// in meters (ellipsoidal, not orthometric — no geoid model is applied).
pub fn ecef_to_geodetic_wgs84(x: f64, y: f64, z: f64) -> (f64, f64, f64) {
    let e2 = WGS84_F * (2.0 - WGS84_F);
    let p = (x * x + y * y).sqrt();
    let lon = y.atan2(x);
    if p < 1e-9 {
        // On the polar axis: latitude is +/-90, height is |z| - polar radius.
        let lat = if z >= 0.0 { 90.0 } else { -90.0 };
        let b = WGS84_A * (1.0 - WGS84_F);
        return (lat, lon.to_degrees(), z.abs() - b);
    }
    let b = WGS84_A * (1.0 - WGS84_F);
    let theta = (z * WGS84_A).atan2(p * b);
    let ep2 = (WGS84_A * WGS84_A - b * b) / (b * b);
    let lat = (z + ep2 * b * theta.sin().powi(3)).atan2(p - e2 * WGS84_A * theta.cos().powi(3));
    let sin_lat = lat.sin();
    let n = WGS84_A / (1.0 - e2 * sin_lat * sin_lat).sqrt();
    let height = p / lat.cos() - n;
    (lat.to_degrees(), lon.to_degrees(), height)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> String {
        [
            "     2.11           OBSERVATION DATA    G (GPS)             RINEX VERSION / TYPE",
            "MARKER1                                                     MARKER NAME",
            "  -2694892.6083  -4276245.5798   3856454.4676                APPROX POSITION XYZ",
            "     4    C1    L1    P2    L2                              # / TYPES OF OBSERV",
            "                                                            END OF HEADER",
            " 21  6 15  1  2  3.0000000  0  2G01G02",
            "  20000000.000   100000000.000    20000100.000   100000200.000  ",
            "  21000000.000   105000000.000                   105000100.000  ",
        ]
        .join("\n")
    }

    #[test]
    fn parses_header_position_and_obs_types() {
        let parsed = parse_rinex_obs(&sample()).unwrap();
        assert!((parsed.header.version - 2.11).abs() < 1e-6);
        assert_eq!(parsed.header.marker_name.as_deref(), Some("MARKER1"));
        let (x, y, z) = parsed.header.approx_position_ecef.unwrap();
        assert!((x + 2694892.6083).abs() < 1e-3);
        assert!((y + 4276245.5798).abs() < 1e-3);
        assert!((z - 3856454.4676).abs() < 1e-3);
        assert_eq!(parsed.header.obs_types, vec!["C1", "L1", "P2", "L2"]);
    }

    #[test]
    fn parses_epoch_satellites_and_observation_values() {
        let parsed = parse_rinex_obs(&sample()).unwrap();
        assert_eq!(parsed.epochs.len(), 1);
        let epoch = &parsed.epochs[0];
        assert_eq!(epoch.year, 2021);
        assert_eq!(epoch.month, 6);
        assert_eq!(epoch.day, 15);
        assert_eq!(epoch.satellites.len(), 2);
        assert_eq!(epoch.satellites[0].satellite, "G01");
        assert_eq!(epoch.satellites[1].satellite, "G02");
        assert_eq!(epoch.satellites[0].values.len(), 4);
        assert!((epoch.satellites[0].values[0].unwrap() - 20000000.000).abs() < 1e-3);
        assert!((epoch.satellites[0].values[2].unwrap() - 20000100.000).abs() < 1e-3);
    }

    #[test]
    fn ecef_round_trips_a_known_point() {
        // Approx position from the sample header, a real-world ECEF fix.
        let (lat, lon, _height) =
            ecef_to_geodetic_wgs84(-2694892.6083, -4276245.5798, 3856454.4676);
        // This ECEF point is roughly in the vicinity of the western US
        // (Nevada/California), around lat 36N, lon -122W.
        assert!(lat > 30.0 && lat < 42.0, "lat = {lat}");
        assert!(lon > -125.0 && lon < -115.0, "lon = {lon}");
    }

    #[test]
    fn ecef_of_equator_prime_meridian_is_the_ellipsoid_surface() {
        let (lat, lon, height) = ecef_to_geodetic_wgs84(WGS84_A, 0.0, 0.0);
        assert!(lat.abs() < 1e-6);
        assert!(lon.abs() < 1e-6);
        assert!(height.abs() < 1e-3);
    }

    #[test]
    fn missing_end_of_header_is_unsupported() {
        let text =
            "     2.11           OBSERVATION DATA                        RINEX VERSION / TYPE\n";
        assert!(matches!(
            parse_rinex_obs(text),
            Err(InteropError::Unsupported { .. })
        ));
    }

    #[test]
    fn malformed_approx_position_is_reported_with_line_number() {
        let text = [
            "     2.11           OBSERVATION DATA    G (GPS)             RINEX VERSION / TYPE",
            "  NOTANUMBER  -4276245.5798   3856454.4676                  APPROX POSITION XYZ",
            "                                                            END OF HEADER",
        ]
        .join("\n");
        let err = parse_rinex_obs(&text).unwrap_err();
        assert!(matches!(err, InteropError::MalformedLine { line: 2, .. }));
    }
}
