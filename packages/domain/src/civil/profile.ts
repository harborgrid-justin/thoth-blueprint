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
  if (!pvi.curveLength || pvi.curveLength <= 0 || !prev || !next) {
    return null;
  }

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
export function profileElevationAt(
  profile: VerticalProfile,
  station: number,
): number {
  if (profile.pvis.length === 0) {
    return 0;
  }
  const sorted = _.sortBy(profile.pvis, "station");

  if (station <= sorted[0].station) {
    return sorted[0].elevation;
  }
  if (station >= sorted[sorted.length - 1].station) {
    return sorted[sorted.length - 1].elevation;
  }

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
  if (!at) {
    return null;
  }

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

/**
 * Extracts Existing Ground (EG) surface profile elevations along an alignment baseline. (REQ-12-001)
 */
export function extractSurfaceProfile(
  grid: ElevationGrid,
  resolved: ResolvedAlignment,
  sampleInterval = 25,
): VerticalProfile {
  const pvis: VerticalPVI[] = [];
  const totalLen = resolved.length;
  const count = Math.max(2, Math.floor(totalLen / sampleInterval));

  for (let i = 0; i <= count; i++) {
    const station = resolved.startStation + (totalLen * i) / count;
    const at = pointAtStation(resolved, station);
    if (!at) {
      continue;
    }
    const elev = elevationAt(grid, at.point);
    pvis.push({ station, elevation: elev });
  }

  return {
    id: `eg-prof-${Date.now()}`,
    name: `${resolved.name} - Existing Ground Profile`,
    alignmentId: resolved.name,
    pvis,
  };
}

/**
 * Validates vertical design profile K-values against minimum stopping sight distance criteria. (REQ-12-012, REQ-12-013)
 */
export function validateProfileKValues(
  profile: VerticalProfile,
  designSpeed = 45,
): { pviIndex: number; station: number; kValue: number; minK: number; isViolation: boolean; message: string }[] {
  const pvis = _.sortBy(profile.pvis, "station");
  const results: { pviIndex: number; station: number; kValue: number; minK: number; isViolation: boolean; message: string }[] = [];

  // AASHTO minimum K-values for crest curves (e.g. 45 mph => Crest K=61, Sag K=79)
  const minKCrest = designSpeed <= 25 ? 12 : designSpeed <= 35 ? 29 : designSpeed <= 45 ? 61 : 151;
  const minKSag = designSpeed <= 25 ? 26 : designSpeed <= 35 ? 49 : designSpeed <= 45 ? 79 : 136;

  for (let i = 1; i < pvis.length - 1; i++) {
    const pvi = pvis[i];
    if (!pvi.curveLength || pvi.curveLength <= 0) {
      continue;
    }
    const curve = resolveVerticalCurve(pvi, pvis[i - 1], pvis[i + 1]);
    if (!curve) {
      continue;
    }
    const isCrest = curve.gradeIn > curve.gradeOut;
    const minK = isCrest ? minKCrest : minKSag;
    const isViolation = curve.kValue < minK;

    results.push({
      pviIndex: i,
      station: pvi.station,
      kValue: curve.kValue,
      minK,
      isViolation,
      message: isViolation
        ? `Vertical curve at station ${pvi.station.toFixed(2)} has K=${curve.kValue.toFixed(1)} below AASHTO minimum K=${minK} for ${designSpeed} mph.`
        : `Vertical curve at station ${pvi.station.toFixed(2)} meets AASHTO standards.`,
    });
  }

  return results;
}

/**
 * Copies a profile and applies a constant vertical offset (REQ-12-011).
 */
export function copyAndOffsetProfile(
  profile: VerticalProfile,
  verticalDelta: number,
  nameSuffix = "Offset",
): VerticalProfile {
  return {
    id: `${profile.id}-off-${verticalDelta}`,
    name: `${profile.name} ${nameSuffix} (${verticalDelta >= 0 ? "+" : ""}${verticalDelta.toFixed(1)}ft)`,
    alignmentId: profile.alignmentId,
    pvis: profile.pvis.map((p) => ({ ...p, elevation: p.elevation + verticalDelta })),
  };
}

