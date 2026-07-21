import type { SubassemblyParam, Subassembly, Assembly, AssemblyPoint } from "./types/assembly";

export type { SubassemblyParam, Subassembly, Assembly, AssemblyPoint };

/**
 * Resolves 2D cross-section coordinate offsets from baseline pivot for a given Assembly.
 */
export function resolveAssemblyOffset(
  assembly: Assembly,
  leftSuperelevationSlope: number = -0.02,
  rightSuperelevationSlope: number = -0.02
): AssemblyPoint[] {
  const points: AssemblyPoint[] = [{ code: "Centerline", x: 0, y: 0 }];

  // Helper to resolve a single side
  const resolveSide = (subassemblies: Subassembly[], sideSign: number, slope: number) => {
    let currentX = 0;
    let currentY = 0;

    for (const sub of subassemblies) {
      const getVal = (name: string, def: number) =>
        sub.parameters.find((p) => p.name === name)?.value ?? def;

      if (sub.type === "Lane") {
        const width = getVal("Width", 12);
        currentX += width * sideSign;
        currentY += width * slope;
        points.push({ code: `EdgeOfPavement_${sub.side}`, x: currentX, y: currentY });
      } else if (sub.type === "CurbAndGutter") {
        const width = getVal("CurbWidth", 1.5);
        const height = getVal("CurbHeight", 0.5);
        // Step up
        points.push({ code: `CurbGutter_${sub.side}`, x: currentX, y: currentY });
        currentX += width * sideSign;
        currentY += height;
        points.push({ code: `CurbTop_${sub.side}`, x: currentX, y: currentY });
      } else if (sub.type === "Sidewalk") {
        const width = getVal("SidewalkWidth", 5);
        const slopeVal = getVal("SidewalkSlope", 0.01);
        currentX += width * sideSign;
        currentY += width * slopeVal;
        points.push({ code: `SidewalkOuter_${sub.side}`, x: currentX, y: currentY });
      } else if (sub.type === "Daylight") {
        const fillSlope = getVal("FillSlope", 3.0);
        // Standard daylight step logic
        const daylightWidth = 8;
        currentX += daylightWidth * sideSign;
        // Assume daylight goes downwards if fill, upwards if cut. Default to fill.
        currentY -= daylightWidth / fillSlope;
        points.push({ code: `Daylight_${sub.side}`, x: currentX, y: currentY });
      }
    }
  };

  resolveSide(assembly.leftSubassemblies, -1, leftSuperelevationSlope);
  resolveSide(assembly.rightSubassemblies, 1, rightSuperelevationSlope);

  return points;
}

/**
 * Returns default subassembly templates.
 */
export function getDefaultSubassemblies(side: "left" | "right"): Subassembly[] {
  return [
    {
      id: `${side}-lane-1`,
      name: `${side === "left" ? "Left" : "Right"} Lane`,
      side,
      type: "Lane",
      parameters: [{ name: "Width", value: 12 }, { name: "Slope", value: -0.02 }],
    },
    {
      id: `${side}-curb-1`,
      name: `${side === "left" ? "Left" : "Right"} Curb`,
      side,
      type: "CurbAndGutter",
      parameters: [{ name: "CurbWidth", value: 1.5 }, { name: "CurbHeight", value: 0.5 }],
    },
    {
      id: `${side}-sidewalk-1`,
      name: `${side === "left" ? "Left" : "Right"} Sidewalk`,
      side,
      type: "Sidewalk",
      parameters: [{ name: "SidewalkWidth", value: 5 }, { name: "SidewalkSlope", value: 0.015 }],
    },
    {
      id: `${side}-daylight-1`,
      name: `${side === "left" ? "Left" : "Right"} Daylight`,
      side,
      type: "Daylight",
      parameters: [{ name: "CutSlope", value: 2 }, { name: "FillSlope", value: 3 }],
    },
  ];
}
