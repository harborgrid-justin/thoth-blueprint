//! Infrastructure networks — roads and utilities modeled as connected nodes
//! and edges rather than loose lines (per the glossary). These carry the
//! community's circulation and services; the functions here measure length,
//! connectivity, intersections, right-of-way corridor area, and service
//! coverage.
//!
//! Port of `packages/domain/src/civil/network.ts` +
//! `packages/domain/src/civil/types/network.ts`. The TS source reads its
//! default ROW widths from `planning/geoid/data/federalReference.json`
//! (`standards.roads.roadWidthsMeters`); mirrored here as
//! [`DEFAULT_ROAD_WIDTH`] — see `crates/thoth-civil/GAPS.md`.

use std::collections::HashMap;

use thoth_spatial::{
    closest_point_on_segment, distance, polyline_length, Point, Polyline, SpatialContext, Unit,
};

/// The kind of system a network carries.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum NetworkKind {
    Road,
    Path,
    Water,
    Sewer,
    Storm,
    Power,
}

/// Functional road classification (drives width and hierarchy).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum RoadClass {
    Arterial,
    Collector,
    Local,
    Alley,
    Private,
}

/// Default ROW widths (plan units) by road class. Mirrors
/// `federalReference.json`'s `standards.roads.roadWidthsMeters`.
pub fn default_road_width(class: RoadClass) -> f64 {
    match class {
        RoadClass::Arterial => 30.0,
        RoadClass::Collector => 22.0,
        RoadClass::Local => 15.0,
        RoadClass::Alley => 6.0,
        RoadClass::Private => 8.0,
    }
}

/// A junction/vertex in a network.
#[derive(Debug, Clone, PartialEq)]
pub struct NetworkNode {
    pub id: String,
    pub point: Point,
}

/// A connection between two nodes, with an optional corridor width.
#[derive(Debug, Clone, PartialEq)]
pub struct NetworkEdge {
    pub id: String,
    pub from: String,
    pub to: String,
    /// Corridor / pipe width in plan units (ROW width for roads).
    pub width: Option<f64>,
    pub road_class: Option<RoadClass>,
}

impl NetworkEdge {
    pub fn new(id: impl Into<String>, from: impl Into<String>, to: impl Into<String>) -> Self {
        NetworkEdge {
            id: id.into(),
            from: from.into(),
            to: to.into(),
            width: None,
            road_class: None,
        }
    }
}

/// A connected linear system (a road network, a water main, …).
#[derive(Debug, Clone)]
pub struct InfrastructureNetwork {
    pub id: String,
    pub name: String,
    pub kind: NetworkKind,
    pub nodes: Vec<NetworkNode>,
    pub edges: Vec<NetworkEdge>,
}

/// Summary statistics for a network.
#[derive(Debug, Clone, PartialEq)]
pub struct NetworkStats {
    pub kind: NetworkKind,
    pub length_meters: f64,
    pub edges: usize,
    pub nodes: usize,
    pub intersections: usize,
    pub dead_ends: usize,
    pub components: usize,
    pub connected: bool,
    pub corridor_area: f64,
}

fn node_map(network: &InfrastructureNetwork) -> HashMap<&str, &NetworkNode> {
    network.nodes.iter().map(|n| (n.id.as_str(), n)).collect()
}

/// Endpoints of an edge as points, or `None` if a node is missing.
pub fn edge_points<'a>(
    edge: &NetworkEdge,
    nodes: &HashMap<&'a str, &'a NetworkNode>,
) -> Option<(Point, Point)> {
    let a = nodes.get(edge.from.as_str())?;
    let b = nodes.get(edge.to.as_str())?;
    Some((a.point, b.point))
}

/// Length of a single edge in plan units.
pub fn edge_length(network: &InfrastructureNetwork, edge: &NetworkEdge) -> f64 {
    let nodes = node_map(network);
    edge_points(edge, &nodes).map_or(0.0, |(a, b)| distance(a, b))
}

/// Total network length, in plan units and meters.
pub fn network_length(network: &InfrastructureNetwork, spatial: &SpatialContext) -> (f64, f64) {
    let nodes = node_map(network);
    let plan: f64 = network
        .edges
        .iter()
        .map(|e| edge_points(e, &nodes).map_or(0.0, |(a, b)| distance(a, b)))
        .sum();
    let meters = plan
        * if spatial.units == Unit::Feet {
            0.3048
        } else {
            1.0
        };
    (plan, meters)
}

/// The degree (number of incident edges) of each node.
pub fn node_degrees(network: &InfrastructureNetwork) -> HashMap<&str, u32> {
    let mut deg: HashMap<&str, u32> = network.nodes.iter().map(|n| (n.id.as_str(), 0)).collect();
    for e in &network.edges {
        *deg.entry(e.from.as_str()).or_insert(0) += 1;
        *deg.entry(e.to.as_str()).or_insert(0) += 1;
    }
    deg
}

/// Intersection nodes (degree ≥ 3) and dead-end nodes (degree 1).
pub fn junctions(network: &InfrastructureNetwork) -> (Vec<&NetworkNode>, Vec<&NetworkNode>) {
    let deg = node_degrees(network);
    let mut intersections = Vec::new();
    let mut dead_ends = Vec::new();
    for n in &network.nodes {
        let d = *deg.get(n.id.as_str()).unwrap_or(&0);
        if d >= 3 {
            intersections.push(n);
        } else if d == 1 {
            dead_ends.push(n);
        }
    }
    (intersections, dead_ends)
}

/// Number of connected components (a fully connected network has exactly 1;
/// an empty network has 0).
pub fn connected_components(network: &InfrastructureNetwork) -> usize {
    let mut parent: HashMap<&str, &str> = network
        .nodes
        .iter()
        .map(|n| (n.id.as_str(), n.id.as_str()))
        .collect();

    fn find<'a>(parent: &mut HashMap<&'a str, &'a str>, x: &'a str) -> &'a str {
        let mut root = x;
        while parent[root] != root {
            root = parent[root];
        }
        let mut curr = x;
        while curr != root {
            let next = parent[curr];
            parent.insert(curr, root);
            curr = next;
        }
        root
    }

    for e in &network.edges {
        let a = find(&mut parent, &e.from);
        let b = find(&mut parent, &e.to);
        if a != b {
            parent.insert(a, b);
        }
    }
    let roots: std::collections::HashSet<&str> = network
        .nodes
        .iter()
        .map(|n| find(&mut parent, &n.id))
        .collect();
    if network.nodes.is_empty() {
        0
    } else {
        roots.len()
    }
}

/// `true` when every node is reachable from every other.
pub fn is_connected(network: &InfrastructureNetwork) -> bool {
    connected_components(network) <= 1
}

/// Estimated right-of-way corridor area (Σ edge length × width), in plan
/// units². A first-order measure of land consumed by the network.
pub fn corridor_area(network: &InfrastructureNetwork) -> f64 {
    let nodes = node_map(network);
    network
        .edges
        .iter()
        .map(|e| {
            let Some((a, b)) = edge_points(e, &nodes) else {
                return 0.0;
            };
            let w = e
                .width
                .unwrap_or_else(|| default_road_width(e.road_class.unwrap_or(RoadClass::Local)));
            distance(a, b) * w
        })
        .sum()
}

/// Shortest distance from a point to any edge of the network, in plan units.
pub fn distance_to_network(network: &InfrastructureNetwork, p: Point) -> f64 {
    let nodes = node_map(network);
    let mut best = f64::INFINITY;
    for e in &network.edges {
        let Some((a, b)) = edge_points(e, &nodes) else {
            continue;
        };
        let c = closest_point_on_segment(p, a, b);
        best = best.min(distance(p, c));
    }
    best
}

/// Service coverage: the fraction of the given points (e.g. lot/building
/// centroids) within `service_distance` plan units of the network — a proxy
/// for how well a utility or road serves the community.
pub fn service_coverage(
    network: &InfrastructureNetwork,
    points: &[Point],
    service_distance: f64,
) -> f64 {
    if points.is_empty() {
        return 0.0;
    }
    let served = points
        .iter()
        .filter(|&&p| distance_to_network(network, p) <= service_distance)
        .count();
    served as f64 / points.len() as f64
}

/// Build a network from a drawn polyline path (chain of nodes/edges).
/// `make_id` mints a fresh id for each node and edge, in path order (nodes
/// first, then edges) — matching the TS `makeId()` call order exactly, which
/// matters when the caller's generator is a deterministic counter (as the
/// test suite's is).
pub fn network_from_path(
    id: impl Into<String>,
    name: impl Into<String>,
    kind: NetworkKind,
    path: &Polyline,
    mut make_id: impl FnMut() -> String,
    edge_width: Option<f64>,
    edge_road_class: Option<RoadClass>,
) -> InfrastructureNetwork {
    let nodes: Vec<NetworkNode> = path
        .iter()
        .map(|&point| NetworkNode {
            id: make_id(),
            point,
        })
        .collect();
    let mut edges = Vec::new();
    for i in 0..nodes.len().saturating_sub(1) {
        edges.push(NetworkEdge {
            id: make_id(),
            from: nodes[i].id.clone(),
            to: nodes[i + 1].id.clone(),
            width: edge_width,
            road_class: edge_road_class,
        });
    }
    InfrastructureNetwork {
        id: id.into(),
        name: name.into(),
        kind,
        nodes,
        edges,
    }
}

/// Summary statistics for a network.
pub fn network_stats(network: &InfrastructureNetwork, spatial: &SpatialContext) -> NetworkStats {
    let (intersections, dead_ends) = junctions(network);
    let (_, length_meters) = network_length(network, spatial);
    NetworkStats {
        kind: network.kind,
        length_meters,
        edges: network.edges.len(),
        nodes: network.nodes.len(),
        intersections: intersections.len(),
        dead_ends: dead_ends.len(),
        components: connected_components(network),
        connected: is_connected(network),
        corridor_area: corridor_area(network),
    }
}

/// Total polyline length of a raw path (convenience for tooling).
pub fn path_length(path: &Polyline) -> f64 {
    polyline_length(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_spatial::SpatialContext;

    fn spatial() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".into(),
            units: Unit::Meters,
            scale: 1.0,
        }
    }

    #[test]
    fn network_from_path_chains_nodes_and_edges() {
        let mut counter = 0;
        let make_id = || {
            counter += 1;
            format!("n{}", counter - 1)
        };
        let net = network_from_path(
            "net1",
            "Main St",
            NetworkKind::Road,
            &vec![
                Point::new(0.0, 0.0),
                Point::new(100.0, 0.0),
                Point::new(100.0, 100.0),
            ],
            make_id,
            Some(20.0),
            Some(RoadClass::Collector),
        );
        assert_eq!(net.nodes.len(), 3);
        assert_eq!(net.edges.len(), 2);
        let (_, meters) = network_length(&net, &spatial());
        assert!((meters - 200.0).abs() < 1e-9);
        assert!((corridor_area(&net) - 200.0 * 20.0).abs() < 1e-9);
        assert!(is_connected(&net));
    }

    #[test]
    fn topology_identifies_intersections_and_dead_ends() {
        // A + shaped network: center node with 4 spokes.
        let net = InfrastructureNetwork {
            id: "x".into(),
            name: "Cross".into(),
            kind: NetworkKind::Road,
            nodes: vec![
                NetworkNode {
                    id: "c".into(),
                    point: Point::new(0.0, 0.0),
                },
                NetworkNode {
                    id: "n".into(),
                    point: Point::new(0.0, -10.0),
                },
                NetworkNode {
                    id: "s".into(),
                    point: Point::new(0.0, 10.0),
                },
                NetworkNode {
                    id: "e".into(),
                    point: Point::new(10.0, 0.0),
                },
                NetworkNode {
                    id: "w".into(),
                    point: Point::new(-10.0, 0.0),
                },
            ],
            edges: vec![
                NetworkEdge::new("1", "c", "n"),
                NetworkEdge::new("2", "c", "s"),
                NetworkEdge::new("3", "c", "e"),
                NetworkEdge::new("4", "c", "w"),
            ],
        };
        let (intersections, dead_ends) = junctions(&net);
        assert_eq!(
            intersections
                .iter()
                .map(|n| n.id.as_str())
                .collect::<Vec<_>>(),
            vec!["c"]
        );
        let mut dead_end_ids: Vec<&str> = dead_ends.iter().map(|n| n.id.as_str()).collect();
        dead_end_ids.sort_unstable();
        assert_eq!(dead_end_ids, vec!["e", "n", "s", "w"]);
        assert_eq!(connected_components(&net), 1);
    }

    #[test]
    fn topology_counts_disconnected_components() {
        let net = InfrastructureNetwork {
            id: "d".into(),
            name: "Split".into(),
            kind: NetworkKind::Water,
            nodes: vec![
                NetworkNode {
                    id: "a".into(),
                    point: Point::new(0.0, 0.0),
                },
                NetworkNode {
                    id: "b".into(),
                    point: Point::new(1.0, 0.0),
                },
                NetworkNode {
                    id: "c".into(),
                    point: Point::new(5.0, 5.0),
                },
                NetworkNode {
                    id: "d".into(),
                    point: Point::new(6.0, 5.0),
                },
            ],
            edges: vec![
                NetworkEdge::new("1", "a", "b"),
                NetworkEdge::new("2", "c", "d"),
            ],
        };
        assert_eq!(connected_components(&net), 2);
        assert!(!is_connected(&net));
    }

    #[test]
    fn service_coverage_measures_fraction_of_points_near_network() {
        let mut counter = 0;
        let make_id = || {
            counter += 1;
            format!("n{}", counter - 1)
        };
        let net = network_from_path(
            "s",
            "Main",
            NetworkKind::Sewer,
            &vec![Point::new(0.0, 0.0), Point::new(100.0, 0.0)],
            make_id,
            None,
            None,
        );
        let points = vec![
            Point::new(50.0, 5.0),  // 5 away — served
            Point::new(50.0, 40.0), // 40 away — not served
        ];
        assert!((service_coverage(&net, &points, 10.0) - 0.5).abs() < 1e-9);
        assert!((service_coverage(&net, &points, 50.0) - 1.0).abs() < 1e-9);
    }

    #[test]
    fn empty_network_has_zero_components_and_is_trivially_connected() {
        let net = InfrastructureNetwork {
            id: "e".into(),
            name: "Empty".into(),
            kind: NetworkKind::Road,
            nodes: vec![],
            edges: vec![],
        };
        assert_eq!(connected_components(&net), 0);
        assert!(is_connected(&net));
    }
}
