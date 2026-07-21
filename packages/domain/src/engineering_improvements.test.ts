import { describe, it, expect } from "vitest";
import {
  distance,
  add,
  subtract,
  scale,
  length,
  normalize,
  dot,
  cross,
  unionBounds,
} from "./spatial/geometry";
import { edgeBulge } from "./spatial/curve";
import {
  resolveAlignment,
  pointAtStation,
  validateAlignmentDesignSpeed,
} from "./civil/alignment";
import { stitchContours, interpolateGrid } from "./civil/terrain";
import { parseLAS, pointCloudBounds, parseXYZ } from "./civil/pointcloud";
import { formatDimText, stackDimensionChains } from "./drawing/dimension";
import { writeCollada } from "./drawing/collada";
import { splitPolygonByLine, mergeLots } from "./planning/subdivision";
import { checkCompliance } from "./planning/rules";
import { adjustTraverse, interiorAngles } from "./survey/survey";
import { calculateGradingVolumes } from "./civil/grading";
import { connectedComponents, distanceToNetwork, serviceCoverage } from "./civil/network";
import { evaluatePayItemCost, parsePayItemListCsv } from "./drawing/qto";
import { calculateStairGeometry } from "./planning/stairs";

describe("30 Engineering Improvements Validation Suite", () => {
  it("Item 1 & 2: Zero-allocation vector math and 2D cross product", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 });
    expect(subtract({ x: 5, y: 7 }, { x: 2, y: 3 })).toEqual({ x: 3, y: 4 });
    expect(scale({ x: 2, y: 3 }, 3)).toEqual({ x: 6, y: 9 });
    expect(length({ x: 6, y: 8 })).toBe(10);
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(dot({ x: 2, y: 3 }, { x: 4, y: 5 })).toBe(23);
    expect(cross({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(1);
  });

  it("Item 3: Scalar accumulator unionBounds", () => {
    const b1 = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    const b2 = { minX: -5, minY: 2, maxX: 15, maxY: 8 };
    expect(unionBounds([b1, b2])).toEqual({ minX: -5, minY: 0, maxX: 15, maxY: 10 });
    expect(unionBounds([])).toBeNull();
  });

  it("Item 4: Fast numeric lookup in edgeBulge", () => {
    const arcs = { 0: 0.5, "1": -0.2 };
    expect(edgeBulge(arcs, 0)).toBe(0.5);
    expect(edgeBulge(arcs, 1)).toBe(-0.2);
    expect(edgeBulge(arcs, 2)).toBe(0);
  });

  it("Item 5 & 6 & 7: Alignment safe sweep, O(log N) stationing & pre-sorted speed zones", () => {
    const alg = {
      id: "alg1",
      name: "Main Baseline",
      startStation: 1000,
      designSpeed: 45,
      designSpeeds: [
        { station: 1000, speed: 35 },
        { station: 2000, speed: 55 },
      ],
      pis: [
        { point: { x: 0, y: 0 }, radius: 500 },
        { point: { x: 1000, y: 0 }, radius: 500 },
        { point: { x: 1000, y: 1000 } },
      ],
    };
    const resolved = resolveAlignment(alg);
    expect(resolved).not.toBeNull();
    if (resolved) {
      expect(pointAtStation(resolved, 1000)).not.toBeNull();
      expect(pointAtStation(resolved, 1500)).not.toBeNull();
      expect(pointAtStation(resolved, 99999)).toBeNull();

      const checks = validateAlignmentDesignSpeed(alg, resolved);
      expect(checks.length).toBeGreaterThan(0);
    }
  });

  it("Item 8 & 9 & 10: Contour stitching HashMap, IDW & Float64Array terrain", () => {
    const segments: Array<[{ x: number; y: number }, { x: number; y: number }]> = [
      [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      [{ x: 1, y: 0 }, { x: 2, y: 0 }],
      [{ x: 2, y: 0 }, { x: 3, y: 0 }],
    ];
    const stitched = stitchContours(segments);
    expect(stitched.length).toBe(1);
    expect(stitched[0].length).toBe(4);

    const grid = interpolateGrid(
      [
        { point: { x: 0, y: 0 }, z: 10 },
        { point: { x: 10, y: 10 }, z: 20 },
      ],
      { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      { cellSize: 5, power: 2 }
    );
    expect(grid.cols).toBeGreaterThan(0);
  });

  it("Item 11 & 12 & 13: Point cloud bounds, LAS DataView offset & chunked parsing", () => {
    const cloud = {
      points: [
        { x: 10, y: 20, z: 5 },
        { x: -5, y: 30, z: 15 },
      ],
    };
    const b = pointCloudBounds(cloud);
    expect(b).toEqual({ minX: -5, minY: 20, maxX: 10, maxY: 30 });

    const parsedXyz = parseXYZ("10 20 30\n40 50 60");
    expect(parsedXyz.points.length).toBe(2);

    const buffer = new ArrayBuffer(500);
    const uint8 = new Uint8Array(buffer, 10, 300);
    uint8[0] = 0x4c; // L
    uint8[1] = 0x41; // A
    uint8[2] = 0x53; // S
    uint8[3] = 0x46; // F
    const sliceBuffer = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
    expect(() => parseLAS(sliceBuffer)).not.toThrow();
  });

  it("Item 14 & 15: Architectural dimension formatting & cascade stack", () => {
    const spatial = { units: "feet" as const, scale: 1 };
    const styleArch = {
      id: "arch",
      label: "Arch",
      arrow: "tick" as const,
      textHeight: 2.5,
      precision: 4, // 1/16"
      unit: "ft-in" as const,
      extensionGap: 1,
      extensionBeyond: 1,
      suppressZero: false,
    };
    // 5 feet 6.25 inches -> 5'-6 1/4"
    const text = formatDimText(5.5208333, styleArch, spatial);
    expect(text).toContain("5'");

    const dim1 = { kind: "aligned" as const, id: "d1", styleId: "arch", a: { x: 0, y: 0 }, b: { x: 10, y: 0 }, offset: 5 };
    const dim2 = { kind: "aligned" as const, id: "d2", styleId: "arch", a: { x: 2, y: 0 }, b: { x: 8, y: 0 }, offset: 5 };
    const stacked = stackDimensionChains([dim1, dim2], 8);
    expect(Math.abs(stacked[0].offset - stacked[1].offset)).toBeGreaterThanOrEqual(8);
  });

  it("Item 16 & 30: COLLADA numeric formatting & attribute XML escaping", () => {
    const collada = writeCollada([
      {
        name: "Building <Main>",
        positions: [0.1234567, 1.2345678, 2.3456789],
        indices: [0, 0, 0],
        color: [1, 0, 0],
      },
    ]);
    expect(collada).toContain('name="Building &#60;Main&#62;"');
    expect(collada).toContain("0.1235 1.2346 2.3457");
  });

  it("Item 17 & 18: Line splitting robustness & O(E) lot merging", () => {
    const poly = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const split = splitPolygonByLine(poly, { x: 5, y: -5 }, { x: 5, y: 15 });
    expect(split).not.toBeNull();

    const lot1 = {
      id: "l1",
      kind: "lot" as const,
      name: "Lot 1",
      layerId: "layer1",
      boundary: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 10 },
        { x: 0, y: 10 },
      ],
    };
    const lot2 = {
      id: "l2",
      kind: "lot" as const,
      name: "Lot 2",
      layerId: "layer1",
      boundary: [
        { x: 5, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 5, y: 10 },
      ],
    };
    const merged = mergeLots([lot1, lot2], "layer1", () => "m1");
    expect(merged.boundary.length).toBeGreaterThanOrEqual(4);
  });

  it("Item 19 & 20: Area-weighted centroid in compliance audit", () => {
    const site = {
      id: "site1",
      name: "Site",
      elements: [
        {
          id: "z1",
          kind: "zone" as const,
          designation: "R-1",
          boundary: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
            { x: 0, y: 100 },
          ],
          allowedUses: ["residential"],
        },
        {
          id: "b1",
          kind: "building" as const,
          name: "House",
          boundary: [
            { x: 10, y: 10 },
            { x: 30, y: 10 },
            { x: 30, y: 30 },
            { x: 10, y: 30 },
          ],
          storeys: 2,
          use: "residential",
        },
      ],
    };
    const findings = checkCompliance(site);
    expect(findings).toBeDefined();
  });

  it("Item 21 & 22: Zero-distance traverse adjustment guard & 360 interior angles", () => {
    const courses = [
      {
        index: 1,
        type: "line" as const,
        from: { x: 0, y: 0 },
        to: { x: 0, y: 0 },
        fromLabel: "P1",
        toLabel: "P2",
        azimuth: 0,
        bearing: { ns: "N" as const, degrees: 0, minutes: 0, seconds: 0, ew: "E" as const },
        bearingText: "N00°00′00″E",
        distance: 0,
        distanceMeters: 0,
        latitude: 0,
        departure: 0,
      },
    ];
    const adj = adjustTraverse(courses);
    expect(adj.courses[0].distanceMeters).toBe(0);

    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const angles = interiorAngles(square);
    expect(angles.every((a) => Math.abs(a - 90) < 1e-4)).toBe(true);
  });

  it("Item 23 & 24: Grading bilinear terrain interpolation & volume calculation", () => {
    const pad = {
      id: "pad1",
      name: "Pad 1",
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 10 },
        { x: 20, y: 20 },
        { x: 10, y: 20 },
      ],
      targetElevation: 100,
      cutSlope: 2,
      fillSlope: 3,
    };
    const surface = interpolateGrid(
      [
        { point: { x: 0, y: 0 }, z: 90 },
        { point: { x: 30, y: 30 }, z: 110 },
      ],
      { minX: 0, minY: 0, maxX: 30, maxY: 30 },
      { cellSize: 5 }
    );
    const vol = calculateGradingVolumes(pad, 100, surface, 5);
    expect(vol.cutVolume).toBeGreaterThanOrEqual(0);
    expect(vol.fillVolume).toBeGreaterThanOrEqual(0);
  });

  it("Item 25 & 26: Network nodeMap reuse and Union-Find path compression", () => {
    const net = {
      id: "net1",
      name: "Roads",
      kind: "road" as const,
      nodes: [
        { id: "n1", point: { x: 0, y: 0 } },
        { id: "n2", point: { x: 10, y: 0 } },
        { id: "n3", point: { x: 20, y: 0 } },
      ],
      edges: [
        { id: "e1", from: "n1", to: "n2" },
        { id: "e2", from: "n2", to: "n3" },
      ],
    };
    expect(connectedComponents(net)).toBe(1);
    expect(distanceToNetwork(net, { x: 5, y: 5 })).toBe(5);
    expect(serviceCoverage(net, [{ x: 5, y: 2 }], 5)).toBe(1);
  });

  it("Item 27 & 28: Safe QTO pay item math parser & quoted CSV parsing", () => {
    const payItem = { id: "item1", name: "Paving", unit: "sqm", unitCost: 25 };
    const costEval = evaluatePayItemCost(payItem, { area: 100 }, "area * unitCost");
    expect(costEval.cost).toBe(2500);

    const csv = 'ID,Name,Unit,UnitCost\n1,"Concrete, Class A",cy,150,Concrete';
    const items = parsePayItemListCsv(csv);
    expect(items.length).toBe(1);
    expect(items[0].name).toBe("Concrete, Class A");
  });

  it("Item 29: Stair zero-height safety guard", () => {
    const stair = {
      id: "stair1",
      kind: "stair" as const,
      name: "Stair 1",
      layerId: "layer1",
      boundary: [
        { x: 0, y: 0 },
        { x: 3, y: 0 },
        { x: 3, y: 1 },
        { x: 0, y: 1 },
      ],
      height: 0,
      stairType: "straight" as const,
    };
    const geom = calculateStairGeometry(stair as any);
    expect(geom.riserCount).toBe(1);
    expect(geom.actualRiserHeight).toBe(0);
    expect(geom.breakLine.length).toBeGreaterThan(0);
  });
});
