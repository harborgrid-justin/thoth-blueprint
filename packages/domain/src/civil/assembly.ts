import type {
  SubassemblyParam,
  Subassembly,
  Assembly,
  AssemblyPoint,
} from "./types/assembly";
import federalData from "../planning/geoid/data/federalReference.json";

const defaultRoads = federalData.standards.roads;

export type { SubassemblyParam, Subassembly, Assembly, AssemblyPoint };

/**
 * Resolves 2D cross-section coordinate offsets from baseline pivot for a given Assembly.
 */
export function resolveAssemblyOffset(
  assembly: Assembly,
  leftSuperelevationSlope: number = defaultRoads.normalCrown,
  rightSuperelevationSlope: number = defaultRoads.normalCrown,
): AssemblyPoint[] {
  const points: AssemblyPoint[] = [{ code: "Centerline", x: 0, y: 0 }];

  // Helper to resolve a single side
  const resolveSide = (
    subassemblies: Subassembly[],
    sideSign: number,
    slope: number,
  ) => {
    let currentX = 0;
    let currentY = 0;

    for (const sub of subassemblies) {
      const getVal = (name: string, def: number) =>
        sub.parameters.find((p) => p.name === name)?.value ?? def;

      if (sub.type === "Lane") {
        const width = getVal("Width", defaultRoads.defaultLaneWidthFt);
        currentX += width * sideSign;
        currentY += width * slope;
        points.push({
          code: `EdgeOfPavement_${sub.side}`,
          x: currentX,
          y: currentY,
        });
      } else if (sub.type === "CurbAndGutter") {
        const width = getVal("CurbWidth", 1.5);
        const height = getVal("CurbHeight", 0.5);
        // Step up
        points.push({
          code: `CurbGutter_${sub.side}`,
          x: currentX,
          y: currentY,
        });
        currentX += width * sideSign;
        currentY += height;
        points.push({ code: `CurbTop_${sub.side}`, x: currentX, y: currentY });
      } else if (sub.type === "Sidewalk") {
        const width = getVal("SidewalkWidth", 5);
        const slopeVal = getVal("SidewalkSlope", 0.01);
        currentX += width * sideSign;
        currentY += width * slopeVal;
        points.push({
          code: `SidewalkOuter_${sub.side}`,
          x: currentX,
          y: currentY,
        });
      } else if (sub.type === "Median") {
        const width = getVal("Width", 10);
        const depth = getVal("DepressionDepth", 0.5);
        points.push({ code: `MedianEdge_${sub.side}`, x: currentX, y: currentY });
        currentX += (width / 2) * sideSign;
        currentY -= depth;
        points.push({ code: `MedianCenter_${sub.side}`, x: currentX, y: currentY });
        currentX += (width / 2) * sideSign;
        currentY += depth;
        points.push({ code: `MedianOuter_${sub.side}`, x: currentX, y: currentY });
      } else if (sub.type === "RetainingWall") {
        const height = getVal("WallHeight", 6.0);
        const thickness = getVal("WallThickness", 1.0);
        points.push({ code: `RetainingWallBase_${sub.side}`, x: currentX, y: currentY });
        currentY += height;
        points.push({ code: `RetainingWallTop_${sub.side}`, x: currentX, y: currentY });
        currentX += thickness * sideSign;
        points.push({ code: `RetainingWallBack_${sub.side}`, x: currentX, y: currentY });
      } else if (sub.type === "DaylightBench") {
        const benchWidth = getVal("BenchWidth", 4.0);
        const benchHeight = getVal("BenchHeight", 10.0);
        const slope = getVal("Slope", 2.0);
        currentX += (benchHeight * slope) * sideSign;
        currentY -= benchHeight;
        points.push({ code: `BenchStep_${sub.side}`, x: currentX, y: currentY });
        currentX += benchWidth * sideSign;
        points.push({ code: `BenchFlat_${sub.side}`, x: currentX, y: currentY });
      } else if (sub.type === "LinkWidthAndSlope") {
        const width = getVal("Width", 8.0);
        const linkSlope = getVal("Slope", -0.04);
        currentX += width * sideSign;
        currentY += width * linkSlope;
        points.push({ code: `LinkWidthSlope_${sub.side}`, x: currentX, y: currentY });
      } else if (sub.type === "ConditionalCutOrFill") {
        // Evaluates conditional branching placeholder point
        const mode = getVal("IsCut", 1) === 1 ? "Cut" : "Fill";
        points.push({ code: `Conditional_${mode}_${sub.side}`, x: currentX, y: currentY });
      } else if (sub.type === "Daylight") {
        const fillSlope = getVal("FillSlope", 3.0);
        const assumedDepth = 10;
        currentX += (assumedDepth * fillSlope) * sideSign;
        currentY -= assumedDepth;
        points.push({
          code: `DaylightTarget_${sub.side}`,
          x: currentX,
          y: currentY,
        });
      }

    }
  };

  resolveSide(assembly.leftSubassemblies, -1, leftSuperelevationSlope);
  resolveSide(assembly.rightSubassemblies, 1, rightSuperelevationSlope);

  return points;
}

/**
 * Mirrors subassemblies from one side to the opposite side while flipping side parameters (REQ-17-007).
 */
export function mirrorSubassemblies(
  subassemblies: Subassembly[],
  targetSide: "left" | "right",
): Subassembly[] {
  return subassemblies.map((sub) => ({
    ...sub,
    id: sub.id.replace(sub.side, targetSide) + "-mirrored",
    name: sub.name.replace(sub.side === "left" ? "Left" : "Right", targetSide === "left" ? "Left" : "Right"),
    side: targetSide,
    parameters: sub.parameters.map((p) => ({ ...p })),
  }));
}

/**
 * Exports an Assembly configuration to an Assembly Set XML string (REQ-17-018).
 */
export function exportAssemblySetToXML(assembly: Assembly): string {
  const formatSub = (subs: Subassembly[]) =>
    subs
      .map(
        (s) =>
          `        <Subassembly id="${s.id}" name="${s.name}" side="${s.side}" type="${s.type}">\n` +
          s.parameters.map((p) => `          <Param name="${p.name}" value="${p.value}"/>`).join("\n") + "\n" +
          `        </Subassembly>`
      )
      .join("\n");

  return (
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<AssemblySet name="${assembly.name}">\n` +
    `  <Assembly id="${assembly.id}">\n` +
    `    <LeftSubassemblies>\n` +
    formatSub(assembly.leftSubassemblies) + "\n" +
    `    </LeftSubassemblies>\n` +
    `    <RightSubassemblies>\n` +
    formatSub(assembly.rightSubassemblies) + "\n" +
    `    </RightSubassemblies>\n` +
    `  </Assembly>\n` +
    `</AssemblySet>`
  );
}

import { globalPartsDb } from "../parts/registry";

/**
 * Returns default subassembly templates.
 */
export function getDefaultSubassemblies(side: "left" | "right"): Subassembly[] {
  const catalogSubs = globalPartsDb.getSubassemblies();
  const lanePart = catalogSubs.find((s) => s.properties?.subassemblyType === "Lane");
  const curbPart = catalogSubs.find((s) => s.properties?.subassemblyType === "CurbAndGutter");
  const sidewalkPart = catalogSubs.find((s) => s.properties?.subassemblyType === "Sidewalk");
  const daylightPart = catalogSubs.find((s) => s.properties?.subassemblyType === "Daylight");

  return [
    {
      id: `${side}-lane-1`,
      name: `${side === "left" ? "Left" : "Right"} Lane`,
      side,
      type: "Lane",
      parameters: [
        { name: "Width", value: (lanePart?.properties?.widthFt as number) || 12 },
        { name: "Slope", value: (lanePart?.properties?.crossSlope as number) || -0.02 },
      ],
    },
    {
      id: `${side}-curb-1`,
      name: `${side === "left" ? "Left" : "Right"} Curb`,
      side,
      type: "CurbAndGutter",
      parameters: [
        { name: "CurbWidth", value: (curbPart?.properties?.curbWidthFt as number) || 1.5 },
        { name: "CurbHeight", value: (curbPart?.properties?.curbHeightFt as number) || 0.5 },
      ],
    },
    {
      id: `${side}-sidewalk-1`,
      name: `${side === "left" ? "Left" : "Right"} Sidewalk`,
      side,
      type: "Sidewalk",
      parameters: [
        { name: "SidewalkWidth", value: (sidewalkPart?.properties?.sidewalkWidthFt as number) || 5 },
        { name: "SidewalkSlope", value: (sidewalkPart?.properties?.crossSlope as number) || 0.015 },
      ],
    },
    {
      id: `${side}-daylight-1`,
      name: `${side === "left" ? "Left" : "Right"} Daylight`,
      side,
      type: "Daylight",
      parameters: [
        { name: "CutSlope", value: (daylightPart?.properties?.cutSlopeH2V as number) || 2 },
        { name: "FillSlope", value: (daylightPart?.properties?.fillSlopeH2V as number) || 3 },
      ],
    },
  ];
}

