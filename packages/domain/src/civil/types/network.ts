import type { Point } from "../../spatial/geometry";

/** The kind of system a network carries. */
export type NetworkKind =
  "road" | "path" | "water" | "sewer" | "storm" | "power";

/** Functional road classification (drives width and hierarchy). */
export type RoadClass =
  "arterial" | "collector" | "local" | "alley" | "private";

/** A junction/vertex in a network. */
export interface NetworkNode {
  id: string;
  point: Point;
}

/** A connection between two nodes, with an optional corridor width. */
export interface NetworkEdge {
  id: string;
  from: string;
  to: string;
  /** Corridor / pipe width in plan units (ROW width for roads). */
  width?: number;
  roadClass?: RoadClass;
}

/** A connected linear system (a road network, a water main, …). */
export interface InfrastructureNetwork {
  id: string;
  name: string;
  kind: NetworkKind;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

/** Summary statistics for a network. */
export interface NetworkStats {
  kind: NetworkKind;
  lengthMeters: number;
  edges: number;
  nodes: number;
  intersections: number;
  deadEnds: number;
  components: number;
  connected: boolean;
  corridorArea: number;
}
