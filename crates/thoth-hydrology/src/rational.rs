//! Rational Method peak-flow calculation (`Q = C·i·A`).
//!
//! The oldest and still most widely used method for estimating peak runoff
//! from small (typically < 200 ac / 0.8 km²) catchments. Source: Kuichling
//! (1889); standard reference tables per ASCE/WEF Manual of Practice No.
//! FD-20, *Design and Construction of Urban Stormwater Management Systems*,
//! Table 3-1 (reproduced in FHWA HEC-22 and most state DOT drainage
//! manuals).
//!
//! # Assumptions and valid range
//! - Rainfall intensity `i` is uniform over the whole catchment and over a
//!   duration equal to the time of concentration (see
//!   [`crate::time_of_concentration`]).
//! - The runoff coefficient `C` is treated as constant for the storm (no
//!   antecedent-moisture adjustment).
//! - Best suited to catchments small enough that storage/attenuation within
//!   the catchment is negligible; TR-55/curve-number methods
//!   ([`crate::curve_number`]) are the better tool for larger or composite
//!   watersheds (item 3/4 in this crate).

use crate::error::{HydroResult, HydrologyError};

/// Land-cover categories with published typical Rational Method runoff
/// coefficients.
///
/// Values are the **midpoint of the published range** from ASCE/WEF MOP
/// FD-20 Table 3-1 (a table reproduced, with only cosmetic differences, in
/// essentially every North American drainage design manual). Use
/// [`LandCover::coefficient_range`] to see the full published range and pick
/// a value at either end if local practice or jurisdiction guidance calls
/// for a more/less conservative estimate.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum LandCover {
    /// Downtown / dense commercial business district.
    BusinessDowntown,
    /// Neighborhood-scale commercial.
    BusinessNeighborhood,
    /// Detached single-family residential.
    ResidentialSingleFamily,
    /// Detached multi-unit residential.
    ResidentialMultiUnitDetached,
    /// Attached (townhouse-style) multi-unit residential.
    ResidentialMultiUnitAttached,
    /// Large-lot suburban residential.
    ResidentialSuburban,
    /// Apartment / multi-family complexes.
    Apartment,
    /// Light industrial (warehousing, low building coverage).
    IndustrialLight,
    /// Heavy industrial (high building/pavement coverage).
    IndustrialHeavy,
    /// Parks and cemeteries.
    ParksAndCemeteries,
    /// Playgrounds.
    Playgrounds,
    /// Railroad yards.
    RailroadYard,
    /// Unimproved land (native vegetation, no grading).
    UnimprovedAreas,
    /// Lawn on sandy/well-drained soil (HSG A/B-like), flat (≤ 2%).
    LawnSandyFlat,
    /// Lawn on sandy/well-drained soil, average slope (2-7%).
    LawnSandyAverage,
    /// Lawn on sandy/well-drained soil, steep (> 7%).
    LawnSandySteep,
    /// Lawn on heavy/clayey soil (HSG C/D-like), flat (≤ 2%).
    LawnHeavyFlat,
    /// Lawn on heavy/clayey soil, average slope (2-7%).
    LawnHeavyAverage,
    /// Lawn on heavy/clayey soil, steep (> 7%).
    LawnHeavySteep,
    /// Asphalt streets/pavement.
    AsphaltPavement,
    /// Concrete streets/pavement.
    ConcretePavement,
    /// Brick streets/pavement.
    BrickPavement,
    /// Drives and walks.
    DrivesAndWalks,
    /// Roofs.
    Roofs,
    /// Gravel surfaces.
    Gravel,
}

impl LandCover {
    /// The published `(min, max)` Rational Method runoff-coefficient range
    /// for this land cover (ASCE/WEF MOP FD-20 Table 3-1).
    pub const fn coefficient_range(self) -> (f64, f64) {
        use LandCover::*;
        match self {
            BusinessDowntown => (0.70, 0.95),
            BusinessNeighborhood => (0.50, 0.70),
            ResidentialSingleFamily => (0.30, 0.50),
            ResidentialMultiUnitDetached => (0.40, 0.60),
            ResidentialMultiUnitAttached => (0.60, 0.75),
            ResidentialSuburban => (0.25, 0.40),
            Apartment => (0.50, 0.70),
            IndustrialLight => (0.50, 0.80),
            IndustrialHeavy => (0.60, 0.90),
            ParksAndCemeteries => (0.10, 0.25),
            Playgrounds => (0.20, 0.35),
            RailroadYard => (0.20, 0.40),
            UnimprovedAreas => (0.10, 0.30),
            LawnSandyFlat => (0.05, 0.10),
            LawnSandyAverage => (0.10, 0.15),
            LawnSandySteep => (0.15, 0.20),
            LawnHeavyFlat => (0.13, 0.17),
            LawnHeavyAverage => (0.18, 0.22),
            LawnHeavySteep => (0.25, 0.35),
            AsphaltPavement => (0.70, 0.95),
            ConcretePavement => (0.80, 0.95),
            BrickPavement => (0.70, 0.85),
            DrivesAndWalks => (0.75, 0.85),
            Roofs => (0.75, 0.95),
            Gravel => (0.40, 0.60),
        }
    }

    /// The typical (midpoint of the published range) runoff coefficient for
    /// this land cover.
    pub fn typical_coefficient(self) -> f64 {
        let (lo, hi) = self.coefficient_range();
        (lo + hi) / 2.0
    }
}

/// A drainage sub-area contributing to a composite Rational Method
/// coefficient: `area_acres` of land cover `cover` (or a directly supplied
/// coefficient via [`SubArea::with_coefficient`]).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SubArea {
    pub area_acres: f64,
    pub c: f64,
}

impl SubArea {
    /// A sub-area using the typical published coefficient for `cover`.
    pub fn new(area_acres: f64, cover: LandCover) -> Self {
        SubArea {
            area_acres,
            c: cover.typical_coefficient(),
        }
    }

    /// A sub-area with a caller-supplied coefficient (e.g. from local
    /// jurisdiction guidance, or a value picked from
    /// [`LandCover::coefficient_range`] other than the midpoint).
    pub fn with_coefficient(area_acres: f64, c: f64) -> Self {
        SubArea { area_acres, c }
    }
}

/// Area-weighted composite runoff coefficient for a catchment made of
/// several sub-areas with different land covers:
///
/// `C_composite = Σ(Cᵢ·Aᵢ) / Σ(Aᵢ)`
///
/// # Errors
/// - [`HydrologyError::NonPositiveArea`] if the total area is not positive,
///   or any sub-area has a non-positive area.
/// - [`HydrologyError::RunoffCoefficientOutOfRange`] if any sub-area's `C`
///   falls outside `[0, 1]`.
///
/// # Example
/// ```
/// use thoth_hydrology::rational::{composite_runoff_coefficient, SubArea};
///
/// // 10 ac of pavement (C=0.90) + 15 ac of single-family residential (C=0.40).
/// let c = composite_runoff_coefficient(&[
///     SubArea::with_coefficient(10.0, 0.90),
///     SubArea::with_coefficient(15.0, 0.40),
/// ])
/// .unwrap();
/// assert!((c - 0.6).abs() < 1e-9);
/// ```
pub fn composite_runoff_coefficient(sub_areas: &[SubArea]) -> HydroResult<f64> {
    let mut total_area = 0.0;
    let mut weighted = 0.0;
    for sa in sub_areas {
        if sa.area_acres <= 0.0 {
            return Err(HydrologyError::NonPositiveArea {
                area: sa.area_acres,
            });
        }
        if !(0.0..=1.0).contains(&sa.c) {
            return Err(HydrologyError::RunoffCoefficientOutOfRange { c: sa.c });
        }
        total_area += sa.area_acres;
        weighted += sa.c * sa.area_acres;
    }
    if total_area <= 0.0 {
        return Err(HydrologyError::NonPositiveArea { area: total_area });
    }
    Ok(weighted / total_area)
}

/// The Sherman/Steel-form Intensity-Duration-Frequency (IDF) curve fit:
///
/// `i = a / (t + b)^c`
///
/// with `i` in in/hr and `t` the storm duration in minutes. Real design work
/// fits `a`, `b`, `c` to a specific gauge's NOAA Atlas 14 (or equivalent
/// national/regional) precipitation-frequency data for the desired
/// return period; this type only evaluates a curve already fit elsewhere —
/// it does not embed any specific station's data.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ShermanIdf {
    pub a: f64,
    pub b: f64,
    pub c: f64,
}

impl ShermanIdf {
    /// Rainfall intensity (in/hr) for a storm of the given duration
    /// (minutes).
    ///
    /// # Errors
    /// [`HydrologyError::NonPositiveTimeOfConcentration`] if `duration_min`
    /// is not positive (an IDF curve is evaluated at the storm duration,
    /// conventionally taken as the time of concentration).
    pub fn intensity(&self, duration_min: f64) -> HydroResult<f64> {
        if duration_min <= 0.0 {
            return Err(HydrologyError::NonPositiveTimeOfConcentration {
                tc: duration_min / 60.0,
            });
        }
        Ok(self.a / (duration_min + self.b).powf(self.c))
    }
}

/// Rational Method peak flow: `Q = C·i·A`.
///
/// `c` is the dimensionless runoff coefficient, `intensity_in_per_hr` is the
/// design rainfall intensity (in/hr) for a storm duration equal to the
/// catchment's time of concentration, and `area_acres` is the drainage area
/// (acres). The result is in **cfs**, using the conventional Rational
/// Method unit shortcut that drops the `1.008` ac·in/hr-per-cfs conversion
/// factor (a < 1% error universally accepted in US customary practice — see
/// any US drainage manual's derivation of the Rational Formula).
///
/// # Errors
/// - [`HydrologyError::RunoffCoefficientOutOfRange`] if `c` is outside
///   `[0, 1]`.
/// - [`HydrologyError::NegativeIntensity`] if `intensity_in_per_hr < 0`.
/// - [`HydrologyError::NonPositiveArea`] if `area_acres <= 0`.
///
/// # Example
/// A textbook Rational Method check: `C = 0.65`, design intensity `i = 4.5`
/// in/hr, drainage area `A = 25` ac.
/// ```
/// use thoth_hydrology::rational::peak_flow;
///
/// let q = peak_flow(0.65, 4.5, 25.0).unwrap();
/// assert!((q - 73.125).abs() < 1e-9); // Q = 0.65 * 4.5 * 25 = 73.125 cfs
/// ```
pub fn peak_flow(c: f64, intensity_in_per_hr: f64, area_acres: f64) -> HydroResult<f64> {
    if !(0.0..=1.0).contains(&c) {
        return Err(HydrologyError::RunoffCoefficientOutOfRange { c });
    }
    if intensity_in_per_hr < 0.0 {
        return Err(HydrologyError::NegativeIntensity {
            intensity: intensity_in_per_hr,
        });
    }
    if area_acres <= 0.0 {
        return Err(HydrologyError::NonPositiveArea { area: area_acres });
    }
    Ok(c * intensity_in_per_hr * area_acres)
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn peak_flow_matches_hand_calculation() {
        let q = peak_flow(0.65, 4.5, 25.0).unwrap();
        assert_relative_eq!(q, 73.125, epsilon = 1e-9);
    }

    #[test]
    fn peak_flow_rejects_out_of_range_c() {
        assert!(matches!(
            peak_flow(1.5, 4.0, 10.0),
            Err(HydrologyError::RunoffCoefficientOutOfRange { .. })
        ));
        assert!(matches!(
            peak_flow(-0.1, 4.0, 10.0),
            Err(HydrologyError::RunoffCoefficientOutOfRange { .. })
        ));
    }

    #[test]
    fn peak_flow_rejects_non_positive_area() {
        assert!(matches!(
            peak_flow(0.5, 4.0, 0.0),
            Err(HydrologyError::NonPositiveArea { .. })
        ));
        assert!(matches!(
            peak_flow(0.5, 4.0, -1.0),
            Err(HydrologyError::NonPositiveArea { .. })
        ));
    }

    #[test]
    fn peak_flow_rejects_negative_intensity() {
        assert!(matches!(
            peak_flow(0.5, -1.0, 10.0),
            Err(HydrologyError::NegativeIntensity { .. })
        ));
    }

    #[test]
    fn composite_coefficient_is_area_weighted() {
        // 10 ac at C=0.9 + 15 ac at C=0.4 => (9 + 6) / 25 = 0.6
        let c = composite_runoff_coefficient(&[
            SubArea::with_coefficient(10.0, 0.9),
            SubArea::with_coefficient(15.0, 0.4),
        ])
        .unwrap();
        assert_relative_eq!(c, 0.6, epsilon = 1e-9);
    }

    #[test]
    fn composite_coefficient_rejects_bad_subarea() {
        assert!(matches!(
            composite_runoff_coefficient(&[SubArea::with_coefficient(-1.0, 0.5)]),
            Err(HydrologyError::NonPositiveArea { .. })
        ));
        assert!(matches!(
            composite_runoff_coefficient(&[SubArea::with_coefficient(1.0, 1.5)]),
            Err(HydrologyError::RunoffCoefficientOutOfRange { .. })
        ));
    }

    #[test]
    fn land_cover_typical_is_range_midpoint() {
        assert_relative_eq!(
            LandCover::AsphaltPavement.typical_coefficient(),
            0.825,
            epsilon = 1e-9
        );
        assert_relative_eq!(
            LandCover::ResidentialSingleFamily.typical_coefficient(),
            0.40,
            epsilon = 1e-9
        );
    }

    #[test]
    fn sherman_idf_matches_known_evaluation() {
        // i = 100 / (t + 10)^0.8 at t = 30 min.
        let idf = ShermanIdf {
            a: 100.0,
            b: 10.0,
            c: 0.8,
        };
        let expected = 100.0 / 40f64.powf(0.8);
        assert_relative_eq!(idf.intensity(30.0).unwrap(), expected, epsilon = 1e-9);
    }

    #[test]
    fn sherman_idf_rejects_non_positive_duration() {
        let idf = ShermanIdf {
            a: 100.0,
            b: 10.0,
            c: 0.8,
        };
        assert!(idf.intensity(0.0).is_err());
        assert!(idf.intensity(-5.0).is_err());
    }
}
