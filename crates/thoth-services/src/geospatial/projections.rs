//! Coordinate-system transforms. Port of
//! `services/geospatial/src/projections.ts`.
//!
//! The TS original delegates to `proj4`, which accepts arbitrary `+proj=...`
//! strings. This port instead implements the specific projection families
//! `proj4` was configured with in `PROJECTION_DEFS` directly — geographic
//! (WGS84 longitude/latitude), spherical Web Mercator, ellipsoidal
//! Transverse Mercator (UTM), and ellipsoidal Lambert Conformal Conic (US
//! state plane in US survey feet) — using the standard closed-form forward
//! and inverse formulas (Snyder, *Map Projections: A Working Manual*, USGS
//! Professional Paper 1395). Every CRS code `proj4.defs` was seeded with in
//! the original registry has a corresponding entry here; an arbitrary
//! `+proj=...` string is not supported (this crate does not parse proj4
//! strings) and, like the TS fallback for an unrecognized code, resolves to
//! WGS84 geographic.
//!
//! Datum shifts are treated as identity: NAD83/GRS80 and WGS84 differ by at
//! most ~1-2m in North America, which the TS registry itself doesn't
//! correct for either (its defs specify no `+towgs84` grid), so this is a
//! faithful match, not a simplification unique to the port.

use thoth_spatial::{Bounds, Point};

use super::GeospatialError;

/// An ellipsoid of revolution: semi-major axis `a` (meters) and flattening
/// `f`.
#[derive(Debug, Clone, Copy, PartialEq)]
struct Ellipsoid {
    a: f64,
    f: f64,
}

impl Ellipsoid {
    /// First eccentricity squared, `e² = f(2 - f)`.
    const fn e2(self) -> f64 {
        self.f * (2.0 - self.f)
    }

    /// Second eccentricity squared, `e'² = e² / (1 - e²)`.
    fn e_prime2(self) -> f64 {
        self.e2() / (1.0 - self.e2())
    }
}

/// WGS84: `a = 6378137`, `f = 1/298.257223563`.
const WGS84: Ellipsoid = Ellipsoid {
    a: 6_378_137.0,
    f: 1.0 / 298.257_223_563,
};

/// GRS80 (NAD83's ellipsoid): `a = 6378137`, `f = 1/298.257222101`.
const GRS80: Ellipsoid = Ellipsoid {
    a: 6_378_137.0,
    f: 1.0 / 298.257_222_101,
};

/// US survey foot, in meters — the linear unit of the CA state plane defs.
const US_SURVEY_FOOT: f64 = 0.304_800_609_601_219_2;

/// A projection family + its parameters, resolved from a CRS code.
#[derive(Debug, Clone, Copy, PartialEq)]
enum Projection {
    /// Geographic (longitude, latitude) in degrees, WGS84.
    LongLat,
    /// Spherical Web Mercator (EPSG:3857).
    Merc,
    /// Ellipsoidal Transverse Mercator (a UTM zone), north hemisphere.
    Utm { zone: u8 },
    /// Ellipsoidal Lambert Conformal Conic with two standard parallels (US
    /// state plane).
    Lcc {
        lat1_deg: f64,
        lat2_deg: f64,
        lat0_deg: f64,
        lon0_deg: f64,
        /// False easting/northing, in the *native* linear unit (feet).
        x0: f64,
        y0: f64,
        /// Meters per native unit.
        to_meter: f64,
    },
}

/// Resolve a CRS code (e.g. `"EPSG:3857"`) to its [`Projection`]. Unknown
/// codes fall back to WGS84 geographic, matching the TS `getProjectionDef`
/// fallback.
fn resolve(crs: &str) -> Projection {
    match crs.to_uppercase().trim() {
        "EPSG:4326" => Projection::LongLat,
        "EPSG:3857" => Projection::Merc,
        "EPSG:26910" => Projection::Utm { zone: 10 },
        "EPSG:26911" => Projection::Utm { zone: 11 },
        "EPSG:26912" => Projection::Utm { zone: 12 },
        "EPSG:26913" => Projection::Utm { zone: 13 },
        "EPSG:26914" => Projection::Utm { zone: 14 },
        "EPSG:26915" => Projection::Utm { zone: 15 },
        "EPSG:26916" => Projection::Utm { zone: 16 },
        "EPSG:26917" => Projection::Utm { zone: 17 },
        "EPSG:26918" => Projection::Utm { zone: 18 },
        // California State Plane Zones I-V (NAD83, US survey feet).
        "EPSG:2225" => Projection::Lcc {
            lat1_deg: 41.0 + 40.0 / 60.0,
            lat2_deg: 40.0,
            lat0_deg: 39.0 + 20.0 / 60.0,
            lon0_deg: -122.0,
            x0: 2_000_000.0001016,
            y0: 500_000.0001016001,
            to_meter: US_SURVEY_FOOT,
        },
        "EPSG:2226" => Projection::Lcc {
            lat1_deg: 39.0 + 50.0 / 60.0,
            lat2_deg: 38.0 + 20.0 / 60.0,
            lat0_deg: 37.0 + 40.0 / 60.0,
            lon0_deg: -122.0,
            x0: 2_000_000.0001016,
            y0: 500_000.0001016001,
            to_meter: US_SURVEY_FOOT,
        },
        "EPSG:2227" => Projection::Lcc {
            lat1_deg: 38.0 + 26.0 / 60.0,
            lat2_deg: 37.0 + 4.0 / 60.0,
            lat0_deg: 36.5,
            lon0_deg: -120.5,
            x0: 2_000_000.0001016,
            y0: 500_000.0001016001,
            to_meter: US_SURVEY_FOOT,
        },
        "EPSG:2228" => Projection::Lcc {
            lat1_deg: 36.0,
            lat2_deg: 34.0 + 2.0 / 60.0,
            lat0_deg: 34.75,
            lon0_deg: -119.0,
            x0: 2_000_000.0001016,
            y0: 500_000.0001016001,
            to_meter: US_SURVEY_FOOT,
        },
        "EPSG:2229" => Projection::Lcc {
            lat1_deg: 34.0 + 38.0 / 60.0,
            lat2_deg: 32.0 + 47.0 / 60.0,
            lat0_deg: 34.0 + 5.0 / 60.0,
            lon0_deg: -118.25,
            x0: 2_000_000.0001016,
            y0: 500_000.0001016001,
            to_meter: US_SURVEY_FOOT,
        },
        _ => Projection::LongLat,
    }
}

fn utm_central_meridian_deg(zone: u8) -> f64 {
    f64::from(zone) * 6.0 - 183.0
}

/// Forward ellipsoidal Transverse Mercator (Snyder eq. 3-21), `k0 = 0.9996`,
/// 500,000 m false easting, 0 false northing (northern hemisphere zones
/// only — every UTM zone this registry supports is north of the equator).
fn tmerc_forward(ellipsoid: Ellipsoid, lon0_deg: f64, lat_deg: f64, lon_deg: f64) -> (f64, f64) {
    const K0: f64 = 0.9996;
    let e2 = ellipsoid.e2();
    let ep2 = ellipsoid.e_prime2();
    let a = ellipsoid.a;

    let lat = lat_deg.to_radians();
    let lon = lon_deg.to_radians();
    let lon0 = lon0_deg.to_radians();

    let sin_lat = lat.sin();
    let cos_lat = lat.cos();
    let tan_lat = lat.tan();

    let n = a / (1.0 - e2 * sin_lat * sin_lat).sqrt();
    let t = tan_lat * tan_lat;
    let c = ep2 * cos_lat * cos_lat;
    let ax = (lon - lon0) * cos_lat;

    let m = a
        * ((1.0 - e2 / 4.0 - 3.0 * e2.powi(2) / 64.0 - 5.0 * e2.powi(3) / 256.0) * lat
            - (3.0 * e2 / 8.0 + 3.0 * e2.powi(2) / 32.0 + 45.0 * e2.powi(3) / 1024.0)
                * (2.0 * lat).sin()
            + (15.0 * e2.powi(2) / 256.0 + 45.0 * e2.powi(3) / 1024.0) * (4.0 * lat).sin()
            - (35.0 * e2.powi(3) / 3072.0) * (6.0 * lat).sin());

    let x = K0
        * n
        * (ax + (1.0 - t + c) * ax.powi(3) / 6.0
            + (5.0 - 18.0 * t + t * t + 72.0 * c - 58.0 * ep2) * ax.powi(5) / 120.0)
        + 500_000.0;
    let y = K0
        * (m + n
            * tan_lat
            * (ax.powi(2) / 2.0
                + (5.0 - t + 9.0 * c + 4.0 * c * c) * ax.powi(4) / 24.0
                + (61.0 - 58.0 * t + t * t + 600.0 * c - 330.0 * ep2) * ax.powi(6) / 720.0));

    (x, y)
}

/// Inverse ellipsoidal Transverse Mercator (Snyder eq. 3-26).
fn tmerc_inverse(ellipsoid: Ellipsoid, lon0_deg: f64, x: f64, y: f64) -> (f64, f64) {
    const K0: f64 = 0.9996;
    let e2 = ellipsoid.e2();
    let ep2 = ellipsoid.e_prime2();
    let a = ellipsoid.a;
    let e1 = (1.0 - (1.0 - e2).sqrt()) / (1.0 + (1.0 - e2).sqrt());

    let m = y / K0;
    let mu = m / (a * (1.0 - e2 / 4.0 - 3.0 * e2.powi(2) / 64.0 - 5.0 * e2.powi(3) / 256.0));

    let phi1 = mu
        + (3.0 * e1 / 2.0 - 27.0 * e1.powi(3) / 32.0) * (2.0 * mu).sin()
        + (21.0 * e1.powi(2) / 16.0 - 55.0 * e1.powi(4) / 32.0) * (4.0 * mu).sin()
        + (151.0 * e1.powi(3) / 96.0) * (6.0 * mu).sin()
        + (1097.0 * e1.powi(4) / 512.0) * (8.0 * mu).sin();

    let sin_phi1 = phi1.sin();
    let cos_phi1 = phi1.cos();
    let tan_phi1 = phi1.tan();

    let n1 = a / (1.0 - e2 * sin_phi1 * sin_phi1).sqrt();
    let t1 = tan_phi1 * tan_phi1;
    let c1 = ep2 * cos_phi1 * cos_phi1;
    let r1 = a * (1.0 - e2) / (1.0 - e2 * sin_phi1 * sin_phi1).powf(1.5);
    let d = (x - 500_000.0) / (n1 * K0);

    let lat = phi1
        - (n1 * tan_phi1 / r1)
            * (d * d / 2.0
                - (5.0 + 3.0 * t1 + 10.0 * c1 - 4.0 * c1 * c1 - 9.0 * ep2) * d.powi(4) / 24.0
                + (61.0 + 90.0 * t1 + 298.0 * c1 + 45.0 * t1 * t1 - 252.0 * ep2 - 3.0 * c1 * c1)
                    * d.powi(6)
                    / 720.0);

    let lon = lon0_deg.to_radians()
        + (d - (1.0 + 2.0 * t1 + c1) * d.powi(3) / 6.0
            + (5.0 - 2.0 * c1 + 28.0 * t1 - 3.0 * c1 * c1 + 8.0 * ep2 + 24.0 * t1 * t1)
                * d.powi(5)
                / 120.0)
            / cos_phi1;

    (lon.to_degrees(), lat.to_degrees())
}

/// Forward ellipsoidal Lambert Conformal Conic, two standard parallels
/// (Snyder eq. 15-1 to 15-3), returning native-unit (feet) coordinates.
#[allow(clippy::too_many_arguments)]
fn lcc_forward(
    ellipsoid: Ellipsoid,
    lat1_deg: f64,
    lat2_deg: f64,
    lat0_deg: f64,
    lon0_deg: f64,
    x0: f64,
    y0: f64,
    to_meter: f64,
    lon_deg: f64,
    lat_deg: f64,
) -> (f64, f64) {
    let e2 = ellipsoid.e2();
    let e = e2.sqrt();

    let m = |lat: f64| -> f64 {
        let sin_lat = lat.sin();
        lat.cos() / (1.0 - e2 * sin_lat * sin_lat).sqrt()
    };
    let t = |lat: f64| -> f64 {
        ((std::f64::consts::FRAC_PI_4 - lat / 2.0).tan())
            / (((1.0 - e * lat.sin()) / (1.0 + e * lat.sin())).powf(e / 2.0))
    };

    let lat1 = lat1_deg.to_radians();
    let lat2 = lat2_deg.to_radians();
    let lat0 = lat0_deg.to_radians();
    let lon0 = lon0_deg.to_radians();
    let lat = lat_deg.to_radians();
    let lon = lon_deg.to_radians();

    let m1 = m(lat1);
    let m2 = m(lat2);
    let t1 = t(lat1);
    let t2 = t(lat2);
    let t0 = t(lat0);
    let tp = t(lat);

    let n = if (lat1 - lat2).abs() < 1e-12 {
        lat1.sin()
    } else {
        (m1.ln() - m2.ln()) / (t1.ln() - t2.ln())
    };
    let f = m1 / (n * t1.powf(n));
    let rho0 = ellipsoid.a * f * t0.powf(n);
    let rho = ellipsoid.a * f * tp.powf(n);
    let theta = n * (lon - lon0);

    let x_m = rho * theta.sin();
    let y_m = rho0 - rho * theta.cos();

    // x0/y0 (false easting/northing) are given in the native unit (feet);
    // combine in meters, then convert the result back to the native unit.
    let x = (x_m + x0 * to_meter) / to_meter;
    let y = (y_m + y0 * to_meter) / to_meter;
    (x, y)
}

/// Inverse ellipsoidal Lambert Conformal Conic (Snyder eq. 15-9 family).
#[allow(clippy::too_many_arguments)]
fn lcc_inverse(
    ellipsoid: Ellipsoid,
    lat1_deg: f64,
    lat2_deg: f64,
    lat0_deg: f64,
    lon0_deg: f64,
    x0: f64,
    y0: f64,
    to_meter: f64,
    x: f64,
    y: f64,
) -> (f64, f64) {
    let e2 = ellipsoid.e2();
    let e = e2.sqrt();

    let m = |lat: f64| -> f64 {
        let sin_lat = lat.sin();
        lat.cos() / (1.0 - e2 * sin_lat * sin_lat).sqrt()
    };
    let t = |lat: f64| -> f64 {
        ((std::f64::consts::FRAC_PI_4 - lat / 2.0).tan())
            / (((1.0 - e * lat.sin()) / (1.0 + e * lat.sin())).powf(e / 2.0))
    };

    let lat1 = lat1_deg.to_radians();
    let lat2 = lat2_deg.to_radians();
    let lat0 = lat0_deg.to_radians();
    let lon0 = lon0_deg.to_radians();

    let m1 = m(lat1);
    let m2 = m(lat2);
    let t1 = t(lat1);
    let t2 = t(lat2);
    let t0 = t(lat0);

    let n = if (lat1 - lat2).abs() < 1e-12 {
        lat1.sin()
    } else {
        (m1.ln() - m2.ln()) / (t1.ln() - t2.ln())
    };
    let f = m1 / (n * t1.powf(n));
    let rho0 = ellipsoid.a * f * t0.powf(n);

    // Native (feet) -> meters, false-easting/northing removed.
    let x_m = x * to_meter - x0 * to_meter;
    let y_m = y * to_meter - y0 * to_meter;

    let rho = (x_m * x_m + (rho0 - y_m).powi(2)).sqrt() * n.signum();
    let theta = (x_m).atan2(rho0 - y_m);
    let tp = (rho / (ellipsoid.a * f)).powf(1.0 / n);

    // Iteratively solve for latitude from `t` (Snyder eq. 7-9), a handful of
    // Newton-ish fixed-point iterations converge to double precision.
    let mut lat = std::f64::consts::FRAC_PI_2 - 2.0 * tp.atan();
    for _ in 0..6 {
        let sin_lat = lat.sin();
        let es_sin = e * sin_lat;
        lat = std::f64::consts::FRAC_PI_2
            - 2.0
                * (tp * ((1.0 - es_sin) / (1.0 + es_sin)).powf(e / 2.0))
                    .atan();
    }
    let lon = theta / n + lon0;

    (lon.to_degrees(), lat.to_degrees())
}

/// Convert a point in `projection`'s native coordinates to WGS84
/// (longitude, latitude) degrees.
fn to_geographic(projection: Projection, x: f64, y: f64) -> (f64, f64) {
    match projection {
        Projection::LongLat => (x, y),
        Projection::Merc => {
            let lon_deg = (x / WGS84.a).to_degrees();
            let lat_deg =
                (2.0 * (y / WGS84.a).exp().atan() - std::f64::consts::FRAC_PI_2).to_degrees();
            (lon_deg, lat_deg)
        }
        Projection::Utm { zone } => tmerc_inverse(GRS80, utm_central_meridian_deg(zone), x, y),
        Projection::Lcc {
            lat1_deg,
            lat2_deg,
            lat0_deg,
            lon0_deg,
            x0,
            y0,
            to_meter,
        } => lcc_inverse(GRS80, lat1_deg, lat2_deg, lat0_deg, lon0_deg, x0, y0, to_meter, x, y),
    }
}

/// Convert a WGS84 (longitude, latitude) degree pair into `projection`'s
/// native coordinates.
fn from_geographic(projection: Projection, lon_deg: f64, lat_deg: f64) -> (f64, f64) {
    match projection {
        Projection::LongLat => (lon_deg, lat_deg),
        Projection::Merc => {
            let x = WGS84.a * lon_deg.to_radians();
            let y = WGS84.a
                * ((std::f64::consts::FRAC_PI_4 + lat_deg.to_radians() / 2.0).tan()).ln();
            (x, y)
        }
        Projection::Utm { zone } => {
            tmerc_forward(GRS80, utm_central_meridian_deg(zone), lat_deg, lon_deg)
        }
        Projection::Lcc {
            lat1_deg,
            lat2_deg,
            lat0_deg,
            lon0_deg,
            x0,
            y0,
            to_meter,
        } => lcc_forward(
            GRS80, lat1_deg, lat2_deg, lat0_deg, lon0_deg, x0, y0, to_meter, lon_deg, lat_deg,
        ),
    }
}

fn assert_finite(point: Point) -> Result<(), GeospatialError> {
    if point.x.is_finite() && point.y.is_finite() {
        Ok(())
    } else {
        Err(GeospatialError::NonFiniteCoordinate {
            x: point.x,
            y: point.y,
        })
    }
}

/// Reproject a single coordinate point from `from_crs` to `to_crs`.
pub fn reproject_point(point: Point, from_crs: &str, to_crs: &str) -> Result<Point, GeospatialError> {
    assert_finite(point)?;
    let from = resolve(from_crs);
    let to = resolve(to_crs);
    if from == to {
        return Ok(point);
    }
    let (lon, lat) = to_geographic(from, point.x, point.y);
    let (x, y) = from_geographic(to, lon, lat);
    Ok(Point::new(x, y))
}

/// Reproject a polyline/polygon array of points.
pub fn reproject_points(
    points: &[Point],
    from_crs: &str,
    to_crs: &str,
) -> Result<Vec<Point>, GeospatialError> {
    let from = resolve(from_crs);
    let to = resolve(to_crs);
    if from == to {
        for p in points {
            assert_finite(*p)?;
        }
        return Ok(points.to_vec());
    }
    points
        .iter()
        .map(|&p| reproject_point(p, from_crs, to_crs))
        .collect()
}

/// Reproject an axis-aligned bounding box by transforming its four corners
/// and re-deriving the envelope (correct even when the transform isn't
/// axis-preserving, e.g. across a UTM zone boundary).
pub fn reproject_bounds(bounds: Bounds, from_crs: &str, to_crs: &str) -> Result<Bounds, GeospatialError> {
    let corners = [
        Point::new(bounds.min_x, bounds.min_y),
        Point::new(bounds.max_x, bounds.min_y),
        Point::new(bounds.max_x, bounds.max_y),
        Point::new(bounds.min_x, bounds.max_y),
    ];
    let reprojected = reproject_points(&corners, from_crs, to_crs)?;
    let xs: Vec<f64> = reprojected.iter().map(|p| p.x).collect();
    let ys: Vec<f64> = reprojected.iter().map(|p| p.y).collect();
    Ok(Bounds {
        min_x: xs.iter().cloned().fold(f64::INFINITY, f64::min),
        min_y: ys.iter().cloned().fold(f64::INFINITY, f64::min),
        max_x: xs.iter().cloned().fold(f64::NEG_INFINITY, f64::max),
        max_y: ys.iter().cloned().fold(f64::NEG_INFINITY, f64::max),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_close(actual: f64, expected: f64, tolerance: f64) {
        assert!(
            (actual - expected).abs() < tolerance,
            "expected {actual} to be within {tolerance} of {expected}"
        );
    }

    #[test]
    fn reprojects_longitude_latitude_to_web_mercator() {
        let origin = Point::new(0.0, 0.0);
        let merc_origin = reproject_point(origin, "EPSG:4326", "EPSG:3857").unwrap();
        assert_close(merc_origin.x, 0.0, 0.1);
        assert_close(merc_origin.y, 0.0, 0.1);

        // San Francisco (~122.4194 W, 37.7749 N).
        let sf = Point::new(-122.4194, 37.7749);
        let sf_merc = reproject_point(sf, "EPSG:4326", "EPSG:3857").unwrap();
        assert_close(sf_merc.x, -13_627_665.3, 0.5);
        assert_close(sf_merc.y, 4_547_675.4, 0.5);
    }

    #[test]
    fn supports_utm_zone_reprojection() {
        let sf = Point::new(-122.4194, 37.7749);
        let sf_utm = reproject_point(sf, "EPSG:4326", "EPSG:26910").unwrap();
        assert_close(sf_utm.x, 551_130.8, 0.5);
        assert_close(sf_utm.y, 4_180_998.9, 0.5);
    }

    #[test]
    fn identity_reprojection_returns_an_equal_point() {
        let p = Point::new(12.5, -8.25);
        let out = reproject_point(p, "EPSG:3857", "EPSG:3857").unwrap();
        assert_eq!(out, p);
    }

    #[test]
    fn rejects_non_finite_coordinates() {
        let err = reproject_point(Point::new(f64::NAN, 0.0), "EPSG:4326", "EPSG:3857").unwrap_err();
        assert!(matches!(err, GeospatialError::NonFiniteCoordinate { .. }));
    }

    #[test]
    fn utm_round_trips_through_geographic() {
        let original = Point::new(-121.5, 38.2);
        let utm = reproject_point(original, "EPSG:4326", "EPSG:26910").unwrap();
        let back = reproject_point(utm, "EPSG:26910", "EPSG:4326").unwrap();
        assert_close(back.x, original.x, 1e-6);
        assert_close(back.y, original.y, 1e-6);
    }

    #[test]
    fn lcc_state_plane_round_trips_through_geographic() {
        // A point inside California zone III (EPSG:2227)'s footprint.
        let original = Point::new(-121.0, 37.5);
        let projected = reproject_point(original, "EPSG:4326", "EPSG:2227").unwrap();
        let back = reproject_point(projected, "EPSG:2227", "EPSG:4326").unwrap();
        assert_close(back.x, original.x, 1e-6);
        assert_close(back.y, original.y, 1e-6);
    }

    #[test]
    fn reprojects_a_bounds_envelope() {
        let bounds = Bounds {
            min_x: -122.5,
            min_y: 37.7,
            max_x: -122.3,
            max_y: 37.8,
        };
        let reprojected = reproject_bounds(bounds, "EPSG:4326", "EPSG:3857").unwrap();
        assert!(reprojected.min_x < reprojected.max_x);
        assert!(reprojected.min_y < reprojected.max_y);
    }

    #[test]
    fn unrecognized_crs_codes_fall_back_to_wgs84_geographic() {
        let p = Point::new(10.0, 20.0);
        let out = reproject_point(p, "EPSG:999999", "EPSG:4326").unwrap();
        assert_eq!(out, p);
    }
}
