import type { Point } from "../../spatial/geometry";

export type IntersectionType = "peerRoadAllCrowns" | "primaryRoadCrown";

export interface CurbReturnQuadrant {
  quadrant: "NE" | "NW" | "SE" | "SW";
  radius: number;
  entryTaperLength?: number;
  exitTaperLength?: number;
}

export interface Intersection {
  id: string;
  name: string;
  primaryAlignmentId: string;
  secondaryAlignmentId: string;
  intersectionPoint: Point;
  intersectionType: IntersectionType;
  primaryStation: number;
  secondaryStation: number;
  quadrants: CurbReturnQuadrant[];
  lockedPVIs?: boolean;
}

export interface SplitterIslandPreset {
  constructionTriangleLength: number;
  splitterIslandWidth: number;
  crosswalkOffset: number;
}

export interface RoundaboutPreset {
  id: string;
  name: string;
  outerRadius: number;
  circulatoryWidth: number;
  apronWidth: number;
  entryWidth: number;
  exitWidth: number;
  splitterIsland: SplitterIslandPreset;
}

export interface Roundabout {
  id: string;
  name: string;
  centerPoint: Point;
  preset: RoundaboutPreset;
  approachAlignmentIds: string[];
}

export interface FastestPathAnalysisResult {
  r1EntryRadius: number;
  r2CirculatoryRadius: number;
  r3ExitRadius: number;
  maxEntrySpeedMph: number;
  maxCirculatorySpeedMph: number;
  maxExitSpeedMph: number;
  isCompliant: boolean;
}
