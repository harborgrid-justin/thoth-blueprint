import { describe, expect, it } from "vitest";
import { defaultSpatialContext } from "../../spatial/spatial";
import type { AlignedDimension } from "../dimension";
import {
  formatDimText,
  formatSlope,
  formatSpotCoordinate,
  measureDimension,
  stackDimensionChains,
} from "../dimension";

describe("AEC Dimensions & Plat annotations", () => {
  const spatial = defaultSpatialContext(); // feet by default

  it("formats dual units", () => {
    const style = {
      id: "dual-unit",
      label: "Dual Unit",
      arrow: "arrow" as const,
      textHeight: 2.5,
      precision: 2,
      unit: "ft-dec" as const,
      secondaryUnit: "m" as const,
      extensionGap: 1.0,
      extensionBeyond: 1.0,
      suppressZero: false,
    };
    // 3.048 meters = 10.00 feet
    const text = formatDimText(3.048, style, spatial);
    expect(text).toBe("10.00' [3.05 m]");
  });

  it("calculates slope annotations (ratios and percents)", () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 100, y: 0, z: 2.5 };
    
    expect(formatSlope(a, b, "percent")).toBe("2.50%");
    expect(formatSlope(a, b, "ratio")).toBe("40.0:1");
  });

  it("formats spot coordinates detailing Northing and Easting", () => {
    const p = { x: 123.45, y: -234.56 };
    const spot = formatSpotCoordinate(p, spatial);
    expect(spot.easting).toBeCloseTo(5123.45);
    expect(spot.northing).toBeCloseTo(5234.56);
    expect(spot.text).toContain("E: 5,123.450 m");
    expect(spot.text).toContain("N: 5,234.560 m");
  });

  it("suppresses witness extension lines", () => {
    const dim: AlignedDimension = {
      id: "d1",
      styleId: "suppressed-ext",
      kind: "aligned",
      a: { x: 0, y: 0 },
      b: { x: 100, y: 0 },
      offset: 10,
    };
    
    const measured = measureDimension(dim, spatial);
    expect(measured.geometry.lines).toHaveLength(1);
    expect(measured.geometry.lines[0]).toEqual([{ x: 0, y: 10 }, { x: 100, y: 10 }]);
  });

  it("aligns dimension text perpendicular or horizontal", () => {
    const dimHoriz: AlignedDimension = {
      id: "d2",
      styleId: "align-horizontal",
      kind: "aligned",
      a: { x: 0, y: 0 },
      b: { x: 0, y: 100 },
      offset: 10,
    };

    const dimPerp: AlignedDimension = {
      id: "d3",
      styleId: "align-perpendicular",
      kind: "aligned",
      a: { x: 0, y: 0 },
      b: { x: 100, y: 0 },
      offset: 10,
    };

    const measuredHoriz = measureDimension(dimHoriz, spatial);
    expect(measuredHoriz.geometry.textAngleDeg).toBe(0);

    const measuredPerp = measureDimension(dimPerp, spatial);
    expect(measuredPerp.geometry.textAngleDeg).toBe(90);
  });

  it("stacks overlapping dimension chains", () => {
    const d1: AlignedDimension = {
      id: "dim1",
      styleId: "arch-tick",
      kind: "aligned",
      a: { x: 0, y: 0 },
      b: { x: 50, y: 0 },
      offset: 10,
    };
    const d2: AlignedDimension = {
      id: "dim2",
      styleId: "arch-tick",
      kind: "aligned",
      a: { x: 25, y: 0 },
      b: { x: 75, y: 0 },
      offset: 10,
    };

    const stacked = stackDimensionChains([d1, d2], 8);
    expect(stacked[0].offset).toBe(10);
    expect(stacked[1].offset).toBe(18);
  });
});
