export interface Corridor {
  id: string;
  name: string;
  alignmentId: string;
  profileId: string;
  assemblyId: string;
  frequency: number; // Station interval (e.g. 50 or 100 feet)
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
