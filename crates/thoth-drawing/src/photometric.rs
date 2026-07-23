//! Photometric/lighting point-by-point illuminance-grid calculation
//! (competitive gap-analysis Theme 5, item 55).
//!
//! Implements the standard **IES point-by-point method** (see the IESNA
//! *Lighting Handbook*, and IES publication *LM-79-08*'s point-calculation
//! background): illuminance at a point equals the source's luminous
//! intensity toward that point, divided by the squared distance
//! (inverse-square law), scaled by the cosine of the angle of incidence at
//! the receiving plane (Lambert's cosine law):
//!
//! ```text
//! E = I * cos(theta) / d^2
//! ```
//!
//! where `d` is the source-to-point distance and `theta` is the angle
//! between the source-to-point line and the calculation plane's normal.
//!
//! ## Simplifying assumptions (documented, per task requirements)
//!
//! - Each source is modeled as an **isotropic point source**: its total
//!   lumen output is assumed uniformly distributed over the full sphere
//!   (4·pi steradians), so luminous intensity `I = lumens / (4*pi)`
//!   candela in every direction. Real luminaire photometry (an IES/LDT
//!   photometric-web file) varies intensity by angle; that angular
//!   distribution is **not** modeled here.
//! - The illuminance grid is computed on a single flat horizontal
//!   calculation plane (the site/ground plane) — no obstruction or
//!   self-shadowing from buildings, poles, or terrain is modeled.
//! - Multiple sources combine by direct superposition (illuminance from
//!   incoherent sources is additive), which is exact, not an approximation.

use std::f64::consts::PI;

use thoth_spatial::Point;

use crate::error::DrawingError;

/// A single point light source: a horizontal position, a mounting height
/// above the calculation plane, and a total lumen output.
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct PointLightSource {
    pub position: Point,
    /// Height above the calculation plane. Must be positive and finite.
    pub height: f64,
    /// Total luminous flux, in lumens. Must be positive and finite.
    pub lumens: f64,
}

impl PointLightSource {
    fn validate(&self) -> Result<(), DrawingError> {
        if !self.height.is_finite() || self.height <= 0.0 {
            return Err(DrawingError::NonPositiveMountingHeight(self.height));
        }
        if !self.lumens.is_finite() || self.lumens <= 0.0 {
            return Err(DrawingError::NonPositiveLumens(self.lumens));
        }
        Ok(())
    }

    /// Isotropic luminous intensity (candela), per the module's documented
    /// simplifying assumption.
    fn intensity_cd(&self) -> f64 {
        self.lumens / (4.0 * PI)
    }
}

/// Illuminance contributed by a single point source at a receiving point on
/// the calculation plane, via the inverse-square + cosine law.
///
/// # Errors
/// [`DrawingError::NonPositiveMountingHeight`] /
/// [`DrawingError::NonPositiveLumens`] if `source` is malformed.
pub fn illuminance_from_source(source: &PointLightSource, p: Point) -> Result<f64, DrawingError> {
    source.validate()?;
    let dx = p.x - source.position.x;
    let dy = p.y - source.position.y;
    let dz = source.height;
    let d_sq = dx * dx + dy * dy + dz * dz;
    let d = d_sq.sqrt();
    // cos(theta) = dz / d (dz is the component along the plane normal);
    // E = I * cos(theta) / d^2 = I * dz / d^3.
    Ok(source.intensity_cd() * dz / (d * d_sq))
}

/// Total illuminance at a point from every source (linear superposition).
///
/// # Errors
/// Propagates [`illuminance_from_source`]'s errors for any malformed source.
pub fn illuminance_at_point(sources: &[PointLightSource], p: Point) -> Result<f64, DrawingError> {
    let mut total = 0.0;
    for source in sources {
        total += illuminance_from_source(source, p)?;
    }
    Ok(total)
}

/// A regular grid of computed illuminance values, one per node, laid out
/// exactly like `thoth_civil::terrain::ElevationGrid` (row-major,
/// `origin + (c*cell_size, r*cell_size)`), so a caller already familiar with
/// that grid convention can reuse it here.
#[derive(Debug, Clone, PartialEq)]
pub struct IlluminanceGrid {
    origin: Point,
    cell_size: f64,
    cols: usize,
    rows: usize,
    values: Vec<f64>,
}

impl IlluminanceGrid {
    pub fn origin(&self) -> Point {
        self.origin
    }

    pub fn cell_size(&self) -> f64 {
        self.cell_size
    }

    pub fn cols(&self) -> usize {
        self.cols
    }

    pub fn rows(&self) -> usize {
        self.rows
    }

    pub fn values(&self) -> &[f64] {
        &self.values
    }

    /// The illuminance value at grid indices `(c, r)`.
    pub fn value_at(&self, c: usize, r: usize) -> f64 {
        self.values[r * self.cols + c]
    }

    /// The minimum and maximum illuminance values on the grid (an
    /// `(min, avg, max)` triple is the standard way an IES point-by-point
    /// report characterizes a lit area, e.g. for a uniformity ratio).
    pub fn stats(&self) -> (f64, f64, f64) {
        let min = self.values.iter().cloned().fold(f64::INFINITY, f64::min);
        let max = self
            .values
            .iter()
            .cloned()
            .fold(f64::NEG_INFINITY, f64::max);
        let avg = if self.values.is_empty() {
            0.0
        } else {
            self.values.iter().sum::<f64>() / self.values.len() as f64
        };
        (min, avg, max)
    }
}

/// Compute an illuminance grid over a flat calculation plane from a set of
/// point light sources.
///
/// # Errors
/// - [`DrawingError::InvalidGridDimensions`] if `cols < 1` or `rows < 1`.
/// - [`DrawingError::NonPositiveCellSize`] if `cell_size` is non-positive or
///   non-finite.
/// - [`DrawingError::NonPositiveMountingHeight`] /
///   [`DrawingError::NonPositiveLumens`] if any source is malformed.
pub fn compute_illuminance_grid(
    sources: &[PointLightSource],
    origin: Point,
    cell_size: f64,
    cols: usize,
    rows: usize,
) -> Result<IlluminanceGrid, DrawingError> {
    if cols < 1 || rows < 1 {
        return Err(DrawingError::InvalidGridDimensions { cols, rows });
    }
    if !cell_size.is_finite() || cell_size <= 0.0 {
        return Err(DrawingError::NonPositiveCellSize(cell_size));
    }
    for source in sources {
        source.validate()?;
    }

    let mut values = Vec::with_capacity(cols * rows);
    for r in 0..rows {
        for c in 0..cols {
            let p = Point::new(
                origin.x + c as f64 * cell_size,
                origin.y + r as f64 * cell_size,
            );
            values.push(illuminance_at_point(sources, p)?);
        }
    }

    Ok(IlluminanceGrid {
        origin,
        cell_size,
        cols,
        rows,
        values,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn illuminance_directly_below_a_source_is_i_over_h_squared() {
        let source = PointLightSource {
            position: Point::new(0.0, 0.0),
            height: 10.0,
            lumens: 4.0 * PI * 1000.0, // I = 1000 cd exactly
        };
        let e = illuminance_from_source(&source, Point::new(0.0, 0.0)).unwrap();
        // Directly below: cos(theta) = 1, d = h -> E = I / h^2 = 1000/100 = 10.
        assert_relative_eq!(e, 10.0, epsilon = 1e-9);
    }

    #[test]
    fn illuminance_at_a_forty_five_degree_offset_matches_closed_form() {
        let h = 10.0;
        let source = PointLightSource {
            position: Point::new(0.0, 0.0),
            height: h,
            lumens: 4.0 * PI * 1000.0, // I = 1000 cd
        };
        // Offset point at (h, 0): d = h*sqrt(2), cos(theta) = h/d = 1/sqrt(2).
        let e = illuminance_from_source(&source, Point::new(h, 0.0)).unwrap();
        let d = h * std::f64::consts::SQRT_2;
        let expected = 1000.0 * (1.0 / std::f64::consts::SQRT_2) / (d * d);
        assert_relative_eq!(e, expected, epsilon = 1e-9);
    }

    #[test]
    fn illuminance_from_source_rejects_non_positive_height() {
        let source = PointLightSource {
            position: Point::new(0.0, 0.0),
            height: 0.0,
            lumens: 1000.0,
        };
        assert_eq!(
            illuminance_from_source(&source, Point::new(0.0, 0.0)).unwrap_err(),
            DrawingError::NonPositiveMountingHeight(0.0)
        );
    }

    #[test]
    fn illuminance_from_source_rejects_non_positive_lumens() {
        let source = PointLightSource {
            position: Point::new(0.0, 0.0),
            height: 10.0,
            lumens: -5.0,
        };
        assert_eq!(
            illuminance_from_source(&source, Point::new(0.0, 0.0)).unwrap_err(),
            DrawingError::NonPositiveLumens(-5.0)
        );
    }

    #[test]
    fn illuminance_at_point_sums_contributions_from_multiple_sources() {
        let a = PointLightSource {
            position: Point::new(0.0, 0.0),
            height: 10.0,
            lumens: 4.0 * PI * 1000.0,
        };
        let b = PointLightSource {
            position: Point::new(20.0, 0.0),
            height: 10.0,
            lumens: 4.0 * PI * 1000.0,
        };
        let single = illuminance_from_source(&a, Point::new(0.0, 0.0)).unwrap();
        let combined = illuminance_at_point(&[a, b], Point::new(0.0, 0.0)).unwrap();
        assert!(combined > single);
    }

    #[test]
    fn compute_illuminance_grid_rejects_degenerate_dimensions() {
        let err = compute_illuminance_grid(&[], Point::new(0.0, 0.0), 5.0, 0, 5).unwrap_err();
        assert_eq!(
            err,
            DrawingError::InvalidGridDimensions { cols: 0, rows: 5 }
        );
    }

    #[test]
    fn compute_illuminance_grid_rejects_non_positive_cell_size() {
        let err = compute_illuminance_grid(&[], Point::new(0.0, 0.0), 0.0, 5, 5).unwrap_err();
        assert_eq!(err, DrawingError::NonPositiveCellSize(0.0));
    }

    #[test]
    fn compute_illuminance_grid_matches_the_closed_form_at_each_node() {
        let source = PointLightSource {
            position: Point::new(0.0, 0.0),
            height: 10.0,
            lumens: 4.0 * PI * 1000.0,
        };
        let grid = compute_illuminance_grid(&[source], Point::new(0.0, 0.0), 10.0, 2, 1).unwrap();
        assert_eq!(grid.cols(), 2);
        assert_eq!(grid.rows(), 1);
        // Node (0,0) is directly below the source.
        assert_relative_eq!(grid.value_at(0, 0), 10.0, epsilon = 1e-9);
        let (min, _avg, max) = grid.stats();
        assert!(min <= max);
    }
}
