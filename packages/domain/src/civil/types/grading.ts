import type { Point } from "../../spatial/geometry";

export interface GradingPad {
  id: string;
  name: string;
  points: { x: number; y: number }[]; // 2D polygon vertices
  targetElevation: number;
  cutSlope: number; // e.g. 2 (representing 2:1 horizontal:vertical)
  fillSlope: number; // e.g. 3 (representing 3:1)
}

export interface VolumeReport {
  cutVolume: number; // cubic yards
  fillVolume: number; // cubic yards
  netVolume: number; // cut - fill
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface FlowArrow {
  point: Point;
  direction: Point;
  slope: number;
}
