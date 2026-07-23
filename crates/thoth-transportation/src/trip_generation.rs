//! ITE trip-generation estimate (item 20): standard ITE Trip Generation
//! Manual average-rate-method lookup by land-use category and unit count,
//! producing daily and AM/PM peak-hour trip estimates.
//!
//! **Simplifying assumption**: the ITE *Trip Generation Manual* (10th/11th
//! Ed.) publishes both a straight average rate and, for many land uses at
//! larger sizes, a fitted log-log regression equation (`Ln(T) = a·Ln(X) + b`)
//! that a full ITE-licensed workflow would use instead. This module
//! implements only the **average-rate method** (`T = rate × units`), which
//! ITE itself endorses for small-to-mid-size developments and planning-level
//! estimates. The rates below are representative published average rates
//! (10th Edition orders of magnitude, widely reproduced in state/municipal
//! traffic impact study guidelines) for a representative subset of land-use
//! codes — not the full ITE code list, and not a substitute for a licensed
//! ITE Trip Generation Manual/database for a final traffic impact study.

use crate::error::{TransportationError, TransportationResult};

/// A representative subset of ITE land-use categories.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LandUseCategory {
    /// ITE LUC 210 — Single-Family Detached Housing (per dwelling unit).
    SingleFamilyDetached,
    /// ITE LUC 220 — Multifamily Housing, Low-Rise (per dwelling unit).
    MultifamilyLowRise,
    /// ITE LUC 710 — General Office Building (per 1,000 sq ft GFA).
    GeneralOffice,
    /// ITE LUC 820 — Shopping Center (per 1,000 sq ft GLA).
    ShoppingCenter,
    /// ITE LUC 850 — Supermarket (per 1,000 sq ft GFA).
    Supermarket,
    /// ITE LUC 934 — Fast-Food Restaurant without Drive-Through Window (per
    /// 1,000 sq ft GFA).
    FastFoodRestaurant,
    /// ITE LUC 110 — Light Industrial (per 1,000 sq ft GFA).
    LightIndustrial,
}

/// One land use's published ITE average trip rates: daily two-way trips,
/// and AM/PM peak-hour-of-adjacent-street-traffic rates split by
/// entering/exiting percentage.
struct ItePlanningRate {
    unit: &'static str,
    daily_rate: f64,
    am_rate: f64,
    am_in_pct: f64,
    pm_rate: f64,
    pm_in_pct: f64,
}

fn rate_for(category: LandUseCategory) -> ItePlanningRate {
    match category {
        LandUseCategory::SingleFamilyDetached => ItePlanningRate {
            unit: "dwelling unit",
            daily_rate: 9.43,
            am_rate: 0.70,
            am_in_pct: 0.25,
            pm_rate: 0.94,
            pm_in_pct: 0.63,
        },
        LandUseCategory::MultifamilyLowRise => ItePlanningRate {
            unit: "dwelling unit",
            daily_rate: 7.32,
            am_rate: 0.46,
            am_in_pct: 0.24,
            pm_rate: 0.56,
            pm_in_pct: 0.63,
        },
        LandUseCategory::GeneralOffice => ItePlanningRate {
            unit: "1,000 sq ft GFA",
            daily_rate: 9.74,
            am_rate: 1.16,
            am_in_pct: 0.86,
            pm_rate: 1.15,
            pm_in_pct: 0.17,
        },
        LandUseCategory::ShoppingCenter => ItePlanningRate {
            unit: "1,000 sq ft GLA",
            daily_rate: 37.01,
            am_rate: 0.94,
            am_in_pct: 0.61,
            pm_rate: 3.40,
            pm_in_pct: 0.49,
        },
        LandUseCategory::Supermarket => ItePlanningRate {
            unit: "1,000 sq ft GFA",
            daily_rate: 93.84,
            am_rate: 3.24,
            am_in_pct: 0.62,
            pm_rate: 8.94,
            pm_in_pct: 0.51,
        },
        LandUseCategory::FastFoodRestaurant => ItePlanningRate {
            unit: "1,000 sq ft GFA",
            daily_rate: 313.11,
            am_rate: 22.88,
            am_in_pct: 0.53,
            pm_rate: 19.68,
            pm_in_pct: 0.52,
        },
        LandUseCategory::LightIndustrial => ItePlanningRate {
            unit: "1,000 sq ft GFA",
            daily_rate: 4.87,
            am_rate: 0.61,
            am_in_pct: 0.80,
            pm_rate: 0.61,
            pm_in_pct: 0.24,
        },
    }
}

/// Entering/exiting/total trips for one peak hour.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PeakHourTrips {
    pub entering: f64,
    pub exiting: f64,
    pub total: f64,
}

/// A full trip-generation estimate for a land use at a given size.
#[derive(Debug, Clone, PartialEq)]
pub struct TripGenerationEstimate {
    pub category: LandUseCategory,
    pub unit_description: &'static str,
    pub units: f64,
    pub daily_trips: f64,
    pub am_peak: PeakHourTrips,
    pub pm_peak: PeakHourTrips,
}

/// Estimates daily and AM/PM peak-hour trips for `units` of `category` (a
/// dwelling-unit count, or 1,000-sq-ft increments of floor area — see each
/// [`LandUseCategory`] variant's doc comment for its unit), via the ITE
/// average-rate method.
///
/// # Errors
/// [`TransportationError::NonPositiveValue`] if `units <= 0`.
pub fn estimate_trip_generation(
    category: LandUseCategory,
    units: f64,
) -> TransportationResult<TripGenerationEstimate> {
    if units <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "units",
            value: units,
        });
    }
    let rate = rate_for(category);
    let am_total = rate.am_rate * units;
    let pm_total = rate.pm_rate * units;
    Ok(TripGenerationEstimate {
        category,
        unit_description: rate.unit,
        units,
        daily_trips: rate.daily_rate * units,
        am_peak: PeakHourTrips {
            entering: am_total * rate.am_in_pct,
            exiting: am_total * (1.0 - rate.am_in_pct),
            total: am_total,
        },
        pm_peak: PeakHourTrips {
            entering: pm_total * rate.pm_in_pct,
            exiting: pm_total * (1.0 - rate.pm_in_pct),
            total: pm_total,
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn single_family_100_units_matches_hand_calc() {
        let est = estimate_trip_generation(LandUseCategory::SingleFamilyDetached, 100.0).unwrap();
        assert_relative_eq!(est.daily_trips, 943.0, epsilon = 1e-6);
        assert_relative_eq!(est.pm_peak.total, 94.0, epsilon = 1e-6);
        assert_relative_eq!(est.pm_peak.entering, 94.0 * 0.63, epsilon = 1e-6);
    }

    #[test]
    fn peak_hour_entering_and_exiting_sum_to_the_total() {
        for category in [
            LandUseCategory::SingleFamilyDetached,
            LandUseCategory::GeneralOffice,
            LandUseCategory::ShoppingCenter,
            LandUseCategory::Supermarket,
            LandUseCategory::FastFoodRestaurant,
            LandUseCategory::LightIndustrial,
            LandUseCategory::MultifamilyLowRise,
        ] {
            let est = estimate_trip_generation(category, 50.0).unwrap();
            assert_relative_eq!(
                est.am_peak.entering + est.am_peak.exiting,
                est.am_peak.total,
                epsilon = 1e-6
            );
            assert_relative_eq!(
                est.pm_peak.entering + est.pm_peak.exiting,
                est.pm_peak.total,
                epsilon = 1e-6
            );
        }
    }

    #[test]
    fn rejects_non_positive_units() {
        assert!(matches!(
            estimate_trip_generation(LandUseCategory::GeneralOffice, 0.0),
            Err(TransportationError::NonPositiveValue { .. })
        ));
    }

    #[test]
    fn office_am_peak_is_entering_dominant_pm_is_exiting_dominant() {
        // Standard commute pattern: office AM inbound-heavy, PM outbound-heavy.
        let est = estimate_trip_generation(LandUseCategory::GeneralOffice, 100.0).unwrap();
        assert!(est.am_peak.entering > est.am_peak.exiting);
        assert!(est.pm_peak.exiting > est.pm_peak.entering);
    }
}
