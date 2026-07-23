import _ from "lodash";
import { type GradingPad, solveBalancedElevation } from "../../civil/grading";

export function createGradingPad({
  padElevation,
  cutSlope,
  fillSlope,
}: {
  padElevation: number;
  cutSlope: number;
  fillSlope: number;
}): GradingPad {
  return {
    id: "pad-1",
    name: "Building Lot Grading Pad",
    points: [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 250 },
      { x: 100, y: 250 },
    ],
    targetElevation: padElevation,
    cutSlope,
    fillSlope,
  };
}

export function saveGradingPadElevation({
  site,
  padElevation,
  cutSlope,
  fillSlope,
}: {
  site: any;
  padElevation: number;
  cutSlope: number;
  fillSlope: number;
}) {
  const matchingPad =
    _.find(site?.elements, (e: any) => e.kind === "parcel") ??
    site?.elements[0];
  if (matchingPad) {
    return {
      matchingPadId: matchingPad.id,
      patch: {
        ...matchingPad,
        properties: {
          ...(matchingPad as any).properties,
          elevation: padElevation,
          cutSlope,
          fillSlope,
        },
      },
    };
  }
  return null;
}

export function solveGradingBalance({
  gradingPad,
  terrainSurface,
  targetVolume,
  onComplete,
}: {
  gradingPad: GradingPad;
  terrainSurface: any;
  targetVolume: number;
  onComplete: (balancedElev: number) => void;
}) {
  if (!terrainSurface) {
    return;
  }
  setTimeout(() => {
    const balancedElev = solveBalancedElevation(
      gradingPad,
      terrainSurface,
      targetVolume,
      5,
    );
    onComplete(Number(balancedElev.toFixed(2)));
  }, 800);
}
