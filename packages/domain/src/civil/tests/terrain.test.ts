import { describe, expect, it } from "vitest";
import { defaultSpatialContext } from "../../spatial/spatial";
import type { Polygon } from "../../spatial/geometry";
import {
  contourLevels,
  cutFill,
  elevationAt,
  gradePad,
  interpolateGrid,
  slopeAtNode,
  slopeStats,
  stitchContours,
  traceWaterDropPath,
  type ElevationGrid,
} from "../terrain";
import {
  matchWildcard,
  findMatchingKey,
  formatDescription,
  evaluatePointGroup,
  DEFAULT_DESCRIPTION_KEYS,
} from "../../survey/descriptionKeys";
import {
  drapePolyline,
  calculateDaylightLine,
  calculatePondVolume,
  calculateDrainageFlow,
} from "../grading";

/** A planar ramp z = slope·x over a `size`×`size` extent at unit resolution. */
function ramp(size: number, slope: number): ElevationGrid {
  const n = size + 1;
  const heights: number[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      heights.push(slope * c);
    }
  }
  return { origin: { x: 0, y: 0 }, cellSize: 1, cols: n, rows: n, heights };
}

function flat(size: number, z: number): ElevationGrid {
  const n = size + 1;
  return {
    origin: { x: 0, y: 0 },
    cellSize: 1,
    cols: n,
    rows: n,
    heights: new Array(n * n).fill(z),
  };
}

describe("interpolation & sampling", () => {
  it("reproduces control-point elevations (IDW)", () => {
    const grid = interpolateGrid(
      [
        { point: { x: 0, y: 0 }, z: 10 },
        { point: { x: 10, y: 0 }, z: 20 },
      ],
      { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      { cellSize: 5 },
    );
    expect(elevationAt(grid, { x: 0, y: 0 })).toBeCloseTo(10, 5);
    expect(elevationAt(grid, { x: 10, y: 0 })).toBeCloseTo(20, 5);
  });

  it("bilinearly interpolates between nodes", () => {
    const g = ramp(10, 1); // z = x
    expect(elevationAt(g, { x: 3.5, y: 2 })).toBeCloseTo(3.5, 6);
  });
});

describe("slope", () => {
  it("measures a ramp's slope as rise over run", () => {
    const g = ramp(10, 0.5); // 50%
    const s = slopeAtNode(g, 5, 5);
    expect(s.slope).toBeCloseTo(0.5, 6);
    expect(s.percent).toBeCloseTo(50, 4);
    expect(s.degrees).toBeCloseTo(26.565, 2);
  });

  it("classifies buildable fraction against a threshold", () => {
    const gentle = slopeStats(ramp(10, 0.05), { buildableMaxPercent: 15 }); // 5%
    expect(gentle.buildableFraction).toBe(1);
    const steep = slopeStats(ramp(10, 0.5), { buildableMaxPercent: 15 }); // 50%
    expect(steep.buildableFraction).toBe(0);
  });
});

describe("contours", () => {
  it("draws vertical contours across a ramp at the interval", () => {
    const g = ramp(20, 1); // z = x, 0..20
    const levels = contourLevels(g, 5);
    expect(levels.map((l) => l.level)).toEqual([5, 10, 15]);
    const ten = levels.find((l) => l.level === 10)!;
    for (const [a, b] of ten.segments) {
      expect(a.x).toBeCloseTo(10, 6);
      expect(b.x).toBeCloseTo(10, 6);
    }
  });

  it("stitches segments into a continuous polyline", () => {
    const g = ramp(20, 1);
    const ten = contourLevels(g, 5).find((l) => l.level === 10)!;
    const lines = stitchContours(ten.segments);
    expect(lines).toHaveLength(1);
    expect(lines[0].length).toBe(g.rows);
  });
});

describe("grading & earthwork", () => {
  const spatial = defaultSpatialContext();

  it("fills volume when a flat pad is raised", () => {
    const existing = flat(10, 0);
    const region: Polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const proposed = gradePad(existing, region, 2);
    const work = cutFill(existing, proposed, { region, spatial });
    expect(work.fill).toBeCloseTo(200, 4);
    expect(work.cut).toBeCloseTo(0, 6);
    expect(work.fillCubicMeters).toBeCloseTo(200, 4);
  });

  it("reports a balanced cut/fill when raising and lowering equal areas", () => {
    const existing = flat(10, 0);
    const left: Polygon = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 10 },
      { x: 0, y: 10 },
    ];
    const right: Polygon = [
      { x: 6, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 6, y: 10 },
    ];
    const proposed = gradePad(gradePad(existing, left, 1), right, -1);
    const work = cutFill(existing, proposed, { spatial });
    expect(work.balanced).toBe(true);
    expect(work.net).toBeCloseTo(0, 4);
  });
});

describe("water drop flow tracer", () => {
  it("traces flow downhill along a planar ramp", () => {
    const size = 10;
    const n = size + 1;
    const heights: number[] = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        heights.push(10 - c);
      }
    }
    const grid: ElevationGrid = {
      origin: { x: 0, y: 0 },
      cellSize: 10,
      cols: n,
      rows: n,
      heights,
    };

    const path = traceWaterDropPath(grid, { x: 20, y: 20 }, 5, 10);
    expect(path.length).toBeGreaterThan(1);
    expect(path[1].x).toBeGreaterThan(20);
    expect(path[1].y).toBe(20);
  });
});

describe("description keys & point groups", () => {
  it("matches wildcard prefixes correctly", () => {
    expect(matchWildcard("Tree-Oak", "TR*")).toBe(true);
    expect(matchWildcard("MH-Storm-1", "MH*")).toBe(true);
    expect(matchWildcard("BM-Survey-1", "BM*")).toBe(true);
    expect(matchWildcard("Concrete-Pad", "TR*")).toBe(false);
  });

  it("finds matching description keys", () => {
    const match = findMatchingKey("Tree-Maple", DEFAULT_DESCRIPTION_KEYS);
    expect(match).not.toBeNull();
    expect(match!.layerId).toBe("c-tree");
    expect(match!.elementKind).toBe("tree");
  });

  it("formats descriptions matching raw keys", () => {
    const formatted = formatDescription("Oak", "Tree - $*");
    expect(formatted).toBe("Tree - Oak");
  });

  it("groups points matching raw descriptions", () => {
    const pts = [
      { id: "p1", description: "Tree-Oak" },
      { id: "p2", description: "MH-General" },
      { id: "p3", description: "Tree-Pine" },
    ];
    const groupIds = evaluatePointGroup(pts, "TR*");
    expect(groupIds).toEqual(["p1", "p3"]);
  });
});

describe("Grading & Topographic calculations", () => {
  const flatSurface: ElevationGrid = {
    origin: { x: 0, y: 0 },
    cellSize: 10,
    cols: 11,
    rows: 11,
    heights: Array(121).fill(10),
  };

  it("drapes a 2D polyline across a surface to create a 3D feature line", () => {
    const pts = [
      { x: 15, y: 15 },
      { x: 45, y: 55 },
    ];
    const draped = drapePolyline(pts, flatSurface);
    expect(draped).toHaveLength(2);
    expect(draped[0].z).toBeCloseTo(10);
    expect(draped[1].z).toBeCloseTo(10);
  });

  it("calculates daylight line projection", () => {
    const featureLineFill = [
      { x: 20, y: 50, z: 12 },
      { x: 80, y: 50, z: 12 },
    ];

    const daylightFill = calculateDaylightLine(
      featureLineFill,
      flatSurface,
      2.0,
      3.0,
      50,
    );
    expect(daylightFill).toHaveLength(2);
    expect(daylightFill[0].y).toBeCloseTo(56, 1);
    expect(daylightFill[1].y).toBeCloseTo(56, 1);

    const featureLineCut = [
      { x: 20, y: 50, z: 8 },
      { x: 80, y: 50, z: 8 },
    ];

    const daylightCut = calculateDaylightLine(
      featureLineCut,
      flatSurface,
      2.0,
      3.0,
      50,
    );
    expect(daylightCut).toHaveLength(2);
    expect(daylightCut[0].y).toBeCloseTo(54, 1);
    expect(daylightCut[1].y).toBeCloseTo(54, 1);
  });

  it("calculates pond storage volume below a specified water level", () => {
    const pondBoundary = [
      { x: 10, y: 10 },
      { x: 50, y: 10 },
      { x: 50, y: 50 },
      { x: 10, y: 50 },
    ];

    const volume = calculatePondVolume(flatSurface, 15, pondBoundary, 2);
    expect(volume).toBeCloseTo(296.3, 1);
  });

  it("calculates drainage flow arrows along terrain slopes", () => {
    const slopedHeights: number[] = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        slopedHeights.push(c * 10);
      }
    }
    const slopedSurface: ElevationGrid = {
      origin: { x: 0, y: 0 },
      cellSize: 10,
      cols: 5,
      rows: 5,
      heights: slopedHeights,
    };

    const arrows = calculateDrainageFlow(slopedSurface, 1);
    expect(arrows.length).toBeGreaterThan(0);
    expect(arrows[0].direction.x).toBeCloseTo(-1, 2);
    expect(arrows[0].direction.y).toBeCloseTo(0, 2);
  });
});
