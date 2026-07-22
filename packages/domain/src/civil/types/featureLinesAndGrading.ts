import type { Point3D } from './grading';

export interface Arc3D {
  vertexIndex: number;
  radius: number;
  elevationStart: number;
  elevationEnd: number;
}

export interface ElevationPoint {
  distanceAlongSegmentFt: number;
  elevationFt: number;
}

export interface FeatureLine {
  id: string;
  name: string;
  siteId: string;
  styleName?: string;
  points: Point3D[];
  arcs?: Arc3D[];
  elevationPoints?: ElevationPoint[];
  dynamicSurfaceLinkId?: string;
  dynamicCorridorLinkId?: string;
  dynamicAlignmentLinkId?: string;
}

export interface PanoramaElevationEditorRow {
  vertexIndex: number;
  station: number;
  elevation: number;
  length: number;
  gradeBackPercent: number;
  gradeAheadPercent: number;
}

export interface LineWeedingConfig {
  maxAngleDeltaDeg: number;
  maxGradeDeltaPercent: number;
  min3DDistanceFt: number;
}
