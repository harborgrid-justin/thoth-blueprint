/** A single point with optional color and intensity. */
export interface CloudPoint {
  x: number;
  y: number;
  z: number;
  r?: number;
  g?: number;
  b?: number;
  intensity?: number;
}

/** A cloud of points. */
export interface PointCloud {
  points: CloudPoint[];
}

/** Supported point-cloud formats. */
export type PointCloudFormat = "xyz" | "pts" | "ply" | "las" | "dxf";

/** Text-based formats serialize to a string; LAS serializes to bytes. */
export type PointCloudData = string | ArrayBuffer;
