/**
 * Infrastructure networks — roads and utilities modeled as connected nodes and
 * edges rather than loose lines (per the glossary). These carry the community's
 * circulation and services; the functions here measure length, connectivity,
 * intersections, right-of-way corridor area, and service coverage.
 */

import _ from "lodash";
import {
  closestPointOnSegment,
  distance,
  polylineLength,
  type Point,
  type Polyline,
} from "../spatial/geometry";
import type { SpatialContext } from "../spatial/spatial";

import type {
  NetworkKind,
  RoadClass,
  NetworkNode,
  NetworkEdge,
  InfrastructureNetwork,
  NetworkStats,
} from "./types/network";

export type {
  NetworkKind,
  RoadClass,
  NetworkNode,
  NetworkEdge,
  InfrastructureNetwork,
  NetworkStats,
};

function nodeMap(network: InfrastructureNetwork): Map<string, NetworkNode> {
  return new Map(network.nodes.map((n) => [n.id, n]));
}

/** Endpoints of an edge as points, or null if a node is missing. */
export function edgePoints(
  network: InfrastructureNetwork,
  edge: NetworkEdge,
  nodes = nodeMap(network),
): [Point, Point] | null {
  const a = nodes.get(edge.from);
  const b = nodes.get(edge.to);
  return a && b ? [a.point, b.point] : null;
}

/** Length of a single edge in plan units. */
export function edgeLength(network: InfrastructureNetwork, edge: NetworkEdge): number {
  const pts = edgePoints(network, edge);
  return pts ? distance(pts[0], pts[1]) : 0;
}

/** Total network length, in plan units and meters. */
export function networkLength(
  network: InfrastructureNetwork,
  spatial: SpatialContext,
): { plan: number; meters: number } {
  const nodes = nodeMap(network);
  const plan = _.sumBy(network.edges, (e) => {
    const pts = edgePoints(network, e, nodes);
    return pts ? distance(pts[0], pts[1]) : 0;
  });
  return { plan, meters: plan * (spatial.units === "feet" ? 0.3048 : 1) };
}

/** The degree (number of incident edges) of each node. */
export function nodeDegrees(network: InfrastructureNetwork): Map<string, number> {
  const deg = new Map<string, number>();
  for (const n of network.nodes) {deg.set(n.id, 0);}
  for (const e of network.edges) {
    deg.set(e.from, (deg.get(e.from) ?? 0) + 1);
    deg.set(e.to, (deg.get(e.to) ?? 0) + 1);
  }
  return deg;
}

/** Intersection nodes (degree ≥ 3) and dead-end nodes (degree 1). */
export function junctions(network: InfrastructureNetwork): {
  intersections: NetworkNode[];
  deadEnds: NetworkNode[];
} {
  const deg = nodeDegrees(network);
  const intersections: NetworkNode[] = [];
  const deadEnds: NetworkNode[] = [];
  for (const n of network.nodes) {
    const d = deg.get(n.id) ?? 0;
    if (d >= 3) {intersections.push(n);}
    else if (d === 1) {deadEnds.push(n);}
  }
  return { intersections, deadEnds };
}

/** Number of connected components (a fully connected network has exactly 1). */
export function connectedComponents(network: InfrastructureNetwork): number {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) {
      root = parent.get(root)!;
    }
    let curr = x;
    while (curr !== root) {
      const nxt = parent.get(curr)!;
      parent.set(curr, root);
      curr = nxt;
    }
    return root;
  };
  for (const n of network.nodes) {parent.set(n.id, n.id);}
  for (const e of network.edges) {
    const a = find(e.from);
    const b = find(e.to);
    if (a !== b) {parent.set(a, b);}
  }
  const roots = new Set<string>();
  for (const n of network.nodes) {roots.add(find(n.id));}
  return network.nodes.length === 0 ? 0 : roots.size;
}

/** True when every node is reachable from every other. */
export function isConnected(network: InfrastructureNetwork): boolean {
  return connectedComponents(network) <= 1;
}

/**
 * Estimated right-of-way corridor area (Σ edge length × width), in plan units².
 * A first-order measure of land consumed by the network.
 */
export function corridorArea(network: InfrastructureNetwork, nodes = nodeMap(network)): number {
  return _.sumBy(network.edges, (e) => {
    const pts = edgePoints(network, e, nodes);
    if (!pts) {return 0;}
    const w = e.width ?? DEFAULT_ROAD_WIDTH[e.roadClass ?? "local"] ?? 0;
    return distance(pts[0], pts[1]) * w;
  });
}

/** Shortest distance from a point to any edge of the network, in plan units. */
export function distanceToNetwork(
  network: InfrastructureNetwork,
  p: Point,
  nodes = nodeMap(network)
): number {
  let best = Infinity;
  for (const e of network.edges) {
    const pts = edgePoints(network, e, nodes);
    if (!pts) {continue;}
    const c = closestPointOnSegment(p, pts[0], pts[1]);
    best = Math.min(best, distance(p, c));
  }
  return best;
}

/**
 * Service coverage: the fraction of the given points (e.g. lot/building
 * centroids) within `serviceDistance` plan units of the network — a proxy for
 * how well a utility or road serves the community.
 */
export function serviceCoverage(
  network: InfrastructureNetwork,
  points: Point[],
  serviceDistance: number,
): number {
  if (points.length === 0) {return 0;}
  const nodes = nodeMap(network);
  const served = points.filter((p) => distanceToNetwork(network, p, nodes) <= serviceDistance).length;
  return served / points.length;
}

/** Default ROW widths (plan units) by road class. */
export const DEFAULT_ROAD_WIDTH: Record<RoadClass, number> = {
  arterial: 30,
  collector: 22,
  local: 15,
  alley: 6,
  private: 8,
};

/** Build a network from a drawn polyline path (chain of nodes/edges). */
export function networkFromPath(
  id: string,
  name: string,
  kind: NetworkKind,
  path: Polyline,
  makeId: () => string,
  edgeDefaults: Partial<NetworkEdge> = {},
): InfrastructureNetwork {
  const nodes: NetworkNode[] = path.map((point) => ({ id: makeId(), point }));
  const edges: NetworkEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ id: makeId(), from: nodes[i].id, to: nodes[i + 1].id, ...edgeDefaults });
  }
  return { id, name, kind, nodes, edges };
}

export function networkStats(
  network: InfrastructureNetwork,
  spatial: SpatialContext,
): NetworkStats {
  const j = junctions(network);
  return {
    kind: network.kind,
    lengthMeters: networkLength(network, spatial).meters,
    edges: network.edges.length,
    nodes: network.nodes.length,
    intersections: j.intersections.length,
    deadEnds: j.deadEnds.length,
    components: connectedComponents(network),
    connected: isConnected(network),
    corridorArea: corridorArea(network),
  };
}

/** Total polyline length of a raw path (convenience for tooling). */
export function pathLength(path: Polyline): number {
  return polylineLength(path);
}
