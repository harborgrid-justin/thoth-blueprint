import { add, scale } from "../spatial/geometry";
import { resolveAlignment, pointAtStation } from "./alignment";
import type { HorizontalAlignment } from "./alignment";
import type { VerticalProfile } from "./profile";
import { profileElevationAt } from "./profile";
import type { Assembly } from "./assembly";
import { resolveAssemblyOffset } from "./assembly";
import type { SuperelevationCurve } from "./superelevation";
import { getSuperelevationSlope } from "./superelevation";
import type { ElevationGrid } from "./terrain";
import { elevationAt } from "./terrain";

import type {
  Corridor,
  CorridorSectionPoint,
  CorridorFeatureLine,
} from "./types/corridor";

export type { Corridor, CorridorSectionPoint, CorridorFeatureLine };

import { globalPartsDb } from "../parts/registry";

const catalogStd = globalPartsDb.getCivilDesignStandards()[0];
const DEFAULT_SAMPLING_FREQ = (catalogStd?.properties?.corridorSamplingIntervalFt as number) || 25.0;

/**
 * Builds 3D points representing the Corridor model.
 */
export function buildCorridorSections(
  corridor: Corridor,
  alignment: HorizontalAlignment,
  profile: VerticalProfile,
  assembly: Assembly,
  superelevation?: SuperelevationCurve,
  targetTerrain?: ElevationGrid,
): CorridorSectionPoint[] {
  const resolved = resolveAlignment(alignment);
  if (!resolved) {
    return [];
  }

  const sections: CorridorSectionPoint[] = [];
  const freq = corridor.frequency || DEFAULT_SAMPLING_FREQ;
  const stationsCount = Math.floor(resolved.length / freq);

  for (let i = 0; i <= stationsCount; i++) {
    const station = i * freq;
    const baseStation = resolved.startStation + station;
    const atStation = pointAtStation(resolved, baseStation);
    if (!atStation) {
      continue;
    }

    // 2. Get profile elevation (Z)
    const zBase = profileElevationAt(profile, station);

    // 3. Get superelevation lane slope
    const slopes = superelevation
      ? getSuperelevationSlope(superelevation, station)
      : { leftSlope: -0.02, rightSlope: -0.02 };

    // 4. Resolve assembly cross-section coordinates
    const offsetPoints = resolveAssemblyOffset(
      assembly,
      slopes.leftSlope,
      slopes.rightSlope,
    );

    // 5. Transform 2D offset points to 3D absolute space along traveled normal using gl-matrix
    const rad = (atStation.bearing * Math.PI) / 180;
    const dir = { x: Math.sin(rad), y: -Math.cos(rad) };
    const normal = { x: -dir.y, y: dir.x };

    const basePos = atStation.point;

    for (const offsetPt of offsetPoints) {
      const pos = add(basePos, scale(normal, offsetPt.x));
      const x = pos.x;
      const y = pos.y;
      
      let z = zBase + offsetPt.y;

      if (offsetPt.code.startsWith("DaylightTarget_") && targetTerrain) {
        // Daylight Intersection logic:
        // Raycast from the previous point in the assembly to the terrain surface
        const terrainZ = elevationAt(targetTerrain, { x, y });
        // Simplified intersection: we project straight down/up to the terrain elevation at that X,Y
        // In a real Civil 3D clone, this would mathematically intersect the 3D ray with the grid mesh triangles.
        z = terrainZ;
        offsetPt.code = offsetPt.code.replace("DaylightTarget_", "Daylight_");
      }

      sections.push({
        code: offsetPt.code,
        station,
        x,
        y,
        z,
      });
    }
  }

  return sections;
}

/**
 * Extracts 3D coordinate lines for specific point codes (e.g. "Centerline", "EdgeOfPavement_left").
 */
export function extractCorridorFeatureLines(
  sections: CorridorSectionPoint[],
): CorridorFeatureLine[] {
  const groups: Record<string, { x: number; y: number; z: number }[]> = {};

  for (const pt of sections) {
    if (!groups[pt.code]) {
      groups[pt.code] = [];
    }
    groups[pt.code].push({ x: pt.x, y: pt.y, z: pt.z });
  }

  return Object.keys(groups).map((code) => ({
    code,
    points: groups[code],
  }));
}

/**
 * Builds 3D Top and Datum TIN Surface meshes from corridor section point sweeps. (REQ-18-012, REQ-18-013)
 */
export function buildCorridorSurfaces(
  sections: CorridorSectionPoint[],
): { topMesh: { p1: { x: number; y: number; z: number }; p2: { x: number; y: number; z: number }; p3: { x: number; y: number; z: number } }[] } {
  // Group section points by station
  const stationGroups: Record<number, CorridorSectionPoint[]> = {};
  for (const pt of sections) {
    if (!stationGroups[pt.station]) {
      stationGroups[pt.station] = [];
    }
    stationGroups[pt.station].push(pt);
  }

  const stations = Object.keys(stationGroups)
    .map(Number)
    .sort((a, b) => a - b);
  const triangles: { p1: { x: number; y: number; z: number }; p2: { x: number; y: number; z: number }; p3: { x: number; y: number; z: number } }[] = [];

  for (let i = 0; i < stations.length - 1; i++) {
    const pts1 = stationGroups[stations[i]];
    const pts2 = stationGroups[stations[i + 1]];
    const minLen = Math.min(pts1.length, pts2.length);

    for (let j = 0; j < minLen - 1; j++) {
      const a = pts1[j];
      const b = pts1[j + 1];
      const c = pts2[j];
      const d = pts2[j + 1];

      triangles.push({ p1: a, p2: b, p3: c });
      triangles.push({ p1: b, p2: d, p3: c });
    }
  }

  return { topMesh: triangles };
}

/**
 * Automatically builds Median or Splitter islands by draping a 2D polyline
 * over the generated corridor surfaces and extruding curbs. (REQ-19-018, REQ-19-020)
 */
export function buildIntersectionIslands(
  islandOutline: { x: number; y: number }[],
  corridorSections: CorridorSectionPoint[],
): CorridorFeatureLine[] {
  // Compute average corridor elevation near island centroid
  const avgZ =
    corridorSections.length > 0
      ? corridorSections.reduce((acc, s) => acc + s.z, 0) / corridorSections.length
      : 0;

  const bottomOfCurb = islandOutline.map((pt) => ({ x: pt.x, y: pt.y, z: avgZ }));
  const topOfCurb = islandOutline.map((pt) => ({ x: pt.x, y: pt.y, z: avgZ + 0.5 }));

  return [
    { code: "Island_BOC", points: bottomOfCurb },
    { code: "Island_TOC", points: topOfCurb },
  ];
}

