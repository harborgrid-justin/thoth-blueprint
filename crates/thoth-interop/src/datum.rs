//! Datum transformation pipeline: NADCON/NTv2-style grid-shift transforms.
//!
//! This is a **different concern from `thoth-services`'s projection math**
//! (Web Mercator/UTM/LCC), which maps geodetic coordinates on one datum's
//! ellipsoid to a projected plane — this module never touches that code and
//! instead shifts geodetic coordinates *from one datum to another* (e.g.
//! NAD27 → NAD83), the step a projection takes as its input. NADCON/NTv2 do
//! this via a dense empirical grid of `(Δlat, Δlon)` shift values fit to
//! control-point observations (rather than a closed-form 7-/10-parameter
//! transform), because North American datum realizations differ by a
//! spatially-varying amount too irregular for a single affine/Helmert
//! transform to capture accurately.
//!
//! **Scope**: this module implements the grid-shift *interpolation engine*
//! — bilinear interpolation of `(Δlat, Δlon)` over a regular lat/lon grid,
//! matching NTv2's `.gsb`/NADCON's `.las`/`.los` interpolation method
//! exactly — plus a small built-in [`DatumGrid`] constructor for callers
//! supplying their own shift values. It does **not** ship the real NADCON/
//! NTv2 binary grid files (NADCON's CONUS grid alone is tens of megabytes of
//! third-party government survey data, not something to vendor into a
//! source crate) or a `.gsb`/`.las`/`.los` binary file parser. A caller with
//! an actual NADCON/NTv2 grid file parses it into a [`DatumGrid`]
//! (`origin`/`cell_size`/`cols`/`rows` + a flat `shifts` array — the same
//! shape those formats store internally) and this module does the
//! numerically-correct interpolation and coordinate application.

use crate::error::{InteropError, InteropResult};

const FORMAT: &str = "DatumTransform";

/// A geodetic position: latitude/longitude in decimal degrees.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct GeodeticPoint {
    pub lat_deg: f64,
    pub lon_deg: f64,
}

/// A `(Δlat, Δlon)` shift value at one grid node, in arc-seconds (NADCON/
/// NTv2's native unit).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ShiftValue {
    pub d_lat_arcsec: f64,
    pub d_lon_arcsec: f64,
}

/// A regular lat/lon grid of shift values — the shape a NADCON `.las`/`.los`
/// pair or an NTv2 `.gsb` sub-grid stores internally.
#[derive(Debug, Clone, PartialEq)]
pub struct DatumGrid {
    /// Southwest corner, decimal degrees.
    origin: GeodeticPoint,
    /// Node spacing, decimal degrees (NADCON/NTv2 grids are almost always
    /// coarser in longitude than latitude; both axes are supported).
    cell_size_lat: f64,
    cell_size_lon: f64,
    cols: usize,
    rows: usize,
    /// Row-major, south-to-north then west-to-east (matches the axis order
    /// `origin` implies).
    shifts: Vec<ShiftValue>,
}

impl DatumGrid {
    /// Build a validated shift grid.
    ///
    /// # Errors
    /// [`InteropError::Unsupported`] if either cell size isn't positive, or
    /// there are fewer than 2 nodes on either axis (the minimum to define one
    /// bilinear cell), or `shifts.len() != cols * rows`.
    pub fn new(
        origin: GeodeticPoint,
        cell_size_lat: f64,
        cell_size_lon: f64,
        cols: usize,
        rows: usize,
        shifts: Vec<ShiftValue>,
    ) -> InteropResult<Self> {
        if !(cell_size_lat.is_finite()
            && cell_size_lat > 0.0
            && cell_size_lon.is_finite()
            && cell_size_lon > 0.0)
        {
            return Err(InteropError::Unsupported {
                format: FORMAT,
                reason: format!(
                    "cell sizes must be positive, got ({cell_size_lat}, {cell_size_lon})"
                ),
            });
        }
        if cols < 2 || rows < 2 {
            return Err(InteropError::Unsupported {
                format: FORMAT,
                reason: format!("grid must be at least 2x2 nodes, got {cols}x{rows}"),
            });
        }
        if shifts.len() != cols * rows {
            return Err(InteropError::CountMismatch {
                format: FORMAT,
                what: "grid shift nodes",
                expected: cols * rows,
                actual: shifts.len(),
            });
        }
        Ok(DatumGrid {
            origin,
            cell_size_lat,
            cell_size_lon,
            cols,
            rows,
            shifts,
        })
    }

    fn node(&self, c: usize, r: usize) -> ShiftValue {
        self.shifts[r * self.cols + c]
    }

    /// Bilinearly interpolate the shift at a geodetic point.
    ///
    /// # Errors
    /// [`InteropError::Unsupported`] if `p` falls outside the grid's
    /// covered extent — NADCON/NTv2 grids are region-specific (e.g. CONUS,
    /// Alaska, Puerto Rico) and extrapolating a shift past a grid's
    /// surveyed extent is not a defensible approximation.
    pub fn interpolate(&self, p: GeodeticPoint) -> InteropResult<ShiftValue> {
        let fx = (p.lon_deg - self.origin.lon_deg) / self.cell_size_lon;
        let fy = (p.lat_deg - self.origin.lat_deg) / self.cell_size_lat;
        if fx < 0.0 || fy < 0.0 || fx > (self.cols - 1) as f64 || fy > (self.rows - 1) as f64 {
            return Err(InteropError::Unsupported {
                format: FORMAT,
                reason: format!(
                    "point ({}, {}) lies outside the datum grid's covered extent",
                    p.lat_deg, p.lon_deg
                ),
            });
        }
        let c0 = (fx.floor() as usize).min(self.cols - 2);
        let r0 = (fy.floor() as usize).min(self.rows - 2);
        let tx = fx - c0 as f64;
        let ty = fy - r0 as f64;

        let bl = self.node(c0, r0);
        let br = self.node(c0 + 1, r0);
        let tl = self.node(c0, r0 + 1);
        let tr = self.node(c0 + 1, r0 + 1);

        let lerp = |a: f64, b: f64, t: f64| a + (b - a) * t;
        let bottom_lat = lerp(bl.d_lat_arcsec, br.d_lat_arcsec, tx);
        let top_lat = lerp(tl.d_lat_arcsec, tr.d_lat_arcsec, tx);
        let bottom_lon = lerp(bl.d_lon_arcsec, br.d_lon_arcsec, tx);
        let top_lon = lerp(tl.d_lon_arcsec, tr.d_lon_arcsec, tx);

        Ok(ShiftValue {
            d_lat_arcsec: lerp(bottom_lat, top_lat, ty),
            d_lon_arcsec: lerp(bottom_lon, top_lon, ty),
        })
    }
}

/// Apply a datum grid shift to a geodetic point (source datum → target
/// datum). NADCON/NTv2 both define the shift as `target = source + shift`
/// (with NADCON's `.los` longitude shift sign convention already meaning
/// "add to get the target longitude", which this function assumes its
/// caller's `grid` was built to match).
///
/// # Errors
/// Propagates [`DatumGrid::interpolate`]'s out-of-extent error.
pub fn apply_datum_shift(grid: &DatumGrid, p: GeodeticPoint) -> InteropResult<GeodeticPoint> {
    let shift = grid.interpolate(p)?;
    Ok(GeodeticPoint {
        lat_deg: p.lat_deg + shift.d_lat_arcsec / 3600.0,
        lon_deg: p.lon_deg + shift.d_lon_arcsec / 3600.0,
    })
}

/// Invert a datum shift (target datum → source datum) by iterating
/// [`apply_datum_shift`] to a fixed point: since the shift grid is defined
/// in source-datum coordinates, going the other way means finding the
/// source point whose forward-shifted position lands on `target` — the same
/// approach NADCON's own inverse transform uses (a direct closed-form
/// inverse doesn't exist for an empirical grid).
///
/// # Errors
/// [`InteropError::ConvergenceFailure`] if the fixed-point iteration doesn't
/// converge within `max_iterations`; propagates
/// [`DatumGrid::interpolate`]'s out-of-extent error if any iterate strays
/// off the grid.
pub fn invert_datum_shift(
    grid: &DatumGrid,
    target: GeodeticPoint,
    max_iterations: u32,
) -> InteropResult<GeodeticPoint> {
    let mut estimate = target;
    for _iteration in 0..max_iterations {
        let forward = apply_datum_shift(grid, estimate)?;
        let d_lat = target.lat_deg - forward.lat_deg;
        let d_lon = target.lon_deg - forward.lon_deg;
        estimate.lat_deg += d_lat;
        estimate.lon_deg += d_lon;
        if d_lat.abs() < 1e-10 && d_lon.abs() < 1e-10 {
            return Ok(estimate);
        }
    }
    Err(InteropError::ConvergenceFailure {
        solver: "invert_datum_shift",
        iterations: max_iterations,
        max_correction: (target.lat_deg - apply_datum_shift(grid, estimate)?.lat_deg).abs(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A trivial constant-shift grid (every node shifts by the same amount)
    /// — enough to test the interpolation/application/inversion machinery
    /// without needing a real NADCON dataset.
    fn constant_shift_grid(d_lat_arcsec: f64, d_lon_arcsec: f64) -> DatumGrid {
        DatumGrid::new(
            GeodeticPoint {
                lat_deg: 30.0,
                lon_deg: -100.0,
            },
            1.0,
            1.0,
            3,
            3,
            vec![
                ShiftValue {
                    d_lat_arcsec,
                    d_lon_arcsec
                };
                9
            ],
        )
        .unwrap()
    }

    #[test]
    fn constant_grid_applies_the_same_shift_everywhere() {
        let grid = constant_shift_grid(3.6, -3.6); // 3.6 arcsec = 0.001 deg
        let p = GeodeticPoint {
            lat_deg: 31.5,
            lon_deg: -99.2,
        };
        let shifted = apply_datum_shift(&grid, p).unwrap();
        assert!((shifted.lat_deg - (p.lat_deg + 0.001)).abs() < 1e-9);
        assert!((shifted.lon_deg - (p.lon_deg - 0.001)).abs() < 1e-9);
    }

    #[test]
    fn varying_grid_interpolates_bilinearly() {
        // Shift grows linearly with longitude only, so the interpolated
        // value at the grid's horizontal midpoint should be the average of
        // its two neighboring columns' values.
        let mut shifts = vec![
            ShiftValue {
                d_lat_arcsec: 0.0,
                d_lon_arcsec: 0.0
            };
            9
        ];
        for r in 0..3 {
            for c in 0..3 {
                shifts[r * 3 + c] = ShiftValue {
                    d_lat_arcsec: 0.0,
                    d_lon_arcsec: c as f64 * 10.0,
                };
            }
        }
        let grid = DatumGrid::new(
            GeodeticPoint {
                lat_deg: 30.0,
                lon_deg: -100.0,
            },
            1.0,
            1.0,
            3,
            3,
            shifts,
        )
        .unwrap();
        let mid = grid
            .interpolate(GeodeticPoint {
                lat_deg: 31.0,
                lon_deg: -99.5,
            })
            .unwrap();
        assert!((mid.d_lon_arcsec - 5.0).abs() < 1e-9);
    }

    #[test]
    fn point_outside_grid_extent_is_rejected() {
        let grid = constant_shift_grid(1.0, 1.0);
        let far = GeodeticPoint {
            lat_deg: 60.0,
            lon_deg: -50.0,
        };
        assert!(matches!(
            grid.interpolate(far),
            Err(InteropError::Unsupported { .. })
        ));
    }

    #[test]
    fn inverse_shift_recovers_the_original_point() {
        let grid = constant_shift_grid(2.0, -2.5);
        let source = GeodeticPoint {
            lat_deg: 31.2,
            lon_deg: -99.7,
        };
        let target = apply_datum_shift(&grid, source).unwrap();
        let recovered = invert_datum_shift(&grid, target, 20).unwrap();
        assert!((recovered.lat_deg - source.lat_deg).abs() < 1e-9);
        assert!((recovered.lon_deg - source.lon_deg).abs() < 1e-9);
    }

    #[test]
    fn non_positive_cell_size_is_rejected() {
        let err = DatumGrid::new(
            GeodeticPoint {
                lat_deg: 0.0,
                lon_deg: 0.0,
            },
            0.0,
            1.0,
            2,
            2,
            vec![
                ShiftValue {
                    d_lat_arcsec: 0.0,
                    d_lon_arcsec: 0.0
                };
                4
            ],
        )
        .unwrap_err();
        assert!(matches!(err, InteropError::Unsupported { .. }));
    }

    #[test]
    fn mismatched_shift_count_is_rejected() {
        let err = DatumGrid::new(
            GeodeticPoint {
                lat_deg: 0.0,
                lon_deg: 0.0,
            },
            1.0,
            1.0,
            3,
            3,
            vec![
                ShiftValue {
                    d_lat_arcsec: 0.0,
                    d_lon_arcsec: 0.0
                };
                5
            ],
        )
        .unwrap_err();
        assert!(matches!(err, InteropError::CountMismatch { .. }));
    }
}
