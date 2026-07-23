//! Sun/shadow study (competitive gap-analysis Theme 5, item 57).
//!
//! Computes topocentric solar position (elevation/azimuth) from
//! latitude/longitude/date/time using the **NOAA General Solar Position
//! Calculations** formulas — a widely reproduced, publicly published
//! low-order truncation of Jean Meeus's *Astronomical Algorithms* (2nd ed.,
//! chapters 7, 22, 24-25) solar-position series, as documented at
//! <https://gml.noaa.gov/grad/solcalc/solareqns.PDF> — then projects a flat
//! building footprint's shadow onto the ground plane given its height.
//!
//! This is a **genuinely distinct concern** from the rest of this crate's
//! sheet-production machinery (it's an astronomical/trigonometric model, not
//! a drawing-document one), so it gets its own [`SolarError`] rather than
//! extending [`crate::DrawingError`], per this crate's error-handling
//! convention.
//!
//! ## Simplifying assumptions (documented, per task requirements)
//!
//! - Returns the sun's **true (geometric) elevation** — atmospheric
//!   refraction near the horizon (which NOAA's calculator additionally
//!   applies as a separate correction table) is **not** modeled.
//! - No Delta-T / UT1-UTC / polar-motion correction: UTC is treated as
//!   TT/UT1 directly. This is accurate to a few arcseconds at
//!   site-planning timescales (shadow studies, not ephemeris work).
//! - Topocentric parallax (correcting the geocentric solar position to the
//!   observer's location on Earth's surface) is neglected — at ~1 AU this
//!   shifts the sun's apparent position by under 9 arcseconds, negligible
//!   here.
//! - The shadow projection assumes a perfectly flat, level ground plane and
//!   a simple vertical extrusion of the footprint (no massing self-shadowing,
//!   no terrain, no adjacent-building occlusion).
//! - Calendar-date validation is bounds-only (month in 1..=12, day in
//!   1..=31): it does **not** check day-of-month against the specific month
//!   or leap-year rules (e.g. "February 30" passes validation but produces a
//!   nonsensical Julian Day). Callers are expected to supply already-valid
//!   calendar dates.

use thiserror::Error;

use thoth_spatial::Point;

/// Errors from solar-position/shadow computations. Deliberately separate
/// from [`crate::DrawingError`] — see the module rustdoc.
#[derive(Debug, Error, Clone, Copy, PartialEq)]
pub enum SolarError {
    #[error("latitude {0} out of range [-90, 90]")]
    InvalidLatitude(f64),
    #[error("longitude {0} out of range [-180, 180]")]
    InvalidLongitude(f64),
    #[error("invalid calendar date/time: {0}")]
    InvalidDateTime(&'static str),
    #[error("building height must be positive and finite, got {0}")]
    InvalidHeight(f64),
    #[error("footprint needs at least 3 vertices, got {0}")]
    DegenerateFootprint(usize),
    #[error("sun is at or below the horizon (elevation {0} deg): shadow is undefined/infinite")]
    SunBelowHorizon(f64),
}

/// A UTC calendar date/time, the input to [`solar_position`].
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct UtcDateTime {
    pub year: i32,
    /// 1-12.
    pub month: u32,
    /// 1-31 (bounds-only validated — see the module rustdoc).
    pub day: u32,
    /// 0-23.
    pub hour: u32,
    /// 0-59.
    pub minute: u32,
    /// 0.0-60.0 (inclusive of a possible leap second at 60).
    pub second: f64,
}

impl UtcDateTime {
    fn validate(&self) -> Result<(), SolarError> {
        if !(1..=12).contains(&self.month) {
            return Err(SolarError::InvalidDateTime("month must be 1..=12"));
        }
        if !(1..=31).contains(&self.day) {
            return Err(SolarError::InvalidDateTime("day must be 1..=31"));
        }
        if self.hour > 23 {
            return Err(SolarError::InvalidDateTime("hour must be 0..=23"));
        }
        if self.minute > 59 {
            return Err(SolarError::InvalidDateTime("minute must be 0..=59"));
        }
        if !(0.0..=60.0).contains(&self.second) {
            return Err(SolarError::InvalidDateTime("second must be 0.0..=60.0"));
        }
        Ok(())
    }

    /// Julian Day Number (including the time-of-day fraction), via the
    /// standard Gregorian-calendar algorithm (Meeus, *Astronomical
    /// Algorithms*, ch. 7).
    fn julian_day(&self) -> Result<f64, SolarError> {
        self.validate()?;
        let (y, m) = if self.month <= 2 {
            (self.year - 1, self.month + 12)
        } else {
            (self.year, self.month)
        };
        let a = (y as f64 / 100.0).floor();
        let b = 2.0 - a + (a / 4.0).floor();
        let day_frac = self.day as f64
            + (self.hour as f64 + self.minute as f64 / 60.0 + self.second / 3600.0) / 24.0;
        let jd = (365.25 * (y as f64 + 4716.0)).floor()
            + (30.6001 * (m as f64 + 1.0)).floor()
            + day_frac
            + b
            - 1524.5;
        Ok(jd)
    }
}

/// Topocentric solar position at a given place and time.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SolarPosition {
    /// Angle above the horizon, degrees (negative = below the horizon).
    pub elevation_deg: f64,
    /// Compass bearing to the sun, degrees clockwise from north.
    pub azimuth_deg: f64,
    /// The sun's declination at this instant, degrees (independent of
    /// observer location) — exposed because it's a directly verifiable
    /// intermediate (e.g. ~+23.44 deg at the northern summer solstice).
    pub declination_deg: f64,
    /// The equation of time at this instant, minutes (apparent minus mean
    /// solar time) — exposed for sun-chart annotations and for testing the
    /// hour-angle computation independently.
    pub equation_of_time_minutes: f64,
}

fn normalize_deg(deg: f64) -> f64 {
    ((deg % 360.0) + 360.0) % 360.0
}

/// Compute the sun's topocentric elevation/azimuth for an observer at
/// `latitude_deg`/`longitude_deg` (longitude positive east) at `at` (UTC).
///
/// # Errors
/// - [`SolarError::InvalidLatitude`] / [`SolarError::InvalidLongitude`] if
///   out of range.
/// - [`SolarError::InvalidDateTime`] if `at`'s fields are out of bounds.
pub fn solar_position(
    latitude_deg: f64,
    longitude_deg: f64,
    at: UtcDateTime,
) -> Result<SolarPosition, SolarError> {
    if !(-90.0..=90.0).contains(&latitude_deg) {
        return Err(SolarError::InvalidLatitude(latitude_deg));
    }
    if !(-180.0..=180.0).contains(&longitude_deg) {
        return Err(SolarError::InvalidLongitude(longitude_deg));
    }
    let jd = at.julian_day()?;

    // Julian century since J2000.0.
    let t = (jd - 2451545.0) / 36525.0;

    // Geometric mean longitude of the sun (deg), normalized.
    let l0 = normalize_deg(280.46646 + t * (36000.76983 + t * 0.0003032));
    // Geometric mean anomaly of the sun (deg).
    let m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
    let m_rad = m.to_radians();
    // Eccentricity of Earth's orbit.
    let e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
    // Equation of center (deg).
    let c = m_rad.sin() * (1.914602 - t * (0.004817 + 0.000014 * t))
        + (2.0 * m_rad).sin() * (0.019993 - 0.000101 * t)
        + (3.0 * m_rad).sin() * 0.000289;
    // True and apparent longitude (deg).
    let true_long = l0 + c;
    let omega = 125.04 - 1934.136 * t;
    let apparent_long = true_long - 0.00569 - 0.00478 * omega.to_radians().sin();

    // Mean obliquity of the ecliptic (deg).
    let mean_obliquity =
        23.0 + (26.0 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60.0) / 60.0;
    // Corrected obliquity (deg).
    let obliquity = mean_obliquity + 0.00256 * omega.to_radians().cos();

    // Declination (deg).
    let declination = (obliquity.to_radians().sin() * apparent_long.to_radians().sin())
        .asin()
        .to_degrees();

    // Equation of time (minutes).
    let y = (obliquity.to_radians() / 2.0).tan().powi(2);
    let l0_rad = l0.to_radians();
    let eot_deg = y * (2.0 * l0_rad).sin() - 2.0 * e * m_rad.sin()
        + 4.0 * e * y * m_rad.sin() * (2.0 * l0_rad).cos()
        - 0.5 * y * y * (4.0 * l0_rad).sin()
        - 1.25 * e * e * (2.0 * m_rad).sin();
    let equation_of_time_minutes = 4.0 * eot_deg.to_degrees();

    // True solar time (minutes into the day), folding in longitude and EoT.
    let time_of_day_minutes = at.hour as f64 * 60.0 + at.minute as f64 + at.second / 60.0;
    let true_solar_time =
        (time_of_day_minutes + equation_of_time_minutes + 4.0 * longitude_deg).rem_euclid(1440.0);

    // Hour angle (deg): negative before solar noon, positive after. The
    // commonly published NOAA formulation branches on the sign of the raw
    // (unwrapped) true solar time; folding `true_solar_time` into [0, 1440)
    // via `rem_euclid` above makes that branch always take the same arm, so
    // it collapses to this single expression.
    let hour_angle = true_solar_time / 4.0 - 180.0;
    let hour_angle_rad = hour_angle.to_radians();

    let lat_rad = latitude_deg.to_radians();
    let decl_rad = declination.to_radians();
    let cos_zenith =
        lat_rad.sin() * decl_rad.sin() + lat_rad.cos() * decl_rad.cos() * hour_angle_rad.cos();
    let zenith_deg = cos_zenith.clamp(-1.0, 1.0).acos().to_degrees();
    let elevation_deg = 90.0 - zenith_deg;

    let sin_zenith = zenith_deg.to_radians().sin();
    let azimuth_deg = if sin_zenith.abs() < 1e-9 {
        // Sun at zenith or nadir: azimuth is undefined; 180 (south) is the
        // conventional fallback used by NOAA's own spreadsheet.
        180.0
    } else {
        let cos_az = ((lat_rad.sin() * zenith_deg.to_radians().cos()) - decl_rad.sin())
            / (lat_rad.cos() * sin_zenith);
        let az = cos_az.clamp(-1.0, 1.0).acos().to_degrees();
        if hour_angle > 0.0 {
            normalize_deg(az + 180.0)
        } else {
            normalize_deg(540.0 - az)
        }
    };

    Ok(SolarPosition {
        elevation_deg,
        azimuth_deg,
        declination_deg: declination,
        equation_of_time_minutes,
    })
}

/// A building footprint's shadow, cast onto a flat ground plane.
#[derive(Debug, Clone, PartialEq)]
pub struct ShadowProjection {
    pub sun: SolarPosition,
    /// Horizontal shadow length cast by a point of the given height.
    pub shadow_length: f64,
    /// The footprint's vertices translated by the shadow displacement
    /// vector — the shadow's outline on the ground plane.
    pub shadow_footprint: Vec<Point>,
}

/// Project `footprint`'s shadow onto the ground plane for a building of
/// `height`, given the sun's computed position.
///
/// The shadow displacement is `height / tan(elevation)` long, pointing
/// directly away from the sun's azimuth (flat-extrusion simplification —
/// see the module rustdoc).
///
/// # Errors
/// - [`SolarError::DegenerateFootprint`] if `footprint` has fewer than 3
///   vertices.
/// - [`SolarError::InvalidHeight`] if `height` is non-positive or
///   non-finite.
/// - [`SolarError::SunBelowHorizon`] if `sun.elevation_deg <= 0`, so no
///   finite shadow exists.
pub fn project_shadow(
    footprint: &[Point],
    height: f64,
    sun: SolarPosition,
) -> Result<ShadowProjection, SolarError> {
    if footprint.len() < 3 {
        return Err(SolarError::DegenerateFootprint(footprint.len()));
    }
    if !height.is_finite() || height <= 0.0 {
        return Err(SolarError::InvalidHeight(height));
    }
    if sun.elevation_deg <= 0.0 {
        return Err(SolarError::SunBelowHorizon(sun.elevation_deg));
    }

    let shadow_length = height / sun.elevation_deg.to_radians().tan();
    let shadow_azimuth = normalize_deg(sun.azimuth_deg + 180.0);
    let rad = shadow_azimuth.to_radians();
    let (dx, dy) = (rad.sin(), rad.cos()); // compass bearing -> (east, north)

    let shadow_footprint = footprint
        .iter()
        .map(|p| Point::new(p.x + dx * shadow_length, p.y + dy * shadow_length))
        .collect();

    Ok(ShadowProjection {
        sun,
        shadow_length,
        shadow_footprint,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn noon_utc(year: i32, month: u32, day: u32) -> UtcDateTime {
        UtcDateTime {
            year,
            month,
            day,
            hour: 12,
            minute: 0,
            second: 0.0,
        }
    }

    #[test]
    fn declination_near_positive_obliquity_at_the_june_solstice() {
        // The sun's declination equals the obliquity of the ecliptic
        // (~23.44 deg) at the northern summer solstice, a standard,
        // independently verifiable reference value.
        let sun = solar_position(0.0, 0.0, noon_utc(2026, 6, 21)).unwrap();
        assert_relative_eq!(sun.declination_deg, 23.44, epsilon = 0.3);
    }

    #[test]
    fn declination_near_negative_obliquity_at_the_december_solstice() {
        let sun = solar_position(0.0, 0.0, noon_utc(2026, 12, 21)).unwrap();
        assert_relative_eq!(sun.declination_deg, -23.44, epsilon = 0.3);
    }

    #[test]
    fn declination_near_zero_at_an_equinox() {
        let sun = solar_position(0.0, 0.0, noon_utc(2026, 3, 20)).unwrap();
        assert_relative_eq!(sun.declination_deg, 0.0, epsilon = 0.6);
    }

    #[test]
    fn elevation_is_between_minus_ninety_and_ninety() {
        let sun = solar_position(40.0, -74.0, noon_utc(2026, 7, 23)).unwrap();
        assert!(sun.elevation_deg <= 90.0 && sun.elevation_deg >= -90.0);
        assert!(sun.azimuth_deg >= 0.0 && sun.azimuth_deg < 360.0);
    }

    #[test]
    fn sun_is_roughly_south_at_true_solar_noon_in_the_northern_hemisphere() {
        // At true solar noon the sun crosses the local meridian, i.e. due
        // south (azimuth ~= 180) for a northern-hemisphere observer whose
        // latitude is outside the tropics of the sun's current declination.
        let lon = 0.0;
        let probe = solar_position(45.0, lon, noon_utc(2026, 6, 13)).unwrap();
        // Solar noon in UTC clock time = 12:00 - lon/15h - EoT; iterate once
        // using the model's own equation of time (self-consistent check of
        // the hour-angle/azimuth formula, not an independent EoT source).
        let correction_minutes = -(lon * 4.0) - probe.equation_of_time_minutes;
        let corrected_minute = (720.0 + correction_minutes).rem_euclid(1440.0);
        let dt = UtcDateTime {
            year: 2026,
            month: 6,
            day: 13,
            hour: (corrected_minute / 60.0).floor() as u32,
            minute: (corrected_minute % 60.0).round() as u32,
            second: 0.0,
        };
        let sun = solar_position(45.0, lon, dt).unwrap();
        assert_relative_eq!(sun.azimuth_deg, 180.0, epsilon = 1.5);
    }

    #[test]
    fn solar_position_rejects_out_of_range_latitude() {
        let err = solar_position(91.0, 0.0, noon_utc(2026, 1, 1)).unwrap_err();
        assert_eq!(err, SolarError::InvalidLatitude(91.0));
    }

    #[test]
    fn solar_position_rejects_an_invalid_month() {
        let mut dt = noon_utc(2026, 1, 1);
        dt.month = 13;
        let err = solar_position(0.0, 0.0, dt).unwrap_err();
        assert!(matches!(err, SolarError::InvalidDateTime(_)));
    }

    #[test]
    fn project_shadow_length_matches_the_closed_form_at_forty_five_degrees() {
        let sun = SolarPosition {
            elevation_deg: 45.0,
            azimuth_deg: 180.0, // due south
            declination_deg: 0.0,
            equation_of_time_minutes: 0.0,
        };
        let footprint = vec![
            Point::new(0.0, 0.0),
            Point::new(10.0, 0.0),
            Point::new(10.0, 10.0),
            Point::new(0.0, 10.0),
        ];
        let shadow = project_shadow(&footprint, 10.0, sun).unwrap();
        // tan(45 deg) = 1, so shadow length == height.
        assert_relative_eq!(shadow.shadow_length, 10.0, epsilon = 1e-9);
        // Sun due south -> shadow points due north -> +y displacement, no x.
        assert_relative_eq!(shadow.shadow_footprint[0].x, 0.0, epsilon = 1e-9);
        assert_relative_eq!(shadow.shadow_footprint[0].y, 10.0, epsilon = 1e-9);
    }

    #[test]
    fn project_shadow_rejects_a_sun_below_the_horizon() {
        let sun = SolarPosition {
            elevation_deg: -5.0,
            azimuth_deg: 0.0,
            declination_deg: 0.0,
            equation_of_time_minutes: 0.0,
        };
        let footprint = vec![
            Point::new(0.0, 0.0),
            Point::new(1.0, 0.0),
            Point::new(1.0, 1.0),
        ];
        let err = project_shadow(&footprint, 10.0, sun).unwrap_err();
        assert_eq!(err, SolarError::SunBelowHorizon(-5.0));
    }

    #[test]
    fn project_shadow_rejects_a_degenerate_footprint() {
        let sun = SolarPosition {
            elevation_deg: 45.0,
            azimuth_deg: 180.0,
            declination_deg: 0.0,
            equation_of_time_minutes: 0.0,
        };
        let err = project_shadow(&[Point::new(0.0, 0.0)], 10.0, sun).unwrap_err();
        assert_eq!(err, SolarError::DegenerateFootprint(1));
    }

    #[test]
    fn project_shadow_rejects_a_non_positive_height() {
        let sun = SolarPosition {
            elevation_deg: 45.0,
            azimuth_deg: 180.0,
            declination_deg: 0.0,
            equation_of_time_minutes: 0.0,
        };
        let footprint = vec![
            Point::new(0.0, 0.0),
            Point::new(1.0, 0.0),
            Point::new(1.0, 1.0),
        ];
        let err = project_shadow(&footprint, 0.0, sun).unwrap_err();
        assert_eq!(err, SolarError::InvalidHeight(0.0));
    }
}
