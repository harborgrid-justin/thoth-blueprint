//! Detention/retention pond routing by the storage-indication (Puls) method.
//!
//! Source: the Puls method (also called the "storage-indication method"),
//! e.g. Chow, Maidment & Mays, *Applied Hydrology* (1988) Ch. 8-9, or any
//! standard hydrology text's treatment of level-pool reservoir routing.
//! Given a stage-storage-discharge curve describing a pond (or any
//! detention structure with a single, non-time-varying outlet rating) and
//! an inflow hydrograph, the method finds the outflow hydrograph by
//! combining continuity (`dS/dt = I - O`) with the storage-indication
//! identity, avoiding an explicit ODE solve:
//!
//! `(I₁ + I₂) + (2S₁/Δt - O₁) = (2S₂/Δt + O₂)`
//!
//! The left side is known from the inflow hydrograph and the previous time
//! step's state; the right side, `2S/Δt + O`, is a single-valued,
//! monotonically increasing function of stage (given the assumptions
//! below), so each time step reduces to one table lookup/interpolation
//! instead of an iterative solve.
//!
//! # Assumptions and valid range
//! - **Level pool**: storage is a single-valued function of stage (no
//!   backwater/wedge storage) and outflow depends only on stage (no
//!   tailwater effects) — the standard Puls-method assumption.
//! - The stage-storage-discharge curve must have storage **strictly**
//!   increasing and discharge **non-decreasing** with stage (discharge may
//!   be flat below an outlet's invert) so the storage-indication value is
//!   invertible; a curve that fails this is rejected rather than routed
//!   against silently.
//! - A constant routing time step `Δt` equal to the inflow hydrograph's
//!   ordinate spacing.

use crate::error::{HydroResult, HydrologyError};

/// Cubic feet per acre-foot.
const CF_PER_ACRE_FOOT: f64 = 43_560.0;

/// A pond's stage-storage-discharge relationship: parallel arrays of stage
/// (ft), storage (acre-feet), and total outlet discharge (cfs) at that
/// stage, ascending by stage.
#[derive(Debug, Clone, PartialEq)]
pub struct StageStorageDischarge {
    pub stage_ft: Vec<f64>,
    pub storage_acft: Vec<f64>,
    pub discharge_cfs: Vec<f64>,
}

impl StageStorageDischarge {
    /// Build a validated stage-storage-discharge curve.
    ///
    /// # Errors
    /// - [`HydrologyError::ShapeMismatch`] if the three arrays differ in
    ///   length.
    /// - [`HydrologyError::InsufficientRoutingPoints`] if fewer than 2
    ///   points are given.
    /// - [`HydrologyError::NonMonotonicStorageCurve`] if `stage_ft` or
    ///   `storage_acft` is not strictly increasing, or `discharge_cfs`
    ///   decreases anywhere.
    pub fn new(
        stage_ft: Vec<f64>,
        storage_acft: Vec<f64>,
        discharge_cfs: Vec<f64>,
    ) -> HydroResult<Self> {
        let curve = StageStorageDischarge {
            stage_ft,
            storage_acft,
            discharge_cfs,
        };
        curve.validate()?;
        Ok(curve)
    }

    fn validate(&self) -> HydroResult<()> {
        if self.stage_ft.len() != self.storage_acft.len()
            || self.stage_ft.len() != self.discharge_cfs.len()
        {
            return Err(HydrologyError::ShapeMismatch {
                reason: format!(
                    "stage ({}), storage ({}), and discharge ({}) arrays must be the same length",
                    self.stage_ft.len(),
                    self.storage_acft.len(),
                    self.discharge_cfs.len()
                ),
            });
        }
        if self.stage_ft.len() < 2 {
            return Err(HydrologyError::InsufficientRoutingPoints {
                count: self.stage_ft.len(),
            });
        }
        for i in 0..self.stage_ft.len() - 1 {
            if self.stage_ft[i + 1] <= self.stage_ft[i] {
                return Err(HydrologyError::NonMonotonicStorageCurve {
                    index: i,
                    index_next: i + 1,
                });
            }
            if self.storage_acft[i + 1] <= self.storage_acft[i] {
                return Err(HydrologyError::NonMonotonicStorageCurve {
                    index: i,
                    index_next: i + 1,
                });
            }
            if self.discharge_cfs[i + 1] < self.discharge_cfs[i] {
                return Err(HydrologyError::NonMonotonicStorageCurve {
                    index: i,
                    index_next: i + 1,
                });
            }
        }
        Ok(())
    }

    /// Interpolate `(storage_acft, discharge_cfs)` at a given stage.
    ///
    /// # Errors
    /// [`HydrologyError::ShapeMismatch`] if `stage_ft` is outside the
    /// curve's covered range.
    pub fn at_stage(&self, stage_ft: f64) -> HydroResult<(f64, f64)> {
        let n = self.stage_ft.len();
        if stage_ft < self.stage_ft[0] || stage_ft > self.stage_ft[n - 1] {
            return Err(HydrologyError::ShapeMismatch {
                reason: format!(
                    "stage {} ft is outside the curve's range [{}, {}]",
                    stage_ft,
                    self.stage_ft[0],
                    self.stage_ft[n - 1]
                ),
            });
        }
        let mut i = 0;
        while i + 1 < n - 1 && self.stage_ft[i + 1] < stage_ft {
            i += 1;
        }
        let (s0, s1) = (self.stage_ft[i], self.stage_ft[i + 1]);
        let frac = if s1 > s0 {
            (stage_ft - s0) / (s1 - s0)
        } else {
            0.0
        };
        let storage =
            self.storage_acft[i] + (self.storage_acft[i + 1] - self.storage_acft[i]) * frac;
        let discharge =
            self.discharge_cfs[i] + (self.discharge_cfs[i + 1] - self.discharge_cfs[i]) * frac;
        Ok((storage, discharge))
    }

    /// The storage-indication value `2S/Δt + O` (cfs) at each tabulated
    /// stage, for a routing time step `dt_seconds`.
    fn indication_values(&self, dt_seconds: f64) -> Vec<f64> {
        self.stage_ft
            .iter()
            .enumerate()
            .map(|(i, _)| {
                2.0 * self.storage_acft[i] * CF_PER_ACRE_FOOT / dt_seconds + self.discharge_cfs[i]
            })
            .collect()
    }

    /// Invert the storage-indication curve: given a target `2S/Δt + O`
    /// value, find the corresponding `(stage_ft, storage_acft, discharge_cfs)`.
    ///
    /// # Errors
    /// - [`HydrologyError::RoutingExceedsCurveRange`] if `target` exceeds
    ///   the maximum indication value the curve covers.
    fn invert_indication(&self, indication: &[f64], target: f64) -> HydroResult<(f64, f64, f64)> {
        let n = indication.len();
        let max = indication[n - 1];
        if target > max {
            return Err(HydrologyError::RoutingExceedsCurveRange { value: target, max });
        }
        if target <= indication[0] {
            return Ok((
                self.stage_ft[0],
                self.storage_acft[0],
                self.discharge_cfs[0],
            ));
        }
        let mut i = 0;
        while i + 1 < n - 1 && indication[i + 1] < target {
            i += 1;
        }
        let (v0, v1) = (indication[i], indication[i + 1]);
        let frac = if v1 > v0 {
            (target - v0) / (v1 - v0)
        } else {
            0.0
        };
        let stage = self.stage_ft[i] + (self.stage_ft[i + 1] - self.stage_ft[i]) * frac;
        let storage =
            self.storage_acft[i] + (self.storage_acft[i + 1] - self.storage_acft[i]) * frac;
        let discharge =
            self.discharge_cfs[i] + (self.discharge_cfs[i + 1] - self.discharge_cfs[i]) * frac;
        Ok((stage, storage, discharge))
    }
}

/// The result of routing an inflow hydrograph through a pond via
/// [`route_reservoir`]. All arrays are the same length as the input inflow
/// hydrograph.
#[derive(Debug, Clone, PartialEq)]
pub struct PulsRoutingResult {
    pub time_hours: Vec<f64>,
    pub inflow_cfs: Vec<f64>,
    pub outflow_cfs: Vec<f64>,
    pub stage_ft: Vec<f64>,
    pub storage_acft: Vec<f64>,
}

impl PulsRoutingResult {
    /// The peak outflow (cfs) and the time (hours) it occurs at.
    pub fn peak_outflow(&self) -> (f64, f64) {
        let mut best_i = 0;
        let mut best_q = f64::NEG_INFINITY;
        for (i, &q) in self.outflow_cfs.iter().enumerate() {
            if q > best_q {
                best_q = q;
                best_i = i;
            }
        }
        (best_q, self.time_hours[best_i])
    }

    /// The peak stage (ft) reached during routing.
    pub fn peak_stage(&self) -> f64 {
        self.stage_ft
            .iter()
            .cloned()
            .fold(f64::NEG_INFINITY, f64::max)
    }
}

/// Route an inflow hydrograph through a pond via the Puls (storage-indication)
/// method.
///
/// `inflow_cfs` is a series of inflow ordinates spaced `dt_hours` apart,
/// starting at `t = 0`; `initial_stage_ft` is the pond's starting water
/// surface elevation-above-datum (stage), which must fall within `curve`'s
/// tabulated range.
///
/// # Errors
/// - [`HydrologyError::HydrographTooShort`] if `inflow_cfs` has fewer than
///   2 ordinates.
/// - [`HydrologyError::NonPositiveTimeStep`] if `dt_hours <= 0`.
/// - [`HydrologyError::ShapeMismatch`] if `initial_stage_ft` is outside
///   `curve`'s range.
/// - [`HydrologyError::RoutingExceedsCurveRange`] if the routed storage
///   indication ever exceeds what `curve` covers (the pond would overtop
///   the surface `curve` describes).
///
/// # Example
/// A small pond (`stage` 0-6 ft, `storage` per a quadratic stage-storage
/// relationship, an outlet rated `Q = 10·(stage - 1)^1.5` above a 1-ft
/// invert) routing a triangular 150 cfs peak inflow hydrograph starting at
/// 1 ft of stage (2 ac-ft stored, no outflow yet):
/// ```
/// use thoth_hydrology::pond_routing::{route_reservoir, StageStorageDischarge};
///
/// let curve = StageStorageDischarge::new(
///     vec![0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
///     vec![0.0, 2.0, 8.0, 18.0, 32.0, 50.0, 72.0],
///     vec![
///         0.0,
///         0.0,
///         10.0 * 1f64.powf(1.5),
///         10.0 * 2f64.powf(1.5),
///         10.0 * 3f64.powf(1.5),
///         10.0 * 4f64.powf(1.5),
///         10.0 * 5f64.powf(1.5),
///     ],
/// )
/// .unwrap();
///
/// let inflow = vec![0.0, 50.0, 100.0, 150.0, 100.0, 50.0, 0.0];
/// let result = route_reservoir(&curve, &inflow, 1.0, 1.0).unwrap();
/// let (peak_out, peak_t) = result.peak_outflow();
/// assert!((peak_out - 45.504164525095916).abs() < 1e-6);
/// assert!((peak_t - 5.0).abs() < 1e-9);
/// // Attenuation: peak outflow is well below peak inflow of 150 cfs.
/// assert!(peak_out < 150.0);
/// ```
pub fn route_reservoir(
    curve: &StageStorageDischarge,
    inflow_cfs: &[f64],
    dt_hours: f64,
    initial_stage_ft: f64,
) -> HydroResult<PulsRoutingResult> {
    curve.validate()?;
    if inflow_cfs.len() < 2 {
        return Err(HydrologyError::HydrographTooShort {
            got: inflow_cfs.len(),
        });
    }
    if dt_hours <= 0.0 {
        return Err(HydrologyError::NonPositiveTimeStep { dt: dt_hours });
    }

    let dt_seconds = dt_hours * 3600.0;
    let indication = curve.indication_values(dt_seconds);

    let (mut storage_acft, mut discharge_cfs) = curve.at_stage(initial_stage_ft)?;
    let mut stage_ft = initial_stage_ft;

    let n = inflow_cfs.len();
    let mut time_hours = Vec::with_capacity(n);
    let mut stages = Vec::with_capacity(n);
    let mut storages = Vec::with_capacity(n);
    let mut outflows = Vec::with_capacity(n);

    time_hours.push(0.0);
    stages.push(stage_ft);
    storages.push(storage_acft);
    outflows.push(discharge_cfs);

    for i in 1..n {
        let rhs = inflow_cfs[i - 1]
            + inflow_cfs[i]
            + (2.0 * storage_acft * CF_PER_ACRE_FOOT / dt_seconds - discharge_cfs);
        let (next_stage, next_storage, next_discharge) =
            curve.invert_indication(&indication, rhs)?;
        stage_ft = next_stage;
        storage_acft = next_storage;
        discharge_cfs = next_discharge;

        time_hours.push(i as f64 * dt_hours);
        stages.push(stage_ft);
        storages.push(storage_acft);
        outflows.push(discharge_cfs);
    }

    Ok(PulsRoutingResult {
        time_hours,
        inflow_cfs: inflow_cfs.to_vec(),
        outflow_cfs: outflows,
        stage_ft: stages,
        storage_acft: storages,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn test_curve() -> StageStorageDischarge {
        StageStorageDischarge::new(
            vec![0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
            vec![0.0, 2.0, 8.0, 18.0, 32.0, 50.0, 72.0],
            vec![
                0.0,
                0.0,
                10.0 * 1f64.powf(1.5),
                10.0 * 2f64.powf(1.5),
                10.0 * 3f64.powf(1.5),
                10.0 * 4f64.powf(1.5),
                10.0 * 5f64.powf(1.5),
            ],
        )
        .unwrap()
    }

    #[test]
    fn route_reservoir_matches_reference_computation() {
        let curve = test_curve();
        let inflow = vec![0.0, 50.0, 100.0, 150.0, 100.0, 50.0, 0.0];
        let result = route_reservoir(&curve, &inflow, 1.0, 1.0).unwrap();

        let expected_outflow = [
            0.0,
            3.2216494845360835,
            12.694455267873298,
            28.459560492736177,
            41.071730719618245,
            45.504164525095916,
            42.82547345355747,
        ];
        for (got, want) in result.outflow_cfs.iter().zip(expected_outflow.iter()) {
            assert_relative_eq!(got, want, epsilon = 1e-6);
        }

        let expected_storage = [
            2.0,
            3.93298969072165,
            9.473646519134485,
            18.103645867869627,
            25.561030528516145,
            28.18186130352796,
            26.59799196556708,
        ];
        for (got, want) in result.storage_acft.iter().zip(expected_storage.iter()) {
            assert_relative_eq!(got, want, epsilon = 1e-6);
        }

        let (peak_out, peak_t) = result.peak_outflow();
        assert_relative_eq!(peak_out, 45.504164525095916, epsilon = 1e-6);
        assert_relative_eq!(peak_t, 5.0, epsilon = 1e-9);
    }

    #[test]
    fn attenuates_peak_flow_below_peak_inflow() {
        let curve = test_curve();
        let inflow = vec![0.0, 50.0, 100.0, 150.0, 100.0, 50.0, 0.0];
        let result = route_reservoir(&curve, &inflow, 1.0, 1.0).unwrap();
        let (peak_out, _) = result.peak_outflow();
        assert!(peak_out < 150.0);
    }

    #[test]
    fn rejects_non_monotonic_storage() {
        let bad = StageStorageDischarge::new(
            vec![0.0, 1.0, 2.0],
            vec![0.0, 5.0, 4.0], // decreases
            vec![0.0, 1.0, 2.0],
        );
        assert!(matches!(
            bad,
            Err(HydrologyError::NonMonotonicStorageCurve { .. })
        ));
    }

    #[test]
    fn rejects_decreasing_discharge() {
        let bad = StageStorageDischarge::new(
            vec![0.0, 1.0, 2.0],
            vec![0.0, 5.0, 10.0],
            vec![0.0, 5.0, 2.0], // decreases
        );
        assert!(matches!(
            bad,
            Err(HydrologyError::NonMonotonicStorageCurve { .. })
        ));
    }

    #[test]
    fn rejects_too_few_points() {
        let bad = StageStorageDischarge::new(vec![0.0], vec![0.0], vec![0.0]);
        assert!(matches!(
            bad,
            Err(HydrologyError::InsufficientRoutingPoints { .. })
        ));
    }

    #[test]
    fn rejects_mismatched_lengths() {
        let bad = StageStorageDischarge::new(vec![0.0, 1.0], vec![0.0, 1.0, 2.0], vec![0.0, 1.0]);
        assert!(matches!(bad, Err(HydrologyError::ShapeMismatch { .. })));
    }

    #[test]
    fn route_reservoir_rejects_short_inflow() {
        let curve = test_curve();
        assert!(matches!(
            route_reservoir(&curve, &[1.0], 1.0, 1.0),
            Err(HydrologyError::HydrographTooShort { .. })
        ));
    }

    #[test]
    fn route_reservoir_rejects_non_positive_timestep() {
        let curve = test_curve();
        assert!(matches!(
            route_reservoir(&curve, &[0.0, 1.0], 0.0, 1.0),
            Err(HydrologyError::NonPositiveTimeStep { .. })
        ));
    }

    #[test]
    fn route_reservoir_rejects_out_of_range_initial_stage() {
        let curve = test_curve();
        assert!(matches!(
            route_reservoir(&curve, &[0.0, 1.0], 1.0, 100.0),
            Err(HydrologyError::ShapeMismatch { .. })
        ));
    }

    #[test]
    fn route_reservoir_flags_overtopping_curve_range() {
        let curve = test_curve();
        // A huge inflow spike will drive the storage indication beyond the
        // curve's maximum tabulated value (stage 6 ft).
        let inflow = vec![0.0, 100_000.0, 100_000.0];
        assert!(matches!(
            route_reservoir(&curve, &inflow, 1.0, 1.0),
            Err(HydrologyError::RoutingExceedsCurveRange { .. })
        ));
    }
}
