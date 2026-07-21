import type { Point } from "../../spatial/geometry";

export interface SlideLineOptions {
  targetArea: number;
  frontage: Point[];
  angle?: number; // angle in degrees relative to frontage tangent (default 90)
  layerId: string;
  makeId: () => string;
  setback?: number;
}

export interface SwingLineOptions {
  targetArea: number;
  pivot: Point;
  startAngle?: number; // unused in corner-sweep mode, kept for backwards compatibility
  layerId: string;
  makeId: () => string;
  setback?: number;
}
