//! Storm-sewer hydraulic/energy grade line (HGL/EGL) profile computation,
//! composing over `thoth_civil::pipedesign`'s [`PipeNetwork`] rather than
//! introducing a second, parallel pipe-network representation.
//!
//! # Design note: composition, not extension
//! `thoth_civil::pipedesign` already owns the storm/sanitary pipe network
//! model (`PipeNetwork`/`PipeNode`/`PipeSegment`) and a *design-rule*
//! validator (`PipeCheckViolation` — cover depth, slope bounds, diameter
//! minimums). This module is a genuinely separate concern: given a pipe
//! network's geometry (which `thoth_civil` already models) **and a flow
//! rate per pipe** (which is hydrology's job, not `thoth_civil`'s — that
//! crate validates geometry, it does not run rainfall-runoff), compute the
//! hydraulic and energy grade lines along it. Composing over the existing
//! `PipeNetwork` type (rather than duplicating a second node/edge model
//! here) means a caller can validate a network with
//! `thoth_civil::pipedesign::validate_pipe_network`/[`crate`]-level checks
//! and then, with the same data plus a hydrology-computed flow per pipe,
//! run this module's HGL/EGL profile — one pipe network representation,
//! two independent analyses layered on top of it.
//!
//! Source: standard storm-sewer hydraulic grade line practice (e.g. FHWA
//! HEC-22, *Urban Drainage Design Manual*, Ch. 7) — friction loss via
//! Manning's equation solved for friction slope, entrance/junction minor
//! losses via a coefficient times velocity head, walking the energy
//! equation upstream from a known downstream (outfall) boundary condition.
//!
//! # Assumptions and valid range
//! - **Full-pipe (pressurized) flow assumed for every pipe** — friction
//!   slope is computed from the full-flow hydraulic radius `R = D/4` and
//!   `V = Q/A_full`, not a partial-flow normal-depth solve. This is the
//!   standard simplifying assumption for a storm sewer design check (verify
//!   capacity at or above design flow), not a partial-flow/free-surface
//!   HGL trace.
//! - **Single-outfall, tree-shaped (dendritic) network**: the profile walks
//!   upstream from exactly one node of [`PipeCheckSeverity`]... — i.e. one
//!   [`thoth_civil::pipedesign::PipeNodeKind::Outfall`] node, following
//!   every pipe whose downstream end reaches an already-solved node. A
//!   network with more than one outfall, or with a loop (two paths
//!   reconverging upstream), is rejected/only partially resolved — see
//!   [`compute_hgl_profile`]'s docs.
//! - A single, caller-supplied junction/structure minor-loss coefficient is
//!   applied uniformly at every junction, rather than per-structure access
//!   hole/bend loss coefficients (HEC-22 Ch. 7 tabulates those separately
//!   by structure geometry — a future refinement, not implemented here).

use std::collections::{HashMap, VecDeque};

use thoth_civil::pipedesign::{PipeNetwork, PipeNode, PipeNodeKind};
use thoth_spatial::distance;

use crate::error::{HydroResult, HydrologyError};
use crate::outlet_hydraulics::GRAVITY_FT_S2;

/// Manning's equation constant for US customary units (`V = (Ku/n)R^(2/3)S^(1/2)`).
const MANNING_KU: f64 = 1.49;

/// EGL/HGL and surcharge status at one node of a solved [`HglProfile`].
#[derive(Debug, Clone, PartialEq)]
pub struct HglProfilePoint {
    pub node_id: String,
    pub rim_elevation_ft: f64,
    pub egl_ft: f64,
    pub hgl_ft: f64,
    /// `true` if the hydraulic grade line rises above the node's rim
    /// elevation (the structure would surcharge/flood at this flow).
    pub surcharged: bool,
}

/// A solved HGL/EGL profile for every node reachable upstream of the
/// network's outfall, keyed by node id.
#[derive(Debug, Clone, PartialEq)]
pub struct HglProfile {
    pub points: HashMap<String, HglProfilePoint>,
}

impl HglProfile {
    /// `true` if any node in the profile surcharges.
    pub fn has_surcharge(&self) -> bool {
        self.points.values().any(|p| p.surcharged)
    }
}

fn find_single_outfall(network: &PipeNetwork) -> HydroResult<&PipeNode> {
    let outfalls: Vec<&PipeNode> = network
        .nodes
        .iter()
        .filter(|n| n.kind == PipeNodeKind::Outfall)
        .collect();
    match outfalls.len() {
        0 => Err(HydrologyError::Network {
            reason: "pipe network has no node of kind Outfall to start the HGL/EGL profile from"
                .into(),
        }),
        1 => Ok(outfalls[0]),
        n => Err(HydrologyError::Network {
            reason: format!(
                "pipe network has {n} Outfall nodes; this module assumes a single-outfall \
                 network (route/analyze sub-networks separately)"
            ),
        }),
    }
}

/// Compute the full-pipe-flow friction head loss (ft) for one pipe segment:
/// solve Manning's equation for friction slope at the given velocity, then
/// multiply by pipe length.
///
/// `Sf = (V·n / (Ku·R^(2/3)))²`, `hf = Sf·L`
fn friction_loss(velocity_fps: f64, n: f64, hydraulic_radius_ft: f64, length_ft: f64) -> f64 {
    let sf = (velocity_fps * n / (MANNING_KU * hydraulic_radius_ft.powf(2.0 / 3.0))).powi(2);
    sf * length_ft
}

/// Compute the HGL/EGL profile for every node upstream of a pipe network's
/// single outfall, given a flow rate for each pipe.
///
/// `flows_cfs` maps pipe segment id → discharge (cfs); every pipe on the
/// path from the outfall to the network's most upstream nodes must have an
/// entry (a pipe with no entry is treated as carrying zero flow and is
/// skipped — it contributes no head loss and its upstream node is not
/// visited through it).
///
/// `outfall_water_surface_elevation_ft` is the downstream boundary EGL at
/// the outfall (e.g. a receiving water's design water surface, or the
/// outfall's own critical/normal depth elevation computed elsewhere).
///
/// `junction_minor_loss_coefficient` (`K`, dimensionless) is applied at
/// every junction as `K·V²/(2g)` using the entering pipe's velocity, added
/// on top of that pipe's friction loss.
///
/// # Errors
/// - [`HydrologyError::Network`] if the network has zero or more than one
///   [`thoth_civil::pipedesign::PipeNodeKind::Outfall`] node, or a pipe
///   references a node id not present in the network.
/// - [`HydrologyError::NonPositiveDimension`] if any traversed pipe has a
///   non-positive diameter.
/// - [`HydrologyError::NonPositiveManningN`] if any traversed pipe has a
///   non-positive Manning's `n`.
pub fn compute_hgl_profile(
    network: &PipeNetwork,
    flows_cfs: &HashMap<String, f64>,
    outfall_water_surface_elevation_ft: f64,
    junction_minor_loss_coefficient: f64,
) -> HydroResult<HglProfile> {
    let outfall = find_single_outfall(network)?;
    let nodes_by_id: HashMap<&str, &PipeNode> =
        network.nodes.iter().map(|n| (n.id.as_str(), n)).collect();

    let mut egl: HashMap<String, f64> = HashMap::new();
    let mut points: HashMap<String, HglProfilePoint> = HashMap::new();

    egl.insert(outfall.id.clone(), outfall_water_surface_elevation_ft);
    points.insert(
        outfall.id.clone(),
        HglProfilePoint {
            node_id: outfall.id.clone(),
            rim_elevation_ft: outfall.rim_elevation,
            egl_ft: outfall_water_surface_elevation_ft,
            hgl_ft: outfall_water_surface_elevation_ft,
            surcharged: outfall_water_surface_elevation_ft > outfall.rim_elevation,
        },
    );

    let mut queue: VecDeque<String> = VecDeque::new();
    queue.push_back(outfall.id.clone());

    while let Some(current_id) = queue.pop_front() {
        let current_egl = egl[&current_id];

        for pipe in network.pipes.iter().filter(|p| p.to_node_id == current_id) {
            let Some(&q) = flows_cfs.get(&pipe.id) else {
                continue;
            };
            if q <= 0.0 {
                continue;
            }
            let upstream_id = &pipe.from_node_id;
            if egl.contains_key(upstream_id) {
                // Already solved via another path (a loop) — leave the
                // first-computed value in place rather than reconciling.
                continue;
            }
            let upstream_node = nodes_by_id.get(upstream_id.as_str()).ok_or_else(|| {
                HydrologyError::Network {
                    reason: format!(
                        "pipe '{}' references unknown upstream node '{}'",
                        pipe.id, upstream_id
                    ),
                }
            })?;

            if pipe.diameter <= 0.0 {
                return Err(HydrologyError::NonPositiveDimension {
                    value: pipe.diameter,
                });
            }
            if pipe.n_manning <= 0.0 {
                return Err(HydrologyError::NonPositiveManningN { n: pipe.n_manning });
            }

            let diameter_ft = pipe.diameter / 12.0;
            let area = std::f64::consts::PI * (diameter_ft / 2.0).powi(2);
            let velocity = q / area;
            let r = diameter_ft / 4.0;
            let downstream_node = nodes_by_id.get(current_id.as_str()).ok_or_else(|| {
                HydrologyError::Network {
                    reason: format!("unknown node '{current_id}' while tracing HGL/EGL profile"),
                }
            })?;
            let length = distance(upstream_node.position, downstream_node.position);

            let hf = friction_loss(velocity, pipe.n_manning, r, length);
            let hm = junction_minor_loss_coefficient * velocity.powi(2) / (2.0 * GRAVITY_FT_S2);
            let upstream_egl = current_egl + hf + hm;
            let upstream_hgl = upstream_egl - velocity.powi(2) / (2.0 * GRAVITY_FT_S2);

            egl.insert(upstream_id.clone(), upstream_egl);
            points.insert(
                upstream_id.clone(),
                HglProfilePoint {
                    node_id: upstream_id.clone(),
                    rim_elevation_ft: upstream_node.rim_elevation,
                    egl_ft: upstream_egl,
                    hgl_ft: upstream_hgl,
                    surcharged: upstream_hgl > upstream_node.rim_elevation,
                },
            );
            queue.push_back(upstream_id.clone());
        }
    }

    Ok(HglProfile { points })
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;
    use thoth_civil::pipedesign::{PipeMaterial, PipeNetworkKind, PipeNode, PipeNodeKind, PipeSegment};
    use thoth_spatial::Point;

    /// Outfall (O) <- Manhole (M1) <- Catch basin (CB2), a simple dendritic
    /// two-pipe network.
    fn test_network() -> PipeNetwork {
        PipeNetwork {
            id: "n1".into(),
            name: "Test Storm Network".into(),
            kind: PipeNetworkKind::Storm,
            nodes: vec![
                PipeNode {
                    id: "O".into(),
                    name: "Outfall".into(),
                    kind: PipeNodeKind::Outfall,
                    position: Point::new(0.0, 0.0),
                    rim_elevation: 95.0,
                    invert_elevation: 90.0,
                    sump_depth: None,
                },
                PipeNode {
                    id: "M1".into(),
                    name: "Manhole 1".into(),
                    kind: PipeNodeKind::Manhole,
                    position: Point::new(100.0, 0.0),
                    rim_elevation: 100.0,
                    invert_elevation: 91.0,
                    sump_depth: Some(1.0),
                },
                PipeNode {
                    id: "CB2".into(),
                    name: "Catch Basin 2".into(),
                    kind: PipeNodeKind::CatchBasin,
                    position: Point::new(180.0, 0.0),
                    rim_elevation: 102.0,
                    invert_elevation: 93.0,
                    sump_depth: Some(1.0),
                },
            ],
            pipes: vec![
                PipeSegment {
                    id: "P1".into(),
                    name: "O-M1".into(),
                    from_node_id: "M1".into(),
                    to_node_id: "O".into(),
                    diameter: 24.0,
                    material: PipeMaterial::Concrete,
                    n_manning: 0.013,
                    start_invert: 91.0,
                    end_invert: 90.0,
                },
                PipeSegment {
                    id: "P2".into(),
                    name: "M1-CB2".into(),
                    from_node_id: "CB2".into(),
                    to_node_id: "M1".into(),
                    diameter: 18.0,
                    material: PipeMaterial::Concrete,
                    n_manning: 0.013,
                    start_invert: 93.0,
                    end_invert: 91.0,
                },
            ],
        }
    }

    #[test]
    fn hgl_profile_matches_reference_computation() {
        let network = test_network();
        let flows = HashMap::from([("P1".to_string(), 15.0), ("P2".to_string(), 8.0)]);
        let profile = compute_hgl_profile(&network, &flows, 92.0, 0.2).unwrap();

        let m1 = &profile.points["M1"];
        assert_relative_eq!(m1.egl_ft, 92.50808969081042, epsilon = 1e-6);
        assert_relative_eq!(m1.hgl_ft, 92.15409487218425, epsilon = 1e-6);
        assert!(!m1.surcharged);

        let cb2 = &profile.points["CB2"];
        assert_relative_eq!(cb2.egl_ft, 93.03326445046261, epsilon = 1e-6);
        assert_relative_eq!(cb2.hgl_ft, 92.71502845000327, epsilon = 1e-6);
        assert!(!cb2.surcharged);

        let outfall = &profile.points["O"];
        assert_relative_eq!(outfall.egl_ft, 92.0, epsilon = 1e-12);
    }

    #[test]
    fn detects_surcharge_when_hgl_exceeds_rim() {
        let network = test_network();
        let flows = HashMap::from([("P1".to_string(), 15.0), ("P2".to_string(), 8.0)]);
        // A very high outfall boundary should surcharge everything upstream.
        let profile = compute_hgl_profile(&network, &flows, 150.0, 0.2).unwrap();
        assert!(profile.has_surcharge());
        assert!(profile.points["M1"].surcharged);
    }

    #[test]
    fn rejects_network_without_outfall() {
        let mut network = test_network();
        network.nodes[0].kind = PipeNodeKind::Manhole; // no outfall now
        let flows = HashMap::new();
        assert!(matches!(
            compute_hgl_profile(&network, &flows, 92.0, 0.2),
            Err(HydrologyError::Network { .. })
        ));
    }

    #[test]
    fn rejects_network_with_multiple_outfalls() {
        let mut network = test_network();
        network.nodes[1].kind = PipeNodeKind::Outfall; // now 2 outfalls
        let flows = HashMap::new();
        assert!(matches!(
            compute_hgl_profile(&network, &flows, 92.0, 0.2),
            Err(HydrologyError::Network { .. })
        ));
    }

    #[test]
    fn skips_pipes_with_no_supplied_flow() {
        let network = test_network();
        // Only P1 has a flow; P2's upstream node (CB2) should not be visited.
        let flows = HashMap::from([("P1".to_string(), 15.0)]);
        let profile = compute_hgl_profile(&network, &flows, 92.0, 0.2).unwrap();
        assert!(profile.points.contains_key("M1"));
        assert!(!profile.points.contains_key("CB2"));
    }
}
