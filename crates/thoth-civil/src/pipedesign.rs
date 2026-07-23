//! Pipe/utility network design-rule validation: cover depth, min/max slope,
//! and pipe diameter checks against a terrain surface.
//!
//! Port of `packages/domain/src/civil/pipedesign.ts` +
//! `packages/domain/src/civil/types/pipeDesign.ts`. The TS source seeds its
//! `DEFAULT_PIPE_DESIGN_RULES` from `federalReference.json`'s
//! `standards.roads` and the parts-catalog registry's `"pipes"` subcategory
//! (which, at the time of this port, has no registered parts — so the
//! catalog lookup always falls through to the federal-data fallback
//! anyway). See `crates/thoth-civil/GAPS.md`.

use std::collections::HashMap;

use thoth_spatial::{distance, Point};

use crate::network::{InfrastructureNetwork, NetworkNode};
use crate::terrain::{elevation_at, ElevationGrid};

/// Design rules settings for utility networks validation.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PipeDesignRules {
    /// Minimum depth from terrain surface to top of pipe, in plan units.
    pub min_cover: f64,
    /// Minimum pipe gradient slope (e.g. `0.005` = 0.5%).
    pub min_slope: f64,
    /// Maximum pipe gradient slope (e.g. `0.08` = 8.0%).
    pub max_slope: f64,
    /// Minimum pipe size diameter, in plan units.
    pub min_pipe_diameter: f64,
    /// Default sump depth below lowest invert.
    pub default_sump_depth: f64,
}

/// Default Federal DOT utility network design rules. Mirrors
/// `federalReference.json`'s `standards.roads` (`minCoverFt`, `minPipeSlope`,
/// `maxPipeSlope`, `minPipeDiameterIn / 12`, `defaultSumpDepthFt`).
pub const DEFAULT_PIPE_DESIGN_RULES: PipeDesignRules = PipeDesignRules {
    min_cover: 3.0,
    min_slope: 0.005,
    max_slope: 0.08,
    min_pipe_diameter: 1.0, // 12 in / 12
    default_sump_depth: 2.0,
};

/// The kind of design-rule violation found on a pipe network element.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PipeViolationType {
    LowCover,
    MinSlope,
    MaxSlope,
    SizeClash,
    SumpError,
}

/// How serious a violation is.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Severity {
    Warning,
    Critical,
}

/// Warning or clearance violation on a pipe network element.
#[derive(Debug, Clone, PartialEq)]
pub struct PipeRuleViolation {
    pub element_id: String,
    pub violation_type: PipeViolationType,
    pub severity: Severity,
    pub message: String,
    /// Distance along the pipe edge from its start node.
    pub station_or_offset: Option<f64>,
}

/// Inverts and rim elevation details for a utility junction structure node.
#[derive(Debug, Clone, PartialEq)]
pub struct StructureElevationDetails {
    pub node_id: String,
    pub name: String,
    pub rim_elevation: f64,
    pub sump_elevation: f64,
    pub lowest_invert_out: f64,
}

/// Inverts and slope details for a pipeline edge.
#[derive(Debug, Clone, PartialEq)]
pub struct PipeElevationDetails {
    pub edge_id: String,
    pub length: f64,
    pub slope: f64,
    pub invert_start: f64,
    pub invert_end: f64,
    pub diameter: f64,
}

/// The full result of validating a pipe network against design rules.
#[derive(Debug, Clone, PartialEq)]
pub struct PipeNetworkValidation {
    pub violations: Vec<PipeRuleViolation>,
    pub node_elevations: Vec<StructureElevationDetails>,
    pub edge_elevations: Vec<PipeElevationDetails>,
}

/// Checks a pipe network against design rules using a terrain surface.
///
/// `node_inverts` maps node id → invert elevation (required for every node
/// the caller wants validated at a design invert; nodes without an entry
/// default to `rim - 6`, mirroring the TS `nodeInverts[node.id] ?? rim - 6`).
/// `node_rims` optionally overrides the terrain-derived rim elevation for
/// specific nodes.
pub fn validate_pipe_network(network: &InfrastructureNetwork, terrain: &ElevationGrid, rules: PipeDesignRules, node_inverts: &HashMap<String, f64>, node_rims: Option<&HashMap<String, f64>>) -> PipeNetworkValidation {
    let mut violations = Vec::new();
    let mut node_elevations = Vec::new();
    let mut edge_elevations = Vec::new();

    let nodes_map: HashMap<&str, &NetworkNode> = network.nodes.iter().map(|n| (n.id.as_str(), n)).collect();

    for node in &network.nodes {
        let rim = node_rims.and_then(|m| m.get(&node.id)).copied().unwrap_or_else(|| elevation_at(terrain, node.point));
        let lowest_connected_invert = node_inverts.get(&node.id).copied().unwrap_or(rim - 6.0);

        let sump_depth = rules.default_sump_depth;
        let sump = lowest_connected_invert - sump_depth;

        let suffix_len = node.id.len().min(3);
        node_elevations.push(StructureElevationDetails {
            node_id: node.id.clone(),
            name: format!("Structure #{}", &node.id[node.id.len() - suffix_len..]),
            rim_elevation: rim,
            sump_elevation: sump,
            lowest_invert_out: lowest_connected_invert,
        });
    }

    for edge in &network.edges {
        let (Some(&from_node), Some(&to_node)) = (nodes_map.get(edge.from.as_str()), nodes_map.get(edge.to.as_str())) else {
            continue;
        };

        let len = distance(from_node.point, to_node.point);
        if len <= 0.0001 {
            continue;
        }

        let start_invert = node_inverts.get(&edge.from).copied().unwrap_or_else(|| elevation_at(terrain, from_node.point) - 6.0);
        let end_invert = node_inverts.get(&edge.to).copied().unwrap_or_else(|| elevation_at(terrain, to_node.point) - 6.0);
        let pipe_diameter = edge.width.unwrap_or(1.0); // default 1 plan unit

        let slope = (end_invert - start_invert).abs() / len;
        edge_elevations.push(PipeElevationDetails { edge_id: edge.id.clone(), length: len, slope, invert_start: start_invert, invert_end: end_invert, diameter: pipe_diameter });

        // Rule: diameter check.
        if pipe_diameter < rules.min_pipe_diameter {
            violations.push(PipeRuleViolation {
                element_id: edge.id.clone(),
                violation_type: PipeViolationType::SizeClash,
                severity: Severity::Warning,
                message: format!("Pipe diameter of {} units is smaller than minimum required diameter of {} units.", pipe_diameter, rules.min_pipe_diameter),
                station_or_offset: None,
            });
        }

        // Rule: slope check.
        if slope < rules.min_slope {
            violations.push(PipeRuleViolation {
                element_id: edge.id.clone(),
                violation_type: PipeViolationType::MinSlope,
                severity: Severity::Warning,
                message: format!("Gradient of {:.2}% is below minimum slope rule of {:.2}%.", slope * 100.0, rules.min_slope * 100.0),
                station_or_offset: None,
            });
        } else if slope > rules.max_slope {
            violations.push(PipeRuleViolation {
                element_id: edge.id.clone(),
                violation_type: PipeViolationType::MaxSlope,
                severity: Severity::Warning,
                message: format!("Gradient of {:.2}% exceeds maximum slope rule of {:.2}%.", slope * 100.0, rules.max_slope * 100.0),
                station_or_offset: None,
            });
        }

        // Rule: cover depth check along the pipe length.
        let steps = 5;
        for i in 0..=steps {
            let ratio = i as f64 / steps as f64;
            let x = from_node.point.x + (to_node.point.x - from_node.point.x) * ratio;
            let y = from_node.point.y + (to_node.point.y - from_node.point.y) * ratio;
            let p = Point::new(x, y);

            let z_terrain = elevation_at(terrain, p);
            let z_invert = start_invert + (end_invert - start_invert) * ratio;
            let cover_depth = z_terrain - (z_invert + pipe_diameter); // top of pipe to surface

            if cover_depth < rules.min_cover {
                violations.push(PipeRuleViolation {
                    element_id: edge.id.clone(),
                    violation_type: PipeViolationType::LowCover,
                    severity: if cover_depth < 0.0 { Severity::Critical } else { Severity::Warning },
                    message: format!("Inadequate cover depth of {:.2} units at {}% station. Minimum required is {} units.", cover_depth, (ratio * 100.0).round(), rules.min_cover),
                    station_or_offset: Some(ratio * len),
                });
                break; // stop listing multiple cover depth warnings for the same pipe
            }
        }
    }

    PipeNetworkValidation { violations, node_elevations, edge_elevations }
}

/// A pipe material.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PipeMaterial {
    Concrete,
    Pvc,
    Hdpe,
    DuctileIron,
}

/// A detailed pipe network structure node (manhole, catch basin, outfall, or
/// junction), as distinct from the generic [`NetworkNode`] used for
/// topology-only analysis.
#[derive(Debug, Clone, PartialEq)]
pub struct PipeNode {
    pub id: String,
    pub name: String,
    pub kind: PipeNodeKind,
    pub position: Point,
    pub rim_elevation: f64,
    pub invert_elevation: f64,
    pub sump_depth: Option<f64>,
}

/// The structural role of a [`PipeNode`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PipeNodeKind {
    Manhole,
    CatchBasin,
    Outfall,
    Junction,
}

/// A detailed pipe segment between two [`PipeNode`]s.
#[derive(Debug, Clone, PartialEq)]
pub struct PipeSegment {
    pub id: String,
    pub name: String,
    pub from_node_id: String,
    pub to_node_id: String,
    /// Diameter, inches.
    pub diameter: f64,
    pub material: PipeMaterial,
    pub n_manning: f64,
    pub start_invert: f64,
    pub end_invert: f64,
}

/// A detailed pipe network (storm or sanitary), carrying [`PipeNode`]/
/// [`PipeSegment`] structures rather than the generic topology-only
/// [`NetworkNode`]/[`NetworkEdge`].
#[derive(Debug, Clone, PartialEq)]
pub struct PipeNetwork {
    pub id: String,
    pub name: String,
    pub kind: PipeNetworkKind,
    pub nodes: Vec<PipeNode>,
    pub pipes: Vec<PipeSegment>,
}

/// Whether a [`PipeNetwork`] carries stormwater or sanitary sewage.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PipeNetworkKind {
    Storm,
    Sanitary,
}

/// A single check-severity result against a [`PipeNetwork`] element.
#[derive(Debug, Clone, PartialEq)]
pub struct PipeCheckViolation {
    pub element_id: String,
    pub code: String,
    pub severity: PipeCheckSeverity,
    pub message: String,
}

/// Severity of a [`PipeCheckViolation`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PipeCheckSeverity {
    Error,
    Warning,
}

/// Summary analysis report for a [`PipeNetwork`].
#[derive(Debug, Clone, PartialEq)]
pub struct PipeNetworkAnalysisReport {
    pub network_id: String,
    pub violations: Vec<PipeCheckViolation>,
    pub total_length: f64,
    pub pipe_count: usize,
    pub structure_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::network::{NetworkEdge, NetworkKind};

    fn grid() -> ElevationGrid {
        ElevationGrid::new(Point::new(0.0, 0.0), 10.0, 3, 3, vec![10.0; 9]).unwrap()
    }

    fn net() -> InfrastructureNetwork {
        InfrastructureNetwork {
            id: "n1".into(),
            name: "Sewer Network".into(),
            kind: NetworkKind::Sewer,
            nodes: vec![NetworkNode { id: "node1".into(), point: Point::new(0.0, 0.0) }, NetworkNode { id: "node2".into(), point: Point::new(20.0, 0.0) }],
            edges: vec![NetworkEdge { id: "edge1".into(), from: "node1".into(), to: "node2".into(), width: Some(1.5), road_class: None }],
        }
    }

    fn rules() -> PipeDesignRules {
        PipeDesignRules { min_cover: 4.0, min_slope: 0.005, max_slope: 0.08, min_pipe_diameter: 1.0, default_sump_depth: 1.5 }
    }

    #[test]
    fn flags_cover_depth_violations_when_pipe_is_too_shallow() {
        let inverts = HashMap::from([("node1".to_string(), 8.0), ("node2".to_string(), 8.0)]);
        let res = validate_pipe_network(&net(), &grid(), rules(), &inverts, None);
        assert!(res.violations.iter().any(|v| v.violation_type == PipeViolationType::LowCover));
    }

    #[test]
    fn passes_when_cover_and_slope_rules_are_satisfied() {
        let inverts = HashMap::from([("node1".to_string(), 4.0), ("node2".to_string(), 3.5)]);
        let res = validate_pipe_network(&net(), &grid(), rules(), &inverts, None);
        assert_eq!(res.violations.len(), 0);
    }

    #[test]
    fn zero_length_edges_are_skipped_without_panicking() {
        let mut n = net();
        n.nodes[1].point = n.nodes[0].point; // coincident nodes => zero-length edge
        let inverts = HashMap::from([("node1".to_string(), 4.0), ("node2".to_string(), 4.0)]);
        let res = validate_pipe_network(&n, &grid(), rules(), &inverts, None);
        assert!(res.edge_elevations.is_empty());
    }

    #[test]
    fn default_rules_match_federal_reference_values() {
        assert_eq!(DEFAULT_PIPE_DESIGN_RULES.min_cover, 3.0);
        assert_eq!(DEFAULT_PIPE_DESIGN_RULES.min_slope, 0.005);
        assert_eq!(DEFAULT_PIPE_DESIGN_RULES.max_slope, 0.08);
    }
}
