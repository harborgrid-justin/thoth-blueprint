//! Subdivision phasing / build-out sequencing: given a set of lots and a
//! phase count, produce an ordered phase assignment that grows outward from
//! existing infrastructure.
//!
//! Item 44 of the Theme 4 subdivision-design-automation gap analysis.
//!
//! ## Algorithm (heuristic — see limitations)
//! 1. Sort lots by distance from a caller-supplied `infrastructure_origin`
//!    (the point where the development connects to existing roads/utilities)
//!    — the standard "build outward from what's already served" sequencing
//!    real subdivisions use to avoid extending infrastructure through
//!    unbuilt phases.
//! 2. Split the sorted list into `phase_count` contiguous buckets by count
//!    (as equal as integer division allows, remainder distributed to the
//!    earliest phases).
//! 3. Check that every phase after the first has at least one lot within
//!    `adjacency_tolerance` of a lot in the previous phase (or of the
//!    infrastructure origin for phase 1) — i.e. that infrastructure can
//!    physically extend from what's already built into what's proposed
//!    next — and emit a [`ComplianceFinding`] warning for any phase that
//!    fails this (a real red flag: it means that phase would need
//!    infrastructure looped in from somewhere not yet built).
//!
//! ## Known limitations (be honest about these)
//! - **Distance-from-origin sequencing is a heuristic**, not a network-flow
//!   or critical-path optimization over actual infrastructure extension
//!   cost; it does not account for topography, easements, or phased road
//!   construction cost.
//! - **Adjacency is approximated** as "any vertex of one lot's boundary
//!   within `adjacency_tolerance` of any vertex of another's" — exact for
//!   lots sharing an exact vertex (e.g. output from [`crate::rules::subdivide_grid`]
//!   or [`crate::lot_yield`]), approximate for hand-drawn or non-conforming
//!   boundaries where shared lot lines may not share exact vertices.
//! - **Equal-count buckets, not equal-area or equal-infrastructure-cost
//!   buckets** — a jurisdiction phasing by absorption capacity rather than
//!   raw lot count will need to weight the buckets differently.

use serde::{Deserialize, Serialize};
use thiserror::Error;
use thoth_spatial::{distance, ComplianceFinding, ComplianceSeverity, Point};

use crate::elements::Lot;

/// Everything that can make a phasing request invalid.
#[derive(Debug, Clone, PartialEq, Error)]
pub enum PhasingError {
    #[error("No lots provided to phase.")]
    NoLotsProvided,
    #[error("Phase count must be at least 1, got {0}.")]
    InvalidPhaseCount(u32),
}

/// One lot's assigned phase (1-indexed).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PhaseAssignment {
    pub lot_id: String,
    pub phase: u32,
}

/// The result of a phasing pass.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PhasingPlan {
    pub assignments: Vec<PhaseAssignment>,
    /// Total lot area per phase, indexed `[0]` = phase 1.
    pub phase_areas: Vec<f64>,
    pub findings: Vec<ComplianceFinding>,
}

/// `true` if any vertex of `a`'s boundary lies within `tolerance` of any
/// vertex of `b`'s boundary — see the module doc's adjacency limitation.
fn lots_adjacent(a: &Lot, b: &Lot, tolerance: f64) -> bool {
    a.base.boundary.iter().any(|pa| {
        b.base
            .boundary
            .iter()
            .any(|pb| distance(*pa, *pb) <= tolerance)
    })
}

/// `true` if any vertex of `lot`'s boundary lies within `tolerance` of `point`.
fn lot_near_point(lot: &Lot, point: Point, tolerance: f64) -> bool {
    lot.base.boundary.iter().any(|p| distance(*p, point) <= tolerance)
}

/// Plan an ordered build-out sequence for `lots` into `phase_count` phases,
/// growing outward from `infrastructure_origin`.
pub fn plan_phasing(
    lots: &[Lot],
    phase_count: u32,
    infrastructure_origin: Point,
    adjacency_tolerance: f64,
) -> Result<PhasingPlan, PhasingError> {
    if lots.is_empty() {
        return Err(PhasingError::NoLotsProvided);
    }
    if phase_count < 1 {
        return Err(PhasingError::InvalidPhaseCount(phase_count));
    }

    let mut ordered: Vec<&Lot> = lots.iter().collect();
    ordered.sort_by(|a, b| {
        let da = thoth_spatial::centroid(&a.base.boundary);
        let db = thoth_spatial::centroid(&b.base.boundary);
        distance(da, infrastructure_origin)
            .partial_cmp(&distance(db, infrastructure_origin))
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let n = ordered.len();
    let base_size = n / phase_count as usize;
    let remainder = n % phase_count as usize;

    let mut assignments = Vec::with_capacity(n);
    let mut phase_areas = vec![0.0; phase_count as usize];
    let mut phase_lots: Vec<Vec<&Lot>> = vec![Vec::new(); phase_count as usize];

    let mut idx = 0usize;
    for phase in 0..phase_count as usize {
        let bucket_size = base_size + if phase < remainder { 1 } else { 0 };
        for _ in 0..bucket_size {
            if idx >= n {
                break;
            }
            let lot = ordered[idx];
            assignments.push(PhaseAssignment {
                lot_id: lot.base.id.clone(),
                phase: phase as u32 + 1,
            });
            phase_areas[phase] += thoth_spatial::area(&lot.base.boundary);
            phase_lots[phase].push(lot);
            idx += 1;
        }
    }

    let mut findings = Vec::new();
    for phase in 0..phase_lots.len() {
        let connects = if phase == 0 {
            phase_lots[0]
                .iter()
                .any(|l| lot_near_point(l, infrastructure_origin, adjacency_tolerance))
        } else {
            phase_lots[phase].iter().any(|l| {
                phase_lots[phase - 1]
                    .iter()
                    .any(|prev| lots_adjacent(l, prev, adjacency_tolerance))
            })
        };
        if !connects {
            findings.push(ComplianceFinding {
                severity: ComplianceSeverity::Warning,
                code: "phasing.disconnectedFromPriorInfrastructure".to_string(),
                message: format!(
                    "Phase {} has no lot adjacent to {} — infrastructure may need to be \
                     extended through land outside this phase sequence.",
                    phase + 1,
                    if phase == 0 {
                        "the infrastructure origin".to_string()
                    } else {
                        format!("phase {}", phase)
                    }
                ),
                element_id: None,
            });
        }
    }
    if findings.is_empty() {
        findings.push(ComplianceFinding {
            severity: ComplianceSeverity::Info,
            code: "phasing.contiguous".to_string(),
            message: "Every phase connects to previously served land.".to_string(),
            element_id: None,
        });
    }

    Ok(PhasingPlan {
        assignments,
        phase_areas,
        findings,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::elements::new_base;
    use thoth_spatial::{ElementKind, Polygon};

    fn square_lot(id: &str, ox: f64, oy: f64, size: f64) -> Lot {
        Lot {
            base: new_base(
                id,
                ElementKind::Lot,
                id,
                "l",
                vec![
                    Point::new(ox, oy),
                    Point::new(ox + size, oy),
                    Point::new(ox + size, oy + size),
                    Point::new(ox, oy + size),
                ] as Polygon,
            ),
            parcel_id: None,
            block_id: None,
            setback: None,
        }
    }

    /// A row of 6 lots, each 10x10, sharing exact side vertices, starting
    /// right at the infrastructure origin and extending away from it.
    fn contiguous_row() -> Vec<Lot> {
        (0..6)
            .map(|i| square_lot(&format!("lot-{i}"), i as f64 * 10.0, 0.0, 10.0))
            .collect()
    }

    #[test]
    fn phases_a_contiguous_row_outward_from_the_origin_with_no_findings() {
        let lots = contiguous_row();
        let plan = plan_phasing(&lots, 3, Point::new(0.0, 0.0), 1e-6).unwrap();
        assert_eq!(plan.assignments.len(), 6);
        // 6 lots / 3 phases = 2 lots each.
        assert_eq!(plan.phase_areas.len(), 3);
        for area in &plan.phase_areas {
            assert!((*area - 200.0).abs() < 1e-6); // 2 lots * 100 sqft each
        }
        // Closest lot (lot-0, at x=0) should be phase 1; farthest (lot-5) phase 3.
        let phase_of = |id: &str| {
            plan.assignments
                .iter()
                .find(|a| a.lot_id == id)
                .unwrap()
                .phase
        };
        assert_eq!(phase_of("lot-0"), 1);
        assert_eq!(phase_of("lot-5"), 3);
        assert!(plan.findings.iter().any(|f| f.code == "phasing.contiguous"));
    }

    #[test]
    fn flags_a_phase_disconnected_from_prior_infrastructure() {
        // Two clusters far apart: a near cluster (phase 1 material) and a
        // far, isolated cluster that isn't adjacent to anything built yet.
        let near = square_lot("near", 0.0, 0.0, 10.0);
        let far = square_lot("far", 1000.0, 1000.0, 10.0);
        let lots = vec![near, far];
        let plan = plan_phasing(&lots, 2, Point::new(0.0, 0.0), 1e-6).unwrap();
        assert!(plan
            .findings
            .iter()
            .any(|f| f.code == "phasing.disconnectedFromPriorInfrastructure"));
    }

    #[test]
    fn rejects_empty_lots_and_zero_phase_count() {
        assert_eq!(
            plan_phasing(&[], 2, Point::ZERO, 1.0),
            Err(PhasingError::NoLotsProvided)
        );
        let lots = contiguous_row();
        assert_eq!(
            plan_phasing(&lots, 0, Point::ZERO, 1.0),
            Err(PhasingError::InvalidPhaseCount(0))
        );
    }

    #[test]
    fn distributes_remainder_lots_to_earlier_phases() {
        let lots = contiguous_row(); // 6 lots
        let plan = plan_phasing(&lots, 4, Point::new(0.0, 0.0), 1e-6).unwrap();
        // 6 / 4 = 1 remainder 2 -> phases sized [2,2,1,1].
        let counts: Vec<usize> = (1..=4)
            .map(|p| plan.assignments.iter().filter(|a| a.phase == p).count())
            .collect();
        assert_eq!(counts, vec![2, 2, 1, 1]);
    }
}
