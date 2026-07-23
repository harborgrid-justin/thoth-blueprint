//! Survey control-network least-squares adjustment.
//!
//! `thoth_survey::survey::adjust_traverse` implements the Compass (Bowditch)
//! and Transit rules — closed-form corrections that distribute a *single*
//! traverse loop's misclosure proportionally. Neither rule extends to a
//! **network** with redundant observations (multiple loops sharing stations,
//! or a mix of distance and azimuth observations between arbitrary station
//! pairs): there is no well-defined "misclosure" to distribute when a
//! station is tied down by more than one loop. This module instead
//! implements a proper linearized (Gauss–Newton) least-squares adjustment
//! from an observation-equation/normal-equations formulation — the standard
//! surveying-network approach, and the natural generalization Compass/
//! Transit can't provide.
//!
//! **Scope**: 2D horizontal networks only (no elevation/leveling network
//! adjustment). Observation types: distance and azimuth between named
//! stations. Each station is either *fixed* (held exactly, contributes no
//! unknowns) or *free* (its `(x, y)` are unknowns to solve for). Weights are
//! `1/σ²` from each observation's supplied standard deviation. This is the
//! shared least-squares engine referenced by the gap-analysis's items 30
//! (GNSS network adjustment) and 36/37 (survey control-network adjustment):
//! a GNSS baseline vector can be adjusted here by supplying its horizontal
//! distance and azimuth as one distance + one azimuth observation between
//! the same two stations (this module does not itself parse GNSS vectors —
//! see [`crate::rinex`]'s scope note on why full baseline processing is out
//! of scope).

use std::collections::HashMap;

use thoth_spatial::Point;

use crate::error::{InteropError, InteropResult};

/// One observed distance between two named stations.
#[derive(Debug, Clone, PartialEq)]
pub struct DistanceObservation {
    pub from: String,
    pub to: String,
    pub observed: f64,
    pub std_dev: f64,
}

/// One observed azimuth (degrees clockwise from north, this codebase's
/// convention) from one station to another.
#[derive(Debug, Clone, PartialEq)]
pub struct AzimuthObservation {
    pub from: String,
    pub to: String,
    pub observed_deg: f64,
    pub std_dev_deg: f64,
}

/// A station in the network: fixed (held) or free (solved for), with an
/// approximate starting coordinate (required for linearization even for a
/// fixed station, though a fixed station's approximate value is also its
/// final value).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Station {
    pub approx: Point,
    pub fixed: bool,
}

/// Convergence/iteration controls.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AdjustmentOptions {
    pub max_iterations: u32,
    /// Iteration stops once every coordinate correction is below this
    /// (plan units).
    pub convergence_tolerance: f64,
}

impl Default for AdjustmentOptions {
    fn default() -> Self {
        AdjustmentOptions {
            max_iterations: 25,
            convergence_tolerance: 1e-6,
        }
    }
}

/// One observation's post-adjustment residual (observed − computed, in the
/// observation's own units).
#[derive(Debug, Clone, PartialEq)]
pub struct Residual {
    pub from: String,
    pub to: String,
    pub kind: &'static str,
    pub residual: f64,
    pub standardized_residual: f64,
}

/// The result of a converged network adjustment.
#[derive(Debug, Clone, PartialEq)]
pub struct AdjustmentResult {
    /// Final coordinates for every station (fixed stations unchanged).
    pub adjusted: HashMap<String, Point>,
    pub residuals: Vec<Residual>,
    /// Degrees of freedom = observations − unknowns (redundancy).
    pub redundancy: i64,
    /// A posteriori variance factor (unit weight), `sum(w * v^2) / redundancy`.
    pub reference_variance: f64,
    pub iterations: u32,
}

fn azimuth_rad(from: Point, to: Point) -> f64 {
    (to.x - from.x).atan2(to.y - from.y)
}

fn wrap_deg_diff(a: f64, b: f64) -> f64 {
    let mut d = a - b;
    while d > 180.0 {
        d -= 360.0;
    }
    while d < -180.0 {
        d += 360.0;
    }
    d
}

/// Solve `a * x = b` via Gaussian elimination with partial pivoting.
/// Returns `None` if `a` is (numerically) singular.
fn solve_linear_system(mut a: Vec<Vec<f64>>, mut b: Vec<f64>) -> Option<Vec<f64>> {
    let n = b.len();
    for col in 0..n {
        let mut pivot = col;
        for row in (col + 1)..n {
            if a[row][col].abs() > a[pivot][col].abs() {
                pivot = row;
            }
        }
        if a[pivot][col].abs() < 1e-14 {
            return None;
        }
        a.swap(col, pivot);
        b.swap(col, pivot);
        let diag = a[col][col];
        for v in a[col].iter_mut().skip(col) {
            *v /= diag;
        }
        b[col] /= diag;
        let pivot_row = a[col].clone();
        for row in 0..n {
            if row == col {
                continue;
            }
            let factor = a[row][col];
            if factor == 0.0 {
                continue;
            }
            for (v, p) in a[row].iter_mut().zip(pivot_row.iter()).skip(col) {
                *v -= factor * p;
            }
            b[row] -= factor * b[col];
        }
    }
    Some(b)
}

/// Run a linearized least-squares adjustment of a 2D control network.
///
/// # Errors
/// - [`InteropError::UnknownReference`] if an observation names a station
///   not present in `stations`.
/// - [`InteropError::UnderDetermined`] if there are fewer independent
///   observations than free-station unknowns (2 per free station).
/// - [`InteropError::ConvergenceFailure`] if the iteration doesn't converge
///   within `options.max_iterations`.
pub fn adjust_network(
    stations: &HashMap<String, Station>,
    distances: &[DistanceObservation],
    azimuths: &[AzimuthObservation],
    options: &AdjustmentOptions,
) -> InteropResult<AdjustmentResult> {
    let mut free_ids: Vec<String> = stations
        .iter()
        .filter(|(_, s)| !s.fixed)
        .map(|(id, _)| id.clone())
        .collect();
    free_ids.sort(); // deterministic unknown ordering
    let index_of: HashMap<&str, usize> = free_ids
        .iter()
        .enumerate()
        .map(|(i, id)| (id.as_str(), i))
        .collect();
    let unknowns = free_ids.len() * 2;

    let total_observations = distances.len() + azimuths.len();
    if total_observations < unknowns {
        return Err(InteropError::UnderDetermined {
            unknowns,
            observations: total_observations,
        });
    }

    for obs_id in distances
        .iter()
        .flat_map(|d| [d.from.as_str(), d.to.as_str()])
        .chain(
            azimuths
                .iter()
                .flat_map(|a| [a.from.as_str(), a.to.as_str()]),
        )
    {
        if !stations.contains_key(obs_id) {
            return Err(InteropError::UnknownReference {
                format: "NetworkAdjustment",
                what: "station",
                id: obs_id.to_string(),
            });
        }
    }

    let mut current: HashMap<String, Point> = stations
        .iter()
        .map(|(id, s)| (id.clone(), s.approx))
        .collect();

    let mut iterations = 0u32;
    let mut last_max_correction;
    loop {
        iterations += 1;
        let mut ata = vec![vec![0.0; unknowns]; unknowns];
        let mut atl = vec![0.0; unknowns];

        let mut add_row = |partials: &[(usize, f64, bool)], misclosure: f64, weight: f64| {
            // partials: (unknown_index, coefficient, is_x) restricted to free stations only.
            for &(i, ci, _) in partials {
                atl[i] += weight * ci * misclosure;
                for &(j, cj, _) in partials {
                    ata[i][j] += weight * ci * cj;
                }
            }
        };

        for d in distances {
            let from = current[&d.from];
            let to = current[&d.to];
            let dx = to.x - from.x;
            let dy = to.y - from.y;
            let dist = dx.hypot(dy).max(1e-9);
            let computed = dist;
            let misclosure = d.observed - computed;
            let weight = 1.0 / (d.std_dev * d.std_dev).max(1e-12);

            let mut partials: Vec<(usize, f64, bool)> = Vec::new();
            if let Some(&fi) = index_of.get(d.from.as_str()) {
                partials.push((fi * 2, -dx / dist, true));
                partials.push((fi * 2 + 1, -dy / dist, false));
            }
            if let Some(&ti) = index_of.get(d.to.as_str()) {
                partials.push((ti * 2, dx / dist, true));
                partials.push((ti * 2 + 1, dy / dist, false));
            }
            add_row(&partials, misclosure, weight);
        }

        for az in azimuths {
            let from = current[&az.from];
            let to = current[&az.to];
            let dx = to.x - from.x;
            let dy = to.y - from.y;
            let dist_sq = (dx * dx + dy * dy).max(1e-9);
            let computed_deg = azimuth_rad(from, to).to_degrees();
            let misclosure_deg = wrap_deg_diff(az.observed_deg, computed_deg);
            let std_dev = az.std_dev_deg.to_radians().max(1e-9);
            let weight = 1.0 / (std_dev * std_dev);

            // d(azimuth)/d(x), d(azimuth)/d(y) in radians per plan unit.
            let d_az_dx = dy / dist_sq;
            let d_az_dy = -dx / dist_sq;

            let mut partials: Vec<(usize, f64, bool)> = Vec::new();
            if let Some(&fi) = index_of.get(az.from.as_str()) {
                partials.push((fi * 2, -d_az_dx, true));
                partials.push((fi * 2 + 1, -d_az_dy, false));
            }
            if let Some(&ti) = index_of.get(az.to.as_str()) {
                partials.push((ti * 2, d_az_dx, true));
                partials.push((ti * 2 + 1, d_az_dy, false));
            }
            add_row(&partials, misclosure_deg.to_radians(), weight);
        }

        let Some(correction) = solve_linear_system(ata, atl) else {
            return Err(InteropError::UnderDetermined {
                unknowns,
                observations: total_observations,
            });
        };

        let mut max_correction = 0.0f64;
        for (i, id) in free_ids.iter().enumerate() {
            let dx = correction[i * 2];
            let dy = correction[i * 2 + 1];
            max_correction = max_correction.max(dx.abs()).max(dy.abs());
            let p = current.get_mut(id).expect("free station present");
            p.x += dx;
            p.y += dy;
        }
        last_max_correction = max_correction;

        if max_correction <= options.convergence_tolerance {
            break;
        }
        if iterations >= options.max_iterations {
            return Err(InteropError::ConvergenceFailure {
                solver: "network_adjustment",
                iterations,
                max_correction: last_max_correction,
            });
        }
    }

    // Final residuals + reference variance at the converged coordinates.
    let mut residuals = Vec::with_capacity(total_observations);
    let mut weighted_sq_sum = 0.0;
    for d in distances {
        let from = current[&d.from];
        let to = current[&d.to];
        let computed = thoth_spatial::distance(from, to);
        let v = d.observed - computed;
        let weight = 1.0 / (d.std_dev * d.std_dev).max(1e-12);
        weighted_sq_sum += weight * v * v;
        residuals.push(Residual {
            from: d.from.clone(),
            to: d.to.clone(),
            kind: "distance",
            residual: v,
            standardized_residual: v / d.std_dev.max(1e-12),
        });
    }
    for az in azimuths {
        let from = current[&az.from];
        let to = current[&az.to];
        let computed_deg = azimuth_rad(from, to).to_degrees();
        let v = wrap_deg_diff(az.observed_deg, computed_deg);
        let weight = 1.0 / (az.std_dev_deg * az.std_dev_deg).max(1e-12);
        weighted_sq_sum += weight * v * v;
        residuals.push(Residual {
            from: az.from.clone(),
            to: az.to.clone(),
            kind: "azimuth",
            residual: v,
            standardized_residual: v / az.std_dev_deg.max(1e-12),
        });
    }

    let redundancy = total_observations as i64 - unknowns as i64;
    let reference_variance = if redundancy > 0 {
        weighted_sq_sum / redundancy as f64
    } else {
        0.0
    };

    Ok(AdjustmentResult {
        adjusted: current,
        residuals,
        redundancy,
        reference_variance,
        iterations,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn perfectly_consistent_observations_converge_to_the_true_position() {
        // Two fixed stations, one free station tied by distance+azimuth from
        // each fixed station (redundant: 4 observations, 2 unknowns).
        let mut stations = HashMap::new();
        stations.insert(
            "A".to_string(),
            Station {
                approx: Point::new(0.0, 0.0),
                fixed: true,
            },
        );
        stations.insert(
            "B".to_string(),
            Station {
                approx: Point::new(100.0, 0.0),
                fixed: true,
            },
        );
        // Deliberately poor initial guess for the free station.
        stations.insert(
            "C".to_string(),
            Station {
                approx: Point::new(40.0, -40.0),
                fixed: false,
            },
        );

        // True position of C is (50, -50) relative to A=(0,0), B=(100,0).
        let true_c = Point::new(50.0, -50.0);
        let dist_a = thoth_spatial::distance(Point::new(0.0, 0.0), true_c);
        let dist_b = thoth_spatial::distance(Point::new(100.0, 0.0), true_c);
        let az_a = azimuth_rad(Point::new(0.0, 0.0), true_c).to_degrees();
        let az_b = azimuth_rad(Point::new(100.0, 0.0), true_c).to_degrees();

        let distances = vec![
            DistanceObservation {
                from: "A".into(),
                to: "C".into(),
                observed: dist_a,
                std_dev: 0.01,
            },
            DistanceObservation {
                from: "B".into(),
                to: "C".into(),
                observed: dist_b,
                std_dev: 0.01,
            },
        ];
        let azimuths = vec![
            AzimuthObservation {
                from: "A".into(),
                to: "C".into(),
                observed_deg: az_a,
                std_dev_deg: 0.01,
            },
            AzimuthObservation {
                from: "B".into(),
                to: "C".into(),
                observed_deg: az_b,
                std_dev_deg: 0.01,
            },
        ];

        let result = adjust_network(
            &stations,
            &distances,
            &azimuths,
            &AdjustmentOptions::default(),
        )
        .unwrap();
        let c = result.adjusted["C"];
        assert!((c.x - true_c.x).abs() < 1e-4, "x = {}", c.x);
        assert!((c.y - true_c.y).abs() < 1e-4, "y = {}", c.y);
        assert_eq!(result.redundancy, 2);
    }

    #[test]
    fn unknown_station_reference_is_an_error() {
        let mut stations = HashMap::new();
        stations.insert(
            "A".to_string(),
            Station {
                approx: Point::ZERO,
                fixed: true,
            },
        );
        let distances = vec![DistanceObservation {
            from: "A".into(),
            to: "GHOST".into(),
            observed: 10.0,
            std_dev: 0.01,
        }];
        let err =
            adjust_network(&stations, &distances, &[], &AdjustmentOptions::default()).unwrap_err();
        assert!(matches!(err, InteropError::UnknownReference { .. }));
    }

    #[test]
    fn under_determined_network_is_rejected() {
        let mut stations = HashMap::new();
        stations.insert(
            "A".to_string(),
            Station {
                approx: Point::ZERO,
                fixed: true,
            },
        );
        stations.insert(
            "B".to_string(),
            Station {
                approx: Point::new(10.0, 0.0),
                fixed: false,
            },
        );
        // Only 1 observation for 2 unknowns (B's x and y).
        let distances = vec![DistanceObservation {
            from: "A".into(),
            to: "B".into(),
            observed: 10.0,
            std_dev: 0.01,
        }];
        let err =
            adjust_network(&stations, &distances, &[], &AdjustmentOptions::default()).unwrap_err();
        assert!(matches!(err, InteropError::UnderDetermined { .. }));
    }

    #[test]
    fn fixed_stations_never_move() {
        let mut stations = HashMap::new();
        stations.insert(
            "A".to_string(),
            Station {
                approx: Point::new(0.0, 0.0),
                fixed: true,
            },
        );
        stations.insert(
            "B".to_string(),
            Station {
                approx: Point::new(100.0, 0.0),
                fixed: true,
            },
        );
        stations.insert(
            "C".to_string(),
            Station {
                approx: Point::new(50.0, -49.0),
                fixed: false,
            },
        );
        let true_c = Point::new(50.0, -50.0);
        let distances = vec![
            DistanceObservation {
                from: "A".into(),
                to: "C".into(),
                observed: thoth_spatial::distance(Point::new(0.0, 0.0), true_c),
                std_dev: 0.01,
            },
            DistanceObservation {
                from: "B".into(),
                to: "C".into(),
                observed: thoth_spatial::distance(Point::new(100.0, 0.0), true_c),
                std_dev: 0.01,
            },
        ];
        let azimuths = vec![AzimuthObservation {
            from: "A".into(),
            to: "C".into(),
            observed_deg: azimuth_rad(Point::new(0.0, 0.0), true_c).to_degrees(),
            std_dev_deg: 0.01,
        }];
        let result = adjust_network(
            &stations,
            &distances,
            &azimuths,
            &AdjustmentOptions::default(),
        )
        .unwrap();
        assert_eq!(result.adjusted["A"], Point::new(0.0, 0.0));
        assert_eq!(result.adjusted["B"], Point::new(100.0, 0.0));
    }
}
