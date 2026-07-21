import { add, scale } from "../spatial/geometry";
import { resolveAlignment, pointAtStation } from "./alignment";
import type { HorizontalAlignment } from "./alignment";
import type { VerticalProfile } from "./profile";
import { profileElevationAt } from "./profile";
import type { Assembly } from "./assembly";
import { resolveAssemblyOffset } from "./assembly";
import type { SuperelevationCurve } from "./superelevation";
import { getSuperelevationSlope } from "./superelevation";

import type { Corridor, CorridorSectionPoint, CorridorFeatureLine } from "./types/corridor";

export type { Corridor, CorridorSectionPoint, CorridorFeatureLine };

/**
 * Builds 3D points representing the Corridor model.
 */
export function buildCorridorSections(
  corridor: Corridor,
  alignment: HorizontalAlignment,
  profile: VerticalProfile,
  assembly: Assembly,
  superelevation?: SuperelevationCurve
): CorridorSectionPoint[] {
  const resolved = resolveAlignment(alignment);
  if (!resolved) {return [];}

  const sections: CorridorSectionPoint[] = [];
  const stationsCount = Math.floor(resolved.length / corridor.frequency);

  for (let i = 0; i <= stationsCount; i++) {
    const station = i * corridor.frequency;
    const baseStation = resolved.startStation + station;
    const atStation = pointAtStation(resolved, baseStation);
    if (!atStation) {continue;}

    // 2. Get profile elevation (Z)
    const zBase = profileElevationAt(profile, station);

    // 3. Get superelevation lane slope
    const slopes = superelevation
      ? getSuperelevationSlope(superelevation, station)
      : { leftSlope: -0.02, rightSlope: -0.02 };

    // 4. Resolve assembly cross-section coordinates
    const offsetPoints = resolveAssemblyOffset(assembly, slopes.leftSlope, slopes.rightSlope);

    // 5. Transform 2D offset points to 3D absolute space along traveled normal using gl-matrix
    const rad = (atStation.bearing * Math.PI) / 180;
    const dir = { x: Math.sin(rad), y: -Math.cos(rad) };
    const normal = { x: -dir.y, y: dir.x };

    const basePos = atStation.point;

    for (const offsetPt of offsetPoints) {
      const pos = add(basePos, scale(normal, offsetPt.x));
      const x = pos.x;
      const y = pos.y;
      const z = zBase + offsetPt.y;

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
  sections: CorridorSectionPoint[]
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
