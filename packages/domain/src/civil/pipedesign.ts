import {
  type InfrastructureNetwork,
  type NetworkNode,
  type NetworkEdge,
} from "./network";
import { type ElevationGrid, elevationAt } from "./terrain";
import { distance } from "../spatial/geometry";
import type {
  PipeMaterial,
  PipeNode,
  PipeSegment,
  PipeNetwork,
  PipeCheckViolation,
  PipeNetworkAnalysisReport,
} from "./types/pipedesign";

export type {
  PipeMaterial,
  PipeNode,
  PipeSegment,
  PipeNetwork,
  PipeCheckViolation,
  PipeNetworkAnalysisReport,
};

import federalData from "../planning/geoid/data/federalReference.json";

const defaultRoads = federalData.standards.roads;

/** Design rules settings for utility networks validation. */
export interface PipeDesignRules {
  minCover: number; // Minimum depth from terrain surface to top of pipe, in plan units
  minSlope: number; // Minimum pipe gradient slope (e.g. 0.005 = 0.5%)
  maxSlope: number; // Maximum pipe gradient slope (e.g. 0.08 = 8.0%)
  minPipeDiameter: number; // Minimum pipe size diameter, in plan units
  defaultSumpDepth: number; // Default sump depth below lowest invert
}

/** Default Federal DOT utility network design rules. */
export const DEFAULT_PIPE_DESIGN_RULES: PipeDesignRules = {
  minCover: defaultRoads.minCoverFt,
  minSlope: defaultRoads.minPipeSlope,
  maxSlope: defaultRoads.maxPipeSlope,
  minPipeDiameter: defaultRoads.minPipeDiameterIn / 12,
  defaultSumpDepth: defaultRoads.defaultSumpDepthFt,
};

/** Warning or clearance violation on a pipe network element. */
export interface PipeRuleViolation {
  elementId: string;
  type: "low_cover" | "min_slope" | "max_slope" | "size_clash" | "sump_error";
  severity: "warning" | "critical";
  message: string;
  stationOrOffset?: number; // Distance along pipe edge from start node
}

/** Inverts and rim elevations details for a utility junction structure node. */
export interface StructureElevationDetails {
  nodeId: string;
  name: string;
  rimElevation: number;
  sumpElevation: number;
  lowestInvertOut: number;
}

/** Inverts and slope details for a pipeline edge. */
export interface PipeElevationDetails {
  edgeId: string;
  length: number;
  slope: number;
  invertStart: number;
  invertEnd: number;
  diameter: number;
}

/** Checks a pipe network against design rules using terrain surface. */
export function validatePipeNetwork(
  network: InfrastructureNetwork,
  terrain: ElevationGrid,
  rules: PipeDesignRules = DEFAULT_PIPE_DESIGN_RULES,
  nodeInverts: Record<string, number>, // Map from nodeId to invert elevation (at center)
  nodeRims?: Record<string, number>, // Optional manual rims overrides
): {
  violations: PipeRuleViolation[];
  nodeElevations: StructureElevationDetails[];
  edgeElevations: PipeElevationDetails[];
} {
  const violations: PipeRuleViolation[] = [];
  const nodeElevations: StructureElevationDetails[] = [];
  const edgeElevations: PipeElevationDetails[] = [];

  const nodesMap = new Map<string, NetworkNode>(
    network.nodes.map((n) => [n.id, n]),
  );

  // Calculate rims and sumps for structures
  const nodeConnectedEdges = new Map<string, NetworkEdge[]>();
  for (const n of network.nodes) {
    nodeConnectedEdges.set(n.id, []);
  }
  for (const e of network.edges) {
    nodeConnectedEdges.get(e.from)?.push(e);
    nodeConnectedEdges.get(e.to)?.push(e);
  }

  for (const node of network.nodes) {
    const rim = nodeRims?.[node.id] ?? elevationAt(terrain, node.point);
    const lowestConnectedInvert = nodeInverts[node.id] ?? rim - 6; // default invert 6 units below

    const sumpDepth = rules.defaultSumpDepth;
    const sump = lowestConnectedInvert - sumpDepth;

    nodeElevations.push({
      nodeId: node.id,
      name: `Structure #${node.id.substring(node.id.length - 3)}`,
      rimElevation: rim,
      sumpElevation: sump,
      lowestInvertOut: lowestConnectedInvert,
    });
  }

  // Validate pipes (edges)
  for (const edge of network.edges) {
    const fromNode = nodesMap.get(edge.from);
    const toNode = nodesMap.get(edge.to);
    if (!fromNode || !toNode) {
      continue;
    }

    const len = distance(fromNode.point, toNode.point);
    if (len <= 0.0001) {
      continue;
    }

    const startInvert =
      nodeInverts[edge.from] ?? elevationAt(terrain, fromNode.point) - 6;
    const endInvert =
      nodeInverts[edge.to] ?? elevationAt(terrain, toNode.point) - 6;
    const pipeDiameter = edge.width ?? 1.0; // default 1 plan unit

    const slope = Math.abs(endInvert - startInvert) / len;
    edgeElevations.push({
      edgeId: edge.id,
      length: len,
      slope,
      invertStart: startInvert,
      invertEnd: endInvert,
      diameter: pipeDiameter,
    });

    // Rule: Diameter Check
    if (pipeDiameter < rules.minPipeDiameter) {
      violations.push({
        elementId: edge.id,
        type: "size_clash",
        severity: "warning",
        message: `Pipe diameter of ${pipeDiameter} units is smaller than minimum required diameter of ${rules.minPipeDiameter} units.`,
      });
    }

    // Rule: Slope Check
    if (slope < rules.minSlope) {
      violations.push({
        elementId: edge.id,
        type: "min_slope",
        severity: "warning",
        message: `Gradient of ${(slope * 100).toFixed(2)}% is below minimum slope rule of ${(rules.minSlope * 100).toFixed(2)}%.`,
      });
    } else if (slope > rules.maxSlope) {
      violations.push({
        elementId: edge.id,
        type: "max_slope",
        severity: "warning",
        message: `Gradient of ${(slope * 100).toFixed(2)}% exceeds maximum slope rule of ${(rules.maxSlope * 100).toFixed(2)}%.`,
      });
    }

    // Rule: Cover Depth Check along the pipe length
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const x = fromNode.point.x + (toNode.point.x - fromNode.point.x) * ratio;
      const y = fromNode.point.y + (toNode.point.y - fromNode.point.y) * ratio;
      const p: Point = { x, y };

      const zTerrain = elevationAt(terrain, p);
      const zInvert = startInvert + (endInvert - startInvert) * ratio;
      const coverDepth = zTerrain - (zInvert + pipeDiameter); // from top of pipe to surface

      if (coverDepth < rules.minCover) {
        violations.push({
          elementId: edge.id,
          type: "low_cover",
          severity: coverDepth < 0 ? "critical" : "warning",
          message: `Inadequate cover depth of ${coverDepth.toFixed(2)} units at ${Math.round(ratio * 100)}% station. Minimum required is ${rules.minCover} units.`,
          stationOrOffset: ratio * len,
        });
        break; // Stop listing multiple cover depth warnings for same pipe
      }
    }
  }

  return {
    violations,
    nodeElevations,
    edgeElevations,
  };
}

interface Point {
  x: number;
  y: number;
}
