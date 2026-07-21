import _ from "lodash";
import type { HorizontalAlignment } from "./alignment";
import { resolveAlignment } from "./alignment";
import federalData from "../planning/geoid/data/federalReference.json";

const defaultRoads = federalData.standards.roads;

import type {
  SuperelevationStation,
  SuperelevationCurve,
} from "./types/superelevation";

export type { SuperelevationStation, SuperelevationCurve };

/**
 * Calculates transition stations for a curve along an alignment per AASHTO standards.
 */
export function calculateSuperelevationRunoff(
  alignment: HorizontalAlignment,
  designSpeed: number,
  eMax: number = defaultRoads.eMax,
  normalCrown: number = defaultRoads.normalCrown,
  speedMultiplier: number = defaultRoads.transitionSpeedMultiplier,
): SuperelevationCurve {
  const transitionLength = designSpeed * speedMultiplier;
  const tangentRunout = (Math.abs(normalCrown) / eMax) * transitionLength;

  const resolved = resolveAlignment(alignment);
  const curves = resolved ? resolved.curves : [];
  const totalLength = resolved ? resolved.length : 1000;
  const midStation =
    curves.length > 0
      ? (curves[0].pcStation + curves[0].ptStation) / 2
      : totalLength / 2;
  const startFS = midStation - transitionLength / 2;
  const endFS = midStation + transitionLength / 2;

  const leftIn = startFS - transitionLength;
  const leftLC = leftIn - tangentRunout / 2;
  const leftNC = leftLC - tangentRunout / 2;

  const rightOut = endFS + transitionLength;
  const rightLC = rightOut + tangentRunout / 2;
  const rightNC = rightLC + tangentRunout / 2;

  const rawStations: SuperelevationStation[] = [
    {
      station: leftNC,
      leftOuterSlope: normalCrown,
      rightOuterSlope: normalCrown,
      description: "Normal Crown (NC)",
    },
    {
      station: leftLC,
      leftOuterSlope: 0.0,
      rightOuterSlope: normalCrown,
      description: "Level Crown (LC)",
    },
    {
      station: leftIn,
      leftOuterSlope: -normalCrown,
      rightOuterSlope: normalCrown,
      description: "Reverse Crown (RC)",
    },
    {
      station: startFS,
      leftOuterSlope: eMax,
      rightOuterSlope: -eMax,
      description: "Full Superelevation Start (FS)",
    },
    {
      station: endFS,
      leftOuterSlope: eMax,
      rightOuterSlope: -eMax,
      description: "Full Superelevation End (FS)",
    },
    {
      station: rightOut,
      leftOuterSlope: -normalCrown,
      rightOuterSlope: normalCrown,
      description: "Reverse Crown (RC)",
    },
    {
      station: rightLC,
      leftOuterSlope: 0.0,
      rightOuterSlope: normalCrown,
      description: "Level Crown (LC)",
    },
    {
      station: rightNC,
      leftOuterSlope: normalCrown,
      rightOuterSlope: normalCrown,
      description: "Normal Crown (NC)",
    },
  ];

  const transitionStations = _.sortBy(rawStations, "station");

  return {
    alignmentId: alignment.id,
    designSpeed,
    eMax,
    normalCrown,
    transitionStations,
  };
}

/**
 * Interpolates outer lane slopes at a given station.
 */
export function getSuperelevationSlope(
  curve: SuperelevationCurve,
  station: number,
): { leftSlope: number; rightSlope: number } {
  const nc = curve.normalCrown ?? -0.02;
  const stations = curve.transitionStations;
  if (!stations || stations.length === 0) {
    return { leftSlope: nc, rightSlope: nc };
  }

  if (station <= stations[0].station) {
    return {
      leftSlope: stations[0].leftOuterSlope,
      rightSlope: stations[0].rightOuterSlope,
    };
  }
  if (station >= stations[stations.length - 1].station) {
    return {
      leftSlope: stations[stations.length - 1].leftOuterSlope,
      rightSlope: stations[stations.length - 1].rightOuterSlope,
    };
  }

  for (let i = 0; i < stations.length - 1; i++) {
    const s0 = stations[i];
    const s1 = stations[i + 1];
    if (station >= s0.station && station <= s1.station) {
      const t = (station - s0.station) / (s1.station - s0.station);
      const leftSlope =
        s0.leftOuterSlope + t * (s1.leftOuterSlope - s0.leftOuterSlope);
      const rightSlope =
        s0.rightOuterSlope + t * (s1.rightOuterSlope - s0.rightOuterSlope);
      return { leftSlope, rightSlope };
    }
  }

  return { leftSlope: nc, rightSlope: nc };
}

/**
 * Detects and resolves overlap between transition runoffs of adjacent curves (REQ-11-015, REQ-11-022).
 */
export function detectAndResolveSuperelevationOverlap(
  curves: SuperelevationCurve[],
): { hasOverlap: boolean; resolvedCurves: SuperelevationCurve[] } {
  if (curves.length <= 1) {
    return { hasOverlap: false, resolvedCurves: curves };
  }

  let hasOverlap = false;
  const sorted = _.sortBy(curves, (c) => c.transitionStations[0]?.station ?? 0);
  const resolved = [...sorted];

  for (let i = 0; i < resolved.length - 1; i++) {
    const c1 = resolved[i];
    const c2 = resolved[i + 1];
    const end1 = c1.transitionStations[c1.transitionStations.length - 1]?.station ?? 0;
    const start2 = c2.transitionStations[0]?.station ?? 0;

    if (end1 > start2) {
      hasOverlap = true;
      // Pro-rate transition lengths to meet at midpoint
      const mid = (end1 + start2) / 2;
      c1.transitionStations[c1.transitionStations.length - 1].station = mid;
      c2.transitionStations[0].station = mid;
    }
  }

  return { hasOverlap, resolvedCurves: resolved };
}

/**
 * Validates shoulder rollover limit against lane cross slope (REQ-11-021).
 */
export function checkShoulderRollover(
  laneSlope: number,
  shoulderSlope: number,
  maxRollover = 0.07,
): { isViolation: boolean; rollover: number; maxRollover: number } {
  const rollover = Math.abs(laneSlope - shoulderSlope);
  return {
    isViolation: rollover > maxRollover,
    rollover,
    maxRollover,
  };
}

/**
 * Exports superelevation critical stations to LandXML 1.2 schema (REQ-11-027).
 */
export function exportSuperelevationLandXML(curve: SuperelevationCurve): string {
  const stationsXml = curve.transitionStations
    .map(
      (s) =>
        `      <SuperelevationStation sta="${s.station.toFixed(3)}" leftGrade="${(s.leftOuterSlope * 100).toFixed(2)}" rightGrade="${(s.rightOuterSlope * 100).toFixed(2)}"/>`
    )
    .join("\n");

  return (
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<LandXML xmlns="http://www.landxml.org/schema/LandXML-1.2" version="1.2">\n` +
    `  <Superelevation alignmentRef="${curve.alignmentId}" eMax="${(curve.eMax * 100).toFixed(1)}%">\n` +
    stationsXml + "\n" +
    `  </Superelevation>\n` +
    `</LandXML>`
  );
}

