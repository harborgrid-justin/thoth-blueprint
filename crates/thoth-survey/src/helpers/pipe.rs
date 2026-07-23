//! Pipe/utility network invert seeding and validation dispatch for the plan
//! canvas. Direct port of
//! `packages/domain/src/survey/helpers/pipeHelpers.ts`.
//!
//! Unlocked this pass by adding `thoth-civil` as a dependency (see
//! `../../GAPS.md` #3 and `../../STATUS.md`).

use std::collections::HashMap;

use thoth_civil::network::InfrastructureNetwork;
use thoth_civil::pipedesign::{validate_pipe_network, PipeDesignRules, PipeNetworkValidation};
use thoth_civil::terrain::ElevationGrid;

/// Seeds every node of every network in `networks` with a flat default
/// invert of `4.0` plan units — but only when both a site and a terrain
/// surface are present (mirrors the TS `if (site && terrainSurface) { ... }`
/// guard; the TS original never reads either argument's contents, only its
/// truthiness, so this port takes plain presence flags rather than the
/// untyped `site`/`terrainSurface` blobs the TS helper never actually
/// inspects).
pub fn initialize_node_inverts(
    networks: &[InfrastructureNetwork],
    has_site: bool,
    terrain: Option<&ElevationGrid>,
) -> HashMap<String, f64> {
    let mut inverts = HashMap::new();
    if has_site && terrain.is_some() {
        for net in networks {
            for node in &net.nodes {
                inverts.insert(node.id.clone(), 4.0);
            }
        }
    }
    inverts
}

/// Runs [`validate_pipe_network`] against `active_net`/`terrain`, or `None`
/// if either is absent (mirrors the TS `if (!activeNet || !terrainSurface)
/// return null;`). No manual rim overrides are supplied (the TS call site
/// never passes `nodeRims` either).
pub fn run_pipe_validation(
    active_net: Option<&InfrastructureNetwork>,
    terrain: Option<&ElevationGrid>,
    rules: PipeDesignRules,
    inverts: &HashMap<String, f64>,
) -> Option<PipeNetworkValidation> {
    let (net, terrain) = (active_net?, terrain?);
    Some(validate_pipe_network(net, terrain, rules, inverts, None))
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_civil::network::{NetworkEdge, NetworkKind, NetworkNode};
    use thoth_civil::pipedesign::DEFAULT_PIPE_DESIGN_RULES;
    use thoth_spatial::Point;

    fn net() -> InfrastructureNetwork {
        InfrastructureNetwork {
            id: "n1".into(),
            name: "Sewer Network".into(),
            kind: NetworkKind::Sewer,
            nodes: vec![
                NetworkNode {
                    id: "node1".into(),
                    point: Point::new(0.0, 0.0),
                },
                NetworkNode {
                    id: "node2".into(),
                    point: Point::new(20.0, 0.0),
                },
            ],
            edges: vec![NetworkEdge {
                id: "edge1".into(),
                from: "node1".into(),
                to: "node2".into(),
                width: Some(1.5),
                road_class: None,
            }],
        }
    }

    fn grid() -> ElevationGrid {
        ElevationGrid::new(Point::new(0.0, 0.0), 10.0, 3, 3, vec![10.0; 9]).unwrap()
    }

    #[test]
    fn seeds_flat_inverts_when_site_and_terrain_are_present() {
        let networks = vec![net()];
        let g = grid();
        let inverts = initialize_node_inverts(&networks, true, Some(&g));
        assert_eq!(inverts.len(), 2);
        assert_eq!(inverts["node1"], 4.0);
        assert_eq!(inverts["node2"], 4.0);
    }

    #[test]
    fn returns_empty_inverts_without_a_site() {
        let networks = vec![net()];
        let g = grid();
        assert!(initialize_node_inverts(&networks, false, Some(&g)).is_empty());
    }

    #[test]
    fn returns_empty_inverts_without_terrain() {
        let networks = vec![net()];
        assert!(initialize_node_inverts(&networks, true, None).is_empty());
    }

    #[test]
    fn runs_validation_when_both_network_and_terrain_are_present() {
        let n = net();
        let g = grid();
        let mut inverts = HashMap::new();
        inverts.insert("node1".to_string(), 4.0);
        inverts.insert("node2".to_string(), 3.5);
        let result =
            run_pipe_validation(Some(&n), Some(&g), DEFAULT_PIPE_DESIGN_RULES, &inverts).unwrap();
        assert_eq!(result.edge_elevations.len(), 1);
    }

    #[test]
    fn returns_none_without_an_active_network() {
        let g = grid();
        let inverts = HashMap::new();
        assert!(run_pipe_validation(None, Some(&g), DEFAULT_PIPE_DESIGN_RULES, &inverts).is_none());
    }

    #[test]
    fn returns_none_without_terrain() {
        let n = net();
        let inverts = HashMap::new();
        assert!(run_pipe_validation(Some(&n), None, DEFAULT_PIPE_DESIGN_RULES, &inverts).is_none());
    }
}
