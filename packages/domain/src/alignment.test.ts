import { describe, expect, it } from "vitest";
import {
  alignmentLength,
  formatStation,
  fullStations,
  pointAtStation,
  resolveAlignment,
  stationOffsetOfPoint,
  type HorizontalAlignment,
} from "./alignment";

// A baseline that runs north, then turns east through a 500-unit curve.
//   POB (0,0) → PI (0,−1000) → POE (1000,−1000);  R = 500 at the PI.
// Hand values: Δ=90°, T=500, L=500·π/2, PC=(0,−500), PT=(500,−1000).
const align: HorizontalAlignment = {
  id: "a1",
  name: "R/L TEST",
  startStation: 10000, // 100+00
  pis: [
    { point: { x: 0, y: 0 } },
    { point: { x: 0, y: -1000 }, radius: 500 },
    { point: { x: 1000, y: -1000 } },
  ],
};

describe("resolveAlignment — curve geometry", () => {
  const r = resolveAlignment(align)!;
  const c = r.curves[0];

  it("computes T, L, Δ and the derived curve data", () => {
    expect(r.curves).toHaveLength(1);
    expect(c.deltaDeg).toBeCloseTo(90, 6);
    expect(c.tangent).toBeCloseTo(500, 6);
    expect(c.length).toBeCloseTo((500 * Math.PI) / 2, 6);
    expect(c.external).toBeCloseTo(500 * (1 / Math.cos(Math.PI / 4) - 1), 6);
    expect(c.middleOrdinate).toBeCloseTo(500 * (1 - Math.cos(Math.PI / 4)), 6);
    expect(c.chord).toBeCloseTo(2 * 500 * Math.sin(Math.PI / 4), 6);
    expect(c.degreeOfCurve).toBeCloseTo(5729.5779513 / 500, 4);
  });

  it("locates PC, PT and the center; turns right (N→E)", () => {
    expect(c.pc).toMatchObject({ x: expect.closeTo(0, 6), y: expect.closeTo(-500, 6) });
    expect(c.pt).toMatchObject({ x: expect.closeTo(500, 6), y: expect.closeTo(-1000, 6) });
    expect(c.center).toMatchObject({ x: expect.closeTo(500, 6), y: expect.closeTo(-500, 6) });
    expect(Math.hypot(c.pc.x - c.center.x, c.pc.y - c.center.y)).toBeCloseTo(500, 6);
    expect(Math.hypot(c.pt.x - c.center.x, c.pt.y - c.center.y)).toBeCloseTo(500, 6);
    expect(c.direction).toBe("right");
  });
});

describe("stationing", () => {
  const r = resolveAlignment(align)!;
  const c = r.curves[0];

  it("accumulates PC/PI/PT stations continuously", () => {
    expect(c.pcStation).toBeCloseTo(10500, 6); // 100+00 + 500 tangent
    expect(c.piStation).toBeCloseTo(11000, 6); // PC + T
    expect(c.ptStation).toBeCloseTo(10500 + (500 * Math.PI) / 2, 6);
    expect(alignmentLength(r)).toBeCloseTo(500 + (500 * Math.PI) / 2 + 500, 6);
    expect(r.endStation).toBeCloseTo(10000 + alignmentLength(r), 6);
  });

  it("full stations fall on 100-unit multiples in range", () => {
    const s = fullStations(r, 100);
    expect(s[0]).toBe(10000); // 100+00 is itself a full station
    expect(s.every((v) => v % 100 === 0)).toBe(true);
    expect(s[s.length - 1]).toBeLessThanOrEqual(r.endStation);
  });
});

describe("pointAtStation", () => {
  const r = resolveAlignment(align)!;

  it("returns the endpoints and the PC/PT", () => {
    expect(pointAtStation(r, 10000)!.point).toMatchObject({
      x: expect.closeTo(0, 6),
      y: expect.closeTo(0, 6),
    });
    expect(pointAtStation(r, 10500)!.point).toMatchObject({
      x: expect.closeTo(0, 6),
      y: expect.closeTo(-500, 6),
    });
    expect(pointAtStation(r, r.endStation)!.point).toMatchObject({
      x: expect.closeTo(1000, 6),
      y: expect.closeTo(-1000, 6),
    });
  });

  it("stays on the arc through the curve (R from center)", () => {
    const c = r.curves[0];
    const mid = pointAtStation(r, (c.pcStation + c.ptStation) / 2)!.point;
    expect(Math.hypot(mid.x - c.center.x, mid.y - c.center.y)).toBeCloseTo(500, 5);
  });

  it("heads due north at the start and due east at the end", () => {
    expect(pointAtStation(r, 10100)!.bearing).toBeCloseTo(0, 4); // north
    expect(pointAtStation(r, r.endStation - 100)!.bearing).toBeCloseTo(90, 4); // east
  });
});

describe("stationOffsetOfPoint", () => {
  const r = resolveAlignment(align)!;

  it("gives ~zero offset for a point on the tangent", () => {
    const so = stationOffsetOfPoint(r, { x: 0, y: -250 });
    expect(so.station).toBeCloseTo(10250, 5);
    expect(so.offset).toBeCloseTo(0, 6);
  });

  it("reports offset magnitude and side (east of a north run is right)", () => {
    const so = stationOffsetOfPoint(r, { x: 15, y: -250 });
    expect(so.offset).toBeCloseTo(15, 6);
    expect(so.side).toBe("right");
    const left = stationOffsetOfPoint(r, { x: -15, y: -250 });
    expect(left.side).toBe("left");
  });
});

describe("formatStation", () => {
  it("formats engineer's stations", () => {
    expect(formatStation(176043.32)).toBe("1760+43.32");
    expect(formatStation(10000)).toBe("100+00.00");
    expect(formatStation(10500)).toBe("105+00.00");
    expect(formatStation(9282.35)).toBe("92+82.35");
  });
});
