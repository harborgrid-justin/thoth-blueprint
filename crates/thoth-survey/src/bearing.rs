//! Bearings, azimuths, and DMS (degrees/minutes/seconds) angle formatting.
//!
//! Direct port of `packages/domain/src/survey/common/bearing.ts` plus the
//! `QuadrantBearing` type from `types/survey.ts` (co-located here since
//! every function in this module produces or consumes it).
//!
//! **Convention** (shared with [`crate::survey`]): north is −Y, east is +X,
//! matching plan coordinates that increase downward on screen. Azimuth is
//! measured clockwise from north in `[0, 360)`. Bearing text formatting
//! (`N45°30′15″E`, `Due North`, …) must match the TypeScript output
//! byte-for-byte — surveyors and legal descriptions depend on this exact
//! text — including the `°`, `′`, and `″` symbol characters.

use serde::{Deserialize, Serialize};
use thoth_spatial::Point;

const DEG: f64 = 180.0 / std::f64::consts::PI;

/// `true` if `a` and `b` are within `eps` of each other.
fn approx_eq(a: f64, b: f64, eps: f64) -> bool {
    (a - b).abs() < eps
}

/// The north/south hemisphere half of a quadrant bearing.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum NorthSouth {
    N,
    S,
}

/// The east/west hemisphere half of a quadrant bearing.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum EastWest {
    E,
    W,
}

/// A due cardinal direction, present on a [`QuadrantBearing`] exactly when
/// it collapses to one of the four compass points.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Cardinal {
    N,
    S,
    E,
    W,
}

/// A whole-number degrees/minutes/seconds angle, carried so minutes/seconds
/// never reach 60 (see [`to_dms`]).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Dms {
    pub degrees: i32,
    pub minutes: i32,
    pub seconds: i32,
}

/// A direction in surveyor's quadrant bearing form, e.g. `N45°30′15″E`.
///
/// Port of `types/survey.ts::QuadrantBearing`. `cardinal` is `Some` exactly
/// when the bearing is a due compass point (matching the TS optional
/// `cardinal?` field, which is only ever set on the four cardinal cases).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct QuadrantBearing {
    pub ns: NorthSouth,
    pub degrees: i32,
    pub minutes: i32,
    pub seconds: i32,
    pub ew: EastWest,
    pub cardinal: Option<Cardinal>,
}

/// Azimuth clockwise from north (−Y), in degrees `[0, 360)`, from `a` to `b`.
pub fn azimuth(a: Point, b: Point) -> f64 {
    let east = b.x - a.x;
    let north = -(b.y - a.y);
    let deg = east.atan2(north) * DEG;
    (deg + 360.0) % 360.0
}

/// Convert a decimal-degree angle into whole degrees/minutes/seconds, with
/// carry (e.g. 59.9999… seconds rounds up through minutes into degrees).
pub fn to_dms(angle_deg: f64) -> Dms {
    let sign = if angle_deg < 0.0 { -1 } else { 1 };
    let a = angle_deg.abs();
    let mut degrees = a.floor() as i32;
    let rem_min = (a - degrees as f64) * 60.0;
    let mut minutes = rem_min.floor() as i32;
    let mut seconds = ((rem_min - minutes as f64) * 60.0).round() as i32;
    if seconds >= 60 {
        seconds -= 60;
        minutes += 1;
    }
    if minutes >= 60 {
        minutes -= 60;
        degrees += 1;
    }
    Dms {
        degrees: degrees * sign,
        minutes,
        seconds,
    }
}

/// Convert an azimuth into a quadrant bearing.
pub fn azimuth_to_bearing(az: f64) -> QuadrantBearing {
    let a = ((az % 360.0) + 360.0) % 360.0;

    // Cardinal directions.
    if approx_eq(a, 0.0, 1e-6) {
        return QuadrantBearing {
            ns: NorthSouth::N,
            degrees: 0,
            minutes: 0,
            seconds: 0,
            ew: EastWest::E,
            cardinal: Some(Cardinal::N),
        };
    }
    if approx_eq(a, 90.0, 1e-6) {
        return QuadrantBearing {
            ns: NorthSouth::N,
            degrees: 90,
            minutes: 0,
            seconds: 0,
            ew: EastWest::E,
            cardinal: Some(Cardinal::E),
        };
    }
    if approx_eq(a, 180.0, 1e-6) {
        return QuadrantBearing {
            ns: NorthSouth::S,
            degrees: 0,
            minutes: 0,
            seconds: 0,
            ew: EastWest::E,
            cardinal: Some(Cardinal::S),
        };
    }
    if approx_eq(a, 270.0, 1e-6) {
        return QuadrantBearing {
            ns: NorthSouth::N,
            degrees: 90,
            minutes: 0,
            seconds: 0,
            ew: EastWest::W,
            cardinal: Some(Cardinal::W),
        };
    }

    let (ns, ew, angle) = if a < 90.0 {
        (NorthSouth::N, EastWest::E, a)
    } else if a < 180.0 {
        (NorthSouth::S, EastWest::E, 180.0 - a)
    } else if a < 270.0 {
        (NorthSouth::S, EastWest::W, a - 180.0)
    } else {
        (NorthSouth::N, EastWest::W, 360.0 - a)
    };
    let dms = to_dms(angle);
    QuadrantBearing {
        ns,
        degrees: dms.degrees,
        minutes: dms.minutes,
        seconds: dms.seconds,
        ew,
        cardinal: None,
    }
}

/// Format a quadrant bearing as e.g. `N45°30′15″E`, or `Due North`.
pub fn format_bearing(b: &QuadrantBearing) -> String {
    if let Some(c) = b.cardinal {
        return match c {
            Cardinal::N => "Due North",
            Cardinal::S => "Due South",
            Cardinal::E => "Due East",
            Cardinal::W => "Due West",
        }
        .to_string();
    }
    let ns = match b.ns {
        NorthSouth::N => "N",
        NorthSouth::S => "S",
    };
    let ew = match b.ew {
        EastWest::E => "E",
        EastWest::W => "W",
    };
    format!(
        "{ns}{:02}°{:02}′{:02}″{ew}",
        b.degrees, b.minutes, b.seconds
    )
}

/// Convenience: quadrant bearing text directly from two points.
pub fn bearing_text(a: Point, b: Point) -> String {
    format_bearing(&azimuth_to_bearing(azimuth(a, b)))
}

/// Azimuth (degrees clockwise from north) reconstructed from a quadrant
/// bearing. The exact inverse of [`azimuth_to_bearing`], used to close a
/// traverse from the *recorded* (rounded) bearings actually printed on the
/// plat.
pub fn bearing_to_azimuth(b: &QuadrantBearing) -> f64 {
    if let Some(c) = b.cardinal {
        return match c {
            Cardinal::N => 0.0,
            Cardinal::E => 90.0,
            Cardinal::S => 180.0,
            Cardinal::W => 270.0,
        };
    }
    let angle = b.degrees as f64 + b.minutes as f64 / 60.0 + b.seconds as f64 / 3600.0;
    match (b.ns, b.ew) {
        (NorthSouth::N, EastWest::E) => angle,
        (NorthSouth::S, EastWest::E) => 180.0 - angle,
        (NorthSouth::S, EastWest::W) => 180.0 + angle,
        (NorthSouth::N, EastWest::W) => 360.0 - angle, // N…W
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn measures_azimuth_clockwise_from_north() {
        assert_relative_eq!(
            azimuth(Point::new(0.0, 0.0), Point::new(0.0, -10.0)),
            0.0,
            epsilon = 1e-9
        );
        assert_relative_eq!(
            azimuth(Point::new(0.0, 0.0), Point::new(10.0, 0.0)),
            90.0,
            epsilon = 1e-9
        );
        assert_relative_eq!(
            azimuth(Point::new(0.0, 0.0), Point::new(0.0, 10.0)),
            180.0,
            epsilon = 1e-9
        );
        assert_relative_eq!(
            azimuth(Point::new(0.0, 0.0), Point::new(-10.0, 0.0)),
            270.0,
            epsilon = 1e-9
        );
    }

    #[test]
    fn formats_quadrant_bearings() {
        assert_eq!(
            bearing_text(Point::new(0.0, 0.0), Point::new(10.0, -10.0)),
            "N45°00′00″E"
        );
        assert_eq!(
            bearing_text(Point::new(0.0, 0.0), Point::new(10.0, 10.0)),
            "S45°00′00″E"
        );
    }

    #[test]
    fn labels_cardinal_directions() {
        assert_eq!(format_bearing(&azimuth_to_bearing(0.0)), "Due North");
        assert_eq!(format_bearing(&azimuth_to_bearing(90.0)), "Due East");
        assert_eq!(format_bearing(&azimuth_to_bearing(180.0)), "Due South");
        assert_eq!(format_bearing(&azimuth_to_bearing(270.0)), "Due West");
    }

    #[test]
    fn converts_decimal_degrees_to_dms_with_carry() {
        assert_eq!(
            to_dms(45.25),
            Dms {
                degrees: 45,
                minutes: 15,
                seconds: 0
            }
        );
        assert_eq!(
            to_dms(30.50833333),
            Dms {
                degrees: 30,
                minutes: 30,
                seconds: 30
            }
        );
    }

    #[test]
    fn recovers_azimuth_from_quadrant_bearing_round_trip() {
        for az in [15.5, 100.25, 210.9, 355.1, 44.999] {
            assert_relative_eq!(
                bearing_to_azimuth(&azimuth_to_bearing(az)),
                az,
                epsilon = 1e-3
            );
        }
    }

    #[test]
    fn crosses_every_quadrant_boundary_exactly() {
        // Just inside each quadrant boundary still resolves to the correct
        // hemisphere pair, not the adjacent quadrant's.
        let just_under_90 = azimuth_to_bearing(89.999);
        assert_eq!(just_under_90.ns, NorthSouth::N);
        assert_eq!(just_under_90.ew, EastWest::E);

        let just_over_90 = azimuth_to_bearing(90.001);
        assert_eq!(just_over_90.ns, NorthSouth::S);
        assert_eq!(just_over_90.ew, EastWest::E);

        let just_under_270 = azimuth_to_bearing(269.999);
        assert_eq!(just_under_270.ns, NorthSouth::S);
        assert_eq!(just_under_270.ew, EastWest::W);

        let just_over_270 = azimuth_to_bearing(270.001);
        assert_eq!(just_over_270.ns, NorthSouth::N);
        assert_eq!(just_over_270.ew, EastWest::W);
    }

    #[test]
    fn zero_length_course_does_not_panic_or_nan() {
        // `east = 0.0`, `north = -(0.0) = -0.0`: IEEE-754 defines
        // `atan2(+0, -0) = +π`, so a degenerate (zero-length) course
        // resolves to a due-south azimuth of 180 rather than panicking or
        // NaN-ing — the same signed-zero behavior JS's `Math.atan2` follows,
        // so this is faithful, not a bug.
        let az = azimuth(Point::new(5.0, 5.0), Point::new(5.0, 5.0));
        assert_relative_eq!(az, 180.0, epsilon = 1e-12);
    }
}
