import { describe, it, expect } from "vitest";
import type { CurtainWall } from "../../spatial/types.js";
import { calculateCurtainWallGeometry } from "../curtainwall.js";

describe("Curtain Wall Layout Calculations Engine", () => {
  it("should divide straight walls uniformly", () => {
    const wall: CurtainWall = {
      id: "cw-1",
      name: "Uniform Curtain Wall",
      layerId: "layer-base",
      kind: "curtainwall",
      boundary: [
        { x: 0, y: 0 },
        { x: 6, y: 0 },
      ],
      width: 6,
      height: 3.0,
      grid: {
        verticalDivisions: "uniform",
        verticalOffsets: [3], // 3 divisions -> splits at 0, 2, 4, 6
        horizontalDivisions: "uniform",
        horizontalOffsets: [2], // 2 divisions -> splits at 0, 1.5, 3.0
      },
    };

    const res = calculateCurtainWallGeometry(wall);
    expect(res.mullions.length).toBe(3); // 2 vertical mullions + 1 horizontal mullion
    expect(res.panels.length).toBe(6); // 3 cols x 2 rows = 6 panel cells
    expect(res.panels[0].width).toBeCloseTo(1.98); // 2m - 2*0.01 gap
    expect(res.panels[0].height).toBeCloseTo(1.48); // 1.5m - 2*0.01 gap
    expect(res.overallRValue).toBeCloseTo(2.5); // only glazing panels
  });

  it("should parse manual grid divisions and custom infill materials", () => {
    const wall: CurtainWall = {
      id: "cw-2",
      name: "Manual Custom Curtain Wall",
      layerId: "layer-base",
      kind: "curtainwall",
      boundary: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
      ],
      width: 5,
      height: 4.0,
      grid: {
        verticalDivisions: "manual",
        verticalOffsets: [1.5, 3.5], // splits at 0, 1.5, 3.5, 5
        horizontalDivisions: "manual",
        horizontalOffsets: [1.0, 3.0], // splits at 0, 1.0, 3.0, 4
        infillMaterials: {
          "0,0": "brick",
          "1,1": "insulation",
          "2,2": "door",
        },
      },
    };

    const res = calculateCurtainWallGeometry(wall);
    expect(res.panels.length).toBe(9); // 3 cols x 3 rows = 9 panels

    // Find brick panel at col 0, row 0
    const brickPanel = res.panels.find((p) => p.key === "0,0");
    expect(brickPanel).toBeDefined();
    expect(brickPanel?.material).toBe("brick");

    // Find insulation panel at col 1, row 1
    const insPanel = res.panels.find((p) => p.key === "1,1");
    expect(insPanel).toBeDefined();
    expect(insPanel?.material).toBe("insulation");

    // R-value should be higher than glazing (2.5) because of brick (12) and insulation (20)
    expect(res.overallRValue).toBeGreaterThan(2.5);
  });

  it("should process recursive nested sub-grids", () => {
    const wall: CurtainWall = {
      id: "cw-3",
      name: "Nested Curtain Wall",
      layerId: "layer-base",
      kind: "curtainwall",
      boundary: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
      ],
      width: 4,
      height: 3.0,
      grid: {
        verticalDivisions: "uniform",
        verticalOffsets: [2], // 2 cols
        horizontalDivisions: "uniform",
        horizontalOffsets: [1], // 1 row (no splits)
      },
      nestedGrids: {
        "0,0": {
          verticalDivisions: "uniform",
          verticalOffsets: [2], // split col 0 into 2 sub-cols
          horizontalDivisions: "uniform",
          horizontalOffsets: [2], // split col 0 into 2 sub-rows
        },
      },
    };

    const res = calculateCurtainWallGeometry(wall);
    // col 0 is nested: splits into 2x2 = 4 panels
    // col 1 is leaf: 1 panel
    // Total panels = 5 panels
    expect(res.panels.length).toBe(5);

    // Nested panel keys should carry parent indices
    const subPanel = res.panels.find((p) => p.key === "0,0/0,0");
    expect(subPanel).toBeDefined();
    expect(subPanel?.width).toBeCloseTo(0.98); // 1.0m - 2*0.01 gap
  });

  it("should generate glass clips and structural ties", () => {
    const wall: CurtainWall = {
      id: "cw-4",
      name: "Anchor Details Wall",
      layerId: "layer-base",
      kind: "curtainwall",
      boundary: [
        { x: 0, y: 0 },
        { x: 3, y: 0 },
      ],
      width: 3.0,
      height: 2.0,
      grid: {
        verticalDivisions: "uniform",
        verticalOffsets: [1],
        horizontalDivisions: "uniform",
        horizontalOffsets: [1],
      },
      clipSpacing: 0.5,
      structuralTieSpacing: 1.0,
    };

    const res = calculateCurtainWallGeometry(wall);
    expect(res.structuralTies.length).toBe(4); // splits at 0, 1.0, 2.0, 3.0
    expect(res.panels[0].clipAnchors.length).toBeGreaterThan(0); // contains clips along the bottom nose
  });
});
