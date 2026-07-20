import { describe, expect, it } from "vitest";
import { defaultSpatialContext } from "./spatial";
import type { Polygon } from "./geometry";
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
} from "./terrain";
import {
  matchWildcard,
  findMatchingKey,
  formatDescription,
  evaluatePointGroup,
  DEFAULT_DESCRIPTION_KEYS,
} from "./descriptionKeys";

/** A planar ramp z = slope·x over a `size`×`size` extent at unit resolution. */
function ramp(size: number, slope: number): ElevationGrid {
  const n = size + 1;
  const heights: number[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) heights.push(slope * c);
  return { origin: { x: 0, y: 0 }, cellSize: 1, cols: n, rows: n, heights };
}

function flat(size: number, z: number): ElevationGrid {
  const n = size + 1;
  return {
    origin: { x: 0, y: 0 },
    cellSize: 1,
    cols: n,
    rows: n,
    heights: new Array((n) * (n)).fill(z),
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
    // Every segment of the level-10 contour sits on x ≈ 10.
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
    expect(lines[0].length).toBe(g.rows); // one vertex per row crossing
  });
});

describe("grading & earthwork", () => {
  const spatial = defaultSpatialContext(); // meters

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
    expect(work.fill).toBeCloseTo(200, 4); // 2 m over 100 m²
    expect(work.cut).toBeCloseTo(0, 6);
    expect(work.fillCubicMeters).toBeCloseTo(200, 4);
  });

  it("reports a balanced cut/fill when raising and lowering equal areas", () => {
    const existing = flat(10, 0);
    // Non-overlapping pads (a clear gap at x=5) so neither overwrites the other.
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
    // Ramp going down in positive X direction (z decreases as X increases)
    const n = size + 1;
    const heights: number[] = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        heights.push(10 - c); // z is 10 at x=0, and 0 at x=10
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
    // Flow should go downslope, meaning X should increase
    expect(path[1].x).toBeGreaterThan(20);
    expect(path[1].y).toBe(20); // no gradient in Y
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
