import _ from "lodash";
import { type Point } from "../spatial/geometry";
import { type ResolvedAlignment, pointAtStation } from "./alignment";
import { type ElevationGrid, elevationAt } from "./terrain";

import type {
  VerticalPVI,
  VerticalProfile,
  ResolvedVerticalCurve,
  CrossSectionPoint,
  CrossSection,
} from "./types/profile";

export type {
  VerticalPVI,
  VerticalProfile,
  ResolvedVerticalCurve,
  CrossSectionPoint,
  CrossSection,
};

/** Resolve vertical curve parameters for a given PVI, given incoming and outgoing PVIs. */
export function resolveVerticalCurve(
  pvi: VerticalPVI,
  prev?: VerticalPVI,
  next?: VerticalPVI,
): ResolvedVerticalCurve | null {
  if (!pvi.curveLength || pvi.curveLength <= 0 || !prev || !next) {return null;}

  const L = pvi.curveLength;
  const g1 = (pvi.elevation - prev.elevation) / (pvi.station - prev.station);
  const g2 = (next.elevation - pvi.elevation) / (next.station - pvi.station);

  const startStation = pvi.station - L / 2;
  const endStation = pvi.station + L / 2;

  // Elevation at curve start on the incoming tangent
  const startElevation = pvi.elevation - g1 * (L / 2);
  const endElevation = pvi.elevation + g2 * (L / 2);

  const gradeChange = Math.abs(g2 - g1) * 100; // in percent
  const kValue = gradeChange > 0.0001 ? L / gradeChange : Infinity;

  // Parabolic equation: y = ax^2 + bx + c
  // x = station - startStation (x ranges from 0 to L)
  // At x = 0, y = startElevation, y' = g1 => c = startElevation, b = g1
  // At x = L, y = endElevation, y' = g2 => a = (g2 - g1) / (2 * L)
  const a = (g2 - g1) / (2 * L);
  const b = g1;
  const c = startElevation;

  return {
    pviStation: pvi.station,
    pviElevation: pvi.elevation,
    startStation,
    endStation,
    startElevation,
    endElevation,
    gradeIn: g1,
    gradeOut: g2,
    curveLength: L,
    kValue,
    a,
    b,
    c,
  };
}

/** Calculate the vertical profile elevation at a given station. */
export function profileElevationAt(profile: VerticalProfile, station: number): number {
  if (profile.pvis.length === 0) {return 0;}
  const sorted = _.sortBy(profile.pvis, "station");

  if (station <= sorted[0].station) {return sorted[0].elevation;}
  if (station >= sorted[sorted.length - 1].station) {return sorted[sorted.length - 1].elevation;}

  // Find the PVI segment containing this station
  let idx = 0;
  while (idx < sorted.length - 1 && sorted[idx + 1].station < station) {
    idx++;
  }

  const pvi = sorted[idx];
  const nextPvi = sorted[idx + 1];
  const prevPvi = idx > 0 ? sorted[idx - 1] : undefined;

  // Check if we are inside the vertical curve of PVI
  if (pvi.curveLength && pvi.curveLength > 0 && prevPvi) {
    const curve = resolveVerticalCurve(pvi, prevPvi, nextPvi);
    if (curve && station >= curve.startStation && station <= curve.endStation) {
      const x = station - curve.startStation;
      return curve.a * x * x + curve.b * x + curve.c;
    }
  }

  // Check vertical curve of nextPvi
  const nextNextPvi = idx + 2 < sorted.length ? sorted[idx + 2] : undefined;
  if (nextPvi.curveLength && nextPvi.curveLength > 0 && nextNextPvi) {
    const curve = resolveVerticalCurve(nextPvi, pvi, nextNextPvi);
    if (curve && station >= curve.startStation && station <= curve.endStation) {
      const x = station - curve.startStation;
      return curve.a * x * x + curve.b * x + curve.c;
    }
  }

  // Straight line interpolation (tangent run)
  const ratio = (station - pvi.station) / (nextPvi.station - pvi.station);
  return pvi.elevation + (nextPvi.elevation - pvi.elevation) * ratio;
}



/**
 * Samples a cross-section slice of the terrain (existing and proposed heights)
 * at a given station along a horizontal alignment.
 */
export function sampleCrossSection(
  existingGrid: ElevationGrid,
  proposedGrid: ElevationGrid | null,
  resolved: ResolvedAlignment,
  station: number,
  swathWidth: number,
  stepSize = 5,
): CrossSection | null {
  const at = pointAtStation(resolved, station);
  if (!at) {return null;}

  const { point, bearing } = at;
  const rad = (bearing * Math.PI) / 180;
  
  // Right-of-travel direction unit vector (perpendicular to bearing)
  const nx = Math.cos(rad);
  const ny = Math.sin(rad);

  const existingPoints: CrossSectionPoint[] = [];
  const proposedPoints: CrossSectionPoint[] = [];

  // Traverse from -swathWidth to +swathWidth (Left to Right)
  const minOffset = -swathWidth;
  const maxOffset = swathWidth;

  for (let offset = minOffset; offset <= maxOffset; offset += stepSize) {
    const pWorld: Point = {
      x: point.x + offset * nx,
      y: point.y + offset * ny,
    };

    const zExist = elevationAt(existingGrid, pWorld);
    existingPoints.push({ offset, elevation: zExist });

    if (proposedGrid) {
      const zProp = elevationAt(proposedGrid, pWorld);
      proposedPoints.push({ offset, elevation: zProp });
    }
  }

  return {
    station,
    centerpoint: point,
    existingPoints,
    proposedPoints,
  };
}
