//! Simplified traffic-noise contour prediction (competitive gap-analysis
//! Theme 5, item 59).
//!
//! Predicts an approximate hourly-equivalent traffic noise level (`Leq`, in
//! dBA) at a distance from a roadway, and solves for the distance at which a
//! given threshold level is reached (a "noise contour"/buffer distance) —
//! an FHWA Traffic Noise Model (TNM)-style **reference-energy mean emission
//! level (REMEL)** approach, following the general structure of the
//! original FHWA highway traffic noise prediction model (Barry & Reagan,
//! FHWA-RD-77-108, 1978): each vehicle class contributes a reference noise
//! energy (calibrated at a reference distance and reference speed), scaled
//! by traffic volume, then combined across classes by energy (not
//! decibel-linear) summation, then attenuated with distance.
//!
//! ## What is simplified here, explicitly (per task requirements)
//!
//! This is **not** the FHWA TNM software: it omits everything TNM's full
//! model handles beyond the core REMEL/volume/distance relationship —
//! - **No ground-effect/atmospheric excess attenuation, barriers, or
//!   terrain shielding.** Distance attenuation uses the theoretical "hard
//!   site" cylindrical-spreading value for an infinite line source of
//!   traffic: 3 dB per doubling of distance (`10*log10(D0/D)`). TNM's
//!   default "soft site" attenuation (closer to 4.5 dB/doubling with ground
//!   absorption) is not modeled.
//! - **Per-class reference emission levels are representative
//!   approximations**, not TNM 2.5's calibrated regression tables. They are
//!   loosely based on published typical pass-by levels (e.g. FHWA/EPA
//!   highway-noise literature) at a 50 mph reference speed and 15 m (50 ft)
//!   reference distance, intended to be order-of-magnitude correct, not a
//!   substitute for a certified TNM run.
//! - **Speed correction is a single uniform `10*log10(speed/speed_ref)`
//!   term** applied to every vehicle class alike; TNM instead fits a
//!   separate speed-regression curve per class.
//! - **No pavement-type, grade, or acceleration/deceleration adjustments.**
//! - Traffic is assumed **free-flowing** (not signal-interrupted, stop-and-go,
//!   or queued).

use crate::error::DrawingError;

/// Reference distance (meters) at which reference emission levels below are
/// calibrated: 15 m (approximately 50 ft), the FHWA TNM's standard reference
/// distance.
pub const REFERENCE_DISTANCE_M: f64 = 15.0;

/// Reference speed (mph) at which the reference emission levels below are
/// calibrated.
pub const REFERENCE_SPEED_MPH: f64 = 50.0;

/// A representative vehicle classification for the simplified REMEL model.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum VehicleClass {
    Auto,
    MediumTruck,
    HeavyTruck,
}

/// Representative reference energy mean emission level (dBA) for one
/// vehicle at [`REFERENCE_SPEED_MPH`] and [`REFERENCE_DISTANCE_M`] — see the
/// module rustdoc's simplification note: these are order-of-magnitude
/// representative values, not the certified TNM 2.5 lookup table.
pub fn reference_emission_level_db(class: VehicleClass) -> f64 {
    match class {
        VehicleClass::Auto => 67.5,
        VehicleClass::MediumTruck => 77.0,
        VehicleClass::HeavyTruck => 83.5,
    }
}

/// One traffic stream contributing to the noise level: a vehicle class,
/// hourly volume, and average speed.
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct VehicleStream {
    pub class: VehicleClass,
    /// Vehicles per hour. Must be positive and finite.
    pub volume_vph: f64,
    /// Average speed, mph. Must be positive and finite.
    pub speed_mph: f64,
}

impl VehicleStream {
    fn validate(&self) -> Result<(), DrawingError> {
        if !self.volume_vph.is_finite() || self.volume_vph <= 0.0 {
            return Err(DrawingError::InvalidTrafficNoiseInput {
                reason: "volume_vph must be positive and finite",
                value: self.volume_vph,
            });
        }
        if !self.speed_mph.is_finite() || self.speed_mph <= 0.0 {
            return Err(DrawingError::InvalidTrafficNoiseInput {
                reason: "speed_mph must be positive and finite",
                value: self.speed_mph,
            });
        }
        Ok(())
    }

    /// This stream's contribution to the Leq at the reference distance
    /// (dBA): reference emission level, adjusted for speed, scaled up for
    /// traffic volume by energy (10*log10(V)).
    fn level_at_reference_distance(&self) -> Result<f64, DrawingError> {
        self.validate()?;
        let speed_adjustment_db = 10.0 * (self.speed_mph / REFERENCE_SPEED_MPH).log10();
        let per_vehicle_db = reference_emission_level_db(self.class) + speed_adjustment_db;
        Ok(per_vehicle_db + 10.0 * self.volume_vph.log10())
    }
}

/// Energy-sum (logarithmic addition) of dBA levels: `10*log10(sum(10^(L/10)))`,
/// the standard acoustics rule for combining incoherent sound sources.
fn energy_sum_db(levels_db: &[f64]) -> f64 {
    let energy: f64 = levels_db.iter().map(|l| 10f64.powf(l / 10.0)).sum();
    10.0 * energy.log10()
}

/// The combined Leq (dBA) at the reference distance from every stream,
/// combined by energy summation.
///
/// # Errors
/// - [`DrawingError::NoTrafficStreams`] if `streams` is empty.
/// - [`DrawingError::InvalidTrafficNoiseInput`] if any stream is malformed.
pub fn combined_level_at_reference_distance(
    streams: &[VehicleStream],
) -> Result<f64, DrawingError> {
    if streams.is_empty() {
        return Err(DrawingError::NoTrafficStreams);
    }
    let levels: Result<Vec<f64>, DrawingError> = streams
        .iter()
        .map(VehicleStream::level_at_reference_distance)
        .collect();
    Ok(energy_sum_db(&levels?))
}

/// Predict the hourly Leq (dBA) at `distance_m` from the roadway centerline,
/// combining every stream's reference-distance level and applying "hard
/// site" line-source geometric spreading (3 dB per doubling of distance)
/// from [`REFERENCE_DISTANCE_M`].
///
/// # Errors
/// - [`DrawingError::NoTrafficStreams`] if `streams` is empty.
/// - [`DrawingError::InvalidTrafficNoiseInput`] if any stream, or
///   `distance_m`, is malformed.
pub fn traffic_noise_leq(streams: &[VehicleStream], distance_m: f64) -> Result<f64, DrawingError> {
    if !distance_m.is_finite() || distance_m <= 0.0 {
        return Err(DrawingError::InvalidTrafficNoiseInput {
            reason: "distance_m must be positive and finite",
            value: distance_m,
        });
    }
    let l_ref = combined_level_at_reference_distance(streams)?;
    Ok(l_ref - 10.0 * (distance_m / REFERENCE_DISTANCE_M).log10())
}

/// Solve for the distance (meters) from the roadway centerline at which the
/// predicted Leq falls to `threshold_dba` — the traffic-noise contour/buffer
/// distance for that threshold, using the same "hard site" line-source
/// spreading as [`traffic_noise_leq`] (closed-form: `D = D0 *
/// 10^((Lref - threshold) / 10)`, the direct algebraic inverse).
///
/// A `threshold_dba` at or above the reference-distance level yields a
/// contour distance at or beyond [`REFERENCE_DISTANCE_M`]; a lower threshold
/// (already exceeded even at the reference distance) yields a contour
/// distance *inside* it — both are physically meaningful (the observer must
/// be that close to the roadway before the level drops to the threshold).
///
/// # Errors
/// - [`DrawingError::NoTrafficStreams`] if `streams` is empty.
/// - [`DrawingError::InvalidTrafficNoiseInput`] if any stream, or
///   `threshold_dba`, is malformed.
pub fn noise_contour_distance(
    streams: &[VehicleStream],
    threshold_dba: f64,
) -> Result<f64, DrawingError> {
    if !threshold_dba.is_finite() {
        return Err(DrawingError::InvalidTrafficNoiseInput {
            reason: "threshold_dba must be finite",
            value: threshold_dba,
        });
    }
    let l_ref = combined_level_at_reference_distance(streams)?;
    Ok(REFERENCE_DISTANCE_M * 10f64.powf((l_ref - threshold_dba) / 10.0))
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn auto_stream(volume: f64, speed: f64) -> VehicleStream {
        VehicleStream {
            class: VehicleClass::Auto,
            volume_vph: volume,
            speed_mph: speed,
        }
    }

    #[test]
    fn traffic_noise_leq_at_the_reference_distance_matches_the_reference_level() {
        let streams = vec![auto_stream(1000.0, REFERENCE_SPEED_MPH)];
        let l_ref = combined_level_at_reference_distance(&streams).unwrap();
        let l_at_ref_dist = traffic_noise_leq(&streams, REFERENCE_DISTANCE_M).unwrap();
        assert_relative_eq!(l_ref, l_at_ref_dist, epsilon = 1e-9);
    }

    #[test]
    fn traffic_noise_leq_drops_three_db_per_distance_doubling() {
        let streams = vec![auto_stream(1000.0, 50.0)];
        let l1 = traffic_noise_leq(&streams, REFERENCE_DISTANCE_M).unwrap();
        let l2 = traffic_noise_leq(&streams, REFERENCE_DISTANCE_M * 2.0).unwrap();
        assert_relative_eq!(l1 - l2, 3.0103, epsilon = 1e-3); // 10*log10(2)
    }

    #[test]
    fn doubling_traffic_volume_adds_about_three_db() {
        let low = vec![auto_stream(1000.0, 50.0)];
        let high = vec![auto_stream(2000.0, 50.0)];
        let l_low = combined_level_at_reference_distance(&low).unwrap();
        let l_high = combined_level_at_reference_distance(&high).unwrap();
        assert_relative_eq!(l_high - l_low, 3.0103, epsilon = 1e-3);
    }

    #[test]
    fn noise_contour_distance_round_trips_through_traffic_noise_leq() {
        let streams = vec![
            auto_stream(3000.0, 55.0),
            VehicleStream {
                class: VehicleClass::HeavyTruck,
                volume_vph: 200.0,
                speed_mph: 55.0,
            },
        ];
        let threshold = 66.0;
        let d = noise_contour_distance(&streams, threshold).unwrap();
        let level_at_d = traffic_noise_leq(&streams, d).unwrap();
        assert_relative_eq!(level_at_d, threshold, epsilon = 1e-6);
    }

    #[test]
    fn noise_contour_distance_rejects_empty_streams() {
        let err = noise_contour_distance(&[], 66.0).unwrap_err();
        assert_eq!(err, DrawingError::NoTrafficStreams);
    }

    #[test]
    fn traffic_noise_leq_rejects_a_non_positive_distance() {
        let streams = vec![auto_stream(1000.0, 50.0)];
        let err = traffic_noise_leq(&streams, 0.0).unwrap_err();
        assert!(matches!(
            err,
            DrawingError::InvalidTrafficNoiseInput {
                reason: "distance_m must be positive and finite",
                ..
            }
        ));
    }

    #[test]
    fn vehicle_stream_rejects_a_non_positive_volume() {
        let streams = vec![auto_stream(0.0, 50.0)];
        let err = combined_level_at_reference_distance(&streams).unwrap_err();
        assert!(matches!(err, DrawingError::InvalidTrafficNoiseInput { .. }));
    }
}
