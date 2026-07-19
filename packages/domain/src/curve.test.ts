import { describe, expect, it } from "vitest";
import { area as polygonArea, type Point, type Polygon } from "./geometry";
import {
  boundaryArea,
  boundaryPerimeter,
  bulgeToArc,
  densifyArc,
  densifyBoundary,
  edgeBulge,
  hasArcs,
} from "./curve";

const S: Point = { x: 0, y: 0 };
const E: Point = { x: 10, y: 0 };

describe("bulgeToArc", () => {
  it("resolves a semicircle (bulge = 1)", () => {
    const arc = bulgeToArc(S, E, 1)!;
    expect(arc.radius).toBeCloseTo(5, 9);
    expect(arc.center.x).toBeCloseTo(5, 9);
    expect(arc.center.y).toBeCloseTo(0, 9);
    expect(arc.delta).toBeCloseTo(Math.PI, 9);
    expect(arc.arcLength).toBeCloseTo(Math.PI * 5, 9);
    expect(arc.chordLength).toBeCloseTo(10, 9);
    // The mid-arc point is one radius from the center.
    expect(Math.hypot(arc.mid.x - arc.center.x, arc.mid.y - arc.center.y)).toBeCloseTo(5, 9);
  });

  it("resolves a quarter circle and its tangent", () => {
    const bulge = Math.tan(Math.PI / 8); // Δ = 90°
    const arc = bulgeToArc(S, E, bulge)!;
    expect(arc.delta).toBeCloseTo(Math.PI / 2, 9);
    // R = chord / (2 sin(Δ/2)) = 10 / (2 sin45°) = 7.0710678…
    expect(arc.radius).toBeCloseTo(10 / (2 * Math.sin(Math.PI / 4)), 9);
    // Tangent = R tan(Δ/2) = R tan45° = R.
    expect(arc.tangent).toBeCloseTo(arc.radius, 9);
  });

  it("flips the bulge side with the sign", () => {
    const up = bulgeToArc(S, E, 0.5)!;
    const down = bulgeToArc(S, E, -0.5)!;
    expect(Math.sign(up.mid.y)).toBe(-Math.sign(down.mid.y));
    expect(up.radius).toBeCloseTo(down.radius, 9);
  });

  it("treats a zero/degenerate bulge as straight", () => {
    expect(bulgeToArc(S, E, 0)).toBeNull();
    expect(bulgeToArc(S, S, 1)).toBeNull();
    expect(edgeBulge({ "0": 0.5 }, 0)).toBe(0.5);
    expect(edgeBulge(undefined, 0)).toBe(0);
  });
});

describe("densifyArc", () => {
  it("stays on the circle of radius R", () => {
    const arc = bulgeToArc(S, E, 0.6)!;
    for (const p of densifyArc(S, E, 0.6, 5)) {
      expect(Math.hypot(p.x - arc.center.x, p.y - arc.center.y)).toBeCloseTo(arc.radius, 6);
    }
  });
});

// A unit square in the plan's (screen) frame: CCW here, interior toward +y.
const square: Polygon = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];
const HALF_DISC = (Math.PI * 5 * 5) / 2; // radius-5 semicircle ≈ 39.2699

describe("boundaryArea with arcs", () => {
  it("equals the shoelace area when there are no arcs", () => {
    expect(boundaryArea(square)).toBeCloseTo(polygonArea(square), 9);
    expect(hasArcs(square)).toBe(false);
  });

  it("adds a semicircle bulging outward and subtracts one bulging inward", () => {
    // Edge 0 runs (0,0)→(10,0); +y is interior, so bulge −1 pushes outward.
    const outward = boundaryArea(square, { "0": -1 });
    const inward = boundaryArea(square, { "0": 1 });
    expect(outward).toBeCloseTo(100 + HALF_DISC, 6);
    expect(inward).toBeCloseTo(100 - HALF_DISC, 6);
    expect(hasArcs(square, { "0": -1 })).toBe(true);
  });

  it("matches a finely densified polygon (independent check)", () => {
    const arcs = { "0": -0.7, "2": 0.4 };
    const analytic = boundaryArea(square, arcs);
    const densified = polygonArea(densifyBoundary(square, arcs, 0.25));
    expect(analytic).toBeCloseTo(densified, 2);
  });
});

describe("boundaryPerimeter with arcs", () => {
  it("replaces a chord's length with the arc length", () => {
    const straight = boundaryPerimeter(square);
    const curved = boundaryPerimeter(square, { "0": -1 });
    // Edge 0's chord (10) becomes a semicircle (π·5 ≈ 15.708).
    expect(curved - straight).toBeCloseTo(Math.PI * 5 - 10, 6);
  });
});
