//! Time of concentration via NRCS TR-55's three-segment method (sheet flow,
//! shallow concentrated flow, channel/pipe flow).
//!
//! Source: USDA NRCS *Urban Hydrology for Small Watersheds*, TR-55 (2nd ed.,
//! June 1986), Chapter 3. Time of concentration `Tc` is the time for runoff
//! to travel from the hydraulically most distant point of a catchment to
//! the point of interest, computed as the sum of travel times through up to
//! three flow regimes that occur in sequence as flow moves downstream:
//! sheet flow, then shallow concentrated flow, then open-channel/pipe flow.
//!
//! # Assumptions and valid range
//! - Each segment type is valid only over the flow-length/slope ranges
//!   TR-55 was calibrated for; in particular sheet flow is capped at 100 ft
//!   (TR-55 Ch. 3, "Sheet flow" — beyond this, flow has physically
//!   concentrated into rills and the kinematic-wave sheet-flow equation no
//!   longer applies).
//! - `P2` (the 2-year, 24-hour rainfall depth) is a site climate input the
//!   caller must supply (from NOAA Atlas 14 or equivalent); it is not looked
//!   up here.

use crate::error::{HydroResult, HydrologyError};

/// Manning's roughness coefficient `n` for sheet flow, by surface cover
/// (TR-55 Table 3-1).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SheetFlowSurface {
    SmoothSurfaces,
    FallowNoResidue,
    CultivatedResidueLessThan20Percent,
    CultivatedResidueGreaterThan20Percent,
    ShortGrassPrairie,
    DenseGrass,
    Bermudagrass,
    WoodsLightUnderbrush,
    WoodsDenseUnderbrush,
}

impl SheetFlowSurface {
    /// Manning's `n` for sheet flow (TR-55 Table 3-1).
    pub const fn n(self) -> f64 {
        use SheetFlowSurface::*;
        match self {
            SmoothSurfaces => 0.011,
            FallowNoResidue => 0.05,
            CultivatedResidueLessThan20Percent => 0.06,
            CultivatedResidueGreaterThan20Percent => 0.17,
            ShortGrassPrairie => 0.15,
            DenseGrass => 0.24,
            Bermudagrass => 0.41,
            WoodsLightUnderbrush => 0.40,
            WoodsDenseUnderbrush => 0.80,
        }
    }
}

/// TR-55's maximum sheet-flow length (ft) before flow is assumed to have
/// concentrated into rills/gullies (TR-55 Ch. 3, "Sheet flow" note).
pub const MAX_SHEET_FLOW_LENGTH_FT: f64 = 100.0;

/// Sheet-flow travel time via TR-55's kinematic-wave form of Manning's
/// equation (TR-55 Ch. 3, Eq. 3-3):
///
/// `Tt = 0.007·(n·L)^0.8 / (P2^0.5 · s^0.4)`
///
/// where `Tt` is travel time (hours), `n` is Manning's roughness coefficient
/// for sheet flow, `length_ft` is the flow length (ft, ≤ 100 ft), `p2_in` is
/// the 2-year, 24-hour rainfall depth (in), and `slope` is the land-surface
/// slope (ft/ft).
///
/// # Errors
/// - [`HydrologyError::SheetFlowLengthExceeded`] if `length_ft` exceeds
///   [`MAX_SHEET_FLOW_LENGTH_FT`].
/// - [`HydrologyError::NonPositiveLength`] if `length_ft <= 0`.
/// - [`HydrologyError::NonPositiveSlope`] if `slope <= 0`.
/// - [`HydrologyError::NegativeRainfallDepth`] if `p2_in < 0`.
///
/// # Example
/// Dense grass (`n = 0.24`), 100 ft sheet-flow length, `P2 = 3.6` in,
/// 1% slope:
/// ```
/// use thoth_hydrology::time_of_concentration::{sheet_flow_time, SheetFlowSurface};
///
/// let tt = sheet_flow_time(SheetFlowSurface::DenseGrass.n(), 100.0, 3.6, 0.01).unwrap();
/// assert!((tt - 0.2958801178425795).abs() < 1e-9);
/// ```
pub fn sheet_flow_time(n: f64, length_ft: f64, p2_in: f64, slope: f64) -> HydroResult<f64> {
    if n <= 0.0 {
        return Err(HydrologyError::NonPositiveManningN { n });
    }
    if length_ft <= 0.0 {
        return Err(HydrologyError::NonPositiveLength { length: length_ft });
    }
    if length_ft > MAX_SHEET_FLOW_LENGTH_FT {
        return Err(HydrologyError::SheetFlowLengthExceeded {
            length: length_ft,
            max: MAX_SHEET_FLOW_LENGTH_FT,
        });
    }
    if slope <= 0.0 {
        return Err(HydrologyError::NonPositiveSlope { slope });
    }
    if p2_in < 0.0 {
        return Err(HydrologyError::NegativeRainfallDepth { depth: p2_in });
    }
    Ok(0.007 * (n * length_ft).powf(0.8) / (p2_in.sqrt() * slope.powf(0.4)))
}

/// Surface type for shallow concentrated flow, which sets the
/// velocity-vs-slope relationship (TR-55 Ch. 3, "Shallow concentrated
/// flow" / Figure 3-1, approximated by the NRCS regression equations below).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShallowFlowSurface {
    Unpaved,
    Paved,
}

impl ShallowFlowSurface {
    /// Average velocity (ft/s) for shallow concentrated flow at the given
    /// slope, per the NRCS regression fit to TR-55 Figure 3-1:
    /// `V = 16.1345·√s` (unpaved) or `V = 20.3282·√s` (paved), `s` in ft/ft.
    pub fn velocity(self, slope: f64) -> f64 {
        let k = match self {
            ShallowFlowSurface::Unpaved => 16.1345,
            ShallowFlowSurface::Paved => 20.3282,
        };
        k * slope.sqrt()
    }
}

/// Shallow-concentrated-flow travel time: `Tt = L / (3600·V)`, with `V` from
/// [`ShallowFlowSurface::velocity`].
///
/// # Errors
/// - [`HydrologyError::NonPositiveLength`] if `length_ft <= 0`.
/// - [`HydrologyError::NonPositiveSlope`] if `slope <= 0`.
///
/// # Example
/// Unpaved shallow concentrated flow, 500 ft at 1.5% slope:
/// ```
/// use thoth_hydrology::time_of_concentration::{shallow_concentrated_flow_time, ShallowFlowSurface};
///
/// let tt = shallow_concentrated_flow_time(ShallowFlowSurface::Unpaved, 500.0, 0.015).unwrap();
/// assert!((tt - 0.07028560098337638).abs() < 1e-9);
/// ```
pub fn shallow_concentrated_flow_time(
    surface: ShallowFlowSurface,
    length_ft: f64,
    slope: f64,
) -> HydroResult<f64> {
    if length_ft <= 0.0 {
        return Err(HydrologyError::NonPositiveLength { length: length_ft });
    }
    if slope <= 0.0 {
        return Err(HydrologyError::NonPositiveSlope { slope });
    }
    let v = surface.velocity(slope);
    Ok(length_ft / (3600.0 * v))
}

/// A channel/pipe cross section, used to compute the hydraulic radius for
/// Manning's-equation channel/pipe flow time.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ChannelCrossSection {
    /// A circular pipe flowing full; hydraulic radius `R = D/4`.
    CircularPipeFull { diameter_ft: f64 },
    /// A rectangular channel at the given flow depth.
    Rectangular { width_ft: f64, depth_ft: f64 },
    /// A trapezoidal channel: bottom width `b`, side slopes `z` (horizontal
    /// run per unit vertical rise), at the given flow depth.
    Trapezoidal {
        bottom_width_ft: f64,
        side_slope_h_per_v: f64,
        depth_ft: f64,
    },
}

impl ChannelCrossSection {
    /// Hydraulic radius `R = A / P` (ft) for this cross section.
    ///
    /// # Errors
    /// [`HydrologyError::NonPositiveDimension`] if any governing dimension
    /// (diameter, width, depth) is not positive.
    pub fn hydraulic_radius(&self) -> HydroResult<f64> {
        match *self {
            ChannelCrossSection::CircularPipeFull { diameter_ft } => {
                if diameter_ft <= 0.0 {
                    return Err(HydrologyError::NonPositiveDimension { value: diameter_ft });
                }
                Ok(diameter_ft / 4.0)
            }
            ChannelCrossSection::Rectangular { width_ft, depth_ft } => {
                if width_ft <= 0.0 {
                    return Err(HydrologyError::NonPositiveDimension { value: width_ft });
                }
                if depth_ft <= 0.0 {
                    return Err(HydrologyError::NonPositiveDimension { value: depth_ft });
                }
                let area = width_ft * depth_ft;
                let wetted_perimeter = width_ft + 2.0 * depth_ft;
                Ok(area / wetted_perimeter)
            }
            ChannelCrossSection::Trapezoidal {
                bottom_width_ft,
                side_slope_h_per_v,
                depth_ft,
            } => {
                if bottom_width_ft <= 0.0 {
                    return Err(HydrologyError::NonPositiveDimension {
                        value: bottom_width_ft,
                    });
                }
                if depth_ft <= 0.0 {
                    return Err(HydrologyError::NonPositiveDimension { value: depth_ft });
                }
                if side_slope_h_per_v < 0.0 {
                    return Err(HydrologyError::NonPositiveDimension {
                        value: side_slope_h_per_v,
                    });
                }
                let area = (bottom_width_ft + side_slope_h_per_v * depth_ft) * depth_ft;
                let wetted_perimeter =
                    bottom_width_ft + 2.0 * depth_ft * (1.0 + side_slope_h_per_v.powi(2)).sqrt();
                Ok(area / wetted_perimeter)
            }
        }
    }
}

/// Channel/pipe flow velocity via Manning's equation (US customary form):
///
/// `V = (1.49/n)·R^(2/3)·S^(1/2)`
///
/// # Errors
/// - [`HydrologyError::NonPositiveManningN`] if `n <= 0`.
/// - [`HydrologyError::NonPositiveSlope`] if `slope <= 0`.
/// - Propagates [`ChannelCrossSection::hydraulic_radius`]'s errors.
pub fn manning_velocity(
    n: f64,
    cross_section: ChannelCrossSection,
    slope: f64,
) -> HydroResult<f64> {
    if n <= 0.0 {
        return Err(HydrologyError::NonPositiveManningN { n });
    }
    if slope <= 0.0 {
        return Err(HydrologyError::NonPositiveSlope { slope });
    }
    let r = cross_section.hydraulic_radius()?;
    Ok((1.49 / n) * r.powf(2.0 / 3.0) * slope.sqrt())
}

/// Channel/pipe-flow travel time: `Tt = L / (3600·V)`, `V` from
/// [`manning_velocity`].
///
/// # Errors
/// - [`HydrologyError::NonPositiveLength`] if `length_ft <= 0`.
/// - Propagates [`manning_velocity`]'s errors.
///
/// # Example
/// A 1.5-ft-diameter pipe flowing full, `n = 0.013`, 800 ft long at 0.5%
/// slope:
/// ```
/// use thoth_hydrology::time_of_concentration::{channel_flow_time, ChannelCrossSection};
///
/// let tt = channel_flow_time(
///     0.013,
///     ChannelCrossSection::CircularPipeFull { diameter_ft: 1.5 },
///     800.0,
///     0.005,
/// )
/// .unwrap();
/// assert!((tt - 0.052727687267256435).abs() < 1e-9);
/// ```
pub fn channel_flow_time(
    n: f64,
    cross_section: ChannelCrossSection,
    length_ft: f64,
    slope: f64,
) -> HydroResult<f64> {
    if length_ft <= 0.0 {
        return Err(HydrologyError::NonPositiveLength { length: length_ft });
    }
    let v = manning_velocity(n, cross_section, slope)?;
    Ok(length_ft / (3600.0 * v))
}

/// One segment of a TR-55 three-segment time-of-concentration path.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum FlowSegment {
    SheetFlow {
        n: f64,
        length_ft: f64,
        p2_in: f64,
        slope: f64,
    },
    ShallowConcentrated {
        surface: ShallowFlowSurface,
        length_ft: f64,
        slope: f64,
    },
    Channel {
        n: f64,
        cross_section: ChannelCrossSection,
        length_ft: f64,
        slope: f64,
    },
}

impl FlowSegment {
    /// This segment's travel time in hours.
    fn travel_time(&self) -> HydroResult<f64> {
        match *self {
            FlowSegment::SheetFlow {
                n,
                length_ft,
                p2_in,
                slope,
            } => sheet_flow_time(n, length_ft, p2_in, slope),
            FlowSegment::ShallowConcentrated {
                surface,
                length_ft,
                slope,
            } => shallow_concentrated_flow_time(surface, length_ft, slope),
            FlowSegment::Channel {
                n,
                cross_section,
                length_ft,
                slope,
            } => channel_flow_time(n, cross_section, length_ft, slope),
        }
    }
}

/// Total time of concentration (hours): the sum of travel times through each
/// segment of the flow path, in the order supplied (TR-55 Ch. 3 — sheet flow
/// segments should precede shallow-concentrated segments, which should
/// precede channel/pipe segments, but this function does not enforce
/// ordering; it only sums whatever segments are given).
///
/// # Errors
/// - [`HydrologyError::NonPositiveLength`] if `segments` is empty (there is
///   no path to sum).
/// - Propagates any individual segment's computation error.
///
/// # Example
/// Sheet flow (dense grass, 100 ft, `P2=3.6in`, 1%) + shallow concentrated
/// unpaved flow (500 ft, 1.5%) + pipe flow (1.5 ft dia., `n=0.013`, 800 ft,
/// 0.5%):
/// ```
/// use thoth_hydrology::time_of_concentration::{
///     time_of_concentration, ChannelCrossSection, FlowSegment, ShallowFlowSurface,
///     SheetFlowSurface,
/// };
///
/// let tc = time_of_concentration(&[
///     FlowSegment::SheetFlow {
///         n: SheetFlowSurface::DenseGrass.n(),
///         length_ft: 100.0,
///         p2_in: 3.6,
///         slope: 0.01,
///     },
///     FlowSegment::ShallowConcentrated {
///         surface: ShallowFlowSurface::Unpaved,
///         length_ft: 500.0,
///         slope: 0.015,
///     },
///     FlowSegment::Channel {
///         n: 0.013,
///         cross_section: ChannelCrossSection::CircularPipeFull { diameter_ft: 1.5 },
///         length_ft: 800.0,
///         slope: 0.005,
///     },
/// ])
/// .unwrap();
/// assert!((tc - 0.41889340609321235).abs() < 1e-9);
/// ```
pub fn time_of_concentration(segments: &[FlowSegment]) -> HydroResult<f64> {
    if segments.is_empty() {
        return Err(HydrologyError::NonPositiveLength { length: 0.0 });
    }
    let mut total = 0.0;
    for seg in segments {
        total += seg.travel_time()?;
    }
    Ok(total)
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn sheet_flow_time_matches_hand_calculation() {
        let tt = sheet_flow_time(0.24, 100.0, 3.6, 0.01).unwrap();
        assert_relative_eq!(tt, 0.2958801178425795, epsilon = 1e-9);
    }

    #[test]
    fn sheet_flow_time_rejects_excessive_length() {
        assert!(matches!(
            sheet_flow_time(0.24, 150.0, 3.6, 0.01),
            Err(HydrologyError::SheetFlowLengthExceeded { .. })
        ));
    }

    #[test]
    fn sheet_flow_time_rejects_zero_slope() {
        assert!(matches!(
            sheet_flow_time(0.24, 100.0, 3.6, 0.0),
            Err(HydrologyError::NonPositiveSlope { .. })
        ));
    }

    #[test]
    fn shallow_concentrated_paved_is_faster_than_unpaved() {
        let unpaved =
            shallow_concentrated_flow_time(ShallowFlowSurface::Unpaved, 500.0, 0.015).unwrap();
        let paved =
            shallow_concentrated_flow_time(ShallowFlowSurface::Paved, 500.0, 0.015).unwrap();
        assert!(paved < unpaved);
        assert_relative_eq!(unpaved, 0.07028560098337638, epsilon = 1e-9);
        assert_relative_eq!(paved, 0.05578570798527593, epsilon = 1e-9);
    }

    #[test]
    fn circular_pipe_full_hydraulic_radius_is_quarter_diameter() {
        let cs = ChannelCrossSection::CircularPipeFull { diameter_ft: 2.0 };
        assert_relative_eq!(cs.hydraulic_radius().unwrap(), 0.5, epsilon = 1e-12);
    }

    #[test]
    fn channel_flow_time_matches_hand_calculation() {
        let tt = channel_flow_time(
            0.013,
            ChannelCrossSection::CircularPipeFull { diameter_ft: 1.5 },
            800.0,
            0.005,
        )
        .unwrap();
        assert_relative_eq!(tt, 0.052727687267256435, epsilon = 1e-9);
    }

    #[test]
    fn total_tc_sums_all_three_segments() {
        let tc = time_of_concentration(&[
            FlowSegment::SheetFlow {
                n: SheetFlowSurface::DenseGrass.n(),
                length_ft: 100.0,
                p2_in: 3.6,
                slope: 0.01,
            },
            FlowSegment::ShallowConcentrated {
                surface: ShallowFlowSurface::Unpaved,
                length_ft: 500.0,
                slope: 0.015,
            },
            FlowSegment::Channel {
                n: 0.013,
                cross_section: ChannelCrossSection::CircularPipeFull { diameter_ft: 1.5 },
                length_ft: 800.0,
                slope: 0.005,
            },
        ])
        .unwrap();
        assert_relative_eq!(tc, 0.41889340609321235, epsilon = 1e-9);
    }

    #[test]
    fn empty_segments_is_an_error() {
        assert!(time_of_concentration(&[]).is_err());
    }

    #[test]
    fn trapezoidal_hydraulic_radius_matches_hand_calculation() {
        // b=4ft, z=2 (2H:1V), y=1ft => A = (4 + 2*1)*1 = 6, P = 4 + 2*1*sqrt(5)
        let cs = ChannelCrossSection::Trapezoidal {
            bottom_width_ft: 4.0,
            side_slope_h_per_v: 2.0,
            depth_ft: 1.0,
        };
        let expected = 6.0 / (4.0 + 2.0 * 5f64.sqrt());
        assert_relative_eq!(cs.hydraulic_radius().unwrap(), expected, epsilon = 1e-12);
    }
}
