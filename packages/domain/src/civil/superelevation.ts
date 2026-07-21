import _ from "lodash";
import type { HorizontalAlignment } from "./alignment";
import { resolveAlignment } from "./alignment";

import type { SuperelevationStation, SuperelevationCurve } from "./types/superelevation";

export type { SuperelevationStation, SuperelevationCurve };

/**
 * Calculates transition stations for a curve along an alignment per AASHTO standards.
 */
export function calculateSuperelevationRunoff(
  alignment: HorizontalAlignment,
  designSpeed: number,
  eMax: number = 0.06,
  normalCrown: number = -0.02
): SuperelevationCurve {
  const transitionLength = designSpeed * 4;
  const tangentRunout = (Math.abs(normalCrown) / eMax) * transitionLength;

  const resolved = resolveAlignment(alignment);
  const curves = resolved ? resolved.curves : [];
  const totalLength = resolved ? resolved.length : 1000;
  const midStation = curves.length > 0
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
    { station: leftNC, leftOuterSlope: normalCrown, rightOuterSlope: normalCrown, description: "Normal Crown (NC)" },
    { station: leftLC, leftOuterSlope: 0.0, rightOuterSlope: normalCrown, description: "Level Crown (LC)" },
    { station: leftIn, leftOuterSlope: -normalCrown, rightOuterSlope: normalCrown, description: "Reverse Crown (RC)" },
    { station: startFS, leftOuterSlope: eMax, rightOuterSlope: -eMax, description: "Full Superelevation Start (FS)" },
    { station: endFS, leftOuterSlope: eMax, rightOuterSlope: -eMax, description: "Full Superelevation End (FS)" },
    { station: rightOut, leftOuterSlope: -normalCrown, rightOuterSlope: normalCrown, description: "Reverse Crown (RC)" },
    { station: rightLC, leftOuterSlope: 0.0, rightOuterSlope: normalCrown, description: "Level Crown (LC)" },
    { station: rightNC, leftOuterSlope: normalCrown, rightOuterSlope: normalCrown, description: "Normal Crown (NC)" },
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
  station: number
): { leftSlope: number; rightSlope: number } {
  const stations = curve.transitionStations;
  if (stations.length === 0) {
    return { leftSlope: curve.normalCrown, rightSlope: curve.normalCrown };
  }

  if (station <= stations[0].station) {
    return { leftSlope: stations[0].leftOuterSlope, rightSlope: stations[0].rightOuterSlope };
  }
  if (station >= stations[stations.length - 1].station) {
    return { leftSlope: stations[stations.length - 1].leftOuterSlope, rightSlope: stations[stations.length - 1].rightOuterSlope };
  }

  for (let i = 0; i < stations.length - 1; i++) {
    const s0 = stations[i];
    const s1 = stations[i + 1];
    if (station >= s0.station && station <= s1.station) {
      const t = (station - s0.station) / (s1.station - s0.station);
      const leftSlope = s0.leftOuterSlope + t * (s1.leftOuterSlope - s0.leftOuterSlope);
      const rightSlope = s0.rightOuterSlope + t * (s1.rightOuterSlope - s0.rightOuterSlope);
      return { leftSlope, rightSlope };
    }
  }

  return { leftSlope: curve.normalCrown, rightSlope: curve.normalCrown };
}
