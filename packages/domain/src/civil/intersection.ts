/**
 * Intersection and Roundabout Design Solvers — implementation of Chapter 14
 * civil requirements: Peer/Primary road crown matching, curb return arc generation,
 * roundabout geometry layout, and fastest-path speed analysis.
 * (REQ-19-001 through REQ-19-039)
 */

import { type Point, add, scale, normalize as norm } from "../spatial/geometry";
import type { VerticalProfile } from "./profile";
import { profileElevationAt } from "./profile";
import type {
  Intersection,
  IntersectionType,
  CurbReturnQuadrant,
  Roundabout,
  RoundaboutPreset,
  FastestPathAnalysisResult,
} from "./types/intersection";


export type {
  Intersection,
  IntersectionType,
  CurbReturnQuadrant,
  Roundabout,
  RoundaboutPreset,
  FastestPathAnalysisResult,
};

/**
 * Solves intersection elevation and crown grade matching between Primary and Secondary roads. (REQ-19-001, REQ-19-002, REQ-19-003, REQ-19-031)
 */
export function solveIntersectionCrown(
  primaryProfile: VerticalProfile,
  primaryStation: number,
  secondaryProfile: VerticalProfile,
  secondaryStation: number,
  intersectionType: IntersectionType,
): { primaryElevation: number; secondaryPviElevation: number; crownGradeMatch: number } {
  const primaryElevation = profileElevationAt(primaryProfile, primaryStation);

  if (intersectionType === "primaryRoadCrown") {
    // Secondary road grade locks to primary road elevation at intersection PVI
    return {
      primaryElevation,
      secondaryPviElevation: primaryElevation,
      crownGradeMatch: 0.0,
    };
  } else {
    // Peer road / All Crowns Maintained: Both roads maintain normal crowns
    const secondaryElevation = profileElevationAt(secondaryProfile, secondaryStation);
    return {
      primaryElevation,
      secondaryPviElevation: secondaryElevation,
      crownGradeMatch: Math.abs(primaryElevation - secondaryElevation),
    };
  }
}

import { globalPartsDb } from "../parts/registry";

const catalogStd = globalPartsDb.getCivilDesignStandards()[0];
const DEFAULT_CURB_RADIUS = (catalogStd?.properties?.curbReturnRadiusFt as number) || 25.0;

/**
 * Generates curb return arc polylines connecting intersecting alignments per quadrant. (REQ-19-004, REQ-19-009, REQ-19-032)
 */
export function generateCurbReturnGeometry(
  intersectionPt: Point,
  primaryBearingDeg: number,
  secondaryBearingDeg: number,
  radius: number = DEFAULT_CURB_RADIUS,
  quadrant: "NE" | "NW" | "SE" | "SW",
  samples = 16,
): Point[] {
  const rad1 = (primaryBearingDeg * Math.PI) / 180;
  const rad2 = (secondaryBearingDeg * Math.PI) / 180;

  const dir1 = { x: Math.sin(rad1), y: -Math.cos(rad1) };
  const dir2 = { x: Math.sin(rad2), y: -Math.cos(rad2) };

  // Offset corner center along bisector
  const bisector = norm(add(dir1, dir2));
  const quadrantSign = quadrant.includes("N") ? 1 : -1;
  const center = add(intersectionPt, scale(bisector, radius * 1.414 * quadrantSign));

  const points: Point[] = [];
  const startAng = Math.atan2(intersectionPt.y - center.y, intersectionPt.x - center.x);
  const sweep = Math.PI / 2;

  for (let i = 0; i <= samples; i++) {
    const ang = startAng + (sweep * i) / samples;
    points.push({
      x: center.x + radius * Math.cos(ang),
      y: center.y + radius * Math.sin(ang),
    });
  }

  return points;
}

/**
 * Builds parametric Roundabout geometry: circulatory roadway ring, center island, and splitter islands. (REQ-19-016, REQ-19-017, REQ-19-018)
 */
export function buildRoundaboutGeometry(
  roundabout: Roundabout,
  samples = 64,
): {
  centerIsland: Point[];
  apronRing: Point[];
  circulatoryOuterRing: Point[];
  splitterIslands: Point[][];
} {
  const { centerPoint, preset } = roundabout;
  const rCenter = preset.outerRadius - preset.circulatoryWidth - preset.apronWidth;
  const rApron = preset.outerRadius - preset.circulatoryWidth;
  const rOuter = preset.outerRadius;

  const makeRing = (r: number) => {
    const pts: Point[] = [];
    for (let i = 0; i <= samples; i++) {
      const ang = (2 * Math.PI * i) / samples;
      pts.push({
        x: centerPoint.x + r * Math.cos(ang),
        y: centerPoint.y + r * Math.sin(ang),
      });
    }
    return pts;
  };

  const centerIsland = makeRing(rCenter);
  const apronRing = makeRing(rApron);
  const circulatoryOuterRing = makeRing(rOuter);

  // Generate splitter islands for each approach
  const splitterIslands: Point[][] = [];
  const approachAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

  for (const ang of approachAngles) {
    const p1 = {
      x: centerPoint.x + rOuter * Math.cos(ang),
      y: centerPoint.y + rOuter * Math.sin(ang),
    };
    const p2 = {
      x: centerPoint.x + (rOuter + preset.splitterIsland.constructionTriangleLength) * Math.cos(ang + 0.1),
      y: centerPoint.y + (rOuter + preset.splitterIsland.constructionTriangleLength) * Math.sin(ang + 0.1),
    };
    const p3 = {
      x: centerPoint.x + (rOuter + preset.splitterIsland.constructionTriangleLength) * Math.cos(ang - 0.1),
      y: centerPoint.y + (rOuter + preset.splitterIsland.constructionTriangleLength) * Math.sin(ang - 0.1),
    };
    splitterIslands.push([p1, p2, p3, p1]);
  }

  return {
    centerIsland,
    apronRing,
    circulatoryOuterRing,
    splitterIslands,
  };
}

/**
 * Calculates AASHTO fastest-path vehicle trajectory speeds inside a roundabout. (REQ-19-021, REQ-19-038)
 */
export function analyzeRoundaboutFastestPath(
  outerRadius: number,
  _entryWidth = 16,
  _circulatoryWidth = 20,
  sideFriction = 0.2,
): FastestPathAnalysisResult {

  const r1EntryRadius = outerRadius * 0.6;
  const r2CirculatoryRadius = outerRadius * 0.85;
  const r3ExitRadius = outerRadius * 1.2;

  // AASHTO speed formula: V = sqrt(15 * R * (e + f)) where e=0.02, f=sideFriction
  const calcSpeed = (r: number) => Math.sqrt(15 * r * (0.02 + sideFriction));

  const maxEntrySpeedMph = calcSpeed(r1EntryRadius);
  const maxCirculatorySpeedMph = calcSpeed(r2CirculatoryRadius);
  const maxExitSpeedMph = calcSpeed(r3ExitRadius);

  // AASHTO rule: Entry speed should not exceed 25 mph for single-lane roundabouts
  const isCompliant = maxEntrySpeedMph <= 25.5;

  return {
    r1EntryRadius,
    r2CirculatoryRadius,
    r3ExitRadius,
    maxEntrySpeedMph,
    maxCirculatorySpeedMph,
    maxExitSpeedMph,
    isCompliant,
  };
}

/**
 * Exports Roundabout Presets to XML schema. (REQ-19-027, REQ-19-039)
 */
export function exportRoundaboutPresetsToXML(presets: RoundaboutPreset[]): string {
  const items = presets
    .map(
      (p) =>
        `    <Preset id="${p.id}" name="${p.name}" outerRadius="${p.outerRadius}" circulatoryWidth="${p.circulatoryWidth}" apronWidth="${p.apronWidth}">\n` +
        `      <SplitterIsland length="${p.splitterIsland.constructionTriangleLength}" width="${p.splitterIsland.splitterIslandWidth}"/>\n` +
        `    </Preset>`
    )
    .join("\n");

  return (
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<RoundaboutPresets>\n` +
    items + "\n" +
    `</RoundaboutPresets>`
  );
}
