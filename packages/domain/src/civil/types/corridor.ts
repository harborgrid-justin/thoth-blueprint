export interface CorridorTarget {
  id: string;
  subassemblyId: string;
  targetType: "surface" | "offsetAlignment" | "elevationProfile" | "polyline";
  targetId: string;
}

export interface CorridorRegion {
  id: string;
  name: string;
  assemblyId: string;
  startStation: number;
  endStation: number;
  frequency?: number;
  targets?: CorridorTarget[];
}

export interface StationParameterOverride {
  station: number;
  subassemblyId: string;
  parameterName: string;
  value: number;
}

export interface Corridor {
  id: string;
  name: string;
  alignmentId: string;
  profileId: string;
  assemblyId: string;
  frequency: number; // Station interval (e.g. 50 or 100 feet)
  regions?: CorridorRegion[];
  overrides?: StationParameterOverride[];
}

export interface CorridorSectionPoint {
  code: string;
  station: number;
  x: number;
  y: number;
  z: number;
}

export interface CorridorFeatureLine {
  code: string;
  points: { x: number; y: number; z: number }[];
}

export interface CorridorSurfaceMesh {
  code: "Top" | "Datum" | string;
  triangles: { p1: { x: number; y: number; z: number }; p2: { x: number; y: number; z: number }; p3: { x: number; y: number; z: number } }[];
}

