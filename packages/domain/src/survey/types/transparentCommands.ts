export interface Point2D {
  x: number;
  y: number;
}

export interface LineSegment {
  start: Point2D;
  end: Point2D;
}

export interface PolylineEntity {
  id: string;
  vertices: Point2D[];
  arcs?: Array<{ vertexIndex: number; radius: number; isClockwise: boolean }>;
}

export interface BearingDistanceEntry {
  bearingDeg: number;
  distanceFt: number;
}

export interface DeflectionDistanceEntry {
  deflectionAngleDeg: number;
  distanceFt: number;
}

export interface StationOffsetEntry {
  station: number;
  offsetFt: number;
}
